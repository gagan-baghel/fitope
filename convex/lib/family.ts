/** Shared by the Convex functions and the UI, so the two can never disagree. */

export const NUDGES = {
  water: { emoji: "💧", text: "Drink some water" },
  eat: { emoji: "🍽️", text: "Have you eaten?" },
  protein: { emoji: "🥚", text: "Get some protein in" },
  move: { emoji: "🚶", text: "Go for a short walk" },
  workout: { emoji: "💪", text: "Workout time!" },
  sleep: { emoji: "😴", text: "Sleep on time tonight" },
  cheer: { emoji: "👏", text: "Proud of you, keep going" },
} as const;
export type NudgeKind = keyof typeof NUDGES;

export const FAMILY_LIMITS = {
  maxMembers: 8,
  /** Circles one account can belong to. Separate circles never see each other. */
  maxCircles: 3,
  nudgesPerPairPerDay: 3,
  nudgeMessageMax: 80,
  inviteHours: 48,
  inviteMaxUses: 5,
  maxActiveInvites: 5,
  passwordAttempts: 5,
  passwordMin: 4,
  passwordMax: 32,
};

/** Sensible defaults: the day-to-day stuff is shared, the sensitive stuff is opt-in. */
export const DEFAULT_SHARES = { meals: true, water: true, workouts: true, sleep: true, body: false };
export type ShareKey = keyof typeof DEFAULT_SHARES;

/** No 0/O/1/I — codes and passwords get read out loud over the phone. */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomToken(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  // 32-char alphabet: masking to 5 bits keeps the distribution uniform.
  return Array.from(bytes, (b) => CODE_ALPHABET[b & 31]).join("");
}

export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const formatCode = (c: string) => (c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c);

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Quiet hours are the receiver's own bed → wake window (defaults 23:00 → 07:00). */
export function isQuiet(nowMin: number, bedtime = "23:00", wake = "07:00") {
  const b = toMin(bedtime);
  const w = toMin(wake);
  return b > w ? nowMin >= b || nowMin < w : nowMin >= b && nowMin < w;
}
