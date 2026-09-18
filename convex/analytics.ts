import { v } from "convex/values";
import { query } from "./lib/functions";
import { getAuthUserId } from "@convex-dev/auth/server";
import { today, addDays, daysBetween } from "./lib/util";
import { trendSeries, linearSlopePerWeek, e1rm } from "./lib/fitness";
import { targetsOn } from "./profiles";

const MUSCLE_GROUPS = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "biceps", "triceps", "core", "calves"];

/** Everything the Progress screen needs, computed from real logs only. */
export const overview = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const n = days ?? 90;
    const from = addDays(today(), -n + 1);

    const [workouts, meals, body, sleep, prs] = await Promise.all([
      ctx.db
        .query("workouts")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
      ctx.db
        .query("mealEntries")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
      ctx.db
        .query("bodyMetrics")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
      ctx.db
        .query("sleepSessions")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
      ctx.db
        .query("personalRecords")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(50),
    ]);
    const targets = await targetsOn(ctx, userId, today());
    const done = workouts.filter((w) => w.status === "completed");

    /* weekly buckets */
    const weeks = new Map<string, { week: string; workouts: number; volume: number; minutes: number }>();
    for (const w of done) {
      const wk = weekKey(w.date);
      const cur = weeks.get(wk) ?? { week: wk, workouts: 0, volume: 0, minutes: 0 };
      cur.workouts++;
      cur.volume += w.totalVolumeKg ?? 0;
      cur.minutes += w.durationMin ?? 0;
      weeks.set(wk, cur);
    }

    /* muscle group frequency from the sets actually logged */
    const setRows = done.length
      ? (
          await Promise.all(
            done.map((w) =>
              ctx.db
                .query("sets")
                .withIndex("by_workout", (q) => q.eq("workoutId", w._id))
                .collect()
            )
          )
        ).flat()
      : [];
    const completedSets = setRows.filter((s) => s.completed);
    const exCache = new Map<string, any>();
    const muscleSets = new Map<string, number>();
    const muscleVolume = new Map<string, number>();
    for (const s of completedSets) {
      let ex = exCache.get(s.exerciseId);
      if (!ex) {
        ex = await ctx.db.get(s.exerciseId);
        exCache.set(s.exerciseId, ex);
      }
      if (!ex) continue;
      for (const m of ex.primaryMuscles) {
        muscleSets.set(m, (muscleSets.get(m) ?? 0) + 1);
        muscleVolume.set(m, (muscleVolume.get(m) ?? 0) + (s.weightKg ?? 0) * (s.reps ?? 0));
      }
    }

    /* nutrition adherence */
    const mealsByDate = new Map<string, { kcal: number; protein: number; fiber: number; carbs: number; fat: number }>();
    for (const m of meals) {
      const cur = mealsByDate.get(m.date) ?? { kcal: 0, protein: 0, fiber: 0, carbs: 0, fat: 0 };
      cur.kcal += m.nutrients.kcal;
      cur.protein += m.nutrients.protein;
      cur.fiber += m.nutrients.fiber;
      cur.carbs += m.nutrients.carbs;
      cur.fat += m.nutrients.fat;
      mealsByDate.set(m.date, cur);
    }
    const nutritionDays = [...mealsByDate.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const avg = (key: "kcal" | "protein" | "fiber") =>
      nutritionDays.length
        ? Math.round(nutritionDays.reduce((a, d) => a + d[key], 0) / nutritionDays.length)
        : 0;
    const hit = (key: "kcal" | "protein" | "fiber", target: number, tol = 0.9) =>
      nutritionDays.length
        ? Math.round((nutritionDays.filter((d) => d[key] >= target * tol).length / nutritionDays.length) * 100)
        : 0;

    /* body weight */
    const weightPoints = trendSeries(
      body.filter((b) => b.weightKg != null).map((b) => ({ date: b.date, value: b.weightKg! })).sort((a, b) => (a.date < b.date ? -1 : 1))
    );

    /* strength progression for the 5 most-trained lifts */
    const exerciseSetCount = new Map<string, number>();
    for (const s of completedSets) exerciseSetCount.set(s.exerciseId, (exerciseSetCount.get(s.exerciseId) ?? 0) + 1);
    const topExercises = [...exerciseSetCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const strength = await Promise.all(
      topExercises.map(async ([exId]) => {
        const ex = exCache.get(exId) ?? (await ctx.db.get(exId as any));
        const byDate = new Map<string, number>();
        for (const s of completedSets.filter((s) => s.exerciseId === exId)) {
          const est = e1rm(s.weightKg ?? 0, s.reps ?? 0);
          byDate.set(s.date, Math.max(byDate.get(s.date) ?? 0, est));
        }
        const points = [...byDate.entries()]
          .map(([date, value]) => ({ date, value }))
          .filter((p) => p.value > 0)
          .sort((a, b) => (a.date < b.date ? -1 : 1));
        return {
          exerciseId: exId,
          name: ex?.name ?? "Exercise",
          points,
          change: points.length > 1 ? Math.round((points[points.length - 1].value - points[0].value) * 10) / 10 : 0,
        };
      })
    );

    const sleepByDate = new Map<string, number>();
    for (const s of sleep) sleepByDate.set(s.date, (sleepByDate.get(s.date) ?? 0) + s.minutes);

    const weeksArr = [...weeks.values()].sort((a, b) => (a.week < b.week ? -1 : 1));
    return {
      range: { from, to: today(), days: n },
      totals: {
        workouts: done.length,
        skipped: workouts.filter((w) => w.status === "skipped").length,
        volume: Math.round(done.reduce((a, w) => a + (w.totalVolumeKg ?? 0), 0)),
        minutes: done.reduce((a, w) => a + (w.durationMin ?? 0), 0),
        sets: completedSets.length,
      },
      weeks: weeksArr,
      muscles: MUSCLE_GROUPS.map((m) => ({
        muscle: m,
        sets: muscleSets.get(m) ?? 0,
        volume: Math.round(muscleVolume.get(m) ?? 0),
      })).sort((a, b) => b.sets - a.sets),
      nutrition: {
        days: nutritionDays,
        avgKcal: avg("kcal"),
        avgProtein: avg("protein"),
        avgFiber: avg("fiber"),
        proteinAdherence: targets ? hit("protein", targets.protein) : 0,
        fiberAdherence: targets ? hit("fiber", targets.fiber) : 0,
        kcalAdherence: targets
          ? Math.round(
              (nutritionDays.filter((d) => Math.abs(d.kcal - targets.kcal) <= targets.kcal * 0.12).length /
                Math.max(1, nutritionDays.length)) *
                100
            )
          : 0,
        loggedDays: nutritionDays.length,
      },
      weight: {
        points: weightPoints,
        slopePerWeek: linearSlopePerWeek(weightPoints.slice(-28).map((p) => ({ date: p.date, value: p.trend }))),
        change:
          weightPoints.length > 1
            ? Math.round((weightPoints[weightPoints.length - 1].trend - weightPoints[0].trend) * 10) / 10
            : 0,
      },
      sleep: {
        points: [...sleepByDate.entries()].map(([date, minutes]) => ({ date, minutes })).sort((a, b) => (a.date < b.date ? -1 : 1)),
        avg: sleepByDate.size ? Math.round([...sleepByDate.values()].reduce((a, b) => a + b, 0) / sleepByDate.size) : 0,
      },
      strength,
      prs: await Promise.all(prs.slice(0, 10).map(async (p) => ({ ...p, exercise: await ctx.db.get(p.exerciseId) }))),
      targets,
      milestones: milestones({
        workouts: done.length,
        sets: completedSets.length,
        volume: done.reduce((a, w) => a + (w.totalVolumeKg ?? 0), 0),
        loggedNutritionDays: nutritionDays.length,
        prs: prs.length,
        weighIns: weightPoints.length,
      }),
    };
  },
});

