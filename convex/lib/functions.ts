/**
 * Every public query and mutation is built from these instead of `_generated/server`, so two
 * protections apply everywhere without each function remembering them:
 *
 * 1. Argument guard: bounded strings/arrays/payload, finite numbers, real YYYY-MM-DD dates.
 *    Convex validators check types; this checks sizes and sanity, which is what abuse needs.
 * 2. Write throttle: each signed-in user gets a per-minute budget of mutations. Sensitive
 *    mutations add a tighter named limit via `throttle()`.
 */
import { mutation as rawMutation, query as rawQuery, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";
import { LIMITS, guardArgs } from "./guard";

export { LIMITS };

function guardPayload(args: unknown) {
  if (JSON.stringify(args ?? {}).length > LIMITS.maxPayloadBytes) throw new Error("Request too large");
  guardArgs(args);
}

/**
 * Fixed-window counter per (user, bucket). A throw rolls the whole mutation back, but the
 * counter is already at the limit so the caller stays blocked until the window ends.
 */
export async function throttle(
  ctx: MutationCtx,
  userId: Id<"users">,
  bucket: string,
  { max, windowMs }: { max: number; windowMs: number }
) {
  const key = `${userId}:${bucket}`;
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!row) return void (await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 }));
  if (now - row.windowStart >= windowMs) return void (await ctx.db.patch(row._id, { windowStart: now, count: 1 }));
  if (row.count >= max) {
    const wait = Math.ceil((row.windowStart + windowMs - now) / 60000);
    throw new Error(`Slow down — try again in ${wait} minute${wait === 1 ? "" : "s"}`);
  }
  await ctx.db.patch(row._id, { count: row.count + 1 });
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const mutation = ((def: any) =>
  rawMutation({
    ...def,
    handler: async (ctx: MutationCtx, args: any) => {
      guardPayload(args);
      const userId = await getAuthUserId(ctx);
      if (userId) await throttle(ctx, userId, "write", { max: LIMITS.writesPerMinute, windowMs: MINUTE });
      return def.handler(ctx, args);
    },
  })) as typeof rawMutation;

export const query = ((def: any) =>
  rawQuery({
    ...def,
    handler: async (ctx: any, args: any) => {
      guardPayload(args);
      return def.handler(ctx, args);
    },
  })) as typeof rawQuery;
