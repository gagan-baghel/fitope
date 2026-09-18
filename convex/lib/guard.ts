/** Pure argument checks used by lib/functions — no Convex imports, so scripts can test it. */

export const LIMITS = {
  maxString: 2000,
  maxArray: 200,
  maxPayloadBytes: 64 * 1024,
  maxDepth: 6,
  writesPerMinute: 90,
};

const DATE_KEYS = new Set(["date", "fromDate", "toDate", "effectiveFrom", "targetDate"]);
const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function guardArgs(value: unknown, key = "", depth = 0): void {
  if (depth > LIMITS.maxDepth) throw new Error("Request too deeply nested");
  if (typeof value === "string") {
    if (value.length > LIMITS.maxString) throw new Error(`"${key}" is too long`);
    if (DATE_KEYS.has(key) && !ISO_DATE.test(value)) throw new Error(`"${key}" must be a YYYY-MM-DD date`);
  } else if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`"${key}" must be a number`);
  } else if (Array.isArray(value)) {
    if (value.length > LIMITS.maxArray) throw new Error(`"${key}" has too many items`);
    for (const v of value) guardArgs(v, key, depth + 1);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) guardArgs(v, k, depth + 1);
  }
}
