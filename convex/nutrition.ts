import { v } from "convex/values";
import { mutation, query } from "./lib/functions";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser, todayFor, addDays, visibleTo } from "./lib/util";
import { nutrientsFor } from "./foods";
import { targetsOn } from "./profiles";
import { Doc } from "./_generated/dataModel";

const EMPTY = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
const sum = (rows: { nutrients: typeof EMPTY }[]) =>
  rows.reduce(
    (a, r) => ({
      kcal: a.kcal + r.nutrients.kcal,
      protein: Math.round((a.protein + r.nutrients.protein) * 10) / 10,
      carbs: Math.round((a.carbs + r.nutrients.carbs) * 10) / 10,
      fat: Math.round((a.fat + r.nutrients.fat) * 10) / 10,
      fiber: Math.round((a.fiber + r.nutrients.fiber) * 10) / 10,
    }),
    { ...EMPTY }
  );

export const MEALS = ["breakfast", "lunch", "dinner", "snack"];

export const day = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const d = date ?? (await todayFor(ctx, userId));
    const entries = await ctx.db
      .query("mealEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .collect();
    const water = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .collect();
    const targets = await targetsOn(ctx, userId, d);
    // Join each entry's food category so the UI can pick a matching thumbnail.
    const categories = new Map<string, string>();
    for (const e of entries) {
      if (!e.foodId || categories.has(e.foodId)) continue;
      const f = await ctx.db.get(e.foodId);
      if (f) categories.set(e.foodId, f.category);
    }
    const withCategory = entries.map((e) => ({
      ...e,
      category: e.foodId ? categories.get(e.foodId) : e.recipeId ? "recipe" : undefined,
    }));

    const byMeal = MEALS.map((meal) => {
      const rows = withCategory.filter((e) => e.meal === meal).sort((a, b) => a.at - b.at);
      return { meal, entries: rows, totals: sum(rows) };
    });
    return {
      date: d,
      totals: sum(entries),
      byMeal,
      targets,
      waterMl: water.reduce((a, w) => a + w.ml, 0),
      entryCount: entries.length,
      estimatedCount: entries.filter((e) => e.estimated).length,
    };
  },
});

