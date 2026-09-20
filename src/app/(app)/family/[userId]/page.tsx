"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card, ConfirmButton, EmptyState, Skeleton } from "@/components/ui";
import { Avatar, NudgeSheet } from "@/components/family";
import { DAY_LABELS, cn, hhmm } from "@/lib/utils";
import { useUnits } from "@/lib/units";
import { ArrowLeft, Bell, BellOff, Crown, Lock, Pause, UserMinus } from "lucide-react";

export default function FamilyMember() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const d = useQuery(api.family.member, { userId: userId as any });
  const overview = useQuery(api.family.overview, {});
  const setMuted = useMutation(api.family.setMuted);
  const remove = useMutation(api.family.removeMember);
  const makeAdmin = useMutation(api.family.makeAdmin);
  const [nudging, setNudging] = useState(false);
  const u = useUnits();

  if (d === undefined || overview === undefined) return <Skeleton className="h-64 w-full" />;
  if (d === null)
    return <EmptyState icon={<Lock className="h-5 w-5" />} title="Private" action={<Link href="/family" className="font-semibold text-accent">← Family</Link>} />;

  const row = overview?.members?.find((m: any) => m.userId === d.userId);
  const iAmOwner = overview?.me?.role === "owner";
  const weightDelta =
    d.weight && d.weight.length > 1 ? Math.round((d.weight[d.weight.length - 1].trend - d.weight[0].trend) * 10) / 10 : null;

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <button onClick={() => router.back()} className="-ml-2 shrink-0 rounded-xl p-2 text-muted hover:bg-surface-2" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={d.name} size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-bold">{d.name}</h1>
          {d.paused && <div className="flex items-center gap-1 text-[11px] text-muted"><Pause className="h-3 w-3" /> paused</div>}
        </div>
        {!d.isMe && (
          <button
            onClick={() => setNudging(true)}
            disabled={!row?.nudgesLeft}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-[20px] text-accent-ink active:scale-90 disabled:opacity-35"
            aria-label="Nudge"
          >
            👋
          </button>
        )}
      </header>

      <div className="text-[11.5px] text-muted">Last 7 days · bars are days, the dashed line is the goal</div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Week emoji="🍽️" label="Calories" series={d.kcal} target={d.targets?.kcal} color="var(--amber)" fmt={(v) => `${v}`} />
        <Week emoji="🥚" label="Protein" series={d.protein} target={d.targets?.protein} color="var(--rose)" fmt={(v) => `${v} g`} />
        <Week emoji="💧" label="Water" series={d.water} target={d.targets?.waterMl} color="var(--sky)" fmt={(v) => `${(v / 1000).toFixed(1)} L`} />
        <Week emoji="😴" label="Sleep" series={d.sleep} target={d.targets?.sleepMinutes} color="var(--violet)" fmt={(v) => hhmm(v)} />
      </div>

      <Card>
        <div className="mb-2 flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-[16px] leading-none">💪</span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold">Workouts</span>
          {d.workouts && (
            <span className="tabular shrink-0 text-[11.5px] text-muted">
              {d.workouts.filter((w: any) => w.value?.status === "completed").length} of {d.workouts.length} days
            </span>
          )}
        </div>
        {d.workouts ? (
          <>
            <div className="grid grid-cols-7 gap-1">
              {d.workouts.map((w: any) => (
                <div key={w.date} className="flex min-w-0 flex-col items-center gap-0.5">
                  <div
                    className={cn(
                      "grid aspect-square w-full place-items-center rounded-lg text-[14px]",
                      w.value?.status === "completed" ? "bg-mint/20" : w.value ? "bg-surface-2" : "bg-surface-2/50"
                    )}
                    title={w.value?.title ?? "No session"}
                  >
                    {w.value?.status === "completed" ? "✅" : w.value?.status === "skipped" ? "➖" : ""}
                  </div>
                  <span className="text-[10px] text-muted">{DAY_LABELS[new Date(w.date + "T00:00:00").getDay()]}</span>
                </div>
              ))}
            </div>
            {/* Three glyphs with no key is a puzzle, not a chart. */}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-muted">
              <span>✅ trained</span>
              <span>➖ rest</span>
              <span>▫️ nothing logged</span>
            </div>
          </>
        ) : (
          <p className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <Lock className="h-3.5 w-3.5" /> Not shared
          </p>
        )}
      </Card>

      {d.weight && d.weight.length > 0 && (
        <Card className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[16px] leading-none">⚖️</span>
          <div className="min-w-0 flex-1">
            <div className="text-[11.5px] font-semibold text-ink-2">Weight</div>
            <div className="tabular truncate text-[17px] font-bold">{u.weight(d.weight[d.weight.length - 1].value)}</div>
          </div>
          {weightDelta != null && (
            <span className="tabular shrink-0 text-right text-[11px] text-muted">
              {weightDelta > 0 ? "↑" : weightDelta < 0 ? "↓" : "→"} {u.weight(Math.abs(weightDelta))}
              <br />
              over 60 days
            </span>
          )}
        </Card>
      )}

      {!d.isMe && (
        <div className="space-y-1.5 pt-1">
          <button
            onClick={() => setMuted({ userId: d.userId, muted: !d.muted })}
            className="flex w-full items-center gap-2.5 rounded-2xl border border-line px-3 py-2.5 text-left"
          >
            {d.muted ? <BellOff className="h-5 w-5 shrink-0 text-muted" /> : <Bell className="h-5 w-5 shrink-0" />}
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{d.muted ? "Unmute" : "Mute"} {d.name.split(" ")[0]}</span>
          </button>
          {iAmOwner && (
            <>
              <ConfirmButton variant="outline" size="md" className="w-full justify-start" onConfirm={() => makeAdmin({ userId: d.userId })} confirmLabel="Tap again">
                <Crown className="h-4 w-4 text-amber" /> Make admin
              </ConfirmButton>
              <ConfirmButton
                size="md"
                className="w-full justify-start"
                onConfirm={async () => {
                  await remove({ userId: d.userId });
                  router.replace("/family");
                }}
                confirmLabel="Tap again to remove"
              >
                <UserMinus className="h-4 w-4" /> Remove from family
              </ConfirmButton>
            </>
          )}
        </div>
      )}

      <NudgeSheet key={String(nudging)} to={nudging && row ? row : null} onClose={() => setNudging(false)} />
    </div>
  );
}

