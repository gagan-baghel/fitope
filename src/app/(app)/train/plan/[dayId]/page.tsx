"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Pill, SectionTitle, Sheet, Skeleton, useToast } from "@/components/ui";
import { Accordion, MediaTile, MetaCell, MinutesRing, RowCard, TagChip } from "@/components/ui/media";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleCheck,
  Dumbbell,
  Flame,
  Gauge,
  HeartPulse,
  MoreHorizontal,
  Play,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { DAY_NAMES, prettyDate } from "@/lib/utils";

/**
 * Plan-day detail, laid out like the reference: pastel hero, goal chips, a
 * four-cell "Plan Details" grid, the exercise list with tick circles, and one
 * sticky primary action.
 */
export default function PlanDay() {
  const { dayId } = useParams<{ dayId: string }>();
  const day = useQuery(api.programs.dayDetail, { id: dayId as any });
  const start = useMutation(api.workouts.start);
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<any>(null);

  if (day === undefined) return <Skeleton className="h-96 w-full" />;
  if (!day) return <div className="py-20 text-center text-muted">Session not found.</div>;

  const { program, items, history, totalMinutes } = day;
  const goalChips: Record<string, { icon: any; label: string }[]> = {
    fat_loss: [
      { icon: Flame, label: "Fat burn" },
      { icon: HeartPulse, label: "Heart boost" },
      { icon: Target, label: "Body tone" },
    ],
    muscle_gain: [
      { icon: Dumbbell, label: "Hypertrophy" },
      { icon: Trophy, label: "Progressive overload" },
      { icon: Target, label: "Muscle focus" },
    ],
    strength: [
      { icon: Trophy, label: "Max strength" },
      { icon: Dumbbell, label: "Heavy compounds" },
      { icon: Timer, label: "Long rest" },
    ],
  };
  const chips = goalChips[program.goal ?? ""] ?? [
    { icon: HeartPulse, label: "General fitness" },
    { icon: Target, label: "Balanced" },
    { icon: Flame, label: "Sustainable" },
  ];

  async function begin() {
    setBusy(true);
    try {
      const id = await start({ programDayId: dayId as any });
      router.push(`/train/session/${id}`);
    } catch (e: any) {
      toast({ message: e.message, tone: "var(--rose)" });
      setBusy(false);
    }
  }

  return (
    <div className="-mt-5 pb-44">
      {/* Hero */}
      <header
        className="relative -mx-4 overflow-hidden px-4 pb-6 pt-5 sm:-mx-6 sm:rounded-b-[28px] sm:px-6"
        style={{ background: "var(--tile-3)", color: "var(--tile-ink)" }}
      >
        <div className="hero-blob -right-12 -top-14 h-44 w-44" />
        <div className="hero-blob-2 -bottom-16 right-8 h-36 w-36" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/train")}
              className="hero-chip grid h-9 w-9 place-items-center rounded-full backdrop-blur"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.push(`/train/programs/${program._id}`)}
              className="hero-chip grid h-9 w-9 place-items-center rounded-full backdrop-blur"
              aria-label="Edit plan"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] font-medium opacity-70">{program.name}</div>
              <h1 className="mt-1 text-[23px] font-bold leading-[1.1] tracking-tight">{day.title}</h1>
              <p className="mt-1 text-[12.5px] capitalize opacity-75">{day.focus}</p>
            </div>
            <MinutesRing minutes={totalMinutes} progress={0.75} size={56} track="rgba(0,0,0,0.10)" />
          </div>
        </div>
      </header>

      <div className="space-y-5 pt-5">
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <TagChip key={c.label} icon={c.icon}>
              {c.label}
            </TagChip>
          ))}
        </div>

        <section>
          <SectionTitle>Session details</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            <MetaCell icon={Timer} value={`${totalMinutes} min`} label="Duration" />
            <MetaCell icon={Gauge} value={day.level} label="Level" />
            <MetaCell icon={Dumbbell} value={day.gear} label="Gear" />
            <MetaCell icon={Target} value={<span className="capitalize">{day.target}</span>} label="Target area" />
          </div>
        </section>

        <section>
          <SectionTitle
            action={<span className="text-[12.5px] text-muted">{items.length} exercises</span>}
          >
            Exercises
          </SectionTitle>
          <div className="space-y-2">
            {items.map((it: any, i: number) => (
              <RowCard
                key={i}
                onClick={() => setInfo(it)}
                leading={
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-[11px] font-bold text-muted">
                    {i + 1}
                  </span>
                }
                tile={<MediaTile muscles={it.exercise?.primaryMuscles} category={it.exercise?.category} />}
                title={it.exercise?.name ?? "Exercise"}
                subtitle={`${it.sets} sets × ${it.reps}${it.notes ? ` · ${it.notes}` : ""}`}
                trailing={
                  <MinutesRing
                    minutes={Math.max(2, Math.round((it.sets * (it.restSec + 40)) / 60))}
                    progress={0.7}
                  />
                }
              />
            ))}
          </div>
        </section>

        {history.length > 0 && (
          <section>
            <SectionTitle>Last times you did this</SectionTitle>
            <div className="space-y-2">
              {history.map((h: any) => (
                <Accordion
                  key={h._id}
                  icon={CircleCheck}
                  title={prettyDate(h.date)}
                  subtitle={`${h.setCount} sets · ${h.durationMin ?? 0} min · ${Math.round((h.totalVolumeKg ?? 0) / 100) / 10}t`}
                >
                  <div className="space-y-1.5">
                    {h.lines.map((l: string, i: number) => (
                      <div key={i} className="tabular text-[12.5px] text-ink-2">
                        {l}
                      </div>
                    ))}
                  </div>
                </Accordion>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[12.5px] text-muted">
          <CalendarDays className="h-4 w-4 shrink-0" />
          {day.weekday != null ? `Scheduled for ${DAY_NAMES[day.weekday]}` : "Not scheduled to a weekday"}
          <Pill className="ml-auto">{program.daysPerWeek} d/wk</Pill>
        </div>
      </div>

      {/* Sticky CTA — the reference's "Join" button */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(88px,calc(env(safe-area-inset-bottom)+84px))] lg:pb-6">
        <div className="mx-auto max-w-md">
          <Button size="lg" className="w-full shadow-[var(--shadow-lift)]" loading={busy} onClick={begin}>
            <Play className="h-4 w-4" /> Start workout
          </Button>
        </div>
      </div>

      <Sheet open={!!info} onClose={() => setInfo(null)} title={info?.exercise?.name}>
        {info && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <MediaTile muscles={info.exercise?.primaryMuscles} category={info.exercise?.category} size={64} radius={20} />
              <div>
                <div className="text-[13px] font-semibold capitalize">{info.exercise?.primaryMuscles?.join(", ")}</div>
                <div className="text-[12px] capitalize text-muted">
                  {info.exercise?.equipment?.join(", ") || "bodyweight"} · {info.exercise?.difficulty}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MetaCell icon={Dumbbell} value={`${info.sets}`} label="Sets" />
              <MetaCell icon={Target} value={info.reps} label="Reps" />
              <MetaCell icon={Timer} value={`${info.restSec}s`} label="Rest" />
            </div>
            <ol className="space-y-2.5">
              {info.exercise?.instructions?.map((c: string, i: number) => (
                <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface-2 text-[11px] font-bold text-muted">
                    {i + 1}
                  </span>
                  {c}
                </li>
              ))}
            </ol>
            {info.lastDone && (
              <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3.5 text-[12.5px]">
                <Check className="h-4 w-4 text-mint" />
                Last time: {info.lastDone}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
