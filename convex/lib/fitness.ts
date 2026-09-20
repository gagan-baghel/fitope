/**
 * Deterministic fitness / nutrition math. Every number the app "estimates" comes from
 * here so the UI can always explain where it came from.
 */

export const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export type MacroTargets = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterMl: number;
  sleepMinutes: number;
  basis: { bmr: number; tdee: number; method: string };
};

/** Mifflin-St Jeor. Widely used, no medical claim attached. */
export function bmr({
  weightKg,
  heightCm,
  age,
  sex,
}: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex?: string;
}) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "female") return base - 161;
  if (sex === "male") return base + 5;
  return base - 78; // midpoint when unspecified
}

/**
 * Stand-ins for the fields a half-finished profile is missing. A rough target the user can
 * see and correct beats a screen full of "of 0 g" — every surface that shows one of these
 * also says it is an estimate.
 */
export const PROFILE_DEFAULTS = { heightCm: 170, weightKg: 70, age: 30 };

export function computeTargets(p: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex?: string;
  activityLevel?: string;
  goal?: string;
  targetWeightKg?: number;
  sleepTargetMinutes?: number;
}): MacroTargets {
  const b = bmr(p);
  const tdee = b * (ACTIVITY_FACTORS[p.activityLevel ?? "moderate"] ?? 1.55);
  const goal = p.goal ?? "general";

  // Deficit/surplus capped at sane rates (~0.5-0.75% bodyweight per week).
  let kcal = tdee;
  if (goal === "fat_loss") kcal = tdee - Math.min(600, Math.max(300, tdee * 0.18));
  else if (goal === "muscle_gain") kcal = tdee + 300;
  else if (goal === "recomp") kcal = tdee - 100;
  else if (goal === "strength") kcal = tdee + 150;

  // Protein anchored to target weight when cutting (avoids over-prescribing at high body fat).
  const anchor =
    goal === "fat_loss" && p.targetWeightKg
      ? (p.weightKg + p.targetWeightKg) / 2
      : p.weightKg;
  const proteinPerKg = goal === "fat_loss" ? 2.0 : goal === "muscle_gain" ? 1.8 : 1.7;
  const protein = Math.round(anchor * proteinPerKg);

  const fat = Math.round(Math.max(0.7 * p.weightKg, (kcal * 0.25) / 9));
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round(Math.min(45, Math.max(25, (kcal / 1000) * 14)));

  return {
    kcal: Math.round(kcal / 10) * 10,
    protein,
    carbs,
    fat,
    fiber,
    waterMl: Math.round((p.weightKg * 35) / 100) * 100,
    sleepMinutes: p.sleepTargetMinutes ?? 480,
    basis: { bmr: Math.round(b), tdee: Math.round(tdee), method: "Mifflin-St Jeor × activity" },
  };
}

/** Epley, capped at 12 reps where the formula stops being meaningful. */
export function e1rm(weightKg: number, reps: number) {
  if (!weightKg || !reps) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + Math.min(reps, 12) / 30) * 10) / 10;
}

/** Exponentially weighted trend weight — kills day-to-day water noise. */
export function trendSeries(points: { date: string; value: number }[], alpha = 0.25) {
  let trend: number | null = null;
  return points.map((p) => {
    trend = trend === null ? p.value : trend + alpha * (p.value - trend);
    return { ...p, trend: Math.round(trend * 100) / 100 };
  });
}

export function linearSlopePerWeek(points: { date: string; value: number }[]) {
  if (points.length < 2) return 0;
  const t0 = new Date(points[0].date).getTime();
  const xs = points.map((p) => (new Date(p.date).getTime() - t0) / 86400000);
  const ys = points.map((p) => p.value);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return 0;
  return Math.round((num / den) * 7 * 100) / 100;
}

/**
 * Readiness 0-100 from things the user actually logged. Deliberately blunt and
 * explainable — it is a training suggestion, never a health assessment.
 */
export function readiness(input: {
  sleepMinutes?: number;
  sleepTarget: number;
  energy?: number;
  soreness?: number;
  stress?: number;
  last7Volume: number;
  prev7Volume: number;
  daysSinceRest: number;
}) {
  const reasons: string[] = [];
  let score = 70;

  if (input.sleepMinutes != null) {
    const ratio = input.sleepMinutes / input.sleepTarget;
    const delta = Math.round(Math.max(-25, Math.min(15, (ratio - 1) * 60)));
    score += delta;
    if (delta <= -8) reasons.push(`Short sleep (${Math.round(input.sleepMinutes / 60 * 10) / 10}h)`);
    if (delta >= 6) reasons.push("Slept to target");
  } else {
    reasons.push("No sleep logged");
  }

  if (input.energy != null) {
    score += (input.energy - 3) * 6;
    if (input.energy <= 2) reasons.push("Low energy check-in");
  }
  if (input.soreness != null) {
    score -= (input.soreness - 2) * 5;
    if (input.soreness >= 4) reasons.push("High soreness");
  }
  if (input.stress != null) score -= (input.stress - 2) * 3;

  if (input.prev7Volume > 0) {
    const spike = input.last7Volume / input.prev7Volume;
    if (spike > 1.5) {
      score -= 10;
      reasons.push("Training load jumped >50% this week");
    }
  }
  if (input.daysSinceRest >= 6) {
    score -= 8;
    reasons.push(`${input.daysSinceRest} days without a rest day`);
  }

  score = Math.max(5, Math.min(100, Math.round(score)));
  const advice =
    score >= 75
      ? "Good to push. Aim for progression on your main lift."
      : score >= 55
        ? "Train as planned, but keep the last set a rep short of failure."
        : score >= 35
          ? "Consider a lighter session — cut volume ~30%."
          : "A recovery day or easy mobility work is likely the better call.";
  return { score, advice, reasons };
}

export function bmi(weightKg: number, heightCm: number) {
  if (!weightKg || !heightCm) return 0;
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
}
