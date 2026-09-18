import { v } from "convex/values";
import { mutation, query } from "./lib/functions";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser, todayFor, addDays, visibleTo, weekday } from "./lib/util";
import { e1rm } from "./lib/fitness";
import { programDayForDate } from "./programs";
import { Doc, Id } from "./_generated/dataModel";

const STATUS_RANK: Record<string, number> = { in_progress: 0, planned: 1, completed: 2, skipped: 3 };

export function pickWorkoutOfDay<T extends { status: string }>(workouts: T[]): T | undefined {
  return [...workouts].sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9))[0];
}

async function hydrate(ctx: any, workout: Doc<"workouts">) {
  const wes = (
    await ctx.db
      .query("workoutExercises")
      .withIndex("by_workout", (q: any) => q.eq("workoutId", workout._id))
      .collect()
  ).sort((a: any, b: any) => a.order - b.order);
  const allSets = await ctx.db
    .query("sets")
    .withIndex("by_workout", (q: any) => q.eq("workoutId", workout._id))
    .collect();
  const exercises = await Promise.all(
    wes.map(async (we: Doc<"workoutExercises">) => {
      const ex = await ctx.db.get(we.exerciseId);
      const sets = allSets
        .filter((s: Doc<"sets">) => s.workoutExerciseId === we._id)
        .sort((a: Doc<"sets">, b: Doc<"sets">) => a.index - b.index);
      // Previous session with this exercise, for the "last time" hint.
      const prev = await ctx.db
        .query("sets")
        .withIndex("by_user_exercise", (q: any) =>
          q.eq("userId", workout.userId).eq("exerciseId", we.exerciseId)
        )
        .order("desc")
        .take(60);
      const prevSets = prev.filter(
        (s: Doc<"sets">) => s.workoutId !== workout._id && s.completed && s.date < workout.date
      );
      const lastDate = prevSets[0]?.date;
      const last = prevSets.filter((s: Doc<"sets">) => s.date === lastDate);
      return {
        ...we,
        exercise: ex,
        sets,
        last: lastDate
          ? {
              date: lastDate,
              topWeight: Math.max(...last.map((s: Doc<"sets">) => s.weightKg ?? 0)),
              topReps: Math.max(...last.map((s: Doc<"sets">) => s.reps ?? 0)),
              volume: last.reduce((a: number, s: Doc<"sets">) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0),
              sets: last.length,
            }
          : null,
      };
    })
  );
  return { ...workout, exercises };
}

export const forDate = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const d = date ?? (await todayFor(ctx, userId));
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .collect();
    // An unfinished session always wins over an already-completed one on the same day.
    const workout = pickWorkoutOfDay(workouts);
    if (workout) return await hydrate(ctx, workout);

    // Nothing logged yet: show what the active program prescribes for this weekday.
    const planned = await programDayForDate(ctx, userId, d);
    if (!planned) return null;
    const exercises = await Promise.all(
      planned.day.items.map(async (i) => ({ ...i, exercise: await ctx.db.get(i.exerciseId) }))
    );
    return {
      _id: null,
      date: d,
      title: planned.day.title,
      focus: planned.day.focus,
      status: "planned" as const,
      preview: true,
      programId: planned.program._id,
      programDayId: planned.day._id,
      estMinutes: planned.day.estMinutes,
      plannedItems: exercises,
      exercises: [],
    };
  },
});

