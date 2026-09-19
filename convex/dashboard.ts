import { v } from "convex/values";
import { query } from "./lib/functions";
import { getAuthUserId } from "@convex-dev/auth/server";
import { todayFor, addDays, daysBetween, weekday } from "./lib/util";
import { targetsOn } from "./profiles";
import { programDayForDate } from "./programs";
import { pickWorkoutOfDay } from "./workouts";
import { trendSeries, readiness, bmi } from "./lib/fitness";

/** One round trip for the whole home screen. */
export const home = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const d = date ?? (await todayFor(ctx, userId));
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const targets = await targetsOn(ctx, userId, d);

    /* nutrition */
    const entries = await ctx.db
      .query("mealEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .collect();
    const nutrition = entries.reduce(
      (a, e) => ({
        kcal: a.kcal + e.nutrients.kcal,
        protein: Math.round((a.protein + e.nutrients.protein) * 10) / 10,
        carbs: Math.round((a.carbs + e.nutrients.carbs) * 10) / 10,
        fat: Math.round((a.fat + e.nutrients.fat) * 10) / 10,
        fiber: Math.round((a.fiber + e.nutrients.fiber) * 10) / 10,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
    const water = (
      await ctx.db
        .query("waterLogs")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
        .collect()
    ).reduce((a, w) => a + w.ml, 0);

    /* workout */
    const dayWorkouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .collect();
    let workout: any = pickWorkoutOfDay(dayWorkouts) ?? null;
    let plannedDay = null;
    if (!workout) {
      const planned = await programDayForDate(ctx, userId, d);
      if (planned) {
        const items = await Promise.all(
          planned.day.items.map(async (i) => ({ ...i, exercise: await ctx.db.get(i.exerciseId) }))
        );
        plannedDay = { ...planned.day, items, programName: planned.program.name };
      }
    } else {
      const sets = await ctx.db
        .query("sets")
        .withIndex("by_workout", (q) => q.eq("workoutId", workout._id))
        .collect();
      workout = {
        ...workout,
        setsDone: sets.filter((s) => s.completed).length,
        setsTotal: sets.length,
        exerciseCount: new Set(sets.map((s) => s.exerciseId)).size,
      };
    }

    /* sleep last night + recovery */
    const sleepRows = await ctx.db
      .query("sleepSessions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .collect();
    const sleepMinutes = sleepRows.reduce((a, s) => a + s.minutes, 0) || undefined;
    const checkin = await ctx.db
      .query("checkins")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .unique();

    /* body */
    const bodyRows = (
      await ctx.db
        .query("bodyMetrics")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", addDays(d, -90)))
        .collect()
    ).sort((a, b) => (a.date < b.date ? -1 : 1));
    const weightPoints = trendSeries(
      bodyRows.filter((r) => r.weightKg != null).map((r) => ({ date: r.date, value: r.weightKg! }))
    );
    const latestWeight = weightPoints[weightPoints.length - 1];
    const weekAgo = weightPoints.find((p) => daysBetween(p.date, d) <= 7 && daysBetween(p.date, d) >= 6);

    /* streak + weekly consistency */
    const recentWorkouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", addDays(d, -60)))
      .collect();
    const completed = recentWorkouts.filter((w) => w.status === "completed");
    const last7 = completed.filter((w) => daysBetween(w.date, d) <= 7);
    const prev7 = completed.filter((w) => daysBetween(w.date, d) > 7 && daysBetween(w.date, d) <= 14);
    let daysSinceRest = 0;
    for (let i = 1; i <= 14; i++) {
      if (completed.some((w) => w.date === addDays(d, -i))) daysSinceRest++;
      else break;
    }

    /* logging streak: any meaningful log counts, so a rest day never breaks it */
    const loggedDates = new Set<string>([
      ...completed.map((w) => w.date),
      ...bodyRows.map((b) => b.date),
    ]);
    const mealDates = await ctx.db
      .query("mealEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", addDays(d, -60)))
      .collect();
    mealDates.forEach((m) => loggedDates.add(m.date));
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const dd = addDays(d, -i);
      if (loggedDates.has(dd)) streak++;
      else if (i > 0) break;
    }

    const r = readiness({
      sleepMinutes,
      sleepTarget: targets?.sleepMinutes ?? 480,
      energy: checkin?.energy,
      soreness: checkin?.soreness,
      stress: checkin?.stress,
      last7Volume: last7.reduce((a, w) => a + (w.totalVolumeKg ?? 0), 0),
      prev7Volume: prev7.reduce((a, w) => a + (w.totalVolumeKg ?? 0), 0),
      daysSinceRest,
    });

    return {
      date: d,
      profile,
      targets,
      nutrition,
      mealCount: entries.length,
      water,
      workout,
      plannedDay,
      sleepMinutes: sleepMinutes ?? null,
      checkin,
      readiness: r,
      weight: latestWeight
        ? {
            latest: latestWeight.value,
            trend: latestWeight.trend,
            date: latestWeight.date,
            changeWeek: weekAgo ? Math.round((latestWeight.trend - weekAgo.trend) * 10) / 10 : null,
            target: profile?.targetWeightKg ?? null,
            start: profile?.startWeightKg ?? null,
            bmi: profile?.heightCm ? bmi(latestWeight.value, profile.heightCm) : null,
          }
        : null,
      streak,
      weekDone: last7.length,
      weekTarget: profile?.daysPerWeek ?? 4,
      /**
       * Reminders that are due today and whose thing still is not logged. Rendered in-app —
       * no push, no email, and they disappear the moment the activity is recorded.
       */
      dueReminders: (
        await ctx.db
          .query("reminders")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect()
      )
        .filter((r) => r.enabled && r.days.includes(weekday(d)))
        .filter((r) => {
          switch (r.kind) {
            case "workout":
              return !workout || (workout.status !== "completed" && workout.status !== "skipped");
            case "meal":
              return entries.length === 0;
            case "water":
              return water < (targets?.waterMl ?? 3000);
            case "sleep":
              return true;
            case "weigh_in":
              return !bodyRows.some((b) => b.date === d && b.weightKg != null);
          }
        })
        .map((r) => ({ _id: r._id, kind: r.kind, label: r.label, time: r.time })),
    };
  },
});

/** Chronological feed of everything logged — the timeline screen. */
export const timeline = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const from = addDays((await todayFor(ctx, userId)), -Math.min(Math.max(days ?? 14, 1), 90) + 1);
    const [workouts, meals, sleep, body, checkins] = await Promise.all([
      ctx.db
        .query("workouts")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
      ctx.db
        .query("mealEntries")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
      ctx.db
        .query("sleepSessions")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
      ctx.db
        .query("bodyMetrics")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
      ctx.db
        .query("checkins")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
    ]);
    const dates = new Set<string>([
      ...workouts.map((x) => x.date),
      ...meals.map((x) => x.date),
      ...sleep.map((x) => x.date),
      ...body.map((x) => x.date),
      ...checkins.map((x) => x.date),
    ]);
    return [...dates]
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => {
        const dayMeals = meals.filter((m) => m.date === date);
        return {
          date,
          workouts: workouts.filter((w) => w.date === date),
          meals: {
            count: dayMeals.length,
            kcal: dayMeals.reduce((a, m) => a + m.nutrients.kcal, 0),
            protein: Math.round(dayMeals.reduce((a, m) => a + m.nutrients.protein, 0)),
          },
          sleepMinutes: sleep.filter((s) => s.date === date).reduce((a, s) => a + s.minutes, 0) || null,
          body: body.find((b) => b.date === date) ?? null,
          checkin: checkins.find((c) => c.date === date) ?? null,
        };
      });
  },
});
