import { v } from "convex/values";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { mutation, query, throttle, HOUR } from "./lib/functions";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser, addDays, daysBetween, safeTz, localDate } from "./lib/util";
import { targetsOn } from "./profiles";
import { pickWorkoutOfDay } from "./workouts";
import { trendSeries } from "./lib/fitness";
import { shareFields } from "./schema";
import {
  DEFAULT_SHARES,
  FAMILY_LIMITS as L,
  NUDGES,
  NudgeKind,
  ShareKey,
  isQuiet,
  normalizeCode,
  randomToken,
} from "./lib/family";

const DAY = 86400000;

/* --------------------------------- time --------------------------------- */

function localMinutes(tz: string, at = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeTz(tz),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return n("hour") * 60 + n("minute");
}

/* -------------------------------- crypto -------------------------------- */

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

async function pbkdf2(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" }, key, 256));
}

async function hashPassword(password: string) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  return `${salt}:${await pbkdf2(password, salt)}`;
}

async function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  const actual = await pbkdf2(password, salt);
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/* ------------------------------ membership ------------------------------ */

async function membershipOf(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("circleMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

async function membersOf(ctx: QueryCtx, circleId: Id<"circles">) {
  return await ctx.db
    .query("circleMembers")
    .withIndex("by_circle", (q) => q.eq("circleId", circleId))
    .collect();
}

/** The caller must be an active member. Every family read/write goes through here. */
async function requireActive(ctx: QueryCtx | MutationCtx) {
  const userId = await requireUser(ctx);
  const me = await membershipOf(ctx, userId);
  if (!me || me.status !== "active") throw new Error("You are not in a family yet");
  return { userId, me };
}

async function requireOwner(ctx: MutationCtx) {
  const r = await requireActive(ctx);
  if (r.me.role !== "owner") throw new Error("Only the family admin can do this");
  return r;
}

/** Same circle, both active, not paused, and this category switched on. */
function canSee(viewer: Doc<"circleMembers">, target: Doc<"circleMembers">, key: ShareKey) {
  if (viewer.userId === target.userId) return true;
  return (
    viewer.circleId === target.circleId &&
    viewer.status === "active" &&
    target.status === "active" &&
    !target.paused &&
    target.shares[key]
  );
}

async function displayName(ctx: QueryCtx, userId: Id<"users">) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const user = await ctx.db.get(userId);
  return profile?.name || user?.name || "Family member";
}

/* ------------------------------- summaries ------------------------------ */

const byUserDate = (ctx: QueryCtx, table: any, userId: Id<"users">, from: string, to: string) =>
  ctx.db
    .query(table)
    .withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("date", from).lte("date", to))
    .collect() as Promise<any[]>;

