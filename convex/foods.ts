import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser, norm } from "./lib/util";
import { Doc, Id } from "./_generated/dataModel";

export const nutrientsFor = (per100: Doc<"foods">["per100"], grams: number) => ({
  kcal: Math.round((per100.kcal * grams) / 100),
  protein: Math.round(((per100.protein * grams) / 100) * 10) / 10,
  carbs: Math.round(((per100.carbs * grams) / 100) * 10) / 10,
  fat: Math.round(((per100.fat * grams) / 100) * 10) / 10,
  fiber: Math.round(((per100.fiber * grams) / 100) * 10) / 10,
});

export const search = query({
  args: {
    q: v.optional(v.string()),
    category: v.optional(v.string()),
    vegOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { q, category, vegOnly, limit }) => {
    const userId = await getAuthUserId(ctx);
    const take = limit ?? 60;
    let rows: Doc<"foods">[] = [];
    if (q && q.trim().length > 1) {
      const term = norm(q);
      const mine = userId
        ? await ctx.db
            .query("foods")
            .withSearchIndex("search_name", (s) => s.search("searchName", term).eq("ownerUserId", userId))
            .take(20)
        : [];
      const shared = await ctx.db
        .query("foods")
        .withSearchIndex("search_name", (s) => s.search("searchName", term).eq("ownerUserId", undefined))
        .take(take);
      rows = [...mine, ...shared];
    } else if (category) {
      const shared = await ctx.db
        .query("foods")
        .withIndex("by_owner", (x) => x.eq("ownerUserId", undefined))
        .collect();
      const mine = userId
        ? await ctx.db
            .query("foods")
            .withIndex("by_owner", (x) => x.eq("ownerUserId", userId))
            .collect()
        : [];
      rows = [...mine, ...shared].filter((f) => f.category === category);
    } else {
      const mine = userId
        ? await ctx.db
            .query("foods")
            .withIndex("by_owner", (x) => x.eq("ownerUserId", userId))
            .take(30)
        : [];
      const shared = await ctx.db
        .query("foods")
        .withIndex("by_owner", (x) => x.eq("ownerUserId", undefined))
        .take(take);
      rows = [...mine, ...shared];
    }
    rows = rows.filter((f) => !f.archived);
    if (vegOnly) rows = rows.filter((f) => f.veg);
    return rows.slice(0, take);
  },
});

export const get = query({
  args: { id: v.id("foods") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
});

export const categories = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("foods")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", undefined))
      .collect();
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  },
});

/** Foods the user logs most, plus the last things they ate — the fast path. */
export const recentsAndFavorites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { recents: [], favorites: [], templates: [] };
    const entries = await ctx.db
      .query("mealEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
    const seen = new Set<string>();
    const recents = [];
    const counts = new Map<string, { count: number; entry: Doc<"mealEntries"> }>();
    for (const e of entries) {
      const key = e.foodId ?? e.name;
      const c = counts.get(key) ?? { count: 0, entry: e };
      counts.set(key, { count: c.count + 1, entry: c.entry });
      if (!seen.has(key) && recents.length < 12) {
        seen.add(key);
        recents.push(e);
      }
    }
    const favorites = [...counts.values()]
      .filter((c) => c.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .map((c) => ({ ...c.entry, timesLogged: c.count }));
    const templates = await ctx.db
      .query("mealTemplates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
    return { recents, favorites, templates };
  },
});

export const createCustom = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    veg: v.boolean(),
    state: v.string(),
    per100: v.object({
      kcal: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
      fiber: v.number(),
    }),
    servings: v.array(v.object({ label: v.string(), grams: v.number() })),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    if (args.per100.kcal < 0 || args.per100.kcal > 950) throw new Error("Calories per 100 g must be between 0 and 950");
    for (const s of args.servings) if (s.grams <= 0) throw new Error("Serving size must be greater than zero");
    return await ctx.db.insert("foods", {
      ownerUserId: userId,
      name: args.name.trim(),
      searchName: norm(`${args.name} ${args.category} custom`),
      category: args.category,
      veg: args.veg,
      state: args.state,
      per100: args.per100,
      servings: args.servings.length ? args.servings : [{ label: "g", grams: 1 }],
      defaultServing: 0,
      source: "custom",
      verified: false,
    });
  },
});