/**
 * Milestones are derived, never stored: they can't drift out of sync with the data,
 * and nothing is lost if a user deletes history. Framed as "what you've done", not streak pressure.
 */
function milestones(c: {
  workouts: number;
  sets: number;
  volume: number;
  loggedNutritionDays: number;
  prs: number;
  weighIns: number;
}) {
  const ladder = (value: number, steps: number[], label: (n: number) => string, unit: string) => {
    const reached = [...steps].reverse().find((s) => value >= s);
    const next = steps.find((s) => s > value);
    return {
      label: reached ? label(reached) : label(steps[0]),
      unlocked: !!reached,
      value,
      next: next ?? null,
      progress: next ? Math.min(1, value / next) : 1,
      unit,
    };
  };
  return [
    ladder(c.workouts, [1, 10, 25, 50, 100, 200], (n) => `${n} sessions logged`, "sessions"),
    ladder(c.sets, [10, 100, 500, 1000, 5000], (n) => `${n} sets completed`, "sets"),
    ladder(Math.round(c.volume / 1000), [1, 25, 100, 500, 1000], (n) => `${n} tonnes moved`, "t"),
    ladder(c.loggedNutritionDays, [1, 7, 30, 90, 180], (n) => `${n} days of food logged`, "days"),
    ladder(c.prs, [1, 5, 15, 30], (n) => `${n} personal records`, "PRs"),
    ladder(c.weighIns, [1, 10, 50, 150], (n) => `${n} weigh-ins`, "weigh-ins"),
  ];
}

