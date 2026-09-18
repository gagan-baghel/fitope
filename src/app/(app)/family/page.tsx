"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { Bar, Button, Card, ConfirmButton, Input, Sheet, Skeleton, useToast } from "@/components/ui";
import { Avatar, NudgeSheet, dayProgress, usePush } from "@/components/family";
import { FAMILY_LIMITS, formatCode, normalizeCode, randomToken } from "../../../../convex/lib/family";
import { cn, errorText, hhmm } from "@/lib/utils";
import { useUnits } from "@/lib/units";
import {
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Copy,
  Crown,
  KeyRound,
  Lock,
  LogOut,
  Pause,
  RefreshCw,
  Settings,
  Share2,
  UserPlus,
  X,
} from "lucide-react";

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function Family() {
  const data = useQuery(api.family.overview, {});
  const updateSharing = useMutation(api.family.updateMySharing);

  // Keep the member's time zone current so "today" and quiet hours are right for them.
  useEffect(() => {
    if (data?.me && data.me.timezone !== tz()) updateSharing({ timezone: tz() });
  }, [data?.me, updateSharing]);

  if (data === undefined) return <Skeleton className="h-96 w-full" />;
  if (!data?.circle) return <NoFamily />;
  if (data.me?.status === "pending") return <Waiting name={data.circle.name} />;
  return <FamilyHome data={data} />;
}

/* ------------------------------ no family yet ----------------------------- */

function NoFamily() {
  const me = useQuery(api.profiles.me, {});
  const create = useMutation(api.family.createCircle);
  // /join/CODE lands here as /family?join=CODE. Safe to read on first render: this view only
  // mounts after the overview query resolves, which never happens on the server.
  const [code] = useState(() => normalizeCode(new URLSearchParams(window.location.search).get("join") ?? ""));
  const [sheet, setSheet] = useState<null | "create" | "join">(code ? "join" : null);
  const [name, setName] = useState("");

  const first = me?.profile?.name?.split(" ")[0];
  return (
    <div className="space-y-5 pt-6 text-center">
      <div className="text-[72px] leading-none">👨‍👩‍👧‍👦</div>
      <h1 className="text-[26px] font-bold tracking-tight">Family</h1>
      <p className="mx-auto max-w-xs text-[14px] text-muted">🍽️ 💧 💪 😴 — see each other, cheer each other.</p>
      <div className="mx-auto grid max-w-sm gap-3 pt-2">
        <Button size="lg" onClick={() => { setName(first ? `${first}'s family` : ""); setSheet("create"); }}>
          <UserPlus className="h-5 w-5" /> Create family
        </Button>
        <Button size="lg" variant="soft" onClick={() => setSheet("join")}>
          <KeyRound className="h-5 w-5" /> Join with code
        </Button>
      </div>

      <Sheet
        open={sheet === "create"}
        onClose={() => setSheet(null)}
        title="👨‍👩‍👧‍👦 Create family"
        footer={
          <Button className="w-full" size="lg" onClick={() => create({ name, timezone: tz() })}>
            <Check className="h-5 w-5" /> Create
          </Button>
        }
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sharma family" maxLength={40} aria-label="Family name" />
      </Sheet>

      <JoinSheet open={sheet === "join"} onClose={() => setSheet(null)} initialCode={code} />
    </div>
  );
}

