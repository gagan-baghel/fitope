"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback, useEffect, useState } from "react";
import { Button, Input, Ring, Sheet, useToast } from "@/components/ui";
import { NUDGES, NudgeKind, FAMILY_LIMITS } from "../../convex/lib/family";
import { cn } from "@/lib/utils";
import { Pencil, Plus, Send, ThumbsUp, Users } from "lucide-react";

/* --------------------------------- avatar -------------------------------- */

const AVATAR_TONES = ["var(--tile-1)", "var(--tile-2)", "var(--tile-3)", "var(--tile-4)", "var(--tile-5)", "var(--tile-6)"];
const toneFor = (name: string) =>
  AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];

export function Avatar({ name, size = 44, ring, className }: { name: string; size?: number; ring?: number | null; className?: string }) {
  const face = (
    <div
      className="grid shrink-0 place-items-center rounded-full font-bold text-[var(--tile-ink)]"
      style={{ width: size - (ring != null ? 10 : 0), height: size - (ring != null ? 10 : 0), background: toneFor(name), fontSize: size * 0.38 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
  if (ring == null) return <div className={className}>{face}</div>;
  return (
    <Ring value={ring} max={1} size={size} stroke={4} color={ring >= 1 ? "var(--mint)" : "var(--sky)"} className={className}>
      {face}
    </Ring>
  );
}

/** 0..1 across whatever the member shares — the single "how's their day going" number. */
export function dayProgress(s: any): number | null {
  if (!s) return null;
  const parts: number[] = [];
  if (s.meals) parts.push(Math.min(1, s.meals.kcal / (s.meals.kcalTarget || 1)));
  if (s.water) parts.push(Math.min(1, s.water.ml / (s.water.target || 1)));
  if (s.sleep?.minutes) parts.push(Math.min(1, s.sleep.minutes / (s.sleep.target || 1)));
  if (s.workout) parts.push(s.workout.today?.status === "completed" ? 1 : 0);
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
}

/* ------------------------------ nudge sheet ------------------------------ */

export function NudgeSheet({
  to,
  onClose,
}: {
  to: { userId: Id<"users">; name: string; nudgesLeft: number } | null;
  onClose: () => void;
}) {
  const send = useMutation(api.family.sendNudge);
  const toast = useToast();
  const [kind, setKind] = useState<NudgeKind | null>(null);
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!to || !kind) return;
    setBusy(true);
    try {
      const r = await send({ toId: to.userId, kind, message: message.trim() || undefined });
      if (r.ok) {
        toast({ message: `${NUDGES[kind].emoji} → ${to.name} ✓` });
        onClose();
      } else toast({ message: r.error, tone: "var(--rose)" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!to}
      onClose={onClose}
      title={to && <span className="flex items-center gap-2"><Avatar name={to.name} size={28} /> {to.name}</span>}
      footer={
        <Button className="w-full" size="lg" disabled={!kind || !to?.nudgesLeft} loading={busy} onClick={go}>
          <Send className="h-5 w-5" /> Send {kind ? NUDGES[kind].emoji : ""}
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {(Object.keys(NUDGES) as NudgeKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border px-1.5 py-2.5 transition-all active:scale-95",
              kind === k ? "scale-[1.04] border-transparent bg-accent text-accent-ink shadow-lg" : "border-line bg-surface-2 text-muted"
            )}
          >
            <span className="text-[26px] leading-none">{NUDGES[k].emoji}</span>
            <span className="w-full truncate text-[11px] font-medium leading-tight">{NUDGES[k].text}</span>
          </button>
        ))}
        <button
          onClick={() => setWriting((w) => !w)}
          aria-pressed={writing}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed px-1.5 py-2.5 transition-all active:scale-95",
            writing ? "border-accent text-accent" : "border-line text-muted"
          )}
          aria-label="Add a message"
        >
          <Pencil className="h-6 w-6" />
        </button>
      </div>
      {writing && (
        <Input
          autoFocus
          className="mt-2"
          maxLength={FAMILY_LIMITS.nudgeMessageMax}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="…"
          aria-label="Message"
        />
      )}
      {/* Remaining nudges today, as dots — no reading needed. */}
      <div className="mt-3 flex justify-center gap-1.5" aria-label={`${to?.nudgesLeft ?? 0} left today`}>
        {Array.from({ length: FAMILY_LIMITS.nudgesPerPairPerDay }, (_, i) => (
          <span key={i} className={cn("h-2 w-2 rounded-full", i < (to?.nudgesLeft ?? 0) ? "bg-accent" : "bg-surface-3")} />
        ))}
      </div>
    </Sheet>
  );
}

/* ------------------------------ nudge banner ----------------------------- */

const NUDGE_LINKS: Record<string, string> = {
  water: "/eat",
  eat: "/eat/add?meal=auto",
  protein: "/eat/add?meal=auto",
  move: "/train",
  workout: "/train",
  sleep: "/recover",
  cheer: "/family",
};

