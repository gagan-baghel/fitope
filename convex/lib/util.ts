import { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";

export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export async function currentUser(ctx: QueryCtx | MutationCtx) {
  return await getAuthUserId(ctx);
}

export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000
  );
}

export function weekday(date: string) {
  return new Date(date + "T00:00:00").getDay();
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