/** Today at a glance, with anything the member does not share left as null. */
async function todaySummary(ctx: QueryCtx, viewer: Doc<"circleMembers">, m: Doc<"circleMembers">) {
  const d = localDate(m.timezone);
  const see = (k: ShareKey) => canSee(viewer, m, k);
  const targets = await targetsOn(ctx, m.userId, d);
  let lastAt = 0;

  let meals = null;
  if (see("meals")) {
    const rows = await byUserDate(ctx, "mealEntries", m.userId, d, d);
    rows.forEach((r) => (lastAt = Math.max(lastAt, r.at)));
    meals = {
      count: rows.length,
      kcal: Math.round(rows.reduce((a, r) => a + r.nutrients.kcal, 0)),
      protein: Math.round(rows.reduce((a, r) => a + r.nutrients.protein, 0)),
      kcalTarget: targets?.kcal ?? 2000,
      proteinTarget: targets?.protein ?? 100,
    };
  }

  let water = null;
  if (see("water")) {
    const rows = await byUserDate(ctx, "waterLogs", m.userId, d, d);
    rows.forEach((r) => (lastAt = Math.max(lastAt, r.at)));
    water = { ml: rows.reduce((a, r) => a + r.ml, 0), target: targets?.waterMl ?? 3000 };
  }

  let workout = null;
  if (see("workouts")) {
    const week = await byUserDate(ctx, "workouts", m.userId, addDays(d, -6), d);
    const todays = pickWorkoutOfDay(week.filter((w) => w.date === d));
    week.forEach((w) => (lastAt = Math.max(lastAt, w.completedAt ?? w.startedAt ?? 0)));
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", m.userId))
      .unique();
    workout = {
      today: todays ? { status: todays.status as string, title: todays.title as string } : null,
      weekDone: week.filter((w) => w.status === "completed").length,
      weekTarget: profile?.daysPerWeek ?? 4,
    };
  }

  let sleep = null;
  if (see("sleep")) {
    const rows = await byUserDate(ctx, "sleepSessions", m.userId, d, d);
    const minutes = rows.reduce((a, r) => a + r.minutes, 0);
    sleep = { minutes: minutes || null, target: targets?.sleepMinutes ?? 480 };
  }

  let body = null;
  if (see("body")) {
    const rows = (await byUserDate(ctx, "bodyMetrics", m.userId, addDays(d, -30), d))
      .filter((r) => r.weightKg != null)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const pts = trendSeries(rows.map((r) => ({ date: r.date, value: r.weightKg })));
    const last = pts[pts.length - 1];
    const weekAgo = pts.find((p) => daysBetween(p.date, d) <= 7);
    body = last
      ? {
          weightKg: last.value,
          changeWeek: weekAgo && weekAgo !== last ? Math.round((last.trend - weekAgo.trend) * 10) / 10 : null,
        }
      : null;
  }

  return { date: d, meals, water, workout, sleep, body, lastActiveAt: lastAt || null };
}

/* -------------------------------- queries ------------------------------- */

