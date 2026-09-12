/**
 * Self-check for the numbers the app claims. Run: npx tsx scripts/check-fitness-math.ts
 * (or `npm run check`). No framework — asserts only.
 */
import assert from "node:assert/strict";
import { bmr, computeTargets, e1rm, trendSeries, linearSlopePerWeek, readiness, bmi } from "../convex/lib/fitness";
import { SEED_FOODS } from "../convex/data/foods";
import { SEED_EXERCISES } from "../convex/data/exercises";

/* Mifflin-St Jeor, published worked example */
assert.equal(Math.round(bmr({ weightKg: 80, heightCm: 180, age: 30, sex: "male" })), 1780);
assert.equal(Math.round(bmr({ weightKg: 60, heightCm: 165, age: 30, sex: "female" })), 1320);

/* A cut is a deficit, a bulk is a surplus, and both stay in a sane range */
const cut = computeTargets({ weightKg: 90, heightCm: 178, age: 30, sex: "male", activityLevel: "moderate", goal: "fat_loss", targetWeightKg: 80 });
const bulk = computeTargets({ weightKg: 65, heightCm: 178, age: 25, sex: "male", activityLevel: "moderate", goal: "muscle_gain" });
assert.ok(cut.kcal < cut.basis.tdee, "fat loss must be under maintenance");
assert.ok(cut.basis.tdee - cut.kcal <= 600, "deficit capped at 600 kcal");
assert.ok(bulk.kcal > bulk.basis.tdee, "muscle gain must be over maintenance");
assert.ok(cut.protein >= 1.6 * 80 && cut.protein <= 2.2 * 90, "protein anchored between target and current weight");
assert.ok(cut.fiber >= 25 && cut.fiber <= 45);
/* Macros must actually add up to the calorie target (±3%) */
for (const t of [cut, bulk]) {
  const fromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9;
  assert.ok(Math.abs(fromMacros - t.kcal) / t.kcal < 0.03, `macros should reconstruct kcal, got ${fromMacros} vs ${t.kcal}`);
}

/* Epley */
assert.equal(e1rm(100, 1), 100);
assert.equal(e1rm(100, 10), 133.3);
assert.equal(e1rm(0, 5), 0);

/* Trend weight smooths noise but tracks the real direction */
const noisy = [82, 81.2, 82.4, 81.5, 81.8, 80.9, 81.1, 80.4].map((value, i) => ({
  date: `2026-01-${String(i + 1).padStart(2, "0")}`,
  value,
}));
const trend = trendSeries(noisy);
assert.ok(trend[trend.length - 1].trend < trend[0].trend, "downward trend detected");
const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
assert.ok(spread(trend.map((t) => t.trend)) < spread(noisy.map((n) => n.value)), "trend is smoother than raw");
assert.ok(linearSlopePerWeek(trend.map((t) => ({ date: t.date, value: t.trend }))) < 0);

/* Readiness responds to the inputs and never leaves 0-100 */
const rested = readiness({ sleepMinutes: 500, sleepTarget: 480, energy: 5, soreness: 1, stress: 1, last7Volume: 1000, prev7Volume: 1000, daysSinceRest: 1 });
const wrecked = readiness({ sleepMinutes: 300, sleepTarget: 480, energy: 1, soreness: 5, stress: 5, last7Volume: 3000, prev7Volume: 1000, daysSinceRest: 7 });
assert.ok(rested.score > wrecked.score);
assert.ok(rested.score <= 100 && wrecked.score >= 5);
assert.ok(wrecked.reasons.length > 0, "a low score must explain itself");
/* No data at all still returns something usable */
const unknown = readiness({ sleepTarget: 480, last7Volume: 0, prev7Volume: 0, daysSinceRest: 0 });
assert.ok(unknown.score > 0 && unknown.advice.length > 0);

assert.equal(bmi(80, 180), 24.7);

/* Seed data integrity — a bad row here silently corrupts every calorie total */
assert.ok(SEED_FOODS.length > 250, "food library should be substantial");
const names = new Set<string>();
for (const f of SEED_FOODS) {
  assert.ok(!names.has(f.name), `duplicate food: ${f.name}`);
  names.add(f.name);
  assert.ok(f.servings.length > 0 && f.servings.every((s) => s.grams > 0), `${f.name}: bad serving`);
  assert.ok(f.per100.kcal >= 0 && f.per100.kcal <= 950, `${f.name}: implausible kcal`);
  // Alcohol carries ~7 kcal/g that no macro column accounts for.
  if (f.tags.includes("alcohol")) continue;
  const fromMacros = f.per100.protein * 4 + f.per100.carbs * 4 + f.per100.fat * 9;
  // Fiber and rounding make this loose; anything wildly off is a typo.
  assert.ok(
    f.per100.kcal === 0 || Math.abs(fromMacros - f.per100.kcal) <= Math.max(60, f.per100.kcal * 0.35),
    `${f.name}: macros (${Math.round(fromMacros)}) do not match kcal (${f.per100.kcal})`
  );
}

assert.ok(SEED_EXERCISES.length > 100);
const exNames = new Set<string>();
for (const e of SEED_EXERCISES) {
  assert.ok(!exNames.has(e.name), `duplicate exercise: ${e.name}`);
  exNames.add(e.name);
  assert.ok(e.primaryMuscles.length > 0, `${e.name}: no primary muscle`);
  assert.ok(e.instructions.length >= 2, `${e.name}: needs cues`);
}

console.log(`✓ fitness math, ${SEED_FOODS.length} foods and ${SEED_EXERCISES.length} exercises all check out`);
