import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser } from "./lib/util";
import { Doc, Id } from "./_generated/dataModel";

/* ------------------------------- generator -------------------------------- */

type Slot = { muscles: string[]; pattern?: string[]; compound?: boolean; label: string };

const SLOTS: Record<string, Slot[]> = {
  push: [
    { muscles: ["chest"], pattern: ["push"], compound: true, label: "Chest press" },
    { muscles: ["shoulders"], pattern: ["push"], compound: true, label: "Overhead press" },
    { muscles: ["chest"], pattern: ["push", "isolation"], label: "Chest accessory" },
    { muscles: ["shoulders"], pattern: ["isolation"], label: "Delt isolation" },
    { muscles: ["triceps"], pattern: ["isolation", "push"], label: "Triceps" },
  ],
  pull: [
    { muscles: ["back"], pattern: ["pull"], compound: true, label: "Vertical pull" },
    { muscles: ["back"], pattern: ["pull"], compound: true, label: "Horizontal row" },
    { muscles: ["back"], pattern: ["pull", "isolation"], label: "Back accessory" },
    { muscles: ["shoulders", "upper back"], pattern: ["pull", "isolation"], label: "Rear delts" },
    { muscles: ["biceps"], pattern: ["isolation"], label: "Biceps" },
  ],
  legs: [
    { muscles: ["quads"], pattern: ["squat"], compound: true, label: "Squat pattern" },
    { muscles: ["hamstrings", "glutes"], pattern: ["hinge"], compound: true, label: "Hinge pattern" },
    { muscles: ["quads"], pattern: ["squat", "isolation"], label: "Quad accessory" },
    { muscles: ["glutes"], pattern: ["hinge", "isolation"], label: "Glutes" },
    { muscles: ["calves"], pattern: ["isolation"], label: "Calves" },
    { muscles: ["core"], pattern: ["core"], label: "Core" },
  ],
  upper: [
    { muscles: ["chest"], pattern: ["push"], compound: true, label: "Chest press" },
    { muscles: ["back"], pattern: ["pull"], compound: true, label: "Row or pull-up" },
    { muscles: ["shoulders"], pattern: ["push"], compound: true, label: "Overhead press" },
    { muscles: ["back"], pattern: ["pull"], label: "Back accessory" },
    { muscles: ["biceps"], pattern: ["isolation"], label: "Biceps" },
    { muscles: ["triceps"], pattern: ["isolation"], label: "Triceps" },
  ],
  lower: [
    { muscles: ["quads"], pattern: ["squat"], compound: true, label: "Squat pattern" },
    { muscles: ["hamstrings", "glutes"], pattern: ["hinge"], compound: true, label: "Hinge pattern" },
    { muscles: ["quads", "glutes"], pattern: ["squat"], label: "Single leg" },
    { muscles: ["hamstrings"], pattern: ["isolation"], label: "Hamstrings" },
    { muscles: ["calves"], pattern: ["isolation"], label: "Calves" },
    { muscles: ["core"], pattern: ["core"], label: "Core" },
  ],
  full: [
    { muscles: ["quads", "glutes"], pattern: ["squat"], compound: true, label: "Squat pattern" },
    { muscles: ["chest"], pattern: ["push"], compound: true, label: "Push" },
    { muscles: ["back"], pattern: ["pull"], compound: true, label: "Pull" },
    { muscles: ["hamstrings", "glutes"], pattern: ["hinge"], compound: true, label: "Hinge" },
    { muscles: ["shoulders"], pattern: ["push", "isolation"], label: "Shoulders" },
    { muscles: ["core"], pattern: ["core"], label: "Core" },
  ],
  conditioning: [
    { muscles: ["cardio"], pattern: ["conditioning"], label: "Steady cardio" },
    { muscles: ["core"], pattern: ["core"], label: "Core" },
    { muscles: ["mobility"], pattern: ["core", "conditioning"], label: "Mobility" },
  ],
};

