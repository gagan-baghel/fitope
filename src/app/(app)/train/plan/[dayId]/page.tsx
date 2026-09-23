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
import { DAY_NAMES, prettyDate, errorText } from "@/lib/utils";

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
      toast({ message: errorText(e), tone: "var(--rose)" });
      setBusy(false);
    }
  }

  return (
    <div className="-mt-3 pb-36">
      {/* Hero */}
      <header
        className="relative bleed overflow-hidden pb-4 pt-3 sm:rounded-b-2xl"
        style={{ background: "var(--tile-3)", color: "var(--tile-ink)" }}
      >
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
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[11.5px] font-medium opacity-70">{program.name}</div>
              <h1 className="text-[20px] font-bold leading-tight tracking-tight">{day.title}</h1>
              <p className="truncate text-[11.5px] capitalize opacity-75">{day.focus}</p>
            </div>
            <MinutesRing minutes={totalMinutes} progress={0.75} size={48} track="rgba(0,0,0,0.10)" />
          </div>
        </div>
      </header>

      <div className="space-y-3 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <TagChip key={c.label} icon={c.icon}>
              {c.label}
            </TagChip>
          ))}
        </div>

        <section>
          <SectionTitle>Session details</SectionTitle>
          <div className="grid grid-cols-2 gap-1.5">
            <MetaCell icon={Timer} value={`${totalMinutes} min`} label="Duration" />
            <MetaCell icon={Gauge} value={day.level} label="Level" />
            <MetaCell icon={Dumbbell} value={day.gear} label="Gear" />
            <MetaCell icon={Target} value={<span className="capitalize">{day.target}</span>} label="Target area" />
          </div>
        </section>

        <section>
          <SectionTitle
            action={<span className="text-[11.5px] text-muted">{items.length}</span>}
          >
            Exercises
          </SectionTitle>
          <div className="space-y-1.5">
            {items.map((it: any, i: number) => (
              <RowCard
                key={i}
                onClick={() => setInfo(it)}
                leading={
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-[11px] font-bold text-muted">
                    {i + 1}
                  </span>
                }
                tile={<MediaTile muscles={it.exercise?.primaryMuscles} category={it.exercise?.category} size={38} radius={12} />}
                title={it.exercise?.name ?? "Exercise"}
                subtitle={
                  it.exercise?.sanskrit ? (
                    <>
                      <span className="italic">{it.exercise.sanskrit}</span>
                      {` · ${it.sets > 1 ? `${it.sets} × ` : ""}${it.reps}`}
                    </>
                  ) : (
                    `${it.sets} × ${it.reps}${it.notes ? ` · ${it.notes}` : ""}`
                  )
                }
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
            <SectionTitle>Last times</SectionTitle>
            <div className="space-y-1.5">
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

        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 py-2.5 text-[11.5px] text-muted">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {day.weekday != null ? DAY_NAMES[day.weekday] : "Unscheduled"}
          </span>
          <Pill className="shrink-0">{program.daysPerWeek} d/wk</Pill>
        </div>
      </div>

      {/* Sticky CTA — the reference's "Join" button. Sits above the floating nav. */}
      <div className="gutter-x fixed inset-x-0 bottom-0 z-30 pb-[calc(var(--safe-bottom)_+_84px)] lg:pb-6">
        <div className="mx-auto max-w-md">
          <Button size="lg" className="w-full shadow-[var(--shadow-lift)]" loading={busy} onClick={begin}>
            <Play className="h-4 w-4" /> Start workout
          </Button>
        </div>
      </div>

      <Sheet open={!!info} onClose={() => setInfo(null)} title={info?.exercise?.name}>
        {info && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <MediaTile muscles={info.exercise?.primaryMuscles} category={info.exercise?.category} size={52} radius={16} />
              <div className="min-w-0">
                <div className={`truncate text-[13px] font-semibold ${info.exercise?.sanskrit ? "italic" : "capitalize"}`}>
                  {info.exercise?.sanskrit ?? info.exercise?.primaryMuscles?.join(", ")}
                </div>
                <div className="truncate text-[11.5px] capitalize text-muted">
                  {info.exercise?.equipment?.join(", ") || "bodyweight"} · {info.exercise?.difficulty}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <MetaCell icon={Dumbbell} value={`${info.sets}`} label="Sets" />
              <MetaCell icon={Target} value={info.reps} label={info.exercise?.holdSec ? "Hold" : "Reps"} />
              <MetaCell icon={Timer} value={`${info.restSec}s`} label="Rest" />
            </div>
            <ol className="space-y-2">
              {info.exercise?.instructions?.map((c: string, i: number) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface-2 text-[11px] font-bold text-muted">
                    {i + 1}
                  </span>
                  {c}
                </li>
              ))}
            </ol>
            {info.lastDone && (
              <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3 text-[12.5px]">
                <Check className="h-4 w-4 shrink-0 text-mint" />
                <span className="min-w-0">Last: {info.lastDone}</span>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
