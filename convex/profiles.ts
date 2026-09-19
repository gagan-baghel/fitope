import { ConvexError, v } from "convex/values";
import { mutation, query } from "./lib/functions";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser, todayFor, safeTz } from "./lib/util";
import { computeTargets } from "./lib/fitness";

const profileFields = {
  timezone: v.optional(v.string()),
  name: v.optional(v.string()),
  sex: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
  birthYear: v.optional(v.number()),
  heightCm: v.optional(v.number()),
  startWeightKg: v.optional(v.number()),
  targetWeightKg: v.optional(v.number()),
  goal: v.optional(v.string()),
  experience: v.optional(v.string()),
  activityLevel: v.optional(v.string()),
  daysPerWeek: v.optional(v.number()),
  preferredDays: v.optional(v.array(v.number())),
  sessionMinutes: v.optional(v.number()),
  equipment: v.optional(v.array(v.string())),
  dietPreference: v.optional(v.string()),
  allergies: v.optional(v.array(v.string())),
  mealSchedule: v.optional(v.array(v.string())),
  bedtime: v.optional(v.string()),
  wakeTime: v.optional(v.string()),
  units: v.optional(v.string()),
  theme: v.optional(v.string()),
  onboardingStep: v.optional(v.number()),
};

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const targets = await currentTargets(ctx, userId);
    const latestWeight = await ctx.db
      .query("bodyMetrics")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .filter((q) => q.neq(q.field("weightKg"), undefined))
      .first();
    return {
      userId,
      email: user?.email,
      profile,
      targets,
      currentWeightKg: latestWeight?.weightKg ?? profile?.startWeightKg,
    };
  },
});

export async function currentTargets(ctx: any, userId: any) {
  const rows = await ctx.db
    .query("targets")
    .withIndex("by_user_date", (q: any) => q.eq("userId", userId))
    .order("desc")
    .take(1);
  return rows[0] ?? null;
}

/** Targets as they were on a given date — keeps history honest when a user changes goals. */
export async function targetsOn(ctx: any, userId: any, date: string) {
  const rows = await ctx.db
    .query("targets")
    .withIndex("by_user_date", (q: any) => q.eq("userId", userId).lte("effectiveFrom", date))
    .order("desc")
    .take(1);
  if (rows[0]) return rows[0];
  return await currentTargets(ctx, userId);
}

/** Keeps "today" right when the user travels or first opens the app on a new device. */
export const setTimezone = mutation({
  args: { timezone: v.string() },
  handler: async (ctx, { timezone }) => {
    const userId = await requireUser(ctx);
    const tz = safeTz(timezone);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (profile && profile.timezone !== tz) await ctx.db.patch(profile._id, { timezone: tz });
  },
});

export const saveProfile = mutation({
  args: profileFields,
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const clean: Record<string, unknown> = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined));
    if (args.timezone) clean.timezone = safeTz(args.timezone);
    if (existing) {
      await ctx.db.patch(existing._id, clean);
      return existing._id;
    }
    return await ctx.db.insert("profiles", {
      userId,
      onboardingComplete: false,
      createdAt: Date.now(),
      units: "metric",
      ...clean,
    });
  },
});

export const completeOnboarding = mutation({
  args: { withSampleData: v.optional(v.boolean()) },
  handler: async (ctx, { withSampleData }) => {
    const userId = await requireUser(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Finish the profile first");
    await ctx.db.patch(profile._id, { onboardingComplete: true, onboardingStep: undefined });

    // Seed the first weight point from onboarding so charts have an anchor.
    if (profile.startWeightKg) {
      const d = await todayFor(ctx, userId);
      const existing = await ctx.db
        .query("bodyMetrics")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
        .unique();
      if (!existing) {
        await ctx.db.insert("bodyMetrics", {
          userId,
          date: d,
          weightKg: profile.startWeightKg,
        });
      }
    }
    await recalcTargets(ctx, userId, "estimated");
    return { withSampleData: !!withSampleData };
  },
});

export async function recalcTargets(ctx: any, userId: any, source: string) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();
  // The newest logged weight wins; the onboarding weight is only a fallback.
  const latest = await ctx.db
    .query("bodyMetrics")
    .withIndex("by_user_date", (q: any) => q.eq("userId", userId))
    .order("desc")
    .filter((q: any) => q.neq(q.field("weightKg"), undefined))
    .first();
  const weightKg = latest?.weightKg ?? profile?.startWeightKg;
  if (!profile?.heightCm || !weightKg) return null;
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : 30;
  let sleepMinutes = 480;
  if (profile.bedtime && profile.wakeTime) {
    const [bh, bm] = profile.bedtime.split(":").map(Number);
    const [wh, wm] = profile.wakeTime.split(":").map(Number);
    let mins = wh * 60 + wm - (bh * 60 + bm);
    if (mins <= 0) mins += 1440;
    sleepMinutes = mins;
  }
  const t = computeTargets({
    weightKg,
    heightCm: profile.heightCm,
    age,
    sex: profile.sex,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    targetWeightKg: profile.targetWeightKg,
    sleepTargetMinutes: sleepMinutes,
  });
  const date = (await todayFor(ctx, userId));
  const existingToday = await ctx.db
    .query("targets")
    .withIndex("by_user_date", (q: any) => q.eq("userId", userId).eq("effectiveFrom", date))
    .unique();
  const doc = {
    userId,
    effectiveFrom: date,
    kcal: t.kcal,
    protein: t.protein,
    carbs: t.carbs,
    fat: t.fat,
    fiber: t.fiber,
    waterMl: t.waterMl,
    sleepMinutes: t.sleepMinutes,
    source,
    basis: t.basis,
    createdAt: Date.now(),
  };
  if (existingToday) {
    await ctx.db.patch(existingToday._id, doc);
    return existingToday._id;
  }
  return await ctx.db.insert("targets", doc);
}

export const recomputeTargets = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const id = await recalcTargets(ctx, userId, "estimated");
    if (!id) throw new ConvexError("Add your height and log a weight to estimate targets");
    return id;
  },
});

export const setCustomTargets = mutation({
  args: {
    kcal: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.number(),
    waterMl: v.number(),
    sleepMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const date = (await todayFor(ctx, userId));
    const existing = await ctx.db
      .query("targets")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("effectiveFrom", date))
      .unique();
    const doc = { userId, effectiveFrom: date, ...args, source: "custom", createdAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
      return existing._id;
    }
    return await ctx.db.insert("targets", doc);
  },
});

export const targetHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("targets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
  },
});

/* ---------------------------------- goals --------------------------------- */

export const listGoals = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const upsertGoal = mutation({
  args: {
    id: v.optional(v.id("goals")),
    type: v.string(),
    title: v.string(),
    metric: v.string(),
    startValue: v.optional(v.number()),
    targetValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const userId = await requireUser(ctx);
    if (id) {
      const doc = await ctx.db.get(id);
      if (!doc || doc.userId !== userId) throw new Error("Not found");
      await ctx.db.patch(id, { ...rest, status: rest.status ?? doc.status });
      return id;
    }
    return await ctx.db.insert("goals", {
      userId,
      ...rest,
      status: rest.status ?? "active",
      createdAt: Date.now(),
    });
  },
});

export const deleteGoal = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});
