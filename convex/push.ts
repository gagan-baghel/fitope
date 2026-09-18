"use node";

import { v } from "convex/values";
import webpush from "web-push";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/** Sends to every device the user enabled. Silently a no-op until VAPID keys are set. */
export const send = internalAction({
  args: { userId: v.id("users"), title: v.string(), body: v.string(), url: v.string(), tag: v.string() },
  handler: async (ctx, { userId, ...payload }) => {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
    webpush.setVapidDetails(VAPID_SUBJECT ?? "mailto:hello@fitope.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const subs = await ctx.runQuery(internal.notifications.subscriptionsFor, { userId });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
            { TTL: 6 * 3600, urgency: "high" }
          );
        } catch (e: any) {
          // 404/410: the browser dropped this subscription — forget it.
          if (e?.statusCode === 404 || e?.statusCode === 410)
            await ctx.runMutation(internal.notifications.dropSubscription, { endpoint: s.endpoint });
          else console.error("push failed", e?.statusCode, e?.body);
        }
      })
    );
  },
});