const SPLITS: Record<number, { title: string; focus: string; key: string }[]> = {
  2: [
    { title: "Full Body A", focus: "full", key: "full" },
    { title: "Full Body B", focus: "full", key: "full" },
  ],
  3: [
    { title: "Push", focus: "chest, shoulders, triceps", key: "push" },
    { title: "Pull", focus: "back, biceps", key: "pull" },
    { title: "Legs & Core", focus: "quads, glutes, core", key: "legs" },
  ],
  4: [
    { title: "Upper A", focus: "chest, back, arms", key: "upper" },
    { title: "Lower A", focus: "quads, glutes, core", key: "lower" },
    { title: "Upper B", focus: "shoulders, back, arms", key: "upper" },
    { title: "Lower B", focus: "hamstrings, glutes, calves", key: "lower" },
  ],
  5: [
    { title: "Push", focus: "chest, shoulders, triceps", key: "push" },
    { title: "Pull", focus: "back, biceps", key: "pull" },
    { title: "Legs", focus: "quads, glutes, hamstrings", key: "legs" },
    { title: "Upper", focus: "chest, back, arms", key: "upper" },
    { title: "Conditioning & Core", focus: "cardio, core", key: "conditioning" },
  ],
  6: [
    { title: "Push A", focus: "chest, shoulders, triceps", key: "push" },
    { title: "Pull A", focus: "back, biceps", key: "pull" },
    { title: "Legs A", focus: "quads, glutes", key: "legs" },
    { title: "Push B", focus: "shoulders, chest, triceps", key: "push" },
    { title: "Pull B", focus: "back, rear delts, biceps", key: "pull" },
    { title: "Legs B", focus: "hamstrings, glutes, calves", key: "legs" },
  ],
};

function scheme(goal: string, compound: boolean) {
  switch (goal) {
    case "strength":
      return compound ? { sets: 5, reps: "3-5", rest: 180 } : { sets: 3, reps: "6-8", rest: 120 };
    case "muscle_gain":
      return compound ? { sets: 4, reps: "6-10", rest: 120 } : { sets: 3, reps: "10-12", rest: 75 };
    case "fat_loss":
      return compound ? { sets: 3, reps: "8-12", rest: 75 } : { sets: 3, reps: "12-15", rest: 45 };
    case "endurance":
      return { sets: 3, reps: "15-20", rest: 45 };
    default:
      return compound ? { sets: 3, reps: "8-12", rest: 90 } : { sets: 3, reps: "10-15", rest: 60 };
  }
}

const EQUIPMENT_ALWAYS = ["bodyweight"];

/**
 * Same movement pattern + same kit + overlapping primary muscle means it is effectively the
 * same exercise twice (pull-ups and chin-ups in one session, say). Used to spread a day out.
 */
function isNearDuplicate(a: Doc<"exercises">, b: Doc<"exercises">) {
  if (a.pattern !== b.pattern) return false;
  const sameKit = a.equipment.length === b.equipment.length && a.equipment.every((x) => b.equipment.includes(x));
  if (!sameKit) return false;
  return a.primaryMuscles.some((m) => b.primaryMuscles.includes(m));
}

function pickExercise(
  pool: Doc<"exercises">[],
  slot: Slot,
  equipment: string[],
  used: Set<string>,
  experience: string,
  /** What today already contains, so a day doesn't end up with pull-ups and chin-ups. */
  dayPicks: Doc<"exercises">[] = []
) {
  const allowed = new Set([...equipment, ...EQUIPMENT_ALWAYS]);
  const rank = (e: Doc<"exercises">) => {
    let s = 0;
    if (e.primaryMuscles.some((m) => slot.muscles.includes(m))) s += 10;
    else if (e.secondaryMuscles.some((m) => slot.muscles.includes(m))) s += 3;
    if (slot.pattern && slot.pattern.includes(e.pattern)) s += 5;
    if (slot.compound && e.pattern !== "isolation") s += 4;
    if (!slot.compound && e.pattern === "isolation") s += 2;
    if (experience === "beginner" && e.difficulty === "beginner") s += 3;
    if (experience === "beginner" && e.difficulty === "advanced") s -= 6;
    if (experience === "advanced" && e.difficulty === "advanced") s += 2;
    if (used.has(e._id)) s -= 25;
    if (dayPicks.some((p) => isNearDuplicate(p, e))) s -= 30;
    return s;
  };
  const candidates = pool
    .filter((e) => e.equipment.length === 0 || e.equipment.some((eq) => allowed.has(eq)))
    .filter((e) => rank(e) > 5)
    .sort((a, b) => rank(b) - rank(a));
  return candidates[0] ?? null;
}