/** One reactive round trip for the whole Family screen. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const me = await membershipOf(ctx, userId);
    if (!me) return { circle: null };
    const circle = (await ctx.db.get(me.circleId))!;
    if (me.status === "pending") return { circle: { name: circle.name }, me, members: [], pending: [], invites: [] };

    const all = await membersOf(ctx, me.circleId);
    const active = all.filter((m) => m.status === "active");
    const since = Date.now() - DAY;

    const members = await Promise.all(
      active.map(async (m) => {
        const sentToday =
          m.userId === userId
            ? 0
            : (
                await ctx.db
                  .query("nudges")
                  .withIndex("by_from_to", (q) => q.eq("fromId", userId).eq("toId", m.userId).gt("createdAt", since))
                  .collect()
              ).length;
        return {
          userId: m.userId,
          name: await displayName(ctx, m.userId),
          role: m.role,
          isMe: m.userId === userId,
          paused: m.paused,
          muted: me.mutedUserIds.includes(m.userId),
          nudgesLeft: Math.max(0, L.nudgesPerPairPerDay - sentToday),
          summary: await todaySummary(ctx, me, m),
        };
      })
    );
    members.sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : a.name.localeCompare(b.name)));

    const isOwner = me.role === "owner";
    const pending = isOwner
      ? await Promise.all(
          all
            .filter((m) => m.status === "pending")
            .map(async (m) => ({ memberId: m._id, name: await displayName(ctx, m.userId), at: m.joinedAt }))
        )
      : [];
    const now = Date.now();
    const invites = (
      await ctx.db
        .query("circleInvites")
        .withIndex("by_circle", (q) => q.eq("circleId", me.circleId))
        .collect()
    )
      .filter((i) => !i.revoked && i.expiresAt > now && i.uses < i.maxUses)
      .filter((i) => isOwner || i.createdBy === userId)
      .map((i) => ({
        _id: i._id,
        code: i.code,
        hasPassword: !!i.passwordHash,
        expiresAt: i.expiresAt,
        usesLeft: i.maxUses - i.uses,
      }));

    return { circle: { _id: circle._id, name: circle.name }, me, members, pending, invites };
  },
});

/** A single member's last `days` days, category by category, gated by what they share. */
export const member = query({
  args: { userId: v.id("users"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    if (!viewerId) return null;
    const viewer = await membershipOf(ctx, viewerId);
    const m = await membershipOf(ctx, args.userId);
    if (!viewer || !m || viewer.status !== "active" || m.status !== "active" || viewer.circleId !== m.circleId)
      return null;
    const see = (k: ShareKey) => canSee(viewer, m, k);
    const n = Math.min(Math.max(args.days ?? 7, 1), 30);
    const to = localDate(m.timezone);
    const from = addDays(to, -(n - 1));
    const dates = Array.from({ length: n }, (_, i) => addDays(from, i));
    const targets = await targetsOn(ctx, m.userId, to);
    const perDay = <T,>(rows: any[], f: (rs: any[]) => T) => dates.map((date) => ({ date, value: f(rows.filter((r) => r.date === date)) }));

    const meals = see("meals") ? await byUserDate(ctx, "mealEntries", m.userId, from, to) : null;
    const water = see("water") ? await byUserDate(ctx, "waterLogs", m.userId, from, to) : null;
    const sleep = see("sleep") ? await byUserDate(ctx, "sleepSessions", m.userId, from, to) : null;
    const workouts = see("workouts") ? await byUserDate(ctx, "workouts", m.userId, from, to) : null;
    const body = see("body")
      ? (await byUserDate(ctx, "bodyMetrics", m.userId, addDays(to, -60), to))
          .filter((r) => r.weightKg != null)
          .sort((a, b) => (a.date < b.date ? -1 : 1))
      : null;

    return {
      userId: m.userId,
      name: await displayName(ctx, m.userId),
      isMe: m.userId === viewerId,
      paused: m.paused,
      muted: viewer.mutedUserIds.includes(m.userId),
      targets: targets
        ? { kcal: targets.kcal, protein: targets.protein, waterMl: targets.waterMl, sleepMinutes: targets.sleepMinutes }
        : null,
      kcal: meals && perDay(meals, (rs) => Math.round(rs.reduce((a, r) => a + r.nutrients.kcal, 0))),
      protein: meals && perDay(meals, (rs) => Math.round(rs.reduce((a, r) => a + r.nutrients.protein, 0))),
      water: water && perDay(water, (rs) => rs.reduce((a, r) => a + r.ml, 0)),
      sleep: sleep && perDay(sleep, (rs) => rs.reduce((a, r) => a + r.minutes, 0)),
      workouts:
        workouts &&
        perDay(workouts, (rs) => {
          const w = pickWorkoutOfDay(rs);
          return w ? { status: w.status as string, title: w.title as string } : null;
        }),
      weight: body && trendSeries(body.map((r) => ({ date: r.date, value: r.weightKg }))),
    };
  },
});

/** Unseen nudges for the global banner. */
export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("nudges")
      .withIndex("by_to", (q) => q.eq("toId", userId).gt("createdAt", Date.now() - 2 * DAY))
      .order("desc")
      .take(20);
    return await Promise.all(
      rows
        .filter((r) => !r.seenAt)
        .map(async (r) => ({
          _id: r._id,
          kind: r.kind,
          message: r.message,
          createdAt: r.createdAt,
          fromId: r.fromId,
          fromName: await displayName(ctx, r.fromId),
        }))
    );
  },
});

/* ------------------------------- mutations ------------------------------ */

const newMember = (circleId: Id<"circles">, userId: Id<"users">, role: "owner" | "member", status: "pending" | "active", timezone: string) => ({
  circleId,
  userId,
  role,
  status,
  shares: DEFAULT_SHARES,
  paused: false,
  mutedUserIds: [],
  timezone: safeTz(timezone),
  joinedAt: Date.now(),
});

export const createCircle = mutation({
  args: { name: v.string(), timezone: v.string() },
  handler: async (ctx, { name, timezone }) => {
    const userId = await requireUser(ctx);
    await throttle(ctx, userId, "circle", { max: 5, windowMs: DAY });
    if (await membershipOf(ctx, userId)) throw new Error("You are already in a family");
    const clean = name.trim().slice(0, 40) || "My family";
    const circleId = await ctx.db.insert("circles", { name: clean, ownerId: userId, createdAt: Date.now() });
    await ctx.db.insert("circleMembers", newMember(circleId, userId, "owner", "active", timezone));
    return circleId;
  },
});

