"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Card,
  Bar,
  Pill,
  Ring,
  SectionTitle,
  Skeleton,
  EmptyState,
  useToast,
} from "@/components/ui";
import { CheckinSheet, SleepSheet, WeightSheet } from "@/components/quick-log";
import {
  ArrowRight,
  BedDouble,
  ChevronRight,
  Droplets,
  Flame,
  Moon,
  Play,
  Plus,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Check,
  HeartPulse,
  Bell,
} from "lucide-react";
import { cn, hhmm } from "@/lib/utils";
import { useUnits } from "@/lib/units";

const REMINDER_LINKS: Record<string, string> = {
  workout: "/train",
  meal: "/eat/add?meal=auto",
  water: "/eat",
  sleep: "/recover",
  weigh_in: "/progress",
  photo: "/progress/photos",
};

export default function Home() {
  const data = useQuery(api.dashboard.home, {});
  const insights = useQuery(api.analytics.insights, {});
  const logWater = useMutation(api.nutrition.logWater);
  const undoWater = useMutation(api.nutrition.undoWater);
  const startWorkout = useMutation(api.workouts.start);
  const router = useRouter();
  const toast = useToast();
  const [sheet, setSheet] = useState<null | "weight" | "sleep" | "checkin">(null);
  const [starting, setStarting] = useState(false);
  const u = useUnits();

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!data) return null;

  const t = data.targets;
  const n = data.nutrition;
  const kcalLeft = Math.max(0, (t?.kcal ?? 0) - n.kcal);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (data.profile?.name ?? "").split(" ")[0];

  async function begin() {
    setStarting(true);
    try {
      const id = await startWorkout({});
      router.push(`/train/session/${id}`);
    } catch (e: any) {
      toast({ message: e.message, tone: "var(--rose)" });
      setStarting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 pt-1">
        <div>
          <div className="text-[13px] text-muted">{greeting}</div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">
            {firstName || "Let's go"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {data.streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber/25 bg-amber/10 px-3 py-1.5">
              <Flame className="h-4 w-4 text-amber" />
              <span className="tabular text-[13px] font-bold text-amber">{data.streak}</span>
            </div>
          )}
          <Link
            href="/me"
            className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-[14px] font-bold"
          >
            {(firstName || "?").slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </header>

      {/* Reminders that are due and still unlogged */}
      {data.dueReminders?.length > 0 && (
        <div className="animate-rise space-y-2">
          {data.dueReminders.map((r: any) => (
            <Link
              key={r._id}
              href={REMINDER_LINKS[r.kind] ?? "/home"}
              className="flex items-center gap-3 rounded-2xl border border-amber/25 bg-amber/[0.07] px-4 py-3"
            >
              <Bell className="h-4 w-4 shrink-0 text-amber" />
              <span className="flex-1 text-[13.5px] font-semibold">{r.label}</span>
              <span className="tabular text-[12px] text-muted">{r.time}</span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </div>
      )}

      {/* Today's session */}
      <TodayCard data={data} onStart={begin} starting={starting} />

      {/* Fuel */}
      <Card className="animate-rise">
        <SectionTitle
          action={
            <Link href="/eat" className="flex items-center gap-1 text-[12.5px] font-semibold text-muted hover:text-ink">
              Details <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          Fuel today
        </SectionTitle>
        <div className="flex items-center gap-5">
          <Ring value={n.kcal} max={t?.kcal ?? 2000} size={128} stroke={13}>
            <div className="text-center">
              <div className="tabular text-[26px] font-bold leading-none">{kcalLeft}</div>
              <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted">
                kcal left
              </div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1 space-y-3">
            <MacroRow label="Protein" value={n.protein} target={t?.protein ?? 0} color="var(--accent)" emphasis />
            <MacroRow label="Fiber" value={n.fiber} target={t?.fiber ?? 0} color="var(--mint)" emphasis />
            <MacroRow label="Carbs" value={n.carbs} target={t?.carbs ?? 0} color="var(--sky)" />
            <MacroRow label="Fat" value={n.fat} target={t?.fat ?? 0} color="var(--amber)" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" className="flex-1" onClick={() => router.push("/eat/add?meal=auto")}>
            <Plus className="h-4 w-4" /> Log food
          </Button>
          <span className="tabular text-[12px] text-muted">
            {n.kcal} / {t?.kcal ?? "–"} kcal · {data.mealCount} items
          </span>
        </div>
      </Card>

      {/* Water / sleep / weight */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <Droplets className="mb-2 h-[18px] w-[18px] text-sky" />
          <div className="tabular text-[19px] font-bold leading-none">
            {(data.water / 1000).toFixed(1)}
            <span className="ml-0.5 text-[11px] font-medium text-muted">L</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">of {((t?.waterMl ?? 3000) / 1000).toFixed(1)} L</div>
          <Bar value={data.water} max={t?.waterMl ?? 3000} color="var(--sky)" className="mt-2.5" height={5} />
          <div className="mt-2.5 flex gap-1.5">
            <button
              onClick={() => logWater({ ml: 250 })}
              className="flex-1 rounded-lg bg-surface-2 py-2 text-[11px] font-semibold text-sky transition-colors hover:bg-surface-3"
            >
              +250 ml
            </button>
            <button
              onClick={() => undoWater({})}
              className="rounded-lg bg-surface-2 px-2 py-2 text-[11px] font-semibold text-muted transition-colors hover:bg-surface-3"
              aria-label="Undo last water log"
            >
              ↺
            </button>
          </div>
        </Card>

        <button onClick={() => setSheet("sleep")} className="card p-4 text-left transition-transform active:scale-[0.98]">
          <Moon className="mb-2 h-[18px] w-[18px] text-violet" />
          <div className="tabular text-[19px] font-bold leading-none">
            {data.sleepMinutes ? hhmm(data.sleepMinutes) : "–"}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {data.sleepMinutes ? `of ${hhmm(t?.sleepMinutes ?? 480)}` : "Not logged"}
          </div>
          <Bar
            value={data.sleepMinutes ?? 0}
            max={t?.sleepMinutes ?? 480}
            color="var(--violet)"
            className="mt-2.5"
            height={5}
          />
          <div className="mt-2.5 flex items-center gap-1 py-2 text-[11px] font-semibold text-violet">
            <BedDouble className="h-3.5 w-3.5" /> {data.sleepMinutes ? "Update" : "Log"}
          </div>
        </button>

        <button onClick={() => setSheet("weight")} className="card p-4 text-left transition-transform active:scale-[0.98]">
          <Scale className="mb-2 h-[18px] w-[18px] text-accent" />
          <div className="tabular text-[19px] font-bold leading-none">
            {data.weight ? (u.outWeight(data.weight.latest) ?? 0).toFixed(1) : "–"}
            <span className="ml-0.5 text-[11px] font-medium text-muted">{u.weightUnit}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
            {data.weight?.changeWeek != null ? (
              <>
                {data.weight.changeWeek <= 0 ? (
                  <TrendingDown className="h-3 w-3 text-mint" />
                ) : (
                  <TrendingUp className="h-3 w-3 text-amber" />
                )}
                {Math.abs(u.outWeight(data.weight.changeWeek) ?? 0).toFixed(1)} {u.weightUnit} / wk
              </>
            ) : (
              "Trend needs a week"
            )}
          </div>
          {data.weight?.target && data.weight?.start ? (
            <>
              <Bar
                value={Math.abs(data.weight.start - data.weight.latest)}
                max={Math.abs(data.weight.start - data.weight.target) || 1}
                color="var(--accent)"
                className="mt-2.5"
                height={5}
              />
              <div className="mt-2.5 py-2 text-[11px] font-semibold text-accent">
                Goal {u.weight(data.weight.target, 0)}
              </div>
            </>
          ) : (
            <div className="mt-2.5 py-2 text-[11px] font-semibold text-accent">Log weight</div>
          )}
        </button>
      </div>

      {/* Readiness */}
      <Card className="animate-rise">
        <SectionTitle
          action={
            <Link href="/recover" className="flex items-center gap-1 text-[12.5px] font-semibold text-muted hover:text-ink">
              Recovery <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          Readiness
        </SectionTitle>
        <div className="flex items-center gap-4">
          <Ring
            value={data.readiness.score}
            max={100}
            size={78}
            stroke={9}
            color={data.readiness.score >= 70 ? "var(--mint)" : data.readiness.score >= 45 ? "var(--amber)" : "var(--rose)"}
          >
            <span className="tabular text-[20px] font-bold">{data.readiness.score}</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium leading-snug text-ink">{data.readiness.advice}</p>
            {data.readiness.reasons.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.readiness.reasons.slice(0, 3).map((r) => (
                  <Pill key={r}>{r}</Pill>
                ))}
              </div>
            )}
            {!data.checkin && (
              <button onClick={() => setSheet("checkin")} className="mt-2.5 flex items-center gap-1 text-[12.5px] font-semibold text-accent">
                <HeartPulse className="h-3.5 w-3.5" /> Add today&apos;s check-in
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Insights */}
      {insights && insights.length > 0 && (
        <section className="animate-rise">
          <SectionTitle
            action={
              <Link href="/progress" className="flex items-center gap-1 text-[12.5px] font-semibold text-muted hover:text-ink">
                All analytics <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            What your data says
          </SectionTitle>
          <div className="space-y-2.5">
            {insights.slice(0, 3).map((i, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl border p-4",
                  i.tone === "good"
                    ? "border-mint/25 bg-mint/[0.06]"
                    : i.tone === "warn"
                      ? "border-amber/25 bg-amber/[0.06]"
                      : "border-line bg-surface"
                )}
              >
                <div className="flex items-center gap-2">
                  <Sparkles
                    className={cn("h-4 w-4", i.tone === "good" ? "text-mint" : i.tone === "warn" ? "text-amber" : "text-muted")}
                  />
                  <div className="text-[14px] font-semibold">{i.title}</div>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{i.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <WeightSheet open={sheet === "weight"} onClose={() => setSheet(null)} initial={data.weight?.latest} />
      <SleepSheet
        open={sheet === "sleep"}
        onClose={() => setSheet(null)}
        defaults={{ bedtime: data.profile?.bedtime, wakeTime: data.profile?.wakeTime }}
      />
      <CheckinSheet open={sheet === "checkin"} onClose={() => setSheet(null)} initial={data.checkin} />
    </div>
  );
}

function MacroRow({
  label,
  value,
  target,
  color,
  emphasis,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className={cn("text-[12px] font-semibold", emphasis ? "text-ink" : "text-muted")}>{label}</span>
        <span className="tabular text-[12px] text-muted">
          <span className={cn(emphasis && "font-bold text-ink")}>{Math.round(value)}</span> / {Math.round(target)} g
        </span>
      </div>
      <Bar value={value} max={target} color={color} height={emphasis ? 7 : 5} />
    </div>
  );
}

function TodayCard({ data, onStart, starting }: { data: any; onStart: () => void; starting: boolean }) {
  const w = data.workout;
  const planned = data.plannedDay;

  if (w && w.status === "completed") {
    return (
      <Card className="animate-rise border-accent/30 bg-gradient-to-br from-accent-soft to-surface">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Pill tone="accent" className="mb-2">
              <Check className="h-3 w-3" /> Done
            </Pill>
            <h2 className="text-[22px] font-bold leading-tight tracking-tight">{w.title}</h2>
            <p className="mt-1 text-[13px] text-muted">
              {w.setsDone} sets · {w.exerciseCount} exercises
              {w.durationMin ? ` · ${w.durationMin} min` : ""}
              {w.totalVolumeKg ? ` · ${(w.totalVolumeKg / 1000).toFixed(1)}t volume` : ""}
            </p>
          </div>
        </div>
        <Link
          href={`/train/session/${w._id}`}
          className="mt-4 flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-[13.5px] font-semibold"
        >
          Review session <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    );
  }

  if (w && (w.status === "in_progress" || w.status === "planned")) {
    return (
      <Card className="animate-rise border-accent/40">
        <Pill tone="accent" className="mb-2">
          In progress
        </Pill>
        <h2 className="text-[22px] font-bold leading-tight tracking-tight">{w.title}</h2>
        <p className="mt-1 text-[13px] text-muted">
          {w.setsDone} of {w.setsTotal} sets logged
        </p>
        <Bar value={w.setsDone} max={w.setsTotal || 1} className="mt-3" />
        <Link href={`/train/session/${w._id}`} className="mt-4 block">
          <Button size="lg" className="w-full">
            <Play className="h-4 w-4" /> Continue session
          </Button>
        </Link>
      </Card>
    );
  }

  if (w && w.status === "skipped") {
    return (
      <Card className="animate-rise">
        <Pill className="mb-2">Rest day</Pill>
        <h2 className="text-[20px] font-bold tracking-tight">Session skipped</h2>
        <p className="mt-1 text-[13px] text-muted">
          {w.notes ? `“${w.notes}”` : "Rest is part of the plan. Nothing to make up for."}
        </p>
        <Button variant="soft" size="md" className="mt-4 w-full" onClick={onStart} loading={starting}>
          Train anyway
        </Button>
      </Card>
    );
  }

  if (planned) {
    return (
      <Card className="animate-rise overflow-hidden border-accent/25 bg-gradient-to-br from-surface-2 to-surface p-0">
        <div className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <Pill tone="accent">Today</Pill>
            <span className="text-[12px] text-muted">{planned.programName}</span>
          </div>
          <h2 className="text-[24px] font-bold leading-tight tracking-tight">{planned.title}</h2>
          <p className="mt-1 text-[13px] capitalize text-muted">
            {planned.focus} · {planned.items.length} exercises · ~{planned.estMinutes} min
          </p>
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
            {planned.items.slice(0, 5).map((i: any, idx: number) => (
              <div key={idx} className="shrink-0 rounded-xl border border-line bg-surface px-3 py-2">
                <div className="max-w-[128px] truncate text-[12px] font-semibold">{i.exercise?.name}</div>
                <div className="tabular text-[11px] text-muted">
                  {i.sets} × {i.reps}
                </div>
              </div>
            ))}
          </div>
          <Button size="lg" className="mt-4 w-full" onClick={onStart} loading={starting}>
            <Play className="h-4 w-4" /> Start workout
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="animate-rise">
      <Pill className="mb-2">Rest day</Pill>
      <h2 className="text-[20px] font-bold tracking-tight">No session scheduled</h2>
      <p className="mt-1 text-[13px] text-muted">
        Your plan has today off. A walk, mobility work, or an unplanned session all still count.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="soft" className="flex-1" onClick={onStart} loading={starting}>
          <Play className="h-4 w-4" /> Freestyle session
        </Button>
        <Link href="/train">
          <Button variant="ghost">Plan</Button>
        </Link>
      </div>
    </Card>
  );
}