export const generate = mutation({
  args: { activate: v.optional(v.boolean()), name: v.optional(v.string()) },
  handler: async (ctx, { activate, name }) => {
    const userId = await requireUser(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const days = Math.max(2, Math.min(6, profile?.daysPerWeek ?? 4));
    const goal = profile?.goal ?? "general";
    const experience = profile?.experience ?? "beginner";
    const equipment = profile?.equipment?.length ? profile.equipment : ["bodyweight", "dumbbell"];
    const sessionMinutes = profile?.sessionMinutes ?? 45;

    const pool = [
      ...(await ctx.db
        .query("exercises")
        .withIndex("by_owner", (q) => q.eq("ownerUserId", undefined))
        .collect()),
      ...(await ctx.db
        .query("exercises")
        .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
        .collect()),
    ].filter((e) => !e.archived);

    const split = SPLITS[days];
    const maxExercises = Math.max(3, Math.min(7, Math.round(sessionMinutes / 9)));

    if (activate) {
      const actives = await ctx.db
        .query("programs")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      await Promise.all(actives.filter((p) => p.isActive).map((p) => ctx.db.patch(p._id, { isActive: false })));
    }

    const programId = await ctx.db.insert("programs", {
      userId,
      name: name ?? `${days}-Day ${goal === "fat_loss" ? "Lean" : goal === "muscle_gain" ? "Hypertrophy" : "Balanced"} Plan`,
      description: `Built for ${goal.replace("_", " ")} · ${experience} · ${sessionMinutes} min sessions`,
      goal,
      daysPerWeek: days,
      isActive: activate ?? true,
      source: "generated",
      createdAt: Date.now(),
    });

    // Spread the split over the days the user said they can train.
    const DEFAULT_DAYS: Record<number, number[]> = {
      2: [1, 4],
      3: [1, 3, 5],
      4: [1, 2, 4, 5],
      5: [1, 2, 3, 5, 6],
      6: [1, 2, 3, 4, 5, 6],
    };
    const preferred =
      profile?.preferredDays && profile.preferredDays.length >= days
        ? [...profile.preferredDays].sort((a, b) => a - b)
        : DEFAULT_DAYS[days];
    const used = new Set<string>();
    for (let i = 0; i < split.length; i++) {
      const day = split[i];
      const slots = SLOTS[day.key].slice(0, maxExercises);
      const items = [];
      const dayPicks: Doc<"exercises">[] = [];
      for (const slot of slots) {
        const ex = pickExercise(pool, slot, equipment, used, experience, dayPicks);
        if (!ex) continue;
        used.add(ex._id);
        dayPicks.push(ex);
        const s = scheme(goal, !!slot.compound);
        items.push({
          exerciseId: ex._id,
          sets: ex.category === "cardio" ? 1 : s.sets,
          reps: ex.category === "cardio" ? "20 min" : ex.category === "core" ? "30-45s" : s.reps,
          restSec: s.rest,
          notes: slot.label,
        });
      }
      await ctx.db.insert("programDays", {
        userId,
        programId,
        order: i,
        weekday: preferred[i % preferred.length],
        title: day.title,
        focus: day.focus,
        estMinutes: sessionMinutes,
        items,
      });
    }
    return programId;
  },
});

/* ---------------------------------- CRUD ---------------------------------- */

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const programs = await ctx.db
      .query("programs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return await Promise.all(
      programs.map(async (p) => {
        const days = await ctx.db
          .query("programDays")
          .withIndex("by_program", (q) => q.eq("programId", p._id))
          .collect();
        return { ...p, dayCount: days.length, exerciseCount: days.reduce((a, d) => a + d.items.length, 0) };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("programs") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const program = await ctx.db.get(id);
    if (!program || program.userId !== userId) return null;
    const days = (
      await ctx.db
        .query("programDays")
        .withIndex("by_program", (q) => q.eq("programId", id))
        .collect()
    ).sort((a, b) => a.order - b.order);
    const exIds = [...new Set(days.flatMap((d) => d.items.map((i) => i.exerciseId)))];
    const exercises = (await Promise.all(exIds.map((i) => ctx.db.get(i)))).filter(Boolean);
    return { program, days, exercises };
  },
});

export const activeProgram = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const program = (
      await ctx.db
        .query("programs")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).find((p) => p.isActive);
    if (!program) return null;
    const days = (
      await ctx.db
        .query("programDays")
        .withIndex("by_program", (q) => q.eq("programId", program._id))
        .collect()
    ).sort((a, b) => a.order - b.order);
    return { program, days };
  },
});

