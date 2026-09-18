import { v } from "convex/values";
import { mutation, throttle, DAY } from "./lib/functions";
import { requireUser, today, addDays, norm } from "./lib/util";
import { SEED_EXERCISES } from "./data/exercises";
import { SEED_FOODS } from "./data/foods";
import { nutrientsFor } from "./foods";
import { e1rm } from "./lib/fitness";
import { Id } from "./_generated/dataModel";

const LIBRARY_VERSION = 1;

/** Idempotent: fills the shared exercise + food library once. */
export const ensureLibrary = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const meta = await ctx.db
      .query("seedMeta")
      .withIndex("by_key", (q) => q.eq("key", "library"))
      .unique();
    if (meta && meta.version >= LIBRARY_VERSION) return { skipped: true, count: meta.count };

    const existingEx = await ctx.db
      .query("exercises")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", undefined))
      .collect();
    const haveEx = new Set(existingEx.map((e) => e.name));
    for (const e of SEED_EXERCISES) {
      if (haveEx.has(e.name)) continue;
      await ctx.db.insert("exercises", { ...e, isSample: false });
    }

    const existingFood = await ctx.db
      .query("foods")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", undefined))
      .collect();
    const haveFood = new Set(existingFood.map((f) => f.name));
    for (const f of SEED_FOODS) {
      if (haveFood.has(f.name)) continue;
      await ctx.db.insert("foods", f);
    }

    const count = SEED_EXERCISES.length + SEED_FOODS.length;
    if (meta) await ctx.db.patch(meta._id, { version: LIBRARY_VERSION, count });
    else await ctx.db.insert("seedMeta", { key: "library", version: LIBRARY_VERSION, count });
    return { skipped: false, count };
  },
});

/* --------------------------- demo history for a user ---------------------- */

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Six weeks of believable history so charts and analytics are meaningful on day one.
 * Every row is flagged isSample so the user can wipe it in one tap.
 */
