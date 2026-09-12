import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser, today, addDays, daysBetween } from "./lib/util";
import { trendSeries, linearSlopePerWeek, readiness } from "./lib/fitness";
import { targetsOn } from "./profiles";

const measurements = v.object({
  waist: v.optional(v.number()),
  chest: v.optional(v.number()),
  arms: v.optional(v.number()),
  shoulders: v.optional(v.number()),
  thighs: v.optional(v.number()),
  hips: v.optional(v.number()),
  neck: v.optional(v.number()),
  calves: v.optional(v.number()),
});

/* ---------------------------------- body ---------------------------------- */

export const logBody = mutation({
  args: {
    date: v.optional(v.string()),
    weightKg: v.optional(v.number()),
    bodyFatPct: v.optional(v.number()),
    measurements: v.optional(measurements),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { date, ...rest }) => {
    const userId = await requireUser(ctx);
    const d = date ?? today();
    if (rest.weightKg != null && (rest.weightKg < 20 || rest.weightKg > 400))
      throw new Error("Weight must be between 20 and 400 kg");
    if (rest.bodyFatPct != null && (rest.bodyFatPct < 2 || rest.bodyFatPct > 70))
      throw new Error("Body fat % looks out of range");
    const existing = await ctx.db
      .query("bodyMetrics")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .unique();
    const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...clean,
        measurements: rest.measurements
          ? { ...(existing.measurements ?? {}), ...rest.measurements }
          : existing.measurements,
      });
      return existing._id;
    }
    return await ctx.db.insert("bodyMetrics", { userId, date: d, ...clean });
  },
});

export const deleteBody = mutation({
  args: { id: v.id("bodyMetrics") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export const bodyHistory = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { points: [], slopePerWeek: 0, measurements: [], latest: null, first: null };
    const from = addDays(today(), -(days ?? 180));
    const rows = (
      await ctx.db
        .query("bodyMetrics")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect()
    ).sort((a, b) => (a.date < b.date ? -1 : 1));
    const weights = rows.filter((r) => r.weightKg != null).map((r) => ({ date: r.date, value: r.weightKg! }));
    const points = trendSeries(weights);
    const recent = points.slice(-28);
    return {
      points,
      slopePerWeek: linearSlopePerWeek(recent.map((p) => ({ date: p.date, value: p.trend }))),
      measurements: rows.filter((r) => r.measurements),
      latest: rows[rows.length - 1] ?? null,
      first: rows[0] ?? null,
      all: rows.slice().reverse(),
    };
  },
});

/* ---------------------------------- sleep --------------------------------- */

export const logSleep = mutation({
  args: {
    date: v.optional(v.string()),
    bedAt: v.number(),
    wakeAt: v.number(),
    quality: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { date, bedAt, wakeAt, quality, notes }) => {
    const userId = await requireUser(ctx);
    if (wakeAt <= bedAt) throw new Error("Wake time must be after bedtime");
    const minutes = Math.round((wakeAt - bedAt) / 60000);
    if (minutes > 20 * 60) throw new Error("That is over 20 hours — check the times");
    const d = date ?? new Date(wakeAt).toISOString().slice(0, 10);
    // Multiple sessions per night are allowed (naps, split sleep); we sum them per date.
    return await ctx.db.insert("sleepSessions", {
      userId,
      date: d,
      bedAt,
      wakeAt,
      minutes,
      quality,
      notes,
      source: "manual",
    });
  },
});

export const deleteSleep = mutation({
  args: { id: v.id("sleepSessions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export const sleepHistory = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { nights: [], avgMinutes: 0, consistency: 0, target: 480, adherence: 0 };
    const n = days ?? 30;
    const from = addDays(today(), -n + 1);
    const rows = await ctx.db
      .query("sleepSessions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
      .collect();
    const target = (await targetsOn(ctx, userId, today()))?.sleepMinutes ?? 480;
    const byDate = new Map<string, { minutes: number; bedAt: number; wakeAt: number; quality?: number }>();
    for (const r of rows) {
      const cur = byDate.get(r.date);
      byDate.set(r.date, {
        minutes: (cur?.minutes ?? 0) + r.minutes,
        bedAt: cur?.bedAt ?? r.bedAt,
        wakeAt: r.wakeAt,
        quality: r.quality ?? cur?.quality,
      });
    }
    const nights = [];
    for (let i = 0; i < n; i++) {
      const d = addDays(from, i);
      const v = byDate.get(d);
      nights.push({
        date: d,
        minutes: v?.minutes ?? 0,
        logged: !!v,
        quality: v?.quality,
        bedMinuteOfDay: v ? bedMinute(v.bedAt) : null,
        wakeMinuteOfDay: v ? new Date(v.wakeAt).getHours() * 60 + new Date(v.wakeAt).getMinutes() : null,
      });
    }
    const logged = nights.filter((x) => x.logged);
    const avg = logged.length ? Math.round(logged.reduce((a, x) => a + x.minutes, 0) / logged.length) : 0;
    // Consistency = how tightly bedtime clusters. Lower spread is better.
    const beds = logged.map((x) => x.bedMinuteOfDay!).filter((x) => x != null);
    const mean = beds.length ? beds.reduce((a, b) => a + b, 0) / beds.length : 0;
    const sd = beds.length
      ? Math.sqrt(beds.reduce((a, b) => a + (b - mean) ** 2, 0) / beds.length)
      : 0;
    return {
      nights,
      avgMinutes: avg,
      consistency: Math.max(0, Math.round(100 - Math.min(100, (sd / 90) * 100))),
      bedtimeSpreadMin: Math.round(sd),
      target,
      adherence: logged.length ? Math.round((logged.filter((x) => x.minutes >= target - 30).length / logged.length) * 100) : 0,
      loggedNights: logged.length,
      sessions: rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30),
    };
  },
});

/** Bedtimes after midnight are folded onto a -1..+ scale so 00:30 sits next to 23:30. */
function bedMinute(ts: number) {
  const d = new Date(ts);
  const m = d.getHours() * 60 + d.getMinutes();
  return m < 12 * 60 ? m + 1440 : m;
}

/* -------------------------------- check-ins ------------------------------- */

export const logCheckin = mutation({
  args: {
    date: v.optional(v.string()),
    energy: v.number(),
    soreness: v.number(),
    stress: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { date, ...rest }) => {
    const userId = await requireUser(ctx);
    const d = date ?? today();
    const existing = await ctx.db
      .query("checkins")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, rest);
      return existing._id;
    }
    return await ctx.db.insert("checkins", { userId, date: d, ...rest });
  },
});

