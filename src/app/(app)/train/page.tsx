"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Chip, EmptyState, Pill, SectionTitle, Skeleton, useToast } from "@/components/ui";
import { MediaTile, MinutesRing, RowCard } from "@/components/ui/media";
import {
  CalendarDays,
  ChevronRight,
  Dumbbell,
  History,
  Layers,
  Library,
  Play,
  Plus,
  Trophy,
} from "lucide-react";
import { cn, prettyDate, todayStr, errorText } from "@/lib/utils";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const FILTERS = [
  { value: "all", label: "All" },
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "core", label: "Core" },
  { value: "mobility", label: "Mobility" },
];

export default function Train() {
  const week = useQuery(api.workouts.weekOverview, {});
  const todayWorkout = useQuery(api.workouts.forDate, {}) as any;
  const program = useQuery(api.programs.activeProgram, {});
  const history = useQuery(api.workouts.history, { limit: 8 });
  const prs = useQuery(api.workouts.personalRecords, {});
  const [filter, setFilter] = useState("all");
  const popular = useQuery(api.exercises.list, {
    category: filter === "all" ? undefined : filter,
    limit: 60,
  });
  const start = useMutation(api.workouts.start);
  const skip = useMutation(api.workouts.skip);
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function begin(programDayId?: any) {
    setBusy(true);
    try {
      const id = await start(programDayId ? { programDayId } : {});
      router.push(`/train/session/${id}`);
    } catch (e: any) {
      toast({ message: errorText(e), tone: "var(--rose)" });
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex min-w-0 items-center justify-between gap-3 pt-1">
        <h1 className="min-w-0 text-[22px] font-bold tracking-tight sm:text-[26px]">Train</h1>
        <div className="flex shrink-0 gap-1.5">
          <Link href="/train/exercises">
            <Button variant="soft" size="sm">
              <Library className="h-4 w-4" /> Library
            </Button>
          </Link>
          <Link href="/train/programs">
            <Button variant="soft" size="sm">
              <Layers className="h-4 w-4" /> Plans
            </Button>
          </Link>
        </div>
      </header>

      {/* Week strip */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">This week</span>
          <Link href="/timeline" className="flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-ink">
            <CalendarDays className="h-3.5 w-3.5" /> Timeline
          </Link>
        </div>
        <div className="flex gap-1.5">
          {(week ?? Array.from({ length: 7 }, () => ({ date: "", status: "rest" }))).map((d: any, i: number) => {
            const isToday = d.date === todayStr();
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-muted">{DAY_LETTERS[i]}</span>
                <div
                  className={cn(
                    "grid h-10 w-full place-items-center rounded-xl border text-[12px] font-bold transition-colors sm:h-11 sm:rounded-2xl",
                    d.status === "completed" && "border-transparent bg-ink text-ground",
                    d.status === "in_progress" && "border-ink bg-surface text-ink",
                    d.status === "planned" && "border-line bg-surface-2 text-ink-2",
                    d.status === "skipped" && "border-line bg-surface-2 text-muted line-through",
                    d.status === "rest" && "border-dashed border-line text-muted/60",
                    isToday && d.status !== "completed" && "ring-2 ring-ink/20"
                  )}
                  title={d.title}
                >
                  {d.date ? new Date(d.date + "T00:00:00").getDate() : "–"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Today */}
      {todayWorkout === undefined ? (
        <Skeleton className="h-52 w-full" />
      ) : todayWorkout ? (
        <section
          className="relative -mx-1 overflow-hidden rounded-[28px] p-5 shadow-[var(--shadow)]"
          style={{ background: "var(--tile-2)", color: "var(--tile-ink)" }}
        >
          <div className="hero-blob -right-12 -top-14 h-48 w-48" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="hero-chip">
                  {todayWorkout.status === "completed"
                    ? "Completed"
                    : todayWorkout.status === "in_progress"
                      ? "In progress"
                      : "Today"}
                </span>
                <h2 className="mt-3 truncate text-[26px] font-bold leading-tight tracking-tight">
                  {todayWorkout.title}
                </h2>
                <p className="mt-1 text-[12.5px] capitalize opacity-75">{todayWorkout.focus}</p>
              </div>
              <MinutesRing
                minutes={todayWorkout.estMinutes ?? todayWorkout.durationMin ?? 0}
                progress={todayWorkout.status === "completed" ? 1 : 0.4}
                size={62}
                track="rgba(0,0,0,0.10)"
              />
            </div>

            <div className="mt-4 space-y-1.5">
              {(todayWorkout.preview ? todayWorkout.plannedItems : todayWorkout.exercises)
                ?.slice(0, 3)
                .map((item: any, i: number) => (
                  <div key={i} className="hero-inset flex items-center gap-2.5 rounded-2xl px-3 py-2">
                    <MediaTile
                      muscles={item.exercise?.primaryMuscles}
                      category={item.exercise?.category}
                      size={34}
                      radius={11}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{item.exercise?.name}</span>
                    <span className="tabular shrink-0 text-[11.5px] opacity-70">
                      {todayWorkout.preview
                        ? `${item.sets}×${item.reps}`
                        : `${item.sets?.filter((s: any) => s.completed).length ?? 0}/${item.sets?.length ?? 0}`}
                    </span>
                  </div>
                ))}
            </div>

            <div className="mt-4 flex gap-2">
              {todayWorkout.status !== "completed" ? (
                <>
                  <button onClick={() => begin(todayWorkout.programDayId)} disabled={busy} className="hero-cta flex-1 justify-center">
                    <Play className="h-4 w-4" />
                    {todayWorkout.status === "in_progress" ? "Continue" : "Start workout"}
                  </button>
                  {todayWorkout.programDayId && (
                    <Link
                      href={`/train/plan/${todayWorkout.programDayId}`}
                      className="hero-inset grid h-[42px] w-[42px] place-items-center rounded-full"
                      aria-label="Session details"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      await skip({ workoutId: todayWorkout._id ?? undefined, reason: "Rest" });
                      toast({ message: "Marked as rest — no guilt attached" });
                    }}
                    className="hero-inset rounded-full px-4 text-[13px] font-semibold"
                  >
                    Rest
                  </button>
                </>
              ) : (
                <Link href={`/train/session/${todayWorkout._id}`} className="hero-cta flex-1 justify-center">
                  Review session <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </section>
      ) : (
        <EmptyState
          icon={<Dumbbell className="h-5 w-5" />}
          title="Nothing scheduled today"
          body="Start a freestyle session, or set up a plan that fits your week."
          action={
            <div className="flex gap-2">
              <Button onClick={() => begin()} loading={busy}>
                <Plus className="h-4 w-4" /> Freestyle
              </Button>
              <Link href="/train/programs">
                <Button variant="soft">Build a plan</Button>
              </Link>
            </div>
          }
        />
      )}

      {/* Active plan days */}
      {program && (
        <section>
          <SectionTitle
            action={
              <Link href={`/train/programs/${program.program._id}`} className="text-[12.5px] font-semibold text-muted hover:text-ink">
                Edit plan
              </Link>
            }
          >
            {program.program.name}
          </SectionTitle>
          <div className="space-y-2">
            {program.days.map((d) => (
              <RowCard
                key={d._id}
                href={`/train/plan/${d._id}`}
                tile={<MediaTile muscles={d.focus.split(",").map((x) => x.trim())} />}
                title={d.title}
                subtitle={`${d.weekday != null ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.weekday] : `Day ${d.order + 1}`} · ${d.items.length} exercises`}
                trailing={<MinutesRing minutes={d.estMinutes} progress={0} />}
              />
            ))}
          </div>
        </section>
      )}

      {/* Browse the library, reference-style chips + rows */}
      <section>
        <SectionTitle
          action={
            <Link href="/train/exercises" className="text-[12.5px] font-semibold text-muted hover:text-ink">
              See all
            </Link>
          }
        >
          Popular exercises
        </SectionTitle>
        <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
          {FILTERS.map((f) => (
            <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </Chip>
          ))}
        </div>
        <div className="space-y-2">
          {(popular ?? []).slice(0, 5).map((e: any) => (
            <RowCard
              key={e._id}
              href="/train/exercises"
              tile={<MediaTile muscles={e.primaryMuscles} category={e.category} />}
              title={e.name}
              subtitle={<span className="capitalize">{e.difficulty} · {e.primaryMuscles.join(", ")}</span>}
              trailing={<ChevronRight className="h-4 w-4 text-muted" />}
            />
          ))}
        </div>
      </section>

      {/* PRs */}
      {prs && prs.length > 0 && (
        <section>
          <SectionTitle>Personal records</SectionTitle>
          <div className="space-y-2">
            {prs.slice(0, 4).map((p: any) => (
              <RowCard
                key={p._id}
                tile={<MediaTile muscles={p.exercise?.primaryMuscles} category={p.exercise?.category} />}
                title={p.exercise?.name ?? "Exercise"}
                subtitle={`${prettyDate(p.date)} · ${p.weightKg} kg × ${p.reps}`}
                trailing={
                  <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5">
                    <Trophy className="h-3.5 w-3.5 text-amber" />
                    <span className="tabular text-[13px] font-bold">{p.value}</span>
                    <span className="text-[11px] text-muted">kg</span>
                  </span>
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* History */}
      <section>
        <SectionTitle
          action={
            <Link href="/timeline" className="flex items-center gap-1 text-[12.5px] font-semibold text-muted hover:text-ink">
              <History className="h-3.5 w-3.5" /> All
            </Link>
          }
        >
          Recent sessions
        </SectionTitle>
        {history === undefined ? (
          <Skeleton className="h-28 w-full" />
        ) : history.length === 0 ? (
          <EmptyState icon={<History className="h-5 w-5" />} title="No sessions yet" body="Your logged workouts will appear here." />
        ) : (
          <div className="space-y-2">
            {history.map((w: any) => (
              <RowCard
                key={w._id}
                href={`/train/session/${w._id}`}
                tile={<MediaTile muscles={w.focus?.split(",").map((x: string) => x.trim())} />}
                title={w.title}
                subtitle={`${prettyDate(w.date)}${w.status === "skipped" ? " · skipped" : ` · ${w.setCount} sets`}`}
                trailing={
                  <div className="flex items-center gap-2">
                    {w.isSample && <Pill>Sample</Pill>}
                    <MinutesRing minutes={w.durationMin ?? 0} progress={w.status === "completed" ? 1 : 0} />
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