export const loadSampleHistory = mutation({
  args: { weeks: v.optional(v.number()), tzOffsetMinutes: v.optional(v.number()) },
  handler: async (ctx, { weeks, tzOffsetMinutes }) => {
    // The server runs in UTC; shift generated wall-clock times into the user's zone.
    const tz = (tzOffsetMinutes ?? 0) * 60000;
    const userId = await requireUser(ctx);
    // Each run writes ~1,000 rows; it is a one-time demo, not something to loop on.
    await throttle(ctx, userId, "sample", { max: 3, windowMs: DAY });
    if ((weeks ?? 6) < 1 || (weeks ?? 6) > 12) throw new Error("Weeks must be 1–12");
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const rand = rng(42);
    const days = (weeks ?? 6) * 7;
    const start = addDays(today(), -days + 1);

    const program = (
      await ctx.db
        .query("programs")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).find((p) => p.isActive);
    const programDays = program
      ? (
          await ctx.db
            .query("programDays")
            .withIndex("by_program", (q) => q.eq("programId", program._id))
            .collect()
        ).sort((a, b) => a.order - b.order)
      : [];

    const foods = await ctx.db
      .query("foods")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", undefined))
      .collect();
    const pick = (name: string) => foods.find((f) => f.name === name);
    const breakfasts = ["Poha", "Oats Porridge (Water)", "Idli", "Paneer Paratha", "Omelette (2 Egg)"].map(pick);
    const lunches = [
      ["Roti (Whole Wheat Chapati)", "Dal Tadka", "Curd (Dahi, Full Fat)", "Salad (Kachumber)"],
      ["Cooked White Rice", "Rajma Curry", "Curd (Dahi, Full Fat)"],
      ["Roti (Whole Wheat Chapati)", "Palak Paneer", "Salad (Kachumber)"],
    ];
    const dinners = [
      ["Chicken Curry (Home Style)", "Roti (Whole Wheat Chapati)"],
      ["Cooked Brown Rice", "Chole (Chana Masala)"],
      ["Paneer Bhurji", "Roti (Whole Wheat Chapati)"],
    ];
    const snacks = ["Roasted Chana", "Banana", "Almonds", "Greek Yogurt Plain", "Whey Protein Powder"].map(pick);

    const startWeight = profile?.startWeightKg ?? 78;
    const goal = profile?.goal ?? "fat_loss";
    const drift = goal === "muscle_gain" ? 0.045 : goal === "fat_loss" ? -0.055 : -0.01;

    let inserted = 0;
    for (let i = 0; i < days; i++) {
      const date = addDays(start, i);
      const wd = new Date(date + "T00:00:00").getDay();

      /* body weight most mornings (never double up on a date the user already logged) */
      const existingBody = await ctx.db
        .query("bodyMetrics")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
        .unique();
      if (!existingBody && rand() > 0.25) {
        await ctx.db.insert("bodyMetrics", {
          userId,
          date,
          weightKg: Math.round((startWeight + drift * i + (rand() - 0.5) * 0.8) * 10) / 10,
          measurements:
            i % 14 === 0
              ? {
                  waist: Math.round((88 + drift * i * 0.8 + (rand() - 0.5)) * 10) / 10,
                  chest: 100 + Math.round(rand() * 2),
                  arms: 34 + Math.round(rand() * 2),
                }
              : undefined,
          isSample: true,
        });
        inserted++;
      }

      /* sleep */
      if (rand() > 0.15) {
        const bed = new Date(new Date(`${addDays(date, -1)}T23:00:00Z`).getTime() + tz);
        bed.setMinutes(bed.getMinutes() + Math.round((rand() - 0.5) * 100));
        const wake = new Date(bed.getTime() + (6.4 + rand() * 1.9) * 3600000);
        await ctx.db.insert("sleepSessions", {
          userId,
          date,
          bedAt: bed.getTime(),
          wakeAt: wake.getTime(),
          minutes: Math.round((wake.getTime() - bed.getTime()) / 60000),
          quality: 2 + Math.round(rand() * 3),
          source: "manual",
          isSample: true,
        });
        inserted++;
      }

      /* check-in twice a week */
      if (wd === 1 || wd === 5) {
        await ctx.db.insert("checkins", {
          userId,
          date,
          energy: 2 + Math.round(rand() * 3),
          soreness: 1 + Math.round(rand() * 3),
          stress: 1 + Math.round(rand() * 3),
          isSample: true,
        });
        inserted++;
      }

      /* meals */
      const logMeal = async (meal: string, food: any, qty: number) => {
        if (!food) return;
        const serving = food.servings[0];
        const grams = serving.grams * qty;
        await ctx.db.insert("mealEntries", {
          userId,
          date,
          meal,
          foodId: food._id,
          name: food.name,
          qty,
          unitLabel: serving.label,
          grams: Math.round(grams),
          nutrients: nutrientsFor(food.per100, grams),
          estimated: false,
          at: new Date(`${date}T09:00:00Z`).getTime() + tz,
          isSample: true,
        });
        inserted++;
      };
      if (rand() > 0.12) {
        await logMeal("breakfast", breakfasts[Math.floor(rand() * breakfasts.length)], 1 + Math.round(rand()));
        for (const n of lunches[Math.floor(rand() * lunches.length)]) await logMeal("lunch", pick(n), 1 + Math.round(rand()));
        for (const n of dinners[Math.floor(rand() * dinners.length)]) await logMeal("dinner", pick(n), 1 + Math.round(rand()));
        await logMeal("snack", snacks[Math.floor(rand() * snacks.length)], 1);
        await ctx.db.insert("waterLogs", {
          userId,
          date,
          ml: 1600 + Math.round(rand() * 1200),
          at: new Date(`${date}T20:00:00Z`).getTime() + tz,
        });
        inserted++;
      }

      /* workouts on program days */
      const day = programDays.find((p) => p.weekday === wd);
      if (day && rand() > 0.14) {
        const startedAt = new Date(`${date}T18:30:00Z`).getTime() + tz;
        const duration = 40 + Math.round(rand() * 25);
        const workoutId = await ctx.db.insert("workouts", {
          userId,
          date,
          programId: program!._id,
          programDayId: day._id,
          title: day.title,
          focus: day.focus,
          status: "completed",
          startedAt,
          completedAt: startedAt + duration * 60000,
          durationMin: duration,
          rpe: 6 + Math.round(rand() * 3),
          isSample: true,
        });
        let volume = 0;
        for (let idx = 0; idx < day.items.length; idx++) {
          const item = day.items[idx];
          const weId = await ctx.db.insert("workoutExercises", {
            userId,
            workoutId,
            exerciseId: item.exerciseId,
            order: idx,
            restSec: item.restSec,
            notes: item.notes,
            });
          const ex = await ctx.db.get(item.exerciseId);
          const bodyweight = !ex || ex.equipment.every((e: string) => ["bodyweight", "pull-up bar", "parallel bars"].includes(e));
          // Plausible loads per movement, so demo data doesn't show 70 kg biceps curls.
          const LOADS: Record<string, number> = {
            hinge: 80, squat: 70, push: 45, pull: 45, carry: 30, core: 15, isolation: 14, conditioning: 0,
          };
          const base = bodyweight ? 0 : Math.round(((LOADS[ex!.pattern] ?? 30) * (0.85 + rand() * 0.3)) / 2.5) * 2.5;
          const progression = base ? base * (1 + (i / days) * 0.18) : 0;
          for (let s = 0; s < item.sets; s++) {
            const reps = 6 + Math.round(rand() * 6);
            const weightKg = base ? Math.round((progression + (rand() - 0.5) * 2.5) / 2.5) * 2.5 : undefined;
            volume += (weightKg ?? 0) * reps;
            await ctx.db.insert("sets", {
              userId,
              workoutId,
              workoutExerciseId: weId,
              exerciseId: item.exerciseId,
              index: s,
              kind: "working",
              targetReps: item.reps,
              reps,
              weightKg,
              completed: true,
              date,
            });
            inserted++;
          }
        }
        await ctx.db.patch(workoutId, { totalVolumeKg: Math.round(volume) });
      }
    }

    /* recompute PRs from the sample sets */
    const allSets = await ctx.db
      .query("sets")
      .withIndex("by_user_exercise", (q) => q.eq("userId", userId))
      .collect();
    const best = new Map<string, { value: number; reps: number; weight: number; date: string }>();
    for (const s of allSets) {
      if (!s.completed || !s.weightKg) continue;
      const est = e1rm(s.weightKg, s.reps ?? 0);
      const cur = best.get(s.exerciseId);
      if (!cur || est > cur.value)
        best.set(s.exerciseId, { value: est, reps: s.reps ?? 0, weight: s.weightKg, date: s.date });
    }
    for (const [exerciseId, b] of best) {
      await ctx.db.insert("personalRecords", {
        userId,
        exerciseId: exerciseId as Id<"exercises">,
        kind: "e1rm",
        value: b.value,
        reps: b.reps,
        weightKg: b.weight,
        date: b.date,
      });
    }

    if (profile) await ctx.db.patch(profile._id, { hasSampleData: true });
    return { inserted };
  },
});