/** Incoming nudges, on every screen. Live — appears the moment it is sent. */
export function NudgeBanner() {
  const all = useQuery(api.family.inbox, {});
  const markSeen = useMutation(api.family.markNudgesSeen);
  // Hidden locally the instant it is handled — no waiting on the server round trip.
  const [gone, setGone] = useState<string[]>([]);
  const inbox = all?.filter((x) => !gone.includes(x._id));
  const n = inbox?.[0];
  const done = useCallback(() => {
    if (!n) return;
    setGone((g) => [...g, n._id]);
    markSeen({ ids: [n._id] });
  }, [n, markSeen]);

  // Like any phone notification, it slides away on its own.
  useEffect(() => {
    if (!n) return;
    const t = setTimeout(done, 10000);
    return () => clearTimeout(t);
  }, [n, done]);

  if (!n || !inbox) return null;
  const preset = NUDGES[n.kind as NudgeKind] ?? NUDGES.cheer;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[55] px-2.5 pt-[calc(var(--safe-top)_+_0.375rem)] lg:left-60">
      <div className="pointer-events-auto mx-auto flex max-w-md animate-drop items-center gap-2.5 rounded-2xl border border-line bg-surface py-1.5 pl-1.5 pr-1.5 shadow-xl">
        <div className="relative shrink-0">
          <Avatar name={n.fromName} size={36} />
          <span className="absolute -bottom-1 -right-1 text-[16px] leading-none">{preset.emoji}</span>
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[11.5px] font-semibold text-muted">
            {n.fromName}
            {inbox.length > 1 && <span className="ml-1.5 rounded-full bg-rose px-1.5 text-[10px] font-bold text-white">{inbox.length}</span>}
          </div>
          <div className="line-clamp-2 text-[13.5px] font-semibold">{n.message ?? preset.text}</div>
        </div>
        <Link
          href={NUDGE_LINKS[n.kind] ?? "/family"}
          onClick={done}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-[18px] text-accent-ink"
          aria-label="Do it"
        >
          {preset.emoji}
        </Link>
        <button onClick={done} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink" aria-label="OK">
          <ThumbsUp className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------- push --------------------------------- */

const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
}

async function detectPush() {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    return ios && !standalone ? ("ios-install" as const) : ("unsupported" as const);
  }
  if (Notification.permission === "denied") return "blocked" as const;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ? ("on" as const) : ("off" as const);
}

/**
 * Phone notifications for nudges. `state` drives the UI:
 * unsupported → hide · ios-install → show the Home Screen hint · off/on/blocked → switch.
 */
export function usePush() {
  const key = useQuery(api.notifications.vapidPublicKey, {});
  const subscribe = useMutation(api.notifications.subscribe);
  const unsubscribe = useMutation(api.notifications.unsubscribe);
  const [state, setState] = useState<"loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on">("loading");

  const refresh = useCallback(() => detectPush().then(setState), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!key) return;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return refresh();
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
    const json = sub.toJSON();
    await subscribe({ endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth });
    setState("on");
  }, [key, subscribe, refresh]);

  const disable = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await unsubscribe({ endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    setState("off");
  }, [unsubscribe]);

  return { state: key === null ? ("unsupported" as const) : state, enable, disable };
}

/* ------------------------------- home strip ------------------------------ */

/** The family at a glance on Home: faces with a ring for how their day is going. */
export function FamilyStrip() {
  const data = useQuery(api.family.overview, {});
  if (!data) return null;
  if (!data.circle || data.me?.status !== "active") {
    return (
      <Link
        href="/family"
        className="flex items-center gap-2 rounded-2xl border border-dashed border-line px-3 py-2 active:scale-[0.99]"
      >
        <span className="text-[22px] leading-none">👨‍👩‍👧‍👦</span>
        <span className="flex-1 text-[13.5px] font-semibold">Family</span>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-ink">
          <Plus className="h-5 w-5" />
        </span>
      </Link>
    );
  }
  return (
    <div className="no-scrollbar bleed flex gap-2 overflow-x-auto">
      {data.members.map((m: any) => (
        <Link key={m.userId} href={m.isMe ? "/family" : `/family/${m.userId}`} className="flex w-14 shrink-0 flex-col items-center gap-1">
          <Avatar name={m.name} size={52} ring={dayProgress(m.summary) ?? 0} />
          <span className="w-full truncate text-center text-[11px] font-medium">{m.isMe ? "You" : m.name.split(" ")[0]}</span>
        </Link>
      ))}
      <Link href="/family" className="flex w-14 shrink-0 flex-col items-center gap-1" aria-label="Family">
        <span className="grid h-[52px] w-[52px] place-items-center rounded-full border border-dashed border-line text-muted">
          <Users className="h-5 w-5" />
        </span>
      </Link>
    </div>
  );
}
