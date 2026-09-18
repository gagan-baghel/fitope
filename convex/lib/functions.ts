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
import { ConvexError } from "convex/values";
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

/**
 * Production Convex redacts error messages. Our deliberate `throw new Error("…")` messages are
 * written for users, so pass those through as ConvexError; anything else (TypeError, runtime
 * faults) stays redacted.
 */
function expose(e: unknown): never {
  if (e instanceof Error && e.constructor === Error) throw new ConvexError(e.message);
  throw e;
}

export const mutation = ((def: any) =>
  rawMutation({
    ...def,
    handler: async (ctx: MutationCtx, args: any) => {
      try {
        guardPayload(args);
        const userId = await getAuthUserId(ctx);
        if (userId) await throttle(ctx, userId, "write", { max: LIMITS.writesPerMinute, windowMs: MINUTE });
        return await def.handler(ctx, args);
      } catch (e) {
        expose(e);
      }
    },
  })) as typeof rawMutation;

export const query = ((def: any) =>
  rawQuery({
    ...def,
    handler: async (ctx: any, args: any) => {
      try {
        guardPayload(args);
        return await def.handler(ctx, args);
      } catch (e) {
        expose(e);
      }
    },
  })) as typeof rawQuery;
