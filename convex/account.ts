import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser } from "./lib/util";

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
    };
  },
});

/** Hard delete. Irreversible, and the UI makes the user type the word. */
export const deleteAccountData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
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
      "achievements",
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
    return { removed };
  },
});