function JoinSheet({ open, onClose, initialCode }: { open: boolean; onClose: () => void; initialCode: string }) {
  const join = useMutation(api.family.joinCircle);
  const toast = useToast();
  const [code, setCode] = useState(initialCode);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const c = normalizeCode(code);
  const peek = useQuery(api.family.peekInvite, c.length === 8 ? { code: c } : "skip");

  async function go() {
    setBusy(true);
    setError("");
    try {
      const r = await join({ code: c, password: password || undefined, timezone: tz() });
      if (!r.ok) setError(r.error);
      else {
        toast({ message: r.status === "active" ? "🎉" : "⏳" });
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="🔑 Join family"
      footer={
        <Button className="w-full" size="lg" disabled={!peek?.valid} loading={busy} onClick={go}>
          <Check className="h-5 w-5" /> Join
        </Button>
      }
    >
      <div className="space-y-3">
        <Input
          value={c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4, 8)}` : c}
          onChange={(e) => setCode(normalizeCode(e.target.value).slice(0, 8))}
          placeholder="ABCD-2345"
          autoCapitalize="characters"
          autoComplete="off"
          aria-label="Invite code"
          className="text-center font-mono text-[24px] font-bold tracking-[0.2em]"
        />
        {peek?.valid === false && <p className="text-center text-[13px] text-rose">❌ Code not valid</p>}
        {peek?.valid && (
          <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 text-left">
            <span className="text-[30px] leading-none">👨‍👩‍👧‍👦</span>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold">{peek.familyName}</div>
              <div className="truncate text-[12px] text-muted">👋 {peek.invitedBy}</div>
            </div>
          </div>
        )}
        {peek?.valid && peek.hasPassword && (
          <div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value.toUpperCase())}
                placeholder="Password"
                autoCapitalize="characters"
                autoComplete="off"
                aria-label="Password"
                className="pl-12 text-center font-mono text-[20px] font-bold tracking-[0.15em]"
              />
            </div>
            <p className="mt-1.5 text-center text-[11.5px] text-muted">No password? Tap Join — the admin will let you in ⏳</p>
          </div>
        )}
        {error && <p className="text-center text-[13px] font-semibold text-rose">{error}</p>}
      </div>
    </Sheet>
  );
}

function Waiting({ name }: { name: string }) {
  const cancel = useMutation(api.family.cancelRequest);
  return (
    <div className="space-y-4 pt-10 text-center">
      <div className="animate-pulse text-[72px] leading-none">⏳</div>
      <h1 className="text-[22px] font-bold">{name}</h1>
      <p className="text-[14px] text-muted">Waiting for the admin 👑</p>
      <Button variant="ghost" onClick={() => cancel({})}>
        <X className="h-4 w-4" /> Cancel
      </Button>
    </div>
  );
}

/* ------------------------------- the family ------------------------------- */

function FamilyHome({ data }: { data: any }) {
  const respond = useMutation(api.family.respondToRequest);
  const [nudgeTo, setNudgeTo] = useState<any>(null);
  const [sheet, setSheet] = useState<null | "invite" | "settings">(null);
  const isOwner = data.me.role === "owner";

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2 pt-1">
        <span className="text-[28px] leading-none">👨‍👩‍👧‍👦</span>
        <h1 className="min-w-0 flex-1 truncate text-[22px] font-bold tracking-tight">{data.circle.name}</h1>
        <Button size="icon" variant="soft" onClick={() => setSheet("settings")} aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
        <Button size="sm" onClick={() => setSheet("invite")} aria-label="Invite" className="max-[359px]:w-10 max-[359px]:px-0">
          <UserPlus className="h-4 w-4" /> <span className="max-[359px]:hidden">Invite</span>
        </Button>
      </header>

      {data.pending.map((p: any) => (
        <Card key={p.memberId} className="flex items-center gap-3 border-amber/40 bg-amber/[0.08]">
          <Avatar name={p.name} size={44} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">{p.name}</div>
            <div className="text-[12px] text-muted">👋 wants to join</div>
          </div>
          <Button size="icon" variant="danger" onClick={() => respond({ memberId: p.memberId, approve: false })} aria-label="Decline">
            <X className="h-5 w-5" />
          </Button>
          <Button size="icon" onClick={() => respond({ memberId: p.memberId, approve: true })} aria-label="Let in">
            <Check className="h-5 w-5" />
          </Button>
        </Card>
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        {data.members.map((m: any) => (
          <MemberCard key={m.userId} m={m} onNudge={() => setNudgeTo(m)} />
        ))}
      </div>

      {data.members.length === 1 && (
        <button
          onClick={() => setSheet("invite")}
          className="flex w-full flex-col items-center gap-2 rounded-[22px] border border-dashed border-line py-8 text-muted active:scale-[0.99]"
        >
          <UserPlus className="h-8 w-8" />
          <span className="text-[14px] font-semibold">Invite family</span>
        </button>
      )}

      <NudgeSheet key={nudgeTo?.userId ?? "none"} to={nudgeTo} onClose={() => setNudgeTo(null)} />
      {sheet === "invite" && <InviteSheet open onClose={() => setSheet(null)} invites={data.invites} />}
      {sheet === "settings" && <SettingsSheet open onClose={() => setSheet(null)} me={data.me} isOwner={isOwner} circleName={data.circle.name} />}
    </div>
  );
}

function Hidden() {
  return <Lock className="h-3.5 w-3.5 text-muted/60" aria-label="Private" />;
}

function MemberCard({ m, onNudge }: { m: any; onNudge: () => void }) {
  const s = m.summary;
  const u = useUnits();
  const progress = dayProgress(s);
  const Head: any = m.isMe ? "div" : Link;
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <Head href={`/family/${m.userId}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={m.name} size={52} ring={progress ?? 0} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[16px] font-bold">{m.isMe ? "You" : m.name}</span>
              {m.role === "owner" && <Crown className="h-4 w-4 shrink-0 text-amber" aria-label="Admin" />}
              {m.muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="Muted" />}
            </div>
            {m.paused && !m.isMe ? (
              <div className="flex items-center gap-1 text-[12px] text-muted"><Pause className="h-3 w-3" /> paused</div>
            ) : progress != null ? (
              <div className="tabular text-[12px] text-muted">{Math.round(progress * 100)}% today</div>
            ) : null}
          </div>
        </Head>
        {!m.isMe && (
          <button
            onClick={onNudge}
            disabled={m.nudgesLeft === 0}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-[22px] text-accent-ink transition-all active:scale-90 disabled:opacity-35"
            aria-label={`Nudge ${m.name}`}
          >
            👋
          </button>
        )}
        {!m.isMe && <ChevronRight className="h-4 w-4 shrink-0 text-muted" />}
      </div>

      {!(m.paused && !m.isMe) && (
        <div className="space-y-2">
          <Row emoji="🍽️" hidden={!s.meals} value={s.meals?.kcal} max={s.meals?.kcalTarget} color="var(--amber)" label={s.meals && `${s.meals.kcal}`} />
          <Row
            emoji="💧"
            hidden={!s.water}
            value={s.water?.ml}
            max={s.water?.target}
            color="var(--sky)"
            label={s.water && `${(s.water.ml / 1000).toFixed(1)}L`}
          />
          <div className="flex items-center gap-2.5">
            <span className="w-6 text-center text-[17px]">💪</span>
            {s.workout ? (
              <div className="flex flex-1 items-center gap-1">
                {Array.from({ length: Math.max(s.workout.weekTarget, s.workout.weekDone) }, (_, i) => (
                  <span key={i} className={cn("h-2.5 flex-1 rounded-full", i < s.workout.weekDone ? "bg-mint" : "bg-surface-3")} />
                ))}
                <span className="ml-1.5 text-[14px]">{s.workout.today?.status === "completed" ? "✅" : ""}</span>
              </div>
            ) : (
              <Hidden />
            )}
          </div>
          <Row emoji="😴" hidden={!s.sleep} value={s.sleep?.minutes ?? 0} max={s.sleep?.target} color="var(--violet)" label={s.sleep && hhmm(s.sleep.minutes)} />
          {s.body && (
            <div className="flex items-center gap-2.5">
              <span className="w-6 text-center text-[17px]">⚖️</span>
              <span className="tabular text-[13px] font-semibold">{u.weight(s.body.weightKg)}</span>
              {s.body.changeWeek != null && (
                <span className="tabular text-[12px] text-muted">
                  {s.body.changeWeek > 0 ? "↑" : s.body.changeWeek < 0 ? "↓" : "→"} {u.weight(Math.abs(s.body.changeWeek))}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Row({ emoji, hidden, value, max, color, label }: { emoji: string; hidden: boolean; value?: number; max?: number; color: string; label?: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-6 text-center text-[17px]">{emoji}</span>
      {hidden ? (
        <Hidden />
      ) : (
        <>
          <Bar value={value ?? 0} max={max ?? 1} color={color} className="flex-1" height={10} />
          <span className="tabular w-12 shrink-0 text-right text-[12px] font-semibold text-muted">{label}</span>
        </>
      )}
    </div>
  );
}

/* --------------------------------- invite --------------------------------- */

function InviteSheet({ open, onClose, invites }: { open: boolean; onClose: () => void; invites: any[] }) {
  const create = useMutation(api.family.createInvite);
  const revoke = useMutation(api.family.revokeInvite);
  const toast = useToast();
  const [usePw, setUsePw] = useState(true);
  const [password, setPassword] = useState(() => randomToken(6));
  const [made, setMade] = useState<null | { code: string; password?: string }>(null);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  async function go() {
    setBusy(true);
    try {
      const r = await create({ password: usePw ? password : undefined });
      setMade({ code: r.code, password: usePw ? password : undefined });
    } catch (e: any) {
      toast({ message: errorText(e), tone: "var(--rose)" });
    } finally {
      setBusy(false);
    }
  }

  const shareText = (code: string, pw?: string) =>
    `👨‍👩‍👧‍👦 Join my family on FitOpe\n${window.location.origin}/join/${code}\nCode: ${formatCode(code)}${pw ? `\nPassword: ${pw}` : ""}`;

  async function share() {
    if (!made) return;
    const text = shareText(made.code, made.password);
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else {
      await navigator.clipboard.writeText(text);
      toast({ message: "📋 ✓" });
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="➕ Invite family">
      {!made ? (
        <div className="space-y-4">
          <button
            onClick={() => setUsePw((v) => !v)}
            className={cn("flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left", usePw ? "border-accent bg-accent-soft" : "border-line bg-surface-2")}
            aria-pressed={usePw}
          >
            <Lock className="h-6 w-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">Password</div>
              <div className="text-[12px] text-muted">{usePw ? "⚡ Joins instantly" : "⏳ You approve each person"}</div>
            </div>
            <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", usePw ? "bg-accent" : "bg-surface-3")}>
              <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-surface shadow transition-all", usePw ? "left-6" : "left-1")} />
            </span>
          </button>
          {usePw && (
            <div className="flex gap-2">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value.toUpperCase().slice(0, FAMILY_LIMITS.passwordMax))}
                className="text-center font-mono text-[22px] font-bold tracking-[0.2em]"
                aria-label="Password"
              />
              <Button size="icon" variant="soft" className="h-[52px] w-[52px] shrink-0" onClick={() => setPassword(randomToken(6))} aria-label="New password">
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          )}
          <Button className="w-full" size="lg" loading={busy} disabled={usePw && password.length < FAMILY_LIMITS.passwordMin} onClick={go}>
            <UserPlus className="h-5 w-5" /> Create invite
          </Button>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="rounded-3xl bg-surface-2 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Code</div>
            <div className="font-mono text-[34px] font-bold tracking-[0.12em]">{formatCode(made.code)}</div>
            {made.password && (
              <>
                <div className="mt-3 flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <Lock className="h-3 w-3" /> Password
                </div>
                <div className="font-mono text-[28px] font-bold tracking-[0.15em]">{made.password}</div>
              </>
            )}
            <div className="mt-3 text-[12px] text-muted">⏱ {FAMILY_LIMITS.inviteHours}h · 👥 {FAMILY_LIMITS.inviteMaxUses}</div>
          </div>
          <Button className="w-full" size="lg" onClick={share}>
            <Share2 className="h-5 w-5" /> Share
          </Button>
          <Button
            className="w-full"
            variant="soft"
            onClick={async () => {
              await navigator.clipboard.writeText(shareText(made.code, made.password));
              toast({ message: "📋 ✓" });
            }}
          >
            <Copy className="h-4 w-4" /> Copy
          </Button>
        </div>
      )}

      {invites.length > 0 && (
        <div className="mt-6 space-y-2 border-t border-line pt-4">
          {invites.map((i) => (
            <div key={i._id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-2.5">
              {i.hasPassword ? <Lock className="h-4 w-4 text-muted" /> : <KeyRound className="h-4 w-4 text-muted" />}
              <span className="flex-1 font-mono text-[15px] font-bold tracking-wider">{formatCode(i.code)}</span>
              <span className="tabular text-[12px] text-muted">⏱ {Math.max(1, Math.round((i.expiresAt - now) / 3600000))}h</span>
              <button onClick={() => revoke({ inviteId: i._id })} className="rounded-lg p-1.5 text-muted hover:text-rose" aria-label="Cancel invite">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* -------------------------------- settings -------------------------------- */

const SHARE_ITEMS = [
  { key: "meals", emoji: "🍽️", label: "Food" },
  { key: "water", emoji: "💧", label: "Water" },
  { key: "workouts", emoji: "💪", label: "Workouts" },
  { key: "sleep", emoji: "😴", label: "Sleep" },
  { key: "body", emoji: "⚖️", label: "Weight" },
] as const;

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-mint" : "bg-surface-3")}>
      <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-surface shadow transition-all", on ? "left-6" : "left-1")} />
    </span>
  );
}

function SettingsSheet({ open, onClose, me, isOwner, circleName }: { open: boolean; onClose: () => void; me: any; isOwner: boolean; circleName: string }) {
  const update = useMutation(api.family.updateMySharing);
  const rename = useMutation(api.family.renameCircle);
  const leave = useMutation(api.family.leaveCircle);
  const push = usePush();
  const [name, setName] = useState(circleName);

  return (
    <Sheet open={open} onClose={onClose} title="⚙️ Family settings">
      <div className="space-y-5">
        {/* What I share */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted">👀 Family can see</div>
          <div className="space-y-1.5">
            {SHARE_ITEMS.map((it) => {
              const on = !!me.shares[it.key];
              return (
                <button
                  key={it.key}
                  onClick={() => update({ shares: { ...me.shares, [it.key]: !on } })}
                  aria-pressed={on}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3 text-left"
                >
                  <span className="text-[22px] leading-none">{it.emoji}</span>
                  <span className="flex-1 text-[14.5px] font-semibold">{it.label}</span>
                  <Toggle on={on} />
                </button>
              );
            })}
            <div className="flex items-center gap-3 rounded-2xl px-3.5 py-3 opacity-60">
              <span className="text-[22px] leading-none">📷</span>
              <span className="flex-1 text-[14.5px] font-semibold">Photos</span>
              <Lock className="h-5 w-5" aria-label="Always private" />
            </div>
          </div>
        </div>

        <button
          onClick={() => update({ paused: !me.paused })}
          aria-pressed={me.paused}
          className={cn("flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left", me.paused ? "border-amber bg-amber/10" : "border-line")}
        >
          <Pause className="h-5 w-5" />
          <span className="flex-1 text-[14.5px] font-semibold">Pause sharing</span>
          <Toggle on={me.paused} />
        </button>

        {push.state !== "unsupported" && push.state !== "loading" && (
          <div>
            {push.state === "ios-install" ? (
              <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3">
                <Bell className="h-5 w-5 shrink-0" />
                <span className="text-[13px]">
                  Tap <Share2 className="inline h-4 w-4" /> then <b>Add to Home Screen</b> to get 🔔
                </span>
              </div>
            ) : push.state === "blocked" ? (
              <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3 text-muted">
                <BellOff className="h-5 w-5 shrink-0" />
                <span className="text-[13px]">🔔 blocked in browser settings</span>
              </div>
            ) : (
              <button
                onClick={() => (push.state === "on" ? push.disable() : push.enable())}
                aria-pressed={push.state === "on"}
                className="flex w-full items-center gap-3 rounded-2xl border border-line px-3.5 py-3 text-left"
              >
                <Bell className="h-5 w-5" />
                <span className="flex-1 text-[14.5px] font-semibold">Phone notifications</span>
                <Toggle on={push.state === "on"} />
              </button>
            )}
          </div>
        )}

        {isOwner && (
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Family name" />
            <Button variant="soft" className="h-[52px] shrink-0" disabled={!name.trim() || name === circleName} onClick={() => rename({ name })}>
              <Check className="h-5 w-5" />
            </Button>
          </div>
        )}

        <ConfirmButton className="w-full" size="md" onConfirm={() => { leave({}); onClose(); }} confirmLabel="Tap again to leave">
          <LogOut className="h-4 w-4" /> Leave family
        </ConfirmButton>
      </div>
    </Sheet>
  );
}