/** Everything the plan-day detail screen needs in one round trip. */
export const dayDetail = query({
  args: { id: v.id("programDays") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const day = await ctx.db.get(id);
    if (!day || day.userId !== userId) return null;
    const program = await ctx.db.get(day.programId);
    if (!program) return null;

    const items = await Promise.all(
      day.items.map(async (i) => {
        const exercise = await ctx.db.get(i.exerciseId);
        const prev = await ctx.db
          .query("sets")
          .withIndex("by_user_exercise", (q) => q.eq("userId", userId).eq("exerciseId", i.exerciseId))
          .order("desc")
          .take(20);
        const done = prev.filter((s) => s.completed);
        const last = done[0];
        return {
          ...i,
          exercise,
          lastDone: last
            ? `${last.weightKg ? `${last.weightKg} kg × ` : ""}${last.reps ?? 0} reps on ${last.date}`
            : null,
        };
      })
    );

    // Rough session length: working time plus prescribed rest.
    const totalMinutes = Math.max(
      10,
      Math.round(day.items.reduce((a, i) => a + i.sets * (i.restSec + 40), 0) / 60)
    );

    const levels = items.map((i) => i.exercise?.difficulty).filter(Boolean) as string[];
    const level = levels.includes("advanced")
      ? "Advanced"
      : levels.includes("intermediate")
        ? "Intermediate"
        : "Starter";
    const gearSet = new Set(items.flatMap((i) => i.exercise?.equipment ?? []));
    gearSet.delete("bodyweight");
    const gear =
      gearSet.size === 0 ? "Bodyweight" : gearSet.size <= 2 ? [...gearSet].join(" + ") : "Full gym";

    // Short, readable target label — "Chest +2" rather than a truncated CSV.
    const muscles = [...new Set(items.flatMap((i) => i.exercise?.primaryMuscles ?? []))];
    const target =
      muscles.length === 0
        ? day.focus
        : muscles.length <= 2
          ? muscles.join(" & ")
          : `${muscles[0]} +${muscles.length - 1}`;

    const past = (
      await ctx.db
        .query("workouts")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))
        .order("desc")
        .take(60)
    )
      .filter((w) => w.programDayId === id && w.status === "completed")
      .slice(0, 3);

    const history = await Promise.all(
      past.map(async (w) => {
        const sets = (
          await ctx.db
            .query("sets")
            .withIndex("by_workout", (q) => q.eq("workoutId", w._id))
            .collect()
        ).filter((s) => s.completed);
        const byExercise = new Map<string, string[]>();
        for (const s of sets.sort((a, b) => a.index - b.index)) {
          const ex = await ctx.db.get(s.exerciseId);
          const name = ex?.name ?? "Exercise";
          if (!byExercise.has(name)) byExercise.set(name, []);
          byExercise.get(name)!.push(`${s.weightKg ?? 0}×${s.reps ?? 0}`);
        }
        return {
          _id: w._id,
          date: w.date,
          durationMin: w.durationMin,
          totalVolumeKg: w.totalVolumeKg,
          setCount: sets.length,
          lines: [...byExercise.entries()].map(([n, v]) => `${n} — ${v.join("  ")}`),
        };
      })
    );

    return {
      day,
      program,
      items,
      totalMinutes,
      level,
      gear,
      target,
      history,
      title: day.title,
      focus: day.focus,
      weekday: day.weekday,
    };
  },
});