function weekKey(date: string) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministic weekly insights. This is the seam an AI coach plugs into later:
 * same inputs, richer narration.
 */
export const insights = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const d = today();
    const from = addDays(d, -27);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const targets = await targetsOn(ctx, userId, d);
    const [workouts, meals, body, sleep] = await Promise.all([
      ctx.db
        .query("workouts")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
      ctx.db
        .query("mealEntries")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
      ctx.db
        .query("bodyMetrics")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
      ctx.db
        .query("sleepSessions")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect(),
    ]);

    const out: { kind: string; tone: string; title: string; detail: string }[] = [];
    const done = workouts.filter((w) => w.status === "completed");
    const thisWeek = done.filter((w) => daysBetween(w.date, d) < 7).length;
    const lastWeek = done.filter((w) => daysBetween(w.date, d) >= 7 && daysBetween(w.date, d) < 14).length;
    const goalDays = profile?.daysPerWeek ?? 4;

    if (done.length === 0) {
      out.push({
        kind: "training",
        tone: "neutral",
        title: "No sessions logged yet",
        detail: "Start today's workout and the progression tracking kicks in from your second session.",
      });
    } else if (thisWeek >= goalDays) {
      out.push({
        kind: "training",
        tone: "good",
        title: `Hit your ${goalDays}-session week`,
        detail: `${thisWeek} sessions in the last 7 days. Consistency is the part most people get wrong — you didn't.`,
      });
    } else if (thisWeek < lastWeek) {
      out.push({
        kind: "training",
        tone: "warn",
        title: "Training volume dipped",
        detail: `${thisWeek} sessions this week vs ${lastWeek} last week. One extra short session keeps the trend intact.`,
      });
    }

    /* protein */
    const byDate = new Map<string, { protein: number; fiber: number; kcal: number }>();
    for (const m of meals) {
      const cur = byDate.get(m.date) ?? { protein: 0, fiber: 0, kcal: 0 };
      cur.protein += m.nutrients.protein;
      cur.fiber += m.nutrients.fiber;
      cur.kcal += m.nutrients.kcal;
      byDate.set(m.date, cur);
    }
    const loggedDays = [...byDate.values()];
    if (targets && loggedDays.length >= 3) {
      const avgP = loggedDays.reduce((a, x) => a + x.protein, 0) / loggedDays.length;
      const pctHit = loggedDays.filter((x) => x.protein >= targets.protein * 0.9).length / loggedDays.length;
      if (pctHit >= 0.7)
        out.push({
          kind: "nutrition",
          tone: "good",
          title: "Protein is dialled in",
          detail: `You averaged ${Math.round(avgP)} g against a ${targets.protein} g target and hit it on ${Math.round(pctHit * 100)}% of logged days.`,
        });
      else
        out.push({
          kind: "nutrition",
          tone: "warn",
          title: `Protein is ${Math.max(0, Math.round(targets.protein - avgP))} g short on average`,
          detail: `Averaging ${Math.round(avgP)} g of ${targets.protein} g. A 150 g bowl of curd plus 100 g paneer closes most of that gap.`,
        });

      const avgF = loggedDays.reduce((a, x) => a + x.fiber, 0) / loggedDays.length;
      if (avgF < targets.fiber * 0.75)
        out.push({
          kind: "nutrition",
          tone: "warn",
          title: "Fiber is running low",
          detail: `${Math.round(avgF)} g/day against ${targets.fiber} g. Dal, chana, guava and vegetables move this fastest.`,
        });
    }

    /* weight vs goal direction */
    const wp = trendSeries(
      body.filter((b) => b.weightKg != null).map((b) => ({ date: b.date, value: b.weightKg! })).sort((a, b) => (a.date < b.date ? -1 : 1))
    );
    if (wp.length >= 4) {
      const slope = linearSlopePerWeek(wp.slice(-21).map((p) => ({ date: p.date, value: p.trend })));
      const goal = profile?.goal;
      const dir = slope > 0.1 ? "up" : slope < -0.1 ? "down" : "flat";
      if (goal === "fat_loss" && dir === "down")
        out.push({
          kind: "body",
          tone: "good",
          title: `Trend weight down ${Math.abs(slope)} kg/week`,
          detail: "That is inside the sustainable range. Keep protein high and the training volume where it is.",
        });
      else if (goal === "fat_loss" && dir !== "down")
        out.push({
          kind: "body",
          tone: "warn",
          title: "Weight trend has stalled",
          detail:
            "Trend weight is flat over three weeks. Before cutting calories further, check that logging is complete — untracked oil and snacks are the usual cause.",
        });
      else if (goal === "muscle_gain" && dir === "up" && slope > 0.5)
        out.push({
          kind: "body",
          tone: "warn",
          title: `Gaining ${slope} kg/week — faster than ideal`,
          detail: "Above ~0.3 kg/week most of the extra tends to be fat. Trimming ~200 kcal usually settles it.",
        });
    }

    /* sleep */
    const sleepByDate = new Map<string, number>();
    for (const s of sleep) sleepByDate.set(s.date, (sleepByDate.get(s.date) ?? 0) + s.minutes);
    if (sleepByDate.size >= 3 && targets) {
      const avgS = [...sleepByDate.values()].reduce((a, b) => a + b, 0) / sleepByDate.size;
      if (avgS < targets.sleepMinutes - 45)
        out.push({
          kind: "sleep",
          tone: "warn",
          title: `Sleeping ${Math.round((targets.sleepMinutes - avgS) / 6) / 10}h under target`,
          detail: `Averaging ${Math.floor(avgS / 60)}h ${Math.round(avgS % 60)}m. Short sleep shows up as lower session quality before it shows up anywhere else.`,
        });
      else
        out.push({
          kind: "sleep",
          tone: "good",
          title: "Sleep is on target",
          detail: `Averaging ${Math.floor(avgS / 60)}h ${Math.round(avgS % 60)}m across ${sleepByDate.size} logged nights.`,
        });
    }

    return out;
  },
});