export const logEntry = mutation({
  args: {
    date: v.optional(v.string()),
    meal: v.string(),
    foodId: v.optional(v.id("foods")),
    recipeId: v.optional(v.id("recipes")),
    qty: v.number(),
    unitLabel: v.optional(v.string()),
    // Free-text quick add when the user does not want to pick a food.
    manual: v.optional(
      v.object({
        name: v.string(),
        kcal: v.number(),
        protein: v.number(),
        carbs: v.number(),
        fat: v.number(),
        fiber: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const d = args.date ?? (await todayFor(ctx, userId));
    if (args.qty <= 0 || args.qty > 100) throw new Error("Quantity looks wrong — enter between 0 and 100");

    if (args.manual) {
      return await ctx.db.insert("mealEntries", {
        userId,
        date: d,
        meal: args.meal,
        name: args.manual.name,
        qty: args.qty,
        unitLabel: "serving",
        grams: 0,
        nutrients: {
          kcal: Math.round(args.manual.kcal * args.qty),
          protein: Math.round(args.manual.protein * args.qty * 10) / 10,
          carbs: Math.round(args.manual.carbs * args.qty * 10) / 10,
          fat: Math.round(args.manual.fat * args.qty * 10) / 10,
          fiber: Math.round(args.manual.fiber * args.qty * 10) / 10,
        },
        estimated: true,
        at: Date.now(),
      });
    }

    if (args.recipeId) {
      const r = await ctx.db.get(args.recipeId);
      if (!r || r.userId !== userId) throw new Error("Recipe not found");
      const gramsPerServing = r.gramsTotal / Math.max(1, r.servings);
      const grams = gramsPerServing * args.qty;
      return await ctx.db.insert("mealEntries", {
        userId,
        date: d,
        meal: args.meal,
        recipeId: r._id,
        name: r.name,
        qty: args.qty,
        unitLabel: "serving",
        grams: Math.round(grams),
        nutrients: nutrientsFor(r.per100, grams),
        estimated: true,
        at: Date.now(),
      });
    }

    if (!args.foodId) throw new Error("Pick a food");
    const food = await ctx.db.get(args.foodId);
    if (!food) throw new Error("Food not found");
    if (food.ownerUserId && food.ownerUserId !== userId) throw new Error("Not your food");
    const serving =
      food.servings.find((s) => s.label === args.unitLabel) ?? food.servings[food.defaultServing] ?? food.servings[0];
    const grams = serving.grams * args.qty;
    if (grams > 5000) throw new Error("That is over 5 kg of food — check the quantity");
    return await ctx.db.insert("mealEntries", {
      userId,
      date: d,
      meal: args.meal,
      foodId: food._id,
      name: food.name,
      qty: args.qty,
      unitLabel: serving.label,
      grams: Math.round(grams),
      nutrients: nutrientsFor(food.per100, grams),
      estimated: !food.verified,
      at: Date.now(),
    });
  },
});

export const logTemplate = mutation({
  args: { templateId: v.id("mealTemplates"), date: v.optional(v.string()), meal: v.optional(v.string()) },
  handler: async (ctx, { templateId, date, meal }) => {
    const userId = await requireUser(ctx);
    const t = await ctx.db.get(templateId);
    if (!t || t.userId !== userId) throw new Error("Not found");
    const d = date ?? (await todayFor(ctx, userId));
    let n = 0;
    for (const item of t.items) {
      const food = visibleTo(await ctx.db.get(item.foodId), userId);
      if (!food) continue;
      await ctx.db.insert("mealEntries", {
        userId,
        date: d,
        meal: meal ?? t.meal ?? "snack",
        foodId: food._id,
        name: food.name,
        qty: item.qty,
        unitLabel: item.unitLabel,
        grams: Math.round(item.grams),
        nutrients: nutrientsFor(food.per100, item.grams),
        estimated: !food.verified,
        at: Date.now(),
      });
      n++;
    }
    return n;
  },
});

/** Copy a whole meal (or day) forward — the single biggest tap-saver in daily use. */
export const repeatMeal = mutation({
  args: { fromDate: v.string(), meal: v.optional(v.string()), toDate: v.optional(v.string()) },
  handler: async (ctx, { fromDate, meal, toDate }) => {
    const userId = await requireUser(ctx);
    const d = toDate ?? (await todayFor(ctx, userId));
    const src = (
      await ctx.db
        .query("mealEntries")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", fromDate))
        .collect()
    ).filter((e) => !meal || e.meal === meal);
    for (const e of src) {
      const { _id, _creationTime, ...rest } = e;
      await ctx.db.insert("mealEntries", { ...rest, date: d, at: Date.now() });
    }
    return src.length;
  },
});

export const updateEntry = mutation({
  args: { id: v.id("mealEntries"), qty: v.optional(v.number()), meal: v.optional(v.string()) },
  handler: async (ctx, { id, qty, meal }) => {
    const userId = await requireUser(ctx);
    const e = await ctx.db.get(id);
    if (!e || e.userId !== userId) throw new Error("Not found");
    const patch: Record<string, unknown> = {};
    if (meal) patch.meal = meal;
    if (qty != null) {
      if (qty <= 0 || qty > 100) throw new Error("Quantity looks wrong");
      const factor = qty / e.qty;
      patch.qty = qty;
      patch.grams = Math.round(e.grams * factor);
      patch.nutrients = {
        kcal: Math.round(e.nutrients.kcal * factor),
        protein: Math.round(e.nutrients.protein * factor * 10) / 10,
        carbs: Math.round(e.nutrients.carbs * factor * 10) / 10,
        fat: Math.round(e.nutrients.fat * factor * 10) / 10,
        fiber: Math.round(e.nutrients.fiber * factor * 10) / 10,
      };
    }
    await ctx.db.patch(id, patch);
  },
});

export const deleteEntry = mutation({
  args: { id: v.id("mealEntries") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const e = await ctx.db.get(id);
    if (!e || e.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
    return e; // returned so the UI can offer an undo
  },
});

export const restoreEntry = mutation({
  args: {
    date: v.string(),
    meal: v.string(),
    name: v.string(),
    qty: v.number(),
    unitLabel: v.string(),
    grams: v.number(),
    nutrients: v.object({
      kcal: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
      fiber: v.number(),
    }),
    foodId: v.optional(v.id("foods")),
    estimated: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    if (args.foodId && !visibleTo(await ctx.db.get(args.foodId), userId)) throw new Error("Food not found");
    return await ctx.db.insert("mealEntries", { userId, ...args, at: Date.now() });
  },
});

/** Daily rollups for the nutrition analytics screen. */
export const range = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const n = Math.min(Math.max(days ?? 30, 1), 365);
    const from = addDays((await todayFor(ctx, userId)), -n + 1);
    const entries = await ctx.db
      .query("mealEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
      .collect();
    const target = await targetsOn(ctx, userId, (await todayFor(ctx, userId)));
    const byDate = new Map<string, Doc<"mealEntries">[]>();
    for (const e of entries) {
      if (!byDate.has(e.date)) byDate.set(e.date, []);
      byDate.get(e.date)!.push(e);
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const d = addDays(from, i);
      const rows = byDate.get(d) ?? [];
      out.push({ date: d, ...sum(rows), logged: rows.length > 0, target: target?.kcal ?? 0 });
    }
    return out;
  },
});

/* ---------------------------------- water --------------------------------- */

export const logWater = mutation({
  args: { ml: v.number(), date: v.optional(v.string()) },
  handler: async (ctx, { ml, date }) => {
    const userId = await requireUser(ctx);
    if (Math.abs(ml) > 3000) throw new Error("That is a lot of water in one go");
    return await ctx.db.insert("waterLogs", { userId, date: date ?? (await todayFor(ctx, userId)), ml, at: Date.now() });
  },
});

export const undoWater = mutation({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const userId = await requireUser(ctx);
    const d = date ?? (await todayFor(ctx, userId));
    const rows = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .collect();
    const last = rows.sort((a, b) => b.at - a.at)[0];
    if (last) await ctx.db.delete(last._id);
  },
});