export const updateCustom = mutation({
  args: {
    id: v.id("foods"),
    name: v.optional(v.string()),
    per100: v.optional(
      v.object({ kcal: v.number(), protein: v.number(), carbs: v.number(), fat: v.number(), fiber: v.number() })
    ),
    servings: v.optional(v.array(v.object({ label: v.string(), grams: v.number() }))),
  },
  handler: async (ctx, { id, ...rest }) => {
    const userId = await requireUser(ctx);
    const f = await ctx.db.get(id);
    if (!f || f.ownerUserId !== userId) throw new Error("You can only edit foods you created");
    const patch: Record<string, unknown> = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined)
    );
    if (rest.name) patch.searchName = norm(`${rest.name} ${f.category} custom`);
    await ctx.db.patch(id, patch);
    // Existing log entries keep their snapshot on purpose — history stays as it was eaten.
  },
});

export const archiveCustom = mutation({
  args: { id: v.id("foods") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const f = await ctx.db.get(id);
    if (!f || f.ownerUserId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { archived: true });
  },
});

/* --------------------------------- recipes -------------------------------- */

export const listRecipes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return await Promise.all(
      recipes.map(async (r) => ({
        ...r,
        perServing: nutrientsFor(r.per100, r.gramsTotal / Math.max(1, r.servings)),
        ingredients: (await Promise.all(r.items.map(async (i) => ({ ...i, food: await ctx.db.get(i.foodId) })))).filter(
          (i) => i.food
        ),
      }))
    );
  },
});

async function computeRecipe(ctx: any, items: { foodId: Id<"foods">; grams: number }[]) {
  let total = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  let grams = 0;
  for (const it of items) {
    const f = await ctx.db.get(it.foodId);
    if (!f) continue;
    const n = nutrientsFor(f.per100, it.grams);
    total = {
      kcal: total.kcal + n.kcal,
      protein: total.protein + n.protein,
      carbs: total.carbs + n.carbs,
      fat: total.fat + n.fat,
      fiber: total.fiber + n.fiber,
    };
    grams += it.grams;
  }
  const per100 =
    grams > 0
      ? {
          kcal: Math.round((total.kcal / grams) * 100),
          protein: Math.round((total.protein / grams) * 1000) / 10,
          carbs: Math.round((total.carbs / grams) * 1000) / 10,
          fat: Math.round((total.fat / grams) * 1000) / 10,
          fiber: Math.round((total.fiber / grams) * 1000) / 10,
        }
      : { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  return { per100, gramsTotal: grams, total };
}

export const saveRecipe = mutation({
  args: {
    id: v.optional(v.id("recipes")),
    name: v.string(),
    servings: v.number(),
    notes: v.optional(v.string()),
    items: v.array(v.object({ foodId: v.id("foods"), grams: v.number() })),
    alsoCreateFood: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, alsoCreateFood, ...rest }) => {
    const userId = await requireUser(ctx);
    if (!rest.items.length) throw new Error("Add at least one ingredient");
    const { per100, gramsTotal } = await computeRecipe(ctx, rest.items);
    if (id) {
      const doc = await ctx.db.get(id);
      if (!doc || doc.userId !== userId) throw new Error("Not found");
      await ctx.db.patch(id, { ...rest, per100, gramsTotal });
      return id;
    }
    const recipeId = await ctx.db.insert("recipes", {
      userId,
      ...rest,
      per100,
      gramsTotal,
      createdAt: Date.now(),
    });
    if (alsoCreateFood) {
      await ctx.db.insert("foods", {
        ownerUserId: userId,
        name: rest.name,
        searchName: norm(`${rest.name} recipe`),
        category: "recipe",
        veg: true,
        state: "cooked",
        per100,
        servings: [
          { label: "serving", grams: Math.round(gramsTotal / Math.max(1, rest.servings)) },
          { label: "g", grams: 1 },
        ],
        defaultServing: 0,
        source: "recipe",
        verified: false,
      });
    }
    return recipeId;
  },
});

export const deleteRecipe = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const r = await ctx.db.get(id);
    if (!r || r.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

/* ----------------------------- meal templates ----------------------------- */

export const saveTemplate = mutation({
  args: {
    name: v.string(),
    meal: v.optional(v.string()),
    items: v.array(
      v.object({ foodId: v.id("foods"), grams: v.number(), unitLabel: v.string(), qty: v.number() })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("mealTemplates", { userId, ...args, createdAt: Date.now() });
  },
});

export const deleteTemplate = mutation({
  args: { id: v.id("mealTemplates") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const t = await ctx.db.get(id);
    if (!t || t.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export const myFoods = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return (
      await ctx.db
        .query("foods")
        .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
        .collect()
    ).filter((f) => !f.archived);
  },
});
