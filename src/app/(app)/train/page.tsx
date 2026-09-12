"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, EmptyState, Pill, SectionTitle, Skeleton, useToast } from "@/components/ui";
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
import { cn, prettyDate, todayStr } from "@/lib/utils";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function Train() {
  const week = useQuery(api.workouts.weekOverview, {});
  const todayWorkout = useQuery(api.workouts.forDate, {}) as any;
  const program = useQuery(api.programs.activeProgram, {});
  const history = useQuery(api.workouts.history, { limit: 8 });
  const prs = useQuery(api.workouts.personalRecords, {});
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
      toast({ message: e.message, tone: "var(--rose)" });
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between pt-1">
        <h1 className="text-[26px] font-bold tracking-tight">Train</h1>
        <div className="flex gap-2">
          <Link href="/train/exercises">
            <Button variant="soft" size="sm">
              <Library className="h-4 w-4" /> Exercises
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
          {(week ?? Array.from({ length: 7 }, (_, i) => ({ date: "", status: "rest" }))).map((d: any, i: number) => {
            const isToday = d.date === todayStr();
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-muted">{DAY_LETTERS[i]}</span>
                <div
                  className={cn(
                    "grid h-11 w-full place-items-center rounded-xl border text-[11px] font-bold transition-colors",
                    d.status === "completed" && "border-transparent bg-accent text-accent-ink",
                    d.status === "in_progress" && "border-accent bg-accent-soft text-accent",
                    d.status === "planned" && "border-line bg-surface-2 text-ink-2",
                    d.status === "skipped" && "border-line bg-surface-2 text-muted line-through",
                    d.status === "rest" && "border-dashed border-line text-muted/60",
                    isToday && d.status !== "completed" && "ring-2 ring-accent/40"
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
        <Skeleton className="h-44 w-full" />
      ) : todayWorkout ? (
        <Card className="border-accent/25">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Pill tone={todayWorkout.status === "completed" ? "accent" : "muted"} className="mb-2">
                {todayWorkout.status === "completed"
                  ? "Completed"
                  : todayWorkout.status === "in_progress"
                    ? "In progress"
                    : "Today's plan"}
              </Pill>
              <h2 className="truncate text-[21px] font-bold tracking-tight">{todayWorkout.title}</h2>
              <p className="mt-0.5 text-[13px] capitalize text-muted">{todayWorkout.focus}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {(todayWorkout.preview ? todayWorkout.plannedItems : todayWorkout.exercises)?.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-[11px] font-bold text-muted">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{item.exercise?.name}</div>
                  <div className="tabular text-[11.5px] text-muted">
                    {todayWorkout.preview
                      ? `${item.sets} sets × ${item.reps} · ${item.restSec}s rest`
                      : `${item.sets?.filter((s: any) => s.completed).length ?? 0}/${item.sets?.length ?? 0} sets done`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {todayWorkout.status !== "completed" ? (
            <div className="mt-4 flex gap-2">
              <Button
                size="lg"
                className="flex-1"
                loading={busy}
                onClick={() => begin(todayWorkout.programDayId)}
              >
                <Play className="h-4 w-4" />
                {todayWorkout.status === "in_progress" ? "Continue" : "Start workout"}
              </Button>
              <Button
                variant="soft"
                size="lg"
                onClick={async () => {
                  await skip({ workoutId: todayWorkout._id ?? undefined, reason: "Rest" });
                  toast({ message: "Marked as rest — no guilt attached" });
                }}
              >
                Rest
              </Button>
            </div>
          ) : (
            <Link href={`/train/session/${todayWorkout._id}`}>
              <Button variant="soft" size="lg" className="mt-4 w-full">
                Review session
              </Button>
            </Link>
          )}
        </Card>
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

      {/* Active program */}
      {program && (
        <section>
          <SectionTitle
            action={
              <Link href={`/train/programs/${program.program._id}`} className="flex items-center gap-1 text-[12.5px] font-semibold text-muted hover:text-ink">
                Edit <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {program.program.name}
          </SectionTitle>
          <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {program.days.map((d) => (
              <button
                key={d._id}
                onClick={() => begin(d._id)}
                className="w-44 shrink-0 rounded-2xl border border-line bg-surface p-4 text-left transition-transform active:scale-[0.98]"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {d.weekday != null ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.weekday] : `Day ${d.order + 1}`}
                </div>
                <div className="mt-1 text-[15px] font-bold leading-tight">{d.title}</div>
                <div className="mt-0.5 truncate text-[12px] capitalize text-muted">{d.focus}</div>
                <div className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-accent">
                  <Play className="h-3.5 w-3.5" /> {d.items.length} exercises
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* PRs */}
      {prs && prs.length > 0 && (
        <section>
          <SectionTitle>Personal records</SectionTitle>
          <Card className="divide-y divide-line p-0">
            {prs.slice(0, 5).map((p: any) => (
              <div key={p._id} className="flex items-center gap-3 px-4 py-3">
                <Trophy className="h-4 w-4 shrink-0 text-amber" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{p.exercise?.name}</div>
                  <div className="text-[11.5px] text-muted">{prettyDate(p.date)}</div>
                </div>
                <div className="text-right">
                  <div className="tabular text-[14px] font-bold text-accent">{p.value} kg</div>
                  <div className="tabular text-[11px] text-muted">
                    est. 1RM · {p.weightKg}×{p.reps}
                  </div>
                </div>
              </div>
            ))}
          </Card>
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
          <Card className="divide-y divide-line p-0">
            {history.map((w: any) => (
              <Link
                key={w._id}
                href={`/train/session/${w._id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
              >
                <div
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                    w.status === "completed" ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"
                  )}
                >
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{w.title}</div>
                  <div className="text-[11.5px] text-muted">
                    {prettyDate(w.date)}
                    {w.status === "skipped" ? " · skipped" : ` · ${w.setCount} sets`}
                    {w.durationMin ? ` · ${w.durationMin} min` : ""}
                  </div>
                </div>
                {w.isSample && <Pill>Sample</Pill>}
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