export const createInvite = mutation({
  args: { password: v.optional(v.string()) },
  handler: async (ctx, { password }) => {
    const { userId, me } = await requireActive(ctx);
    await throttle(ctx, userId, "invite", { max: 20, windowMs: DAY });
    // Case-insensitive: passwords get read out over the phone.
    const pw = password?.trim().toUpperCase();
    if (pw && (pw.length < L.passwordMin || pw.length > L.passwordMax))
      throw new Error(`Password must be ${L.passwordMin}–${L.passwordMax} characters`);

    const now = Date.now();
    const live = (
      await ctx.db
        .query("circleInvites")
        .withIndex("by_circle", (q) => q.eq("circleId", me.circleId))
        .collect()
    ).filter((i) => !i.revoked && i.expiresAt > now && i.uses < i.maxUses);
    if (live.length >= L.maxActiveInvites) throw new Error("Too many open invites — cancel one first");

    let code = randomToken(8);
    while (await ctx.db.query("circleInvites").withIndex("by_code", (q) => q.eq("code", code)).first())
      code = randomToken(8);

    await ctx.db.insert("circleInvites", {
      circleId: me.circleId,
      code,
      createdBy: userId,
      passwordHash: pw ? await hashPassword(pw) : undefined,
      expiresAt: now + L.inviteHours * 3600000,
      maxUses: L.inviteMaxUses,
      uses: 0,
      failedAttempts: 0,
      revoked: false,
    });
    return { code, expiresAt: now + L.inviteHours * 3600000 };
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("circleInvites") },
  handler: async (ctx, { inviteId }) => {
    const { userId, me } = await requireActive(ctx);
    const inv = await ctx.db.get(inviteId);
    if (!inv || inv.circleId !== me.circleId) throw new Error("Not found");
    if (me.role !== "owner" && inv.createdBy !== userId) throw new Error("Not allowed");
    await ctx.db.patch(inviteId, { revoked: true });
  },
});

/** What the join screen shows before the user commits: the family name and whether a password is needed. */
export const peekInvite = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const c = normalizeCode(code);
    if (c.length !== 8) return null;
    const inv = await ctx.db.query("circleInvites").withIndex("by_code", (q) => q.eq("code", c)).first();
    if (!inv || inv.revoked || inv.expiresAt < Date.now() || inv.uses >= inv.maxUses) return { valid: false as const };
    const circle = await ctx.db.get(inv.circleId);
    return {
      valid: true as const,
      familyName: circle?.name ?? "Family",
      invitedBy: await displayName(ctx, inv.createdBy),
      hasPassword: !!inv.passwordHash,
    };
  },
});

/**
 * Returns errors instead of throwing so a wrong password still counts toward the lockout —
 * a thrown error would roll the attempt counter back with the rest of the transaction.
 */
export const joinCircle = mutation({
  args: { code: v.string(), password: v.optional(v.string()), timezone: v.string() },
  handler: async (ctx, { code, password, timezone }) => {
    const userId = await requireUser(ctx);
    // Per-user cap on top of the per-invite lockout, so one account can't sweep many invites.
    await throttle(ctx, userId, "join", { max: 10, windowMs: HOUR });
    if (await membershipOf(ctx, userId)) return { ok: false as const, error: "You are already in a family" };
    const inv = await ctx.db
      .query("circleInvites")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(code)))
      .first();
    if (!inv || inv.revoked || inv.expiresAt < Date.now() || inv.uses >= inv.maxUses)
      return { ok: false as const, error: "This invite is not valid anymore" };

    const members = await membersOf(ctx, inv.circleId);
    if (members.length >= L.maxMembers) return { ok: false as const, error: "This family is full" };

    let status: "active" | "pending" = "pending";
    const pw = password?.trim().toUpperCase();
    if (inv.passwordHash && pw) {
      if (await verifyPassword(pw, inv.passwordHash)) status = "active";
      else {
        const failed = inv.failedAttempts + 1;
        await ctx.db.patch(inv._id, { failedAttempts: failed, revoked: failed >= L.passwordAttempts });
        return {
          ok: false as const,
          error:
            failed >= L.passwordAttempts
              ? "Too many wrong tries. Ask for a new invite."
              : `Wrong password (${L.passwordAttempts - failed} tries left)`,
        };
      }
    }

    await ctx.db.patch(inv._id, { uses: inv.uses + 1 });
    await ctx.db.insert("circleMembers", newMember(inv.circleId, userId, "member", status, timezone));

    const circle = (await ctx.db.get(inv.circleId))!;
    const name = await displayName(ctx, userId);
    await ctx.scheduler.runAfter(0, internal.push.send, {
      userId: circle.ownerId,
      title: status === "active" ? `👋 ${name} joined ${circle.name}` : `👋 ${name} wants to join`,
      body: status === "active" ? "Tap to see your family" : "Tap to let them in",
      url: "/family",
      tag: "family-join",
    });
    return { ok: true as const, status };
  },
});