export const weeklySummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const d = today();
    const from = addDays(d, -6);
    const [workouts, meals, sleep, body] = await Promise.all([
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
    ]);
    const done = workouts.filter((w) => w.status === "completed");
    const mealDays = new Set(meals.map((m) => m.date)).size;
    const sleepDays = new Set(sleep.map((s) => s.date)).size;
    return {
      from,
      to: d,
      workouts: done.length,
      volume: Math.round(done.reduce((a, w) => a + (w.totalVolumeKg ?? 0), 0)),
      minutes: done.reduce((a, w) => a + (w.durationMin ?? 0), 0),
      avgKcal: mealDays ? Math.round(meals.reduce((a, m) => a + m.nutrients.kcal, 0) / mealDays) : 0,
      avgProtein: mealDays ? Math.round(meals.reduce((a, m) => a + m.nutrients.protein, 0) / mealDays) : 0,
      avgFiber: mealDays ? Math.round(meals.reduce((a, m) => a + m.nutrients.fiber, 0) / mealDays) : 0,
      loggedMealDays: mealDays,
      avgSleep: sleepDays ? Math.round(sleep.reduce((a, s) => a + s.minutes, 0) / sleepDays) : 0,
      weighIns: body.filter((b) => b.weightKg != null).length,
    };
  },
});
