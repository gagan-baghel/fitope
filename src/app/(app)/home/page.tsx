"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bar, Card, Ring, SectionTitle, Skeleton, useToast } from "@/components/ui";
import { MediaTile, MinutesRing, RowCard } from "@/components/ui/media";
import { SleepSheet, WeightSheet } from "@/components/quick-log";
import { FamilyStrip } from "@/components/family";
import { InstallCard } from "@/components/install";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Droplets,
  Flame,
  HeartPulse,
  Moon,
  Play,
  Plus,
  Scale,
  Sparkles,
} from "lucide-react";
import { cn, hhmm, errorText } from "@/lib/utils";
import { useUnits } from "@/lib/units";

const REMINDER_LINKS: Record<string, string> = {
  workout: "/train",
  meal: "/eat/add?meal=auto",
  water: "/eat",
  sleep: "/recover",
  weigh_in: "/progress",
};

export default function Home() {
  const data = useQuery(api.dashboard.home, {});
  const insights = useQuery(api.analytics.insights, {});
  const logWater = useMutation(api.nutrition.logWater);
  const startWorkout = useMutation(api.workouts.start);
  const router = useRouter();
  const toast = useToast();
  const [sheet, setSheet] = useState<null | "weight" | "sleep">(null);
  const [starting, setStarting] = useState(false);
  const u = useUnits();

  if (data === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (!data) return null;

  const t = data.targets;
  const n = data.nutrition;
  const kcalTarget = t?.kcal ?? 0;
  const kcalLeft = Math.max(0, kcalTarget - n.kcal);
  const hour = new Date().getHours();
  const firstName = (data.profile?.name ?? "").split(" ")[0];
  const planned = data.plannedDay;
  const w = data.workout;
  const done = w?.status === "completed";
  // `0 && <section>` renders a literal "0" — these have to be booleans, not counts.
  const hasPlan = !!planned?.items?.length || !!w?.setsTotal;

  async function begin() {
    setStarting(true);
    try {
      const id = await startWorkout({});
      router.push(`/train/session/${id}`);
    } catch (e: any) {
      toast({ message: errorText(e), tone: "var(--rose)" });
      setStarting(false);
    }
  }

  return (
    <div className="space-y-3.5">
      {/* Greeting and streak */}
      <header className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] leading-tight text-muted">
            {hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}
          </div>
          <div className="truncate text-[17px] font-bold leading-tight tracking-tight">{firstName || "Welcome"}</div>
        </div>
        <Link
          href="/progress"
          className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1"
          aria-label={`${data.streak} day streak`}
        >
          <Flame className="h-3.5 w-3.5 text-amber" />
          <span className="tabular text-[13px] font-bold">{data.streak}</span>
        </Link>
      </header>

      <FamilyStrip />
      <InstallCard />

      {/* Due reminders */}
      {data.dueReminders?.map((r: any) => (
        <Link
          key={r._id}
          href={REMINDER_LINKS[r.kind] ?? "/home"}
          className="flex items-center gap-2 rounded-2xl border border-amber/30 bg-amber/[0.09] px-3 py-2.5"
        >
          <Bell className="h-4 w-4 shrink-0 text-amber" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{r.label}</span>
          <span className="tabular shrink-0 text-[11.5px] text-muted">{r.time}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>
      ))}

      {/* Today's session. One full-width card, not a carousel: a card that ran to 82% of the
          screen showed a third of the information and left the page edge-aligned wrong. */}
      <article
        className="relative overflow-hidden rounded-[20px] p-4 text-[color:var(--tile-ink)] shadow-[var(--shadow)]"
        style={{ background: "var(--tile-3)" }}
      >
        <div className="hero-blob -right-10 -top-12 h-36 w-36" />
        <div className="relative flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <span className="hero-chip">
              {done ? <Check className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {done ? "Completed" : planned ? "Today" : "Rest day"}
            </span>
            {/* The plan name is its own line: inlined into the meta it wrapped and orphaned
                the last word at 320px. */}
            <div className="mt-2 truncate text-[11px] font-medium opacity-65">
              {planned?.programName ?? (w ? "Logged session" : "No session scheduled")}
            </div>
            <h2 className="text-[21px] font-bold leading-tight tracking-tight">
              {w?.title ?? planned?.title ?? "Recovery day"}
            </h2>
            <p className="mt-1 text-[12px] leading-snug opacity-75">
              {done
                ? `${w.setsDone} sets · ${w.durationMin ?? 0} min`
                : planned
                  ? `${planned.items.length} exercises · ~${planned.estMinutes} min`
                  : "Mobility or a walk still counts"}
            </p>
          </div>
          <MinutesRing
            minutes={planned?.estMinutes ?? w?.durationMin ?? 0}
            progress={done ? 1 : 0.35}
            size={50}
            track="rgba(0,0,0,0.10)"
          />
        </div>
        <div className="relative mt-3.5 flex gap-2">
          {done ? (
            <Link href={`/train/session/${w._id}`} className="hero-cta flex-1 justify-center">
              Review <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button onClick={begin} disabled={starting} className="hero-cta flex-1 justify-center">
              <Play className="h-4 w-4" /> {w?.status === "in_progress" ? "Continue" : "Start workout"}
            </button>
          )}
          <Link href="/eat/add?meal=auto" className="hero-cta shrink-0">
            <Plus className="h-4 w-4" /> Food
          </Link>
        </div>
      </article>

      {/* Fuel — the headline number plus every macro in one card, four abreast */}
      <Card>
        <SectionTitle
          className="mb-2.5"
          action={
            <Link href="/eat" className="flex items-center gap-0.5 text-[12px] font-semibold text-muted hover:text-ink">
              Details <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          Fuel today
        </SectionTitle>
        <div className="flex items-center gap-3">
          <Ring
            value={n.kcal}
            max={kcalTarget || 1}
            size={54}
            stroke={5}
            color="var(--data)"
            track="var(--surface-3)"
            className="shrink-0"
          >
            <span className="tabular text-[13px] font-bold">{pct(n.kcal, kcalTarget)}</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="tabular text-[24px] font-bold leading-none">{Math.round(n.kcal)}</span>
              <span className="tabular text-[12px] text-muted">
                {kcalTarget ? `of ${kcalTarget} kcal` : "kcal"}
              </span>
            </div>
            <div className="mt-1 text-[11.5px] text-muted">
              {kcalTarget ? `${kcalLeft} kcal left · ${data.mealCount} meals` : `${data.mealCount} meals logged`}
            </div>
          </div>
        </div>
        {/* 2×2, not four across: at 320px four ring cells leave ~55px each, which is not
            enough for the ring and its label to sit side by side. */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-4">
          {(
            [
              ["Protein", n.protein, t?.protein ?? 0, "var(--mint)"],
              ["Fiber", n.fiber, t?.fiber ?? 0, "var(--energy)"],
              ["Carbs", n.carbs, t?.carbs ?? 0, "var(--sky)"],
              ["Fat", n.fat, t?.fat ?? 0, "var(--amber)"],
            ] as const
          ).map(([label, value, target, color]) => (
            <div key={label} className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-surface-2 p-2.5">
              <Ring
                value={value}
                max={target || 1}
                size={46}
                stroke={4}
                color={color}
                track="var(--surface-3)"
                className="shrink-0"
              >
                <span className="tabular text-[13px] font-bold">{Math.round(value)}</span>
              </Ring>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-ink">{label}</div>
                <div className="tabular truncate text-[11.5px] text-muted">{goalOf(target)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Water / sleep / weight — three tiles on one row, each one a log action */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat
          icon={Droplets}
          color="var(--sky)"
          label="Water"
          value={`${(data.water / 1000).toFixed(1)}L`}
          sub={`of ${((t?.waterMl ?? 3000) / 1000).toFixed(1)}L`}
          bar={{ value: data.water, max: t?.waterMl ?? 3000 }}
          hint="+250 ml"
          onClick={async () => {
            await logWater({ ml: 250 });
            toast({ message: "250 ml logged" });
          }}
        />
        <MiniStat
          icon={Moon}
          color="var(--violet)"
          label="Sleep"
          value={data.sleepMinutes ? hhmm(data.sleepMinutes) : "–"}
          sub={data.sleepMinutes ? `of ${hhmm(t?.sleepMinutes ?? 480)}` : "Not logged"}
          bar={{ value: data.sleepMinutes ?? 0, max: t?.sleepMinutes ?? 480 }}
          hint={data.sleepMinutes ? "Update" : "Log"}
          onClick={() => setSheet("sleep")}
        />
        <MiniStat
          icon={Scale}
          color="var(--mint)"
          label="Weight"
          value={data.weight ? `${(u.outWeight(data.weight.latest) ?? 0).toFixed(1)}` : "–"}
          sub={
            data.weight?.changeWeek != null
              ? `${data.weight.changeWeek <= 0 ? "↓" : "↑"}${Math.abs(u.outWeight(data.weight.changeWeek) ?? 0).toFixed(1)}/wk`
              : u.weightUnit
          }
          bar={
            data.weight?.target && data.weight?.start
              ? {
                  value: Math.abs(data.weight.start - data.weight.latest),
                  max: Math.abs(data.weight.start - data.weight.target) || 1,
                }
              : undefined
          }
          hint={data.weight ? "Update" : "Log"}
          onClick={() => setSheet("weight")}
        />
      </div>

      {/* Readiness — one row, not a whole card: the score and what to do about it */}
      <Link
        href="/recover"
        className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 active:scale-[0.99]"
      >
        <Ring
          value={data.readiness.score}
          max={100}
          size={40}
          stroke={4}
          color="var(--data)"
          track="var(--surface-3)"
          className="shrink-0"
        >
          <span className="tabular text-[12px] font-bold">{data.readiness.score}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[13px] font-bold">
            <HeartPulse className="h-3.5 w-3.5 shrink-0 text-rose" /> Readiness
          </div>
          <div className="line-clamp-2 text-[11.5px] leading-snug text-muted">{data.readiness.advice}</div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </Link>

      {/* Today's plan */}
      {hasPlan && (
        <section>
          <SectionTitle
            action={
              <Link href="/train" className="text-[12px] font-semibold text-muted hover:text-ink">
                See all
              </Link>
            }
          >
            Today&apos;s plan
          </SectionTitle>
          <div className="space-y-2">
            {(planned?.items ?? []).slice(0, 4).map((i: any, idx: number) => (
              <RowCard
                key={idx}
                onClick={begin}
                tile={<MediaTile muscles={i.exercise?.primaryMuscles} category={i.exercise?.category} size={40} radius={13} />}
                title={i.exercise?.name ?? "Exercise"}
                subtitle={`${i.sets} × ${i.reps} · ${i.exercise?.difficulty ?? "all levels"}`}
                trailing={<MinutesRing minutes={Math.max(2, Math.round((i.sets * (i.restSec + 40)) / 60))} progress={0} size={34} />}
              />
            ))}
            {!planned && w && (
              <RowCard
                href={`/train/session/${w._id}`}
                tile={<MediaTile category="cardio" size={40} radius={13} />}
                title={w.title}
                subtitle={`${w.setsDone}/${w.setsTotal} sets logged`}
                trailing={
                  <MinutesRing minutes={w.durationMin ?? 0} progress={w.setsTotal ? w.setsDone / w.setsTotal : 0} size={34} />
                }
              />
            )}
          </div>
        </section>
      )}

      {/* Insights */}
      {insights && insights.length > 0 && (
        <section>
          <SectionTitle
            action={
              <Link href="/progress" className="text-[12px] font-semibold text-muted hover:text-ink">
                Analytics
              </Link>
            }
          >
            What your data says
          </SectionTitle>
          <div className="space-y-2">
            {insights.slice(0, 3).map((i: any, idx: number) => (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl border p-3.5",
                  i.tone === "good"
                    ? "border-mint/30 bg-mint/[0.07]"
                    : i.tone === "warn"
                      ? "border-amber/30 bg-amber/[0.07]"
                      : "border-line bg-surface"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      i.tone === "good" ? "text-mint" : i.tone === "warn" ? "text-amber" : "text-muted"
                    )}
                  />
                  <div className="text-[13px] font-bold">{i.title}</div>
                </div>
                <p className="mt-1 text-[12px] leading-snug text-ink-2">{i.detail}</p>
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
    </div>
  );
}

/** "of 150 g" — and "logged" when there is no target to compare against, never "of 0 g". */
const goalOf = (target: number) => (target > 0 ? `of ${Math.round(target)} g` : "logged");

const pct = (value: number, target: number) => (target > 0 ? `${Math.round((value / target) * 100)}%` : "–");

function MiniStat({
  icon: Icon,
  color,
  label,
  value,
  sub,
  bar,
  hint,
  onClick,
}: {
  icon: any;
  color: string;
  label: string;
  value: string;
  sub: string;
  bar?: { value: number; max: number };
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`${label}: ${value}. ${hint}`}
      className="card flex min-w-0 flex-col p-3 text-left active:scale-[0.98]"
    >
      <div className="flex min-w-0 items-center gap-1">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      </div>
      <span className="tabular mt-1.5 truncate text-[18px] font-bold leading-none">{value}</span>
      <span className="tabular mt-1 truncate text-[11px] text-muted">{sub}</span>
      <Bar value={bar?.value ?? 0} max={bar?.max ?? 1} color={color} className="mt-2" height={4} />
      <span className="mt-2 truncate text-[11px] font-semibold" style={{ color }}>
        {hint}
      </span>
    </button>
  );
}