export const get = query({
  args: { id: v.id("workouts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const w = await ctx.db.get(id);
    if (!w || w.userId !== userId) return null;
    return await hydrate(ctx, w);
  },
});

/** Materialise a planned program day (or an empty session) into a real, editable workout. */
export const start = mutation({
  args: {
    date: v.optional(v.string()),
    programDayId: v.optional(v.id("programDays")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { date, programDayId, title }) => {
    const userId = await requireUser(ctx);
    const d = date ?? (await todayFor(ctx, userId));
    const existing = (
      await ctx.db
        .query("workouts")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
        .collect()
    ).find((w) => w.status === "in_progress" || w.status === "planned");
    if (existing) {
      if (existing.status === "planned")
        await ctx.db.patch(existing._id, { status: "in_progress", startedAt: Date.now() });
      return existing._id;
    }

    let day: Doc<"programDays"> | null = null;
    let programId: Id<"programs"> | undefined;
    if (programDayId) {
      day = await ctx.db.get(programDayId);
      if (day && day.userId !== userId) day = null;
      programId = day?.programId;
    } else {
      const planned = await programDayForDate(ctx, userId, d);
      if (planned) {
        day = planned.day;
        programId = planned.program._id;
      }
    }

    const workoutId = await ctx.db.insert("workouts", {
      userId,
      date: d,
      programId,
      programDayId: day?._id,
      title: title ?? day?.title ?? "Freestyle session",
      focus: day?.focus ?? "custom",
      status: "in_progress",
      startedAt: Date.now(),
    });

    if (day) {
      for (let i = 0; i < day.items.length; i++) {
        const item = day.items[i];
        const weId = await ctx.db.insert("workoutExercises", {
          userId,
          workoutId,
          exerciseId: item.exerciseId,
          order: i,
          restSec: item.restSec,
          tempo: item.tempo,
          notes: item.notes,
        });
        // Progressive overload: prefill from the best set of the last session.
        const prev = await ctx.db
          .query("sets")
          .withIndex("by_user_exercise", (q) => q.eq("userId", userId).eq("exerciseId", item.exerciseId))
          .order("desc")
          .take(30);
        const done = prev.filter((s) => s.completed && s.weightKg);
        const suggested = done.length ? Math.max(...done.map((s) => s.weightKg ?? 0)) : item.targetWeightKg;
        for (let s = 0; s < Math.min(item.sets, 10); s++) {
          await ctx.db.insert("sets", {
            userId,
            workoutId,
            workoutExerciseId: weId,
            exerciseId: item.exerciseId,
            index: s,
            kind: "working",
            targetReps: item.reps,
            weightKg: suggested,
            completed: false,
            date: d,
          });
        }
      }
    }
    return workoutId;
  },
});

export const addExercise = mutation({
  args: { workoutId: v.id("workouts"), exerciseId: v.id("exercises"), sets: v.optional(v.number()), reps: v.optional(v.string()) },
  handler: async (ctx, { workoutId, exerciseId, sets, reps }) => {
    const userId = await requireUser(ctx);
    const w = await ctx.db.get(workoutId);
    if (!w || w.userId !== userId) throw new Error("Not found");
    if (!visibleTo(await ctx.db.get(exerciseId), userId)) throw new Error("Exercise not found");
    if (sets != null && (sets < 1 || sets > 10)) throw new Error("Sets must be 1–10");
    const existing = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workout", (q) => q.eq("workoutId", workoutId))
      .collect();
    const weId = await ctx.db.insert("workoutExercises", {
      userId,
      workoutId,
      exerciseId,
      order: existing.length,
      restSec: 90,
    });
    const prev = await ctx.db
      .query("sets")
      .withIndex("by_user_exercise", (q) => q.eq("userId", userId).eq("exerciseId", exerciseId))
      .order("desc")
      .take(20);
    const suggested = prev.find((s) => s.completed && s.weightKg)?.weightKg;
    for (let i = 0; i < (sets ?? 3); i++) {
      await ctx.db.insert("sets", {
        userId,
        workoutId,
        workoutExerciseId: weId,
        exerciseId,
        index: i,
        kind: "working",
        targetReps: reps ?? "8-12",
        weightKg: suggested,
        completed: false,
        date: w.date,
      });
    }
    return weId;
  },
});

export const removeExercise = mutation({
  args: { workoutExerciseId: v.id("workoutExercises") },
  handler: async (ctx, { workoutExerciseId }) => {
    const userId = await requireUser(ctx);
    const we = await ctx.db.get(workoutExerciseId);
    if (!we || we.userId !== userId) throw new Error("Not found");
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_workout_exercise", (q) => q.eq("workoutExerciseId", workoutExerciseId))
      .collect();
    await Promise.all(sets.map((s) => ctx.db.delete(s._id)));
    await ctx.db.delete(workoutExerciseId);
  },
});

export const reorderExercises = mutation({
  args: { workoutId: v.id("workouts"), orderedIds: v.array(v.id("workoutExercises")) },
  handler: async (ctx, { workoutId, orderedIds }) => {
    const userId = await requireUser(ctx);
    const w = await ctx.db.get(workoutId);
    if (!w || w.userId !== userId) throw new Error("Not found");
    for (let i = 0; i < orderedIds.length; i++) await ctx.db.patch(orderedIds[i], { order: i });
  },
});

export const addSet = mutation({
  args: { workoutExerciseId: v.id("workoutExercises"), kind: v.optional(v.string()) },
  handler: async (ctx, { workoutExerciseId, kind }) => {
    const userId = await requireUser(ctx);
    const we = await ctx.db.get(workoutExerciseId);
    if (!we || we.userId !== userId) throw new Error("Not found");
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_workout_exercise", (q) => q.eq("workoutExerciseId", workoutExerciseId))
      .collect();
    const last = sets.sort((a, b) => b.index - a.index)[0];
    const w = await ctx.db.get(we.workoutId);
    return await ctx.db.insert("sets", {
      userId,
      workoutId: we.workoutId,
      workoutExerciseId,
      exerciseId: we.exerciseId,
      index: (last?.index ?? -1) + 1,
      kind: kind ?? "working",
      targetReps: last?.targetReps,
      weightKg: last?.weightKg,
      completed: false,
      date: w!.date,
    });
  },
});

export const updateSet = mutation({
  args: {
    id: v.id("sets"),
    reps: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    seconds: v.optional(v.number()),
    completed: v.optional(v.boolean()),
    rpe: v.optional(v.number()),
    kind: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const userId = await requireUser(ctx);
    const s = await ctx.db.get(id);
    if (!s || s.userId !== userId) throw new Error("Not found");
    // Guard against fat-finger entries that would poison the charts.
    if (rest.weightKg != null && (rest.weightKg < 0 || rest.weightKg > 500)) throw new Error("Weight must be between 0 and 500 kg");
    if (rest.reps != null && (rest.reps < 0 || rest.reps > 500)) throw new Error("Reps must be between 0 and 500");
    await ctx.db.patch(id, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
    const w = await ctx.db.get(s.workoutId);
    if (w && w.status === "planned") await ctx.db.patch(w._id, { status: "in_progress", startedAt: Date.now() });
    return id;
  },
});

export const deleteSet = mutation({
  args: { id: v.id("sets") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const s = await ctx.db.get(id);
    if (!s || s.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export const updateWorkout = mutation({
  args: {
    id: v.id("workouts"),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    rpe: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const userId = await requireUser(ctx);
    const w = await ctx.db.get(id);
    if (!w || w.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
  },
});

/** Finishing a workout is what writes PRs — a partial session still counts for what was done. */
export const complete = mutation({
  args: { id: v.id("workouts"), notes: v.optional(v.string()), rpe: v.optional(v.number()) },
  handler: async (ctx, { id, notes, rpe }) => {
    const userId = await requireUser(ctx);
    const w = await ctx.db.get(id);
    if (!w || w.userId !== userId) throw new Error("Not found");
    const sets = (
      await ctx.db
        .query("sets")
        .withIndex("by_workout", (q) => q.eq("workoutId", id))
        .collect()
    ).filter((s) => s.completed);

    const volume = sets.reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
    const completedAt = Date.now();
    await ctx.db.patch(id, {
      status: sets.length ? "completed" : "skipped",
      completedAt,
      durationMin: w.startedAt ? Math.max(1, Math.round((completedAt - w.startedAt) / 60000)) : undefined,
      totalVolumeKg: Math.round(volume),
      notes: notes ?? w.notes,
      rpe: rpe ?? w.rpe,
    });

    const prs: { exerciseId: Id<"exercises">; kind: string; value: number }[] = [];
    const byExercise = new Map<string, typeof sets>();
    for (const s of sets) {
      if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, []);
      byExercise.get(s.exerciseId)!.push(s);
    }
    for (const [exerciseId, exSets] of byExercise) {
      const best = exSets.reduce(
        (acc, s) => {
          const est = e1rm(s.weightKg ?? 0, s.reps ?? 0);
          return est > acc.e1rm ? { e1rm: est, weight: s.weightKg ?? 0, reps: s.reps ?? 0 } : acc;
        },
        { e1rm: 0, weight: 0, reps: 0 }
      );
      if (best.e1rm <= 0) continue;
      const existing = await ctx.db
        .query("personalRecords")
        .withIndex("by_user_exercise", (q) =>
          q.eq("userId", userId).eq("exerciseId", exerciseId as Id<"exercises">)
        )
        .collect();
      const bestPrev = existing.filter((p) => p.kind === "e1rm").sort((a, b) => b.value - a.value)[0];
      if (!bestPrev || best.e1rm > bestPrev.value) {
        await ctx.db.insert("personalRecords", {
          userId,
          exerciseId: exerciseId as Id<"exercises">,
          kind: "e1rm",
          value: best.e1rm,
          reps: best.reps,
          weightKg: best.weight,
          date: w.date,
          workoutId: id,
        });
        prs.push({ exerciseId: exerciseId as Id<"exercises">, kind: "e1rm", value: best.e1rm });
      }
    }
    return { volume: Math.round(volume), sets: sets.length, prs: prs.length };
  },
});

export const skip = mutation({
  args: { date: v.optional(v.string()), reason: v.optional(v.string()), workoutId: v.optional(v.id("workouts")) },
  handler: async (ctx, { date, reason, workoutId }) => {
    const userId = await requireUser(ctx);
    if (workoutId) {
      const w = await ctx.db.get(workoutId);
      if (!w || w.userId !== userId) throw new Error("Not found");
      await ctx.db.patch(workoutId, { status: "skipped", notes: reason });
      return workoutId;
    }
    const d = date ?? (await todayFor(ctx, userId));
    const planned = await programDayForDate(ctx, userId, d);
    return await ctx.db.insert("workouts", {
      userId,
      date: d,
      title: planned?.day.title ?? "Rest",
      focus: planned?.day.focus ?? "rest",
      status: "skipped",
      notes: reason,
      programId: planned?.program._id,
      programDayId: planned?.day._id,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("workouts") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const w = await ctx.db.get(id);
    if (!w || w.userId !== userId) throw new Error("Not found");
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_workout", (q) => q.eq("workoutId", id))
      .collect();
    await Promise.all(sets.map((s) => ctx.db.delete(s._id)));
    const wes = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workout", (q) => q.eq("workoutId", id))
      .collect();
    await Promise.all(wes.map((e) => ctx.db.delete(e._id)));
    await ctx.db.delete(id);
  },
});

export const history = query({
  args: { limit: v.optional(v.number()), from: v.optional(v.string()) },
  handler: async (ctx, { limit, from }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) =>
        from ? q.eq("userId", userId).gte("date", from) : q.eq("userId", userId)
      )
      .order("desc")
      .take(Math.min(limit ?? 60, 100));
    return await Promise.all(
      rows.map(async (w) => {
        const sets = await ctx.db
          .query("sets")
          .withIndex("by_workout", (q) => q.eq("workoutId", w._id))
          .collect();
        return {
          ...w,
          setCount: sets.filter((s) => s.completed).length,
          exerciseCount: new Set(sets.map((s) => s.exerciseId)).size,
        };
      })
    );
  },
});

export const personalRecords = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const prs = await ctx.db
      .query("personalRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
    const best = new Map<string, (typeof prs)[0]>();
    for (const p of prs) {
      const cur = best.get(p.exerciseId);
      if (!cur || p.value > cur.value) best.set(p.exerciseId, p);
    }
    return await Promise.all(
      [...best.values()]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map(async (p) => ({ ...p, exercise: await ctx.db.get(p.exerciseId) }))
    );
  },
});

/** Week strip for the header: what's planned/done for the next and last few days. */
export const weekOverview = query({
  args: { anchor: v.optional(v.string()) },
  handler: async (ctx, { anchor }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const base = anchor ?? (await todayFor(ctx, userId));
    const start = addDays(base, -weekday(base));
    const days: { date: string; status: string; title?: string }[] = [];
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", start))
      .take(30);
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const w = workouts.find((x) => x.date === d);
      if (w) days.push({ date: d, status: w.status, title: w.title });
      else {
        const planned = await programDayForDate(ctx, userId, d);
        days.push({ date: d, status: planned ? "planned" : "rest", title: planned?.day.title });
      }
    }
    return days;
  },
});