export const cancelRequest = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const me = await membershipOf(ctx, userId);
    if (me?.status === "pending") await ctx.db.delete(me._id);
  },
});

export const respondToRequest = mutation({
  args: { memberId: v.id("circleMembers"), approve: v.boolean() },
  handler: async (ctx, { memberId, approve }) => {
    const { me } = await requireOwner(ctx);
    const m = await ctx.db.get(memberId);
    if (!m || m.circleId !== me.circleId || m.status !== "pending") throw new Error("Not found");
    if (!approve) return await ctx.db.delete(memberId);
    await ctx.db.patch(memberId, { status: "active", joinedAt: Date.now() });
    const circle = (await ctx.db.get(me.circleId))!;
    await ctx.scheduler.runAfter(0, internal.push.send, {
      userId: m.userId,
      title: `🎉 You're in ${circle.name}`,
      body: "Tap to see your family",
      url: "/family",
      tag: "family-join",
    });
  },
});

export const removeMember = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const { me } = await requireOwner(ctx);
    if (userId === me.userId) throw new Error("Use Leave instead");
    const m = await membershipOf(ctx, userId);
    if (!m || m.circleId !== me.circleId) throw new Error("Not found");
    await detach(ctx, m);
  },
});

export const leaveCircle = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const me = await membershipOf(ctx, userId);
    if (me) await detach(ctx, me);
  },
});

export const makeAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const { me } = await requireOwner(ctx);
    const m = await membershipOf(ctx, userId);
    if (!m || m.circleId !== me.circleId || m.status !== "active") throw new Error("Not found");
    await ctx.db.patch(m._id, { role: "owner" });
    await ctx.db.patch(me._id, { role: "member" });
    await ctx.db.patch(me.circleId, { ownerId: userId });
  },
});

export const renameCircle = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const { me } = await requireOwner(ctx);
    const clean = name.trim().slice(0, 40);
    if (clean) await ctx.db.patch(me.circleId, { name: clean });
  },
});

export const updateMySharing = mutation({
  args: { shares: v.optional(shareFields), paused: v.optional(v.boolean()), timezone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const me = await membershipOf(ctx, userId);
    if (!me) return;
    const patch: Partial<Doc<"circleMembers">> = {};
    if (args.shares) patch.shares = args.shares;
    if (args.paused !== undefined) patch.paused = args.paused;
    if (args.timezone && safeTz(args.timezone) !== me.timezone) patch.timezone = safeTz(args.timezone);
    if (Object.keys(patch).length) await ctx.db.patch(me._id, patch);
  },
});

export const setMuted = mutation({
  args: { userId: v.id("users"), muted: v.boolean() },
  handler: async (ctx, { userId, muted }) => {
    const { me } = await requireActive(ctx);
    const rest = me.mutedUserIds.filter((id) => id !== userId);
    await ctx.db.patch(me._id, { mutedUserIds: muted ? [...rest, userId] : rest });
  },
});

