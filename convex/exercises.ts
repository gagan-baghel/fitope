import { v } from "convex/values";
import { mutation, query } from "./lib/functions";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser, norm, visibleTo } from "./lib/util";

/** Library rows (no owner) plus the caller's own custom exercises. */
export const list = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    muscle: v.optional(v.string()),
    equipment: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { search, category, muscle, equipment, limit }) => {
    const userId = await getAuthUserId(ctx);
    let rows;
    if (search && search.trim().length > 1) {
      const q = norm(search);
      const shared = await ctx.db
        .query("exercises")
        .withSearchIndex("search_name", (s) => s.search("searchName", q).eq("ownerUserId", undefined))
        .take(40);
      const mine = userId
        ? await ctx.db
            .query("exercises")
            .withSearchIndex("search_name", (s) => s.search("searchName", q).eq("ownerUserId", userId))
            .take(20)
        : [];
      rows = [...mine, ...shared];
    } else {
      const shared = await ctx.db
        .query("exercises")
        .withIndex("by_owner", (q) => q.eq("ownerUserId", undefined))
        .collect();
      const mine = userId
        ? await ctx.db
            .query("exercises")
            .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
            .collect()
        : [];
      rows = [...mine, ...shared];
    }
    rows = rows.filter((r) => !r.archived);
    if (category) rows = rows.filter((r) => r.category === category);
    if (muscle) rows = rows.filter((r) => [...r.primaryMuscles, ...r.secondaryMuscles].includes(muscle));
    if (equipment) rows = rows.filter((r) => r.equipment.includes(equipment));
    return rows.slice(0, Math.min(limit ?? 300, 300));
  },
});

export const get = query({
  args: { id: v.id("exercises") },
  handler: async (ctx, { id }) => visibleTo(await ctx.db.get(id), await getAuthUserId(ctx)),
});

export const byIds = query({
  args: { ids: v.array(v.id("exercises")) },
  handler: async (ctx, { ids }) => {
    const userId = await getAuthUserId(ctx);
    const out = await Promise.all(ids.map(async (id) => visibleTo(await ctx.db.get(id), userId)));
    return out.filter(Boolean);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    primaryMuscles: v.array(v.string()),
    secondaryMuscles: v.optional(v.array(v.string())),
    equipment: v.array(v.string()),
    category: v.string(),
    pattern: v.string(),
    difficulty: v.string(),
    instructions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("exercises", {
      ownerUserId: userId,
      name: args.name.trim(),
      searchName: norm(`${args.name} ${args.primaryMuscles.join(" ")} ${args.equipment.join(" ")}`),
      primaryMuscles: args.primaryMuscles,
      secondaryMuscles: args.secondaryMuscles ?? [],
      equipment: args.equipment,
      category: args.category,
      pattern: args.pattern,
      difficulty: args.difficulty,
      instructions: args.instructions ?? [],
    });
  },
});

/** Custom exercises are archived rather than deleted so old workouts still read correctly. */
export const archive = mutation({
  args: { id: v.id("exercises") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.ownerUserId !== userId) throw new Error("You can only archive your own exercises");
    await ctx.db.patch(id, { archived: true });
  },
});

/** Everything logged for one exercise, newest first — powers "last time you did this". */
export const history = query({
  args: { exerciseId: v.id("exercises"), limit: v.optional(v.number()) },
  handler: async (ctx, { exerciseId, limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_user_exercise", (q) => q.eq("userId", userId).eq("exerciseId", exerciseId))
      .order("desc")
      .take(200);
    const byDate = new Map<string, { date: string; sets: typeof sets }>();
    for (const s of sets) {
      if (!s.completed) continue;
      if (!byDate.has(s.date)) byDate.set(s.date, { date: s.date, sets: [] });
      byDate.get(s.date)!.sets.push(s);
    }
    return [...byDate.values()]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, Math.min(limit ?? 10, 50))
      .map((d) => ({
        date: d.date,
        sets: d.sets.sort((a, b) => a.index - b.index),
        topWeight: Math.max(...d.sets.map((s) => s.weightKg ?? 0)),
        volume: d.sets.reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0),
      }));
  },
});
