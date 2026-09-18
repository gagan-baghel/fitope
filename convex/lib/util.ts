import { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";
import { localDate } from "./dates";

export { safeTz, localDate, today, addDays, daysBetween, weekday } from "./dates";

export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export async function currentUser(ctx: QueryCtx | MutationCtx) {
  return await getAuthUserId(ctx);
}

/**
 * "Today" for this user, in their own time zone. The server runs in UTC, so plain today()
 * would file an Indian user's 1am breakfast under yesterday and a Californian's dinner
 * under tomorrow.
 */
export async function todayFor(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return localDate(profile?.timezone);
}

export const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Guard: every doc read through this is verified to belong to the caller. */
export function assertOwner<T extends { userId: Id<"users"> }>(doc: T | null, userId: Id<"users">): T {
  if (!doc || doc.userId !== userId) throw new Error("Not found");
  return doc;
}

/** Library rows (foods, exercises) are shared when unowned, otherwise private to their owner. */
export function visibleTo<T extends { ownerUserId?: Id<"users"> }>(doc: T | null, userId: Id<"users"> | null): T | null {
  if (!doc) return null;
  return !doc.ownerUserId || doc.ownerUserId === userId ? doc : null;
}