export const sendNudge = mutation({
  args: { toId: v.id("users"), kind: v.string(), message: v.optional(v.string()) },
  handler: async (ctx, { toId, kind, message }) => {
    const { userId, me } = await requireActive(ctx);
    if (toId === userId) return { ok: false as const, error: "That's you!" };
    if (!(kind in NUDGES)) return { ok: false as const, error: "Unknown nudge" };
    const to = await membershipOf(ctx, toId);
    if (!to || to.circleId !== me.circleId || to.status !== "active") return { ok: false as const, error: "Not in your family" };

    const now = Date.now();
    const sent = await ctx.db
      .query("nudges")
      .withIndex("by_from_to", (q) => q.eq("fromId", userId).eq("toId", toId).gt("createdAt", now - DAY))
      .collect();
    if (sent.length >= L.nudgesPerPairPerDay) return { ok: false as const, error: "Enough for today 🙂" };

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", toId))
      .unique();
    const toName = profile?.name || "They";
    if (isQuiet(localMinutes(to.timezone, now), profile?.bedtime, profile?.wakeTime))
      return { ok: false as const, error: `😴 ${toName} is sleeping — try after ${profile?.wakeTime ?? "07:00"}` };

    const text = message?.trim().slice(0, L.nudgeMessageMax) || undefined;
    // Mute is silent: the sender is never told, the receiver never sees it.
    const muted = to.mutedUserIds.includes(userId);
    await ctx.db.insert("nudges", {
      circleId: me.circleId,
      fromId: userId,
      toId,
      kind,
      message: text,
      createdAt: now,
      seenAt: muted ? now : undefined,
    });
    if (!muted) {
      const n = NUDGES[kind as NudgeKind];
      await ctx.scheduler.runAfter(0, internal.push.send, {
        userId: toId,
        title: `${n.emoji} ${await displayName(ctx, userId)}`,
        body: text ?? n.text,
        url: "/family",
        tag: `nudge-${userId}`,
      });
    }
    return { ok: true as const };
  },
});

export const markNudgesSeen = mutation({
  args: { ids: v.array(v.id("nudges")) },
  handler: async (ctx, { ids }) => {
    const userId = await requireUser(ctx);
    const now = Date.now();
    for (const id of ids) {
      const n = await ctx.db.get(id);
      if (n && n.toId === userId && !n.seenAt) await ctx.db.patch(id, { seenAt: now });
    }
  },
});

/* ------------------------------- teardown ------------------------------- */

/**
 * Removes a member. The admin role passes to the longest-standing member; the last one out
 * takes the circle, its invites and its nudges with them.
 */
async function detach(ctx: MutationCtx, m: Doc<"circleMembers">) {
  await ctx.db.delete(m._id);
  const rest = (await membersOf(ctx, m.circleId)).sort((a, b) => a.joinedAt - b.joinedAt);
  const active = rest.filter((r) => r.status === "active");

  if (active.length === 0) {
    for (const r of rest) await ctx.db.delete(r._id);
    for (const t of ["circleInvites", "nudges"] as const)
      for (const row of await ctx.db
        .query(t)
        .withIndex("by_circle", (q) => q.eq("circleId", m.circleId))
        .collect())
        await ctx.db.delete(row._id);
    await ctx.db.delete(m.circleId);
    return;
  }
  if (m.role === "owner") {
    await ctx.db.patch(active[0]._id, { role: "owner" });
    await ctx.db.patch(m.circleId, { ownerId: active[0].userId });
  }
  for (const r of active)
    if (r.mutedUserIds.includes(m.userId))
      await ctx.db.patch(r._id, { mutedUserIds: r.mutedUserIds.filter((id) => id !== m.userId) });
}

/** Account deletion: leave the family and erase everything this user sent or received. */
export async function eraseFamilyData(ctx: MutationCtx, userId: Id<"users">) {
  const me = await membershipOf(ctx, userId);
  if (me) await detach(ctx, me);
  const sent = await ctx.db.query("nudges").withIndex("by_from_to", (q) => q.eq("fromId", userId)).collect();
  const got = await ctx.db.query("nudges").withIndex("by_to", (q) => q.eq("toId", userId)).collect();
  const subs = await ctx.db.query("pushSubscriptions").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  for (const r of [...sent, ...got, ...subs]) await ctx.db.delete(r._id);
  let removed = sent.length + got.length + subs.length;
  for (const i of await ctx.db.query("circleInvites").withIndex("by_creator", (q) => q.eq("createdBy", userId)).collect()) {
    await ctx.db.delete(i._id);
    removed++;
  }
  return removed;
}