export const recovery = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const d = date ?? today();
    const checkin = await ctx.db
      .query("checkins")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .unique();
    const sleepRows = await ctx.db
      .query("sleepSessions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", d))
      .collect();
    const sleepMinutes = sleepRows.reduce((a, s) => a + s.minutes, 0) || undefined;
    const target = (await targetsOn(ctx, userId, d))?.sleepMinutes ?? 480;

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", addDays(d, -14)))
      .collect();
    const done = workouts.filter((w) => w.status === "completed");
    const last7 = done.filter((w) => daysBetween(w.date, d) <= 7).reduce((a, w) => a + (w.totalVolumeKg ?? 0), 0);
    const prev7 = done
      .filter((w) => daysBetween(w.date, d) > 7 && daysBetween(w.date, d) <= 14)
      .reduce((a, w) => a + (w.totalVolumeKg ?? 0), 0);
    let daysSinceRest = 0;
    for (let i = 1; i <= 14; i++) {
      const dd = addDays(d, -i);
      if (done.some((w) => w.date === dd)) daysSinceRest++;
      else break;
    }

    const r = readiness({
      sleepMinutes,
      sleepTarget: target,
      energy: checkin?.energy,
      soreness: checkin?.soreness,
      stress: checkin?.stress,
      last7Volume: last7,
      prev7Volume: prev7,
      daysSinceRest,
    });
    return {
      date: d,
      ...r,
      checkin,
      sleepMinutes: sleepMinutes ?? null,
      sleepTarget: target,
      weeklyVolume: Math.round(last7),
      prevWeeklyVolume: Math.round(prev7),
      daysSinceRest,
    };
  },
});

export const checkinHistory = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const from = addDays(today(), -(days ?? 30));
    return (
      await ctx.db
        .query("checkins")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from))
        .collect()
    ).sort((a, b) => (a.date < b.date ? -1 : 1));
  },
});

/* --------------------------------- photos --------------------------------- */

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const savePhoto = mutation({
  args: {
    storageId: v.id("_storage"),
    pose: v.string(),
    date: v.optional(v.string()),
    weightKg: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, pose, date, weightKg, notes }) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("progressPhotos", {
      userId,
      storageId,
      pose,
      date: date ?? today(),
      weightKg,
      notes,
    });
  },
});

export const listPhotos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("progressPhotos")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return await Promise.all(rows.map(async (p) => ({ ...p, url: await ctx.storage.getUrl(p.storageId) })));
  },
});

export const deletePhoto = mutation({
  args: { id: v.id("progressPhotos") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const p = await ctx.db.get(id);
    if (!p || p.userId !== userId) throw new Error("Not found");
    await ctx.storage.delete(p.storageId);
    await ctx.db.delete(id);
  },
});

/* -------------------------------- reminders ------------------------------- */

export const listReminders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const upsertReminder = mutation({
  args: {
    id: v.optional(v.id("reminders")),
    kind: v.string(),
    label: v.string(),
    time: v.string(),
    days: v.array(v.number()),
    enabled: v.boolean(),
  },
  handler: async (ctx, { id, ...rest }) => {
    const userId = await requireUser(ctx);
    if (id) {
      const doc = await ctx.db.get(id);
      if (!doc || doc.userId !== userId) throw new Error("Not found");
      await ctx.db.patch(id, rest);
      return id;
    }
    return await ctx.db.insert("reminders", { userId, ...rest });
  },
});

export const deleteReminder = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});
