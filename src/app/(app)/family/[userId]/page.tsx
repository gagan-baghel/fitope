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

  if (d === undefined || overview === undefined) return <Skeleton className="h-96 w-full" />;
  if (d === null)
    return <EmptyState icon={<Lock className="h-5 w-5" />} title="🔒" action={<Link href="/family" className="font-semibold text-accent">← Family</Link>} />;

  const row = overview?.members?.find((m: any) => m.userId === d.userId);
  const iAmOwner = overview?.me?.role === "owner";
  const weightDelta =
    d.weight && d.weight.length > 1 ? Math.round((d.weight[d.weight.length - 1].trend - d.weight[0].trend) * 10) / 10 : null;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pt-1">
        <button onClick={() => router.back()} className="-ml-2 rounded-xl p-2 text-muted hover:bg-surface-2" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={d.name} size={48} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-bold">{d.name}</h1>
          {d.paused && <div className="flex items-center gap-1 text-[12px] text-muted"><Pause className="h-3 w-3" /> paused</div>}
        </div>
        {!d.isMe && (
          <button
            onClick={() => setNudging(true)}
            disabled={!row?.nudgesLeft}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-[22px] text-accent-ink active:scale-90 disabled:opacity-35"
            aria-label="Nudge"
          >
            👋
          </button>
        )}
      </header>

      <Week emoji="🍽️" series={d.kcal} target={d.targets?.kcal} color="var(--amber)" fmt={(v) => `${v}`} />
      <Week emoji="🥚" series={d.protein} target={d.targets?.protein} color="var(--rose)" fmt={(v) => `${v}g`} />
      <Week emoji="💧" series={d.water} target={d.targets?.waterMl} color="var(--sky)" fmt={(v) => `${(v / 1000).toFixed(1)}L`} />
      <Week emoji="😴" series={d.sleep} target={d.targets?.sleepMinutes} color="var(--violet)" fmt={(v) => hhmm(v)} />

      <Card>
        <div className="mb-3 text-[22px] leading-none">💪</div>
        {d.workouts ? (
          <div className="grid grid-cols-7 gap-1.5">
            {d.workouts.map((w: any) => (
              <div key={w.date} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "grid aspect-square w-full place-items-center rounded-xl text-[16px]",
                    w.value?.status === "completed" ? "bg-mint/20" : w.value ? "bg-surface-2" : "bg-surface-2/50"
                  )}
                  title={w.value?.title}
                >
                  {w.value?.status === "completed" ? "✅" : w.value?.status === "skipped" ? "➖" : ""}
                </div>
                <span className="text-[10px] text-muted">{DAY_LABELS[new Date(w.date + "T00:00:00").getDay()]}</span>
              </div>
            ))}
          </div>
        ) : (
          <Lock className="h-4 w-4 text-muted" aria-label="Private" />
        )}
      </Card>

      {d.weight && d.weight.length > 0 && (
        <Card className="flex items-center gap-3">
          <span className="text-[22px] leading-none">⚖️</span>
          <span className="tabular text-[20px] font-bold">{u.weight(d.weight[d.weight.length - 1].value)}</span>
          {weightDelta != null && (
            <span className="tabular text-[13px] text-muted">
              {weightDelta > 0 ? "↑" : weightDelta < 0 ? "↓" : "→"} {u.weight(Math.abs(weightDelta))} · 60d
            </span>
          )}
        </Card>
      )}

      {!d.isMe && (
        <div className="space-y-2 pt-2">
          <button
            onClick={() => setMuted({ userId: d.userId, muted: !d.muted })}
            className="flex w-full items-center gap-3 rounded-2xl border border-line px-4 py-3 text-left"
          >
            {d.muted ? <BellOff className="h-5 w-5 text-muted" /> : <Bell className="h-5 w-5" />}
            <span className="flex-1 text-[14px] font-semibold">{d.muted ? "Unmute" : "Mute"} {d.name.split(" ")[0]}</span>
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
  series,
  target,
  color,
  fmt,
}: {
  emoji: string;
  series: { date: string; value: number }[] | null;
  target?: number;
  color: string;
  fmt: (v: number) => string;
}) {
  if (!series)
    return (
      <Card className="flex items-center gap-3">
        <span className="text-[22px] leading-none">{emoji}</span>
        <Lock className="h-4 w-4 text-muted" aria-label="Private" />
      </Card>
    );
  const max = Math.max(target ?? 0, ...series.map((s) => s.value), 1);
  const last = series[series.length - 1];
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[22px] leading-none">{emoji}</span>
        <span className="tabular flex-1 text-[17px] font-bold">{fmt(last.value)}</span>
        {target != null && <span className="tabular text-[12px] text-muted">🎯 {fmt(target)}</span>}
      </div>
      <div className="relative flex h-24 items-end gap-1.5">
        {target != null && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink/25" style={{ bottom: `${(target / max) * 100}%` }} />
        )}
        {series.map((s) => (
          <div key={s.date} className="flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t-lg"
              style={{ height: `${Math.max(s.value ? 4 : 0, (s.value / max) * 100)}%`, background: color, opacity: target && s.value >= target ? 1 : 0.6 }}
              title={`${s.date}: ${fmt(s.value)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {series.map((s) => (
          <span key={s.date} className="flex-1 text-center text-[10px] text-muted">
            {DAY_LABELS[new Date(s.date + "T00:00:00").getDay()]}
          </span>
        ))}
      </div>
    </Card>
  );
}