export const clearSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    let removed = 0;
    const wipe = async (rows: { _id: any; isSample?: boolean }[]) => {
      for (const r of rows)
        if (r.isSample) {
          await ctx.db.delete(r._id);
          removed++;
        }
    };
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    for (const w of workouts) {
      if (!w.isSample) continue;
      const sets = await ctx.db
        .query("sets")
        .withIndex("by_workout", (q) => q.eq("workoutId", w._id))
        .collect();
      for (const s of sets) await ctx.db.delete(s._id);
      const wes = await ctx.db
        .query("workoutExercises")
        .withIndex("by_workout", (q) => q.eq("workoutId", w._id))
        .collect();
      for (const e of wes) await ctx.db.delete(e._id);
      await ctx.db.delete(w._id);
      removed++;
    }
    await wipe(
      await ctx.db
        .query("mealEntries")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))
        .collect()
    );
    await wipe(
      await ctx.db
        .query("sleepSessions")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))
        .collect()
    );
    await wipe(
      await ctx.db
        .query("bodyMetrics")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))
        .collect()
    );
    await wipe(
      await ctx.db
        .query("checkins")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))
        .collect()
    );
    const prs = await ctx.db
      .query("personalRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const p of prs) {
      await ctx.db.delete(p._id);
      removed++;
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.patch(profile._id, { hasSampleData: false });
    return { removed };
  },
});
