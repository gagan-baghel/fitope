import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const DAY = 86400000;
const BATCH = 500;

/**
 * Daily housekeeping so tables that only ever grow stay small: old nudges (the inbox only shows
 * 2 days), invites long expired, and throttle windows nobody has touched for a day.
 * Deletes in batches and re-schedules itself until done.
 */
export const prune = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const nudges = await ctx.db
      .query("nudges")
      .withIndex("by_created", (q) => q.lt("createdAt", now - 30 * DAY))
      .take(BATCH);
    const invites = await ctx.db
      .query("circleInvites")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now - DAY))
      .take(BATCH);
    const limits = await ctx.db
      .query("rateLimits")
      .withIndex("by_window", (q) => q.lt("windowStart", now - DAY))
      .take(BATCH);
    for (const r of [...nudges, ...invites, ...limits]) await ctx.db.delete(r._id);
    if (nudges.length === BATCH || invites.length === BATCH || limits.length === BATCH)
      await ctx.scheduler.runAfter(0, internal.maintenance.prune, {});
  },
});
