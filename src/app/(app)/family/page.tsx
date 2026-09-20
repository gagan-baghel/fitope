"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
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

  if (data === undefined) return <Skeleton className="h-64 w-full" />;
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
    <div className="space-y-3 pt-4 text-center">
      <div className="text-[56px] leading-none">👨‍👩‍👧‍👦</div>
      <h1 className="text-[20px] font-bold tracking-tight">Family</h1>
      <p className="mx-auto max-w-xs text-[13px] text-muted">🍽️ 💧 💪 😴 — see each other, cheer each other.</p>
      <div className="mx-auto grid max-w-sm gap-2 pt-1">
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
      <div className="space-y-2.5">
        <Input
          value={c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4, 8)}` : c}
          onChange={(e) => setCode(normalizeCode(e.target.value).slice(0, 8))}
          placeholder="ABCD-2345"
          autoCapitalize="characters"
          autoComplete="off"
          aria-label="Invite code"
          className="text-center font-mono text-[20px] font-bold tracking-[0.18em]"
        />
        {peek?.valid === false && <p className="text-center text-[12.5px] text-rose">❌ Code not valid</p>}
        {peek?.valid && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-surface-2 p-2.5 text-left">
            <span className="text-[24px] leading-none">👨‍👩‍👧‍👦</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-bold">{peek.familyName}</div>
              <div className="truncate text-[11.5px] text-muted">👋 {peek.invitedBy}</div>
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
                className="pl-12 text-center font-mono text-[18px] font-bold tracking-[0.15em]"
              />
            </div>
            <p className="mt-1.5 text-center text-[11px] text-muted">No password? Tap Join — the admin approves ⏳</p>
          </div>
        )}
        {error && <p className="text-center text-[12.5px] font-semibold text-rose">{error}</p>}
      </div>
    </Sheet>
  );
}

function Waiting({ name }: { name: string }) {
  const cancel = useMutation(api.family.cancelRequest);
  return (
    <div className="space-y-3 pt-8 text-center">
      <div className="animate-pulse text-[56px] leading-none">⏳</div>
      <h1 className="truncate text-[20px] font-bold">{name}</h1>
      <p className="text-[13px] text-muted">Waiting for the admin 👑</p>
      <Button variant="ghost" onClick={() => cancel({})}>
        <X className="h-4 w-4" /> Cancel
      </Button>
    </div>
  );
}

/* ------------------------------- the family ------------------------------- */

function FamilyHome({ data }: { data: any }) {
  const respond = useMutation(api.family.respondToRequest);
  const switchCircle = useMutation(api.family.switchCircle);
  const [nudgeTo, setNudgeTo] = useState<any>(null);
  const [sheet, setSheet] = useState<null | "invite" | "settings">(null);
  const isOwner = data.me.role === "owner";
  const multiCircle = (data.myCircles?.length ?? 0) > 1;

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <span className="shrink-0 text-[22px] leading-none">👨‍👩‍👧‍👦</span>
        <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-tight">{data.circle.name}</h1>
        <Button size="icon" variant="soft" onClick={() => setSheet("settings")} aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
        <Button size="sm" onClick={() => setSheet("invite")} aria-label="Invite" className="max-[359px]:w-10 max-[359px]:px-0">
          <UserPlus className="h-4 w-4" /> <span className="max-[359px]:hidden">Invite</span>
        </Button>
      </header>

      {/* Circle switcher — only visible when the user belongs to more than one circle */}
      {multiCircle && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {(data.myCircles as { circleId: Id<"circles">; name: string; isActive: boolean }[]).map((c) => (
            <button
              key={c.circleId}
              onClick={() => { if (!c.isActive) switchCircle({ circleId: c.circleId }); }}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                c.isActive
                  ? "bg-accent text-accent-ink"
                  : "bg-surface-2 text-ink-2 active:bg-surface-3"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {data.pending.map((p: any) => (
        <Card key={p.memberId} className="flex items-center gap-2 border-amber/40 bg-amber/[0.08]">
          <Avatar name={p.name} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold">{p.name}</div>
            <div className="text-[11px] text-muted">👋 wants to join</div>
          </div>
          <Button size="icon" variant="danger" onClick={() => respond({ memberId: p.memberId, approve: false })} aria-label="Decline">
            <X className="h-5 w-5" />
          </Button>
          <Button size="icon" onClick={() => respond({ memberId: p.memberId, approve: true })} aria-label="Let in">
            <Check className="h-5 w-5" />
          </Button>
        </Card>
      ))}

      <div className="grid gap-2 sm:grid-cols-2">
        {data.members.map((m: any) => (
          <MemberCard key={m.userId} m={m} onNudge={() => setNudgeTo(m)} />
        ))}
      </div>

      {data.members.length === 1 && (
        <button
          onClick={() => setSheet("invite")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-4 text-muted active:scale-[0.99]"
        >
          <UserPlus className="h-5 w-5" />
          <span className="text-[13px] font-semibold">Invite family</span>
        </button>
      )}

      <NudgeSheet key={nudgeTo?.userId ?? "none"} to={nudgeTo} onClose={() => setNudgeTo(null)} />
      {sheet === "invite" && <InviteSheet open onClose={() => setSheet(null)} invites={data.invites} />}
      {sheet === "settings" && <SettingsSheet open onClose={() => setSheet(null)} me={data.me} isOwner={isOwner} circleName={data.circle.name} circleCount={data.myCircles?.length ?? 1} />}
    </div>
  );
}


/**
 * One member's day. Every row names what it is and what the goal is: the previous version
 * was a bare emoji, a bar and a number, so "🍽️ ▬▬▬ 1290" gave no way to tell what was being
 * measured or whether 1290 was good. Protein and meal count were fetched and never shown.
 */
function MemberCard({ m, onNudge }: { m: any; onNudge: () => void }) {
  const s = m.summary;
  const u = useUnits();
  const progress = dayProgress(s);
  const paused = m.paused && !m.isMe;
  const Head: any = m.isMe ? "div" : Link;
  const shares = !!(s.meals || s.water || s.workout || s.sleep || s.body);

  return (
    <Card className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <Head href={`/family/${m.userId}`} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={m.name} size={44} ring={progress ?? 0} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1">
              <span className="min-w-0 truncate text-[14px] font-bold">{m.isMe ? "You" : m.name}</span>
              {m.role === "owner" && <Crown className="h-3.5 w-3.5 shrink-0 text-amber" aria-label="Admin" />}
              {m.muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="Muted" />}
            </div>
            {/* The avatar ring is a percentage of nothing obvious unless it says so. */}
            <div className="truncate text-[11px] text-muted">
              {paused ? (
                "Sharing paused"
              ) : progress != null ? (
                <>
                  <span className="tabular font-semibold text-ink-2">{Math.round(progress * 100)}%</span> of today&apos;s goals
                </>
              ) : shares ? (
                "Nothing logged today"
              ) : (
                "Shares nothing yet"
              )}
            </div>
          </div>
        </Head>
        {!m.isMe && (
          <button
            onClick={onNudge}
            disabled={m.nudgesLeft === 0}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-[20px] text-accent-ink transition-all active:scale-90 disabled:opacity-35"
            aria-label={`Nudge ${m.name}`}
          >
            👋
          </button>
        )}
        {!m.isMe && <ChevronRight className="h-4 w-4 shrink-0 text-muted" />}
      </div>

      {paused ? (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-[11.5px] text-muted">
          {m.name.split(" ")[0]} has paused sharing. Nothing from today is visible.
        </p>
      ) : (
        <div className="space-y-2 border-t border-line pt-2.5">
          <Metric
            icon="🍽️"
            label="Calories"
            shared={!!s.meals}
            value={s.meals?.kcal}
            max={s.meals?.kcalTarget}
            text={s.meals && `${s.meals.kcal}`}
            goal={s.meals && `${s.meals.kcalTarget}`}
            note={s.meals ? (s.meals.count ? `${s.meals.count} meal${s.meals.count === 1 ? "" : "s"}` : "nothing logged") : undefined}
            color="var(--amber)"
          />
          {/* Protein comes down with the meals summary and was simply never rendered. */}
          <Metric
            icon="🥚"
            label="Protein"
            shared={!!s.meals}
            value={s.meals?.protein}
            max={s.meals?.proteinTarget}
            text={s.meals && `${s.meals.protein} g`}
            goal={s.meals && `${s.meals.proteinTarget} g`}
            color="var(--rose)"
          />
          <Metric
            icon="💧"
            label="Water"
            shared={!!s.water}
            value={s.water?.ml}
            max={s.water?.target}
            text={s.water && `${(s.water.ml / 1000).toFixed(1)} L`}
            goal={s.water && `${((s.water.target || 0) / 1000).toFixed(1)} L`}
            color="var(--sky)"
          />
          <Metric
            icon="💪"
            label="Workouts"
            shared={!!s.workout}
            text={s.workout && `${s.workout.weekDone}`}
            goal={s.workout && `${s.workout.weekTarget} this week`}
            note={
              s.workout
                ? s.workout.today?.status === "completed"
                  ? `✅ ${s.workout.today.title}`
                  : s.workout.today
                    ? `Today: ${s.workout.today.title}`
                    : "Rest day today"
                : undefined
            }
          >
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: Math.max(s.workout?.weekTarget ?? 0, s.workout?.weekDone ?? 0, 1) }, (_, i) => (
                <span
                  key={i}
                  className={cn("h-1.5 flex-1 rounded-full", i < (s.workout?.weekDone ?? 0) ? "bg-mint" : "bg-surface-3")}
                />
              ))}
            </div>
          </Metric>
          <Metric
            icon="😴"
            label="Sleep"
            shared={!!s.sleep}
            value={s.sleep?.minutes ?? 0}
            max={s.sleep?.target}
            text={s.sleep && (s.sleep.minutes ? hhmm(s.sleep.minutes) : "Not logged")}
            /* No goal alongside "Not logged" — "Not logged / 8h" reads as a measurement. */
            goal={s.sleep?.minutes ? hhmm(s.sleep.target) : null}
            color="var(--violet)"
          />
          {s.body ? (
            <Metric
              icon="⚖️"
              label="Weight"
              shared
              text={u.weight(s.body.weightKg)}
              note={
                s.body.changeWeek != null
                  ? `${s.body.changeWeek > 0 ? "↑" : s.body.changeWeek < 0 ? "↓" : "→"} ${u.weight(Math.abs(s.body.changeWeek))} this week`
                  : "first weigh-in"
              }
            />
          ) : (
            <Metric icon="⚖️" label="Weight" shared={false} />
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * A labelled row: what it is, where they are, what they were aiming for. `children` replaces
 * the bar for metrics a bar cannot express (a week of workouts).
 */
function Metric({
  icon,
  label,
  shared,
  value,
  max,
  text,
  goal,
  note,
  color,
  children,
}: {
  icon: string;
  label: string;
  shared: boolean;
  value?: number;
  max?: number;
  text?: string | null;
  goal?: string | null;
  note?: string;
  color?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="w-4 shrink-0 text-center text-[12px] leading-none">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink-2">{label}</span>
        {shared ? (
          <span className="tabular shrink-0 text-[12px] font-bold">
            {text}
            {goal && <span className="font-medium text-muted"> / {goal}</span>}
          </span>
        ) : (
          /* "Private" in words — a lone padlock glyph does not tell you whose choice it was. */
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
            <Lock className="h-3 w-3" /> Private
          </span>
        )}
      </div>
      {shared &&
        (children ?? (color ? <Bar value={value ?? 0} max={max || 1} color={color} className="mt-1" height={5} /> : null))}
      {shared && note && <div className="mt-0.5 truncate pl-[22px] text-[10.5px] text-muted">{note}</div>}
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
        <div className="space-y-3">
          <button
            onClick={() => setUsePw((v) => !v)}
            className={cn("flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-left", usePw ? "border-accent bg-accent-soft" : "border-line bg-surface-2")}
            aria-pressed={usePw}
          >
            <Lock className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">Password</div>
              <div className="truncate text-[11px] text-muted">{usePw ? "⚡ Joins instantly" : "⏳ You approve each person"}</div>
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
                className="min-w-0 text-center font-mono text-[18px] font-bold tracking-[0.15em]"
                aria-label="Password"
              />
              <Button size="icon" variant="soft" className="h-12 w-12 shrink-0" onClick={() => setPassword(randomToken(6))} aria-label="New password">
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          )}
          <Button className="w-full" size="lg" loading={busy} disabled={usePw && password.length < FAMILY_LIMITS.passwordMin} onClick={go}>
            <UserPlus className="h-5 w-5" /> Create invite
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5 text-center">
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Code</div>
            <div className="font-mono text-[26px] font-bold tracking-[0.1em]">{formatCode(made.code)}</div>
            {made.password && (
              <>
                <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  <Lock className="h-3 w-3" /> Password
                </div>
                <div className="font-mono text-[22px] font-bold tracking-[0.12em]">{made.password}</div>
              </>
            )}
            <div className="mt-2 text-[11px] text-muted">⏱ {FAMILY_LIMITS.inviteHours}h · 👥 {FAMILY_LIMITS.inviteMaxUses}</div>
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
        <div className="mt-4 space-y-1.5 border-t border-line pt-3">
          {invites.map((i) => (
            <div key={i._id} className="flex items-center gap-2 rounded-2xl bg-surface-2 px-2.5 py-1.5">
              {i.hasPassword ? <Lock className="h-4 w-4 shrink-0 text-muted" /> : <KeyRound className="h-4 w-4 shrink-0 text-muted" />}
              <span className="min-w-0 flex-1 truncate font-mono text-[13.5px] font-bold tracking-wide">{formatCode(i.code)}</span>
              <span className="tabular shrink-0 text-[11px] text-muted">⏱ {Math.max(1, Math.round((i.expiresAt - now) / 3600000))}h</span>
              <button onClick={() => revoke({ inviteId: i._id })} className="-my-2 shrink-0 rounded-lg p-2 text-muted hover:text-rose" aria-label="Cancel invite">
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

function SettingsSheet({
  open,
  onClose,
  me,
  isOwner,
  circleName,
  circleCount,
}: {
  open: boolean;
  onClose: () => void;
  me: any;
  isOwner: boolean;
  circleName: string;
  circleCount: number;
}) {
  const update = useMutation(api.family.updateMySharing);
  const rename = useMutation(api.family.renameCircle);
  const leave = useMutation(api.family.leaveCircle);
  const create = useMutation(api.family.createCircle);
  const push = usePush();
  const toast = useToast();
  const me2 = useQuery(api.profiles.me, {});
  const [name, setName] = useState(circleName);
  const [addSheet, setAddSheet] = useState<null | "create" | "join">(null);
  const [newName, setNewName] = useState("");
  const canAdd = circleCount < FAMILY_LIMITS.maxCircles;

  return (
    <Sheet open={open} onClose={onClose} title="⚙️ Family settings">
      <div className="space-y-3">
        {/* What I share */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">👀 Family can see</div>
          <div className="space-y-1">
            {SHARE_ITEMS.map((it) => {
              const on = !!me.shares[it.key];
              return (
                <button
                  key={it.key}
                  onClick={() => update({ shares: { ...me.shares, [it.key]: !on } })}
                  aria-pressed={on}
                  className="flex w-full items-center gap-2.5 rounded-2xl bg-surface-2 px-3 py-2.5 text-left"
                >
                  <span className="shrink-0 text-[18px] leading-none">{it.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{it.label}</span>
                  <Toggle on={on} />
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => update({ paused: !me.paused })}
          aria-pressed={me.paused}
          className={cn("flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left", me.paused ? "border-amber bg-amber/10" : "border-line")}
        >
          <Pause className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">Pause sharing</span>
          <Toggle on={me.paused} />
        </button>

        {push.state !== "unsupported" && push.state !== "loading" && (
          <div>
            {push.state === "ios-install" ? (
              <div className="flex items-center gap-2.5 rounded-2xl bg-surface-2 px-3 py-2.5">
                <Bell className="h-5 w-5 shrink-0" />
                <span className="min-w-0 text-[12.5px]">
                  Tap <Share2 className="inline h-4 w-4" /> then <b>Add to Home Screen</b> to get 🔔
                </span>
              </div>
            ) : push.state === "blocked" ? (
              <div className="flex items-center gap-2.5 rounded-2xl bg-surface-2 px-3 py-2.5 text-muted">
                <BellOff className="h-5 w-5 shrink-0" />
                <span className="min-w-0 text-[12.5px]">🔔 blocked in browser settings</span>
              </div>
            ) : (
              <button
                onClick={() => (push.state === "on" ? push.disable() : push.enable())}
                aria-pressed={push.state === "on"}
                className="flex w-full items-center gap-2.5 rounded-2xl border border-line px-3 py-2.5 text-left"
              >
                <Bell className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">Phone notifications</span>
                <Toggle on={push.state === "on"} />
              </button>
            )}
          </div>
        )}

        {isOwner && (
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Family name" className="min-w-0" />
            <Button variant="soft" className="h-12 shrink-0" disabled={!name.trim() || name === circleName} onClick={() => rename({ name })}>
              <Check className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Add another circle */}
        {canAdd && (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Add another circle</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="soft"
                size="sm"
                className="h-10"
                onClick={() => {
                  const first = me2?.profile?.name?.split(" ")[0];
                  setNewName(first ? `${first}'s circle` : "");
                  setAddSheet("create");
                }}
              >
                <UserPlus className="h-4 w-4" /> Create
              </Button>
              <Button variant="soft" size="sm" className="h-10" onClick={() => setAddSheet("join")}>
                <KeyRound className="h-4 w-4" /> Join
              </Button>
            </div>
          </div>
        )}

        <ConfirmButton className="w-full" size="md" onConfirm={() => { leave({}); onClose(); }} confirmLabel="Tap again to leave">
          <LogOut className="h-4 w-4" /> Leave family
        </ConfirmButton>
      </div>

      {/* Nested sheets for adding a circle */}
      <Sheet
        open={addSheet === "create"}
        onClose={() => setAddSheet(null)}
        title="➕ Create circle"
        footer={
          <Button
            className="w-full"
            size="lg"
            disabled={!newName.trim()}
            onClick={async () => {
              try {
                await create({ name: newName, timezone: tz() });
                setAddSheet(null);
                onClose();
              } catch (e: any) {
                toast({ message: errorText(e), tone: "var(--rose)" });
              }
            }}
          >
            <Check className="h-5 w-5" /> Create
          </Button>
        }
      >
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Partner circle" maxLength={40} aria-label="Circle name" />
        <p className="mt-2 text-[11.5px] text-muted">People in this circle won&apos;t know about your other circles.</p>
      </Sheet>

      <JoinSheet open={addSheet === "join"} onClose={() => { setAddSheet(null); onClose(); }} initialCode="" />
    </Sheet>
  );
}

