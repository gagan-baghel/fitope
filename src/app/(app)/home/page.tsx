"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bar, Button, Card, Pill, Ring, SectionTitle, Skeleton, useToast } from "@/components/ui";
import { CircleAction, MediaTile, MinutesRing, RowCard } from "@/components/ui/media";
import { CheckinSheet, SleepSheet, WeightSheet } from "@/components/quick-log";
import { FamilyStrip } from "@/components/family";
import { InstallCard } from "@/components/install";
import {
  ArrowRight,
  Bell,
  Camera,
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
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { cn, hhmm, errorText } from "@/lib/utils";
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
  const startWorkout = useMutation(api.workouts.start);
  const router = useRouter();
  const toast = useToast();
  const [sheet, setSheet] = useState<null | "weight" | "sleep" | "checkin">(null);
  const [starting, setStarting] = useState(false);
  const u = useUnits();

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!data) return null;

  const t = data.targets;
  const n = data.nutrition;
  const kcalLeft = Math.max(0, (t?.kcal ?? 0) - n.kcal);
  const hour = new Date().getHours();
  const firstName = (data.profile?.name ?? "").split(" ")[0];
  const planned = data.plannedDay;
  const w = data.workout;

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
    <div className="space-y-5">
      {/* Welcome row — avatar, greeting, streak pill */}
      <header className="flex items-center gap-2.5 pt-1">
        <Link
          href="/me"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-[15px] font-bold text-ground"
        >
          {(firstName || "?").slice(0, 1).toUpperCase()}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] text-muted">
            {hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}
          </div>
          <div className="truncate text-[17px] font-bold leading-tight tracking-tight">
            {firstName || "Welcome"}
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 shadow-[var(--shadow)]">
          <Flame className="h-3.5 w-3.5 text-amber" />
          <span className="tabular text-[13px] font-bold">{data.streak}</span>
        </div>
      </header>

      <FamilyStrip />
      <InstallCard />

      {/* Due reminders */}
      {data.dueReminders?.length > 0 && (
        <div className="space-y-2">
          {data.dueReminders.map((r: any) => (
            <Link
              key={r._id}
              href={REMINDER_LINKS[r.kind] ?? "/home"}
              className="flex items-center gap-3 rounded-2xl border border-amber/30 bg-amber/[0.09] px-4 py-3"
            >
              <Bell className="h-4 w-4 shrink-0 text-amber" />
              <span className="flex-1 text-[13.5px] font-semibold">{r.label}</span>
              <span className="tabular text-[12px] text-muted">{r.time}</span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </div>
      )}

      {/* Hero carousel */}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <HeroCard
          tone="var(--tile-3)"
          chip={w?.status === "completed" ? "Completed" : planned ? "Today" : "Rest day"}
          chipIcon={w?.status === "completed" ? Check : Play}
          eyebrow={planned?.programName ?? (w ? "Logged session" : "No session scheduled")}
          title={w?.title ?? planned?.title ?? "Recovery day"}
          meta={
            w?.status === "completed"
              ? `${w.setsDone} sets · ${w.durationMin ?? 0} min`
              : planned
                ? `${planned.items.length} exercises · ~${planned.estMinutes} min`
                : "Mobility or a walk still counts"
          }
          action={
            w?.status === "completed" ? (
              <Link href={`/train/session/${w._id}`} className="hero-cta">
                Review <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button onClick={begin} disabled={starting} className="hero-cta">
                <Play className="h-4 w-4" /> {w?.status === "in_progress" ? "Continue" : "Start workout"}
              </button>
            )
          }
          ring={
            <MinutesRing
              minutes={planned?.estMinutes ?? w?.durationMin ?? 0}
              progress={w?.status === "completed" ? 1 : 0.35}
              size={50}
              track="rgba(0,0,0,0.10)"
            />
          }
        />

        <HeroCard
          tone="var(--tile-2)"
          chip="Fuel"
          chipIcon={UtensilsCrossed}
          eyebrow={`${n.kcal} of ${t?.kcal ?? "–"} kcal`}
          title={`${kcalLeft} kcal left`}
          meta={`Protein ${Math.round(n.protein)} / ${t?.protein ?? 0} g · Fiber ${Math.round(n.fiber)} / ${t?.fiber ?? 0} g`}
          action={
            <Link href="/eat/add?meal=auto" className="hero-cta">
              <Plus className="h-4 w-4" /> Log food
            </Link>
          }
          ring={
            <Ring value={n.kcal} max={t?.kcal ?? 2000} size={50} stroke={5} color="var(--ink)" track="rgba(0,0,0,0.08)">
              <span className="tabular text-[13px] font-bold">{Math.round(((n.kcal / (t?.kcal || 1)) * 100))}%</span>
            </Ring>
          }
        />

        <HeroCard
          tone="var(--tile-1)"
          chip="Readiness"
          chipIcon={HeartPulse}
          eyebrow={data.readiness.reasons[0] ?? "Based on your logs"}
          title={`${data.readiness.score} / 100`}
          meta={data.readiness.advice}
          action={
            <Link href="/recover" className="hero-cta">
              Recovery <ArrowRight className="h-4 w-4" />
            </Link>
          }
          ring={
            <Ring value={data.readiness.score} max={100} size={50} stroke={5} color="var(--ink)" track="rgba(0,0,0,0.08)">
              <span className="tabular text-[13px] font-bold">{data.readiness.score}</span>
            </Ring>
          }
        />
      </div>

      {/* Quick actions row */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <CircleAction icon={UtensilsCrossed} label="Food" onClick={() => router.push("/eat/add?meal=auto")} />
        <CircleAction
          icon={Droplets}
          label="+250 ml"
          onClick={async () => {
            await logWater({ ml: 250 });
            toast({ message: "250 ml logged" });
          }}
        />
        <CircleAction icon={Scale} label="Weigh in" onClick={() => setSheet("weight")} />
        <CircleAction icon={Moon} label="Sleep" onClick={() => setSheet("sleep")} />
        <CircleAction icon={HeartPulse} label="Check-in" onClick={() => setSheet("checkin")} active={!!data.checkin} />
        <CircleAction icon={Camera} label="Photo" onClick={() => router.push("/progress/photos")} />
      </div>

      {/* Today's plan — reference list rows */}
      {(planned?.items?.length || (w as any)?.setsTotal) && (
        <section>
          <SectionTitle
            action={
              <Link href="/train" className="text-[12.5px] font-semibold text-muted hover:text-ink">
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
                tile={<MediaTile muscles={i.exercise?.primaryMuscles} category={i.exercise?.category} />}
                title={i.exercise?.name ?? "Exercise"}
                subtitle={`${i.sets} sets × ${i.reps} · ${i.exercise?.difficulty ?? "all levels"}`}
                trailing={<MinutesRing minutes={Math.max(2, Math.round((i.sets * (i.restSec + 40)) / 60))} progress={0} />}
              />
            ))}
            {!planned && w && (
              <RowCard
                href={`/train/session/${w._id}`}
                tile={<MediaTile category="cardio" />}
                title={w.title}
                subtitle={`${w.setsDone}/${w.setsTotal} sets logged`}
                trailing={<MinutesRing minutes={w.durationMin ?? 0} progress={w.setsTotal ? w.setsDone / w.setsTotal : 0} />}
              />
            )}
          </div>
        </section>
      )}

      {/* Macros */}
      <Card>
        <SectionTitle
          action={
            <Link href="/eat" className="flex items-center gap-1 text-[12.5px] font-semibold text-muted hover:text-ink">
              Details <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          Fuel today
        </SectionTitle>
        {/* 2×2 on phones — four columns leaves each ring ~55px wide at 320px. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["Protein", n.protein, t?.protein ?? 0, "var(--mint)"],
              ["Fiber", n.fiber, t?.fiber ?? 0, "var(--energy)"],
              ["Carbs", n.carbs, t?.carbs ?? 0, "var(--sky)"],
              ["Fat", n.fat, t?.fat ?? 0, "var(--amber)"],
            ] as const
          ).map(([label, value, target, color]) => (
            <div
              key={label}
              className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-surface-2 p-2.5 sm:flex-col sm:gap-1.5 sm:p-2 sm:text-center"
            >
              <Ring value={value} max={target || 1} size={44} stroke={4} color={color} track="var(--surface-3)" className="shrink-0">
                <span className="tabular text-[13px] font-bold">{Math.round(value)}</span>
              </Ring>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-ink sm:text-[11px]">{label}</div>
                <div className="tabular truncate text-[12px] text-muted sm:text-[10.5px]">of {Math.round(target)} g</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Water / sleep / weight */}
      {/* Rows on phones, cards from sm up — three cards are ~88px wide at 320px. */}
      <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        <MiniStat
          icon={Droplets}
          tint="var(--tile-3)"
          value={`${(data.water / 1000).toFixed(1)}L`}
          label={`of ${((t?.waterMl ?? 3000) / 1000).toFixed(1)} L`}
          bar={{ value: data.water, max: t?.waterMl ?? 3000, color: "var(--sky)" }}
          onClick={() => logWater({ ml: 250 })}
          cta="+250 ml"
        />
        <MiniStat
          icon={Moon}
          tint="var(--tile-1)"
          value={data.sleepMinutes ? hhmm(data.sleepMinutes) : "–"}
          label={data.sleepMinutes ? `of ${hhmm(t?.sleepMinutes ?? 480)}` : "Not logged"}
          bar={{ value: data.sleepMinutes ?? 0, max: t?.sleepMinutes ?? 480, color: "var(--violet)" }}
          onClick={() => setSheet("sleep")}
          cta={data.sleepMinutes ? "Update" : "Log sleep"}
        />
        <MiniStat
          icon={Scale}
          tint="var(--tile-2)"
          value={data.weight ? `${(u.outWeight(data.weight.latest) ?? 0).toFixed(1)}` : "–"}
          label={
            data.weight?.changeWeek != null
              ? `${data.weight.changeWeek <= 0 ? "↓" : "↑"} ${Math.abs(u.outWeight(data.weight.changeWeek) ?? 0).toFixed(1)} ${u.weightUnit}/wk`
              : u.weightUnit
          }
          bar={
            data.weight?.target && data.weight?.start
              ? {
                  value: Math.abs(data.weight.start - data.weight.latest),
                  max: Math.abs(data.weight.start - data.weight.target) || 1,
                  color: "var(--mint)",
                }
              : undefined
          }
          onClick={() => setSheet("weight")}
          cta={data.weight?.target ? `Goal ${u.weight(data.weight.target, 0)}` : "Log weight"}
        />
      </div>

      {/* Insights */}
      {insights && insights.length > 0 && (
        <section>
          <SectionTitle
            action={
              <Link href="/progress" className="text-[12.5px] font-semibold text-muted hover:text-ink">
                Analytics
              </Link>
            }
          >
            What your data says
          </SectionTitle>
          <div className="space-y-2.5">
            {insights.slice(0, 3).map((i: any, idx: number) => (
              <div
                key={idx}
                className={cn(
                  "rounded-[20px] border p-4",
                  i.tone === "good"
                    ? "border-mint/30 bg-mint/[0.07]"
                    : i.tone === "warn"
                      ? "border-amber/30 bg-amber/[0.07]"
                      : "border-line bg-surface"
                )}
              >
                <div className="flex items-center gap-2">
                  <Sparkles
                    className={cn("h-4 w-4", i.tone === "good" ? "text-mint" : i.tone === "warn" ? "text-amber" : "text-muted")}
                  />
                  <div className="text-[14px] font-bold">{i.title}</div>
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

/**
 * The reference's signature card: pastel ground, meta chip, oversized title,
 * a decorative disc where its photo cut-out sits, and one clear action.
 */
function HeroCard({
  tone,
  chip,
  chipIcon: ChipIcon,
  eyebrow,
  title,
  meta,
  action,
  ring,
}: {
  tone: string;
  chip: string;
  chipIcon?: any;
  eyebrow: string;
  title: string;
  meta: string;
  action: React.ReactNode;
  ring?: React.ReactNode;
}) {
  return (
    <article
      className="relative w-[82%] shrink-0 snap-start overflow-hidden rounded-[24px] p-4 text-[color:var(--tile-ink)] shadow-[var(--shadow)] sm:w-[380px]"
      style={{ background: tone }}
    >
      <div className="hero-blob -right-8 -top-10 h-36 w-36" />
      <div className="hero-blob-2 -bottom-12 -right-3 h-32 w-32" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <span className="hero-chip">
            {ChipIcon && <ChipIcon className="h-3.5 w-3.5" />}
            {chip}
          </span>
          {ring}
        </div>
        <div className="mt-3 text-[11.5px] font-medium opacity-70">{eyebrow}</div>
        <h2 className="mt-0.5 text-[20px] font-bold leading-[1.15] tracking-tight">{title}</h2>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug opacity-75">{meta}</p>
        <div className="mt-3">{action}</div>
      </div>
    </article>
  );
}

function MiniStat({
  icon: Icon,
  tint,
  value,
  label,
  bar,
  onClick,
  cta,
}: {
  icon: any;
  tint: string;
  value: string;
  label: string;
  bar?: { value: number; max: number; color: string };
  onClick: () => void;
  cta: string;
}) {
  return (
    <button
      onClick={onClick}
      className="card flex items-center gap-3 p-3 text-left transition-transform active:scale-[0.98] sm:block"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-7 sm:w-7 sm:rounded-lg" style={{ background: tint }}>
        <Icon className="h-[18px] w-[18px] sm:h-3.5 sm:w-3.5" style={{ color: "var(--tile-ink)" }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 sm:mt-2 sm:block">
          <span className="tabular text-[17px] font-bold leading-none sm:text-[16px]">{value}</span>
          <span className="truncate text-[12px] text-muted sm:mt-1 sm:block sm:text-[10.5px]">{label}</span>
        </div>
        {bar && <Bar value={bar.value} max={bar.max} color={bar.color} className="mt-2" height={4} />}
      </div>
      <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink sm:mt-1.5 sm:block sm:truncate sm:bg-transparent sm:p-0 sm:text-[10.5px]">
        {cta}
      </span>
    </button>
  );
}
