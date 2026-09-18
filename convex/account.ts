import { mutation, query } from "./lib/functions";
import { MutationCtx } from "./_generated/server";
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

/** Wipes everything the user logged but keeps the login — a fresh start. Irreversible. */
export const deleteAccountData = mutation({
  args: {},
  handler: async (ctx) => ({ removed: await wipeUserData(ctx, await requireUser(ctx)) }),
});

/**
 * Right to be forgotten: all data, then the login itself (email, password hash, sessions,
 * refresh tokens). The client signs out right after.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    await wipeUserData(ctx, userId);
    const user = await ctx.db.get(userId);
    for (const s of await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", userId)).collect()) {
      for (const t of await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", s._id)).collect())
        await ctx.db.delete(t._id);
      await ctx.db.delete(s._id);
    }
    for (const a of await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", userId)).collect()) {
      for (const c of await ctx.db.query("authVerificationCodes").withIndex("accountId", (q) => q.eq("accountId", a._id)).collect())
        await ctx.db.delete(c._id);
      await ctx.db.delete(a._id);
    }
    if (user?.email)
      for (const r of await ctx.db.query("authRateLimits").withIndex("identifier", (q) => q.eq("identifier", user.email!)).collect())
        await ctx.db.delete(r._id);
    // Our own throttle rows are keyed `${userId}:bucket`.
    for (const r of await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.gte("key", `${userId}:`).lt("key", `${userId};`))
      .collect())
      await ctx.db.delete(r._id);
    await ctx.db.delete(userId);
  },
});

async function wipeUserData(ctx: MutationCtx, userId: Id<"users">) {
  let removed = 0;
  const del = async (rows: { _id: any }[]) => {
    for (const r of rows) {
      await ctx.db.delete(r._id);
      removed++;
    }
  };
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

  const photos = await byUserDate("progressPhotos");
  for (const p of photos as any[]) await ctx.storage.delete(p.storageId);
  await del(photos);
  await del(
    await ctx.db
      .query("sets")
      .withIndex("by_user_exercise", (q) => q.eq("userId", userId))
      .collect()
  );
  for (const t of ["workouts", "mealEntries", "waterLogs", "sleepSessions", "bodyMetrics", "checkins"])
    await del(await byUserDate(t));
  for (const t of [
    "workoutExercises",
    "programDays",
    "programs",
    "targets",
    "goals",
    "personalRecords",
    "recipes",
    "mealTemplates",
    "reminders",
    "profiles",
  ]) {
    if (t === "workoutExercises") {
      await del(
        await ctx.db
          .query("workoutExercises")
          .withIndex("by_user_exercise", (q) => q.eq("userId", userId))
          .collect()
      );
      continue;
    }
    await del(await byUser(t));
  }
  await del(
    await ctx.db
      .query("foods")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .collect()
  );
  await del(
    await ctx.db
      .query("exercises")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .collect()
  );
  removed += await eraseFamilyData(ctx, userId);
  return removed;
}