/** Seven bars, one per day, with the target as a line — readable without any numbers. */
function Week({
  emoji,
  label,
  series,
  target,
  color,
  fmt,
}: {
  emoji: string;
  label: string;
  series: { date: string; value: number }[] | null;
  target?: number;
  color: string;
  fmt: (v: number) => string;
}) {
  if (!series)
    return (
      <Card className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-[16px] leading-none">{emoji}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{label}</span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
          <Lock className="h-3 w-3" /> Private
        </span>
      </Card>
    );
  // An absent target arrives as 0 as often as undefined — treat both as "no target" so the
  // card never shows "🎯 0" or pins the goal line to the floor.
  const goal = target || null;
  const max = Math.max(goal ?? 0, ...series.map((s) => s.value), 1);
  const last = series[series.length - 1];
  return (
    <Card>
      <div className="mb-0.5 flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-[16px] leading-none">{emoji}</span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink-2">{label}</span>
        {goal != null && <span className="tabular shrink-0 text-[10.5px] text-muted">Goal {fmt(goal)}</span>}
      </div>
      <div className="mb-2 flex min-w-0 items-baseline gap-1.5">
        <span className="tabular min-w-0 truncate text-[17px] font-bold">{fmt(last.value)}</span>
        <span className="shrink-0 text-[10.5px] text-muted">today</span>
      </div>
      <div className="relative flex h-16 items-end gap-1">
        {goal != null && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink/25" style={{ bottom: `${(goal / max) * 100}%` }} />
        )}
        {series.map((s) => (
          <div key={s.date} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t-md"
              style={{ height: `${Math.max(s.value ? 4 : 0, (s.value / max) * 100)}%`, background: color, opacity: goal && s.value >= goal ? 1 : 0.6 }}
              title={`${s.date}: ${fmt(s.value)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {series.map((s) => (
          <span key={s.date} className="min-w-0 flex-1 text-center text-[10px] text-muted">
            {DAY_LABELS[new Date(s.date + "T00:00:00").getDay()]}
          </span>
        ))}
      </div>
    </Card>
  );
}
