import { v } from "convex/values";
import { mutation, query } from "./lib/functions";
import { internalMutation, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser } from "./lib/util";
import { eraseFamilyData } from "./family";

/** Everything the user has ever logged, as one JSON blob they can keep. */
export const exportData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const byUserDate = async (table: any) =>
      await ctx.db
        .query(table)
        .withIndex("by_user_date", (q: any) => q.eq("userId", userId))
        .collect();
    const byUser = async (table: any) =>
      await ctx.db
        .query(table)
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect();

    return {
      exportedAt: new Date().toISOString(),
      profile: await byUser("profiles"),
      targets: await byUser("targets"),
      goals: await byUser("goals"),
      programs: await byUser("programs"),
      programDays: await byUser("programDays"),
      workouts: await byUserDate("workouts"),
      sets: await ctx.db
        .query("sets")
        .withIndex("by_user_exercise", (q) => q.eq("userId", userId))
        .collect(),
      meals: await byUserDate("mealEntries"),
      water: await byUserDate("waterLogs"),
      sleep: await byUserDate("sleepSessions"),
      body: await byUserDate("bodyMetrics"),
      checkins: await byUserDate("checkins"),
      personalRecords: await byUser("personalRecords"),
      customFoods: await ctx.db
        .query("foods")
        .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
        .collect(),
      customExercises: await ctx.db
        .query("exercises")
        .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
        .collect(),
      recipes: await byUser("recipes"),
      reminders: await byUser("reminders"),
      familyMembership: await byUser("circleMembers"),
      nudgesReceived: await ctx.db
        .query("nudges")
        .withIndex("by_to", (q) => q.eq("toId", userId))
        .collect(),
      nudgesSent: await ctx.db
        .query("nudges")
        .withIndex("by_from_to", (q) => q.eq("fromId", userId))
        .collect(),
    };
  },
});

/**
 * Every table holding a user's rows and the index that finds them. Deletion walks this list in
 * batches so a long-time user's history never exceeds one transaction's limits.
 */
const OWNED = [
  { table: "progressPhotos", index: "by_user_date", field: "userId" },
  { table: "sets", index: "by_user_exercise", field: "userId" },
  { table: "workoutExercises", index: "by_user_exercise", field: "userId" },
  { table: "workouts", index: "by_user_date", field: "userId" },
  { table: "mealEntries", index: "by_user_date", field: "userId" },
  { table: "waterLogs", index: "by_user_date", field: "userId" },
  { table: "sleepSessions", index: "by_user_date", field: "userId" },
  { table: "bodyMetrics", index: "by_user_date", field: "userId" },
  { table: "checkins", index: "by_user_date", field: "userId" },
  { table: "programDays", index: "by_user", field: "userId" },
  { table: "programs", index: "by_user", field: "userId" },
  { table: "targets", index: "by_user", field: "userId" },
  { table: "goals", index: "by_user", field: "userId" },
  { table: "personalRecords", index: "by_user", field: "userId" },
  { table: "recipes", index: "by_user", field: "userId" },
  { table: "mealTemplates", index: "by_user", field: "userId" },
  { table: "reminders", index: "by_user", field: "userId" },
  { table: "profiles", index: "by_user", field: "userId" },
  { table: "foods", index: "by_owner", field: "ownerUserId" },
  { table: "exercises", index: "by_owner", field: "ownerUserId" },
] as const;
const BATCH = 300;

/** Wipes everything the user logged but keeps the login — a fresh start. Irreversible. */
export const deleteAccountData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    // The profile goes now so the app lands on onboarding; the rest follows in batches.
    // Only rows created before this moment are touched, so re-onboarding is never deleted.
    const before = Date.now();
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.delete(profile._id);
    await ctx.scheduler.runAfter(0, internal.account.wipeBatch, { userId, before, eraseLogin: false });
  },
});

/**
 * Right to be forgotten. Access ends immediately (sessions and login erased in this
 * transaction); the data follows in background batches, then the user record itself.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    for (const s of await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", userId)).collect()) {
      for (const t of await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", s._id)).collect())
        await ctx.db.delete(t._id);
      await ctx.db.delete(s._id);
    }
    const user = await ctx.db.get(userId);
    for (const a of await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", userId)).collect()) {
      for (const c of await ctx.db.query("authVerificationCodes").withIndex("accountId", (q) => q.eq("accountId", a._id)).collect())
        await ctx.db.delete(c._id);
      await ctx.db.delete(a._id);
    }
    if (user?.email)
      for (const r of await ctx.db.query("authRateLimits").withIndex("identifier", (q) => q.eq("identifier", user.email!)).collect())
        await ctx.db.delete(r._id);
    await ctx.scheduler.runAfter(0, internal.account.wipeBatch, { userId, before: Date.now(), eraseLogin: true });
  },
});

export const wipeBatch = internalMutation({
  args: { userId: v.id("users"), before: v.number(), eraseLogin: v.boolean() },
  handler: async (ctx, args) => {
    let budget = BATCH;
    for (const src of OWNED) {
      while (budget > 0) {
        const rows: any[] = await (ctx.db.query(src.table) as any)
          .withIndex(src.index, (q: any) => q.eq(src.field, args.userId))
          .filter((q: any) => q.lt(q.field("_creationTime"), args.before))
          .take(budget);
        if (rows.length === 0) break;
        for (const r of rows) {
          if (src.table === "progressPhotos") await ctx.storage.delete(r.storageId);
          await ctx.db.delete(r._id);
        }
        budget -= rows.length;
      }
      if (budget <= 0) {
        await ctx.scheduler.runAfter(0, internal.account.wipeBatch, args);
        return;
      }
    }
    await eraseFamilyData(ctx, args.userId);
    if (!args.eraseLogin) return;
    await wipeThrottles(ctx, args.userId);
    await ctx.db.delete(args.userId);
  },
});

async function wipeThrottles(ctx: MutationCtx, userId: Id<"users">) {
  // Our own throttle rows are keyed `${userId}:bucket`.
  for (const r of await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.gte("key", `${userId}:`).lt("key", `${userId};`))
    .collect())
    await ctx.db.delete(r._id);
}