export const setActive = mutation({
  args: { id: v.id("programs") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db
      .query("programs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const p of all) {
      if (p.isActive !== (p._id === id)) await ctx.db.patch(p._id, { isActive: p._id === id });
    }
  },
});

export const createProgram = mutation({
  args: { name: v.string(), description: v.optional(v.string()), daysPerWeek: v.number(), goal: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("programs", {
      userId,
      ...args,
      isActive: false,
      source: "custom",
      createdAt: Date.now(),
    });
  },
});

export const updateProgram = mutation({
  args: {
    id: v.id("programs"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    daysPerWeek: v.optional(v.number()),
    goal: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const userId = await requireUser(ctx);
    const p = await ctx.db.get(id);
    if (!p || p.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
  },
});

export const duplicateProgram = mutation({
  args: { id: v.id("programs") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const p = await ctx.db.get(id);
    if (!p || p.userId !== userId) throw new Error("Not found");
    const copyId = await ctx.db.insert("programs", {
      userId,
      name: `${p.name} (copy)`,
      description: p.description,
      goal: p.goal,
      daysPerWeek: p.daysPerWeek,
      isActive: false,
      source: "custom",
      createdAt: Date.now(),
    });
    const days = await ctx.db
      .query("programDays")
      .withIndex("by_program", (q) => q.eq("programId", id))
      .collect();
    for (const d of days) {
      await ctx.db.insert("programDays", {
        userId,
        programId: copyId,
        order: d.order,
        weekday: d.weekday,
        title: d.title,
        focus: d.focus,
        estMinutes: d.estMinutes,
        items: d.items,
      });
    }
    return copyId;
  },
});

export const deleteProgram = mutation({
  args: { id: v.id("programs") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const p = await ctx.db.get(id);
    if (!p || p.userId !== userId) throw new Error("Not found");
    const days = await ctx.db
      .query("programDays")
      .withIndex("by_program", (q) => q.eq("programId", id))
      .collect();
    await Promise.all(days.map((d) => ctx.db.delete(d._id)));
    await ctx.db.delete(id);
  },
});

const itemValidator = v.object({
  exerciseId: v.id("exercises"),
  sets: v.number(),
  reps: v.string(),
  targetWeightKg: v.optional(v.number()),
  restSec: v.number(),
  tempo: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export const upsertDay = mutation({
  args: {
    id: v.optional(v.id("programDays")),
    programId: v.id("programs"),
    order: v.number(),
    weekday: v.optional(v.number()),
    title: v.string(),
    focus: v.string(),
    estMinutes: v.number(),
    items: v.array(itemValidator),
  },
  handler: async (ctx, { id, ...rest }) => {
    const userId = await requireUser(ctx);
    const program = await ctx.db.get(rest.programId);
    if (!program || program.userId !== userId) throw new Error("Not found");
    if (id) {
      const day = await ctx.db.get(id);
      if (!day || day.userId !== userId) throw new Error("Not found");
      await ctx.db.patch(id, rest);
      return id;
    }
    return await ctx.db.insert("programDays", { userId, ...rest });
  },
});

export const deleteDay = mutation({
  args: { id: v.id("programDays") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const day = await ctx.db.get(id);
    if (!day || day.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export async function programDayForDate(
  ctx: any,
  userId: Id<"users">,
  date: string
): Promise<{ program: Doc<"programs">; day: Doc<"programDays"> } | null> {
  const programs = await ctx.db
    .query("programs")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  const program = programs.find((p: Doc<"programs">) => p.isActive);
  if (!program) return null;
  const days = (
    await ctx.db
      .query("programDays")
      .withIndex("by_program", (q: any) => q.eq("programId", program._id))
      .collect()
  ).sort((a: Doc<"programDays">, b: Doc<"programDays">) => a.order - b.order);
  if (!days.length) return null;
  const wd = new Date(date + "T00:00:00").getDay();
  const byWeekday = days.find((d: Doc<"programDays">) => d.weekday === wd);
  if (byWeekday) return { program, day: byWeekday };
  return null;
}
