"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Button, Chip, ConfirmButton, EmptyState, Input, Pill, Sheet, Skeleton, useToast } from "@/components/ui";
import { MediaTile } from "@/components/ui/media";
import { CreateExercise } from "@/components/exercise-picker";
import { ArrowLeft, Dumbbell, Plus, Search, Timer, Trash2, TrendingUp } from "lucide-react";
import { prettyDate, titleCase } from "@/lib/utils";

const CATEGORIES = ["yoga", "strength", "cardio", "core", "mobility"];
const MUSCLES = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "core", "calves"];
/** Yoga is browsed by shape, not by muscle — nobody looks for "an asana for biceps". */
const YOGA_PATTERNS = [
  "flow",
  "standing",
  "balance",
  "core",
  "backbend",
  "twist",
  "forward-fold",
  "seated",
  "inversion",
  "restorative",
];

/** `useSearchParams` needs a boundary above it or the whole route opts out of prerendering. */
export default function ExercisesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Exercises />
    </Suspense>
  );
}

function Exercises() {
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | undefined>(params.get("category") ?? undefined);
  const [muscle, setMuscle] = useState<string | undefined>();
  const [pattern, setPattern] = useState<string | undefined>();
  const [selected, setSelected] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const list = useQuery(api.exercises.list, { search: q || undefined, category, muscle });
  const archive = useMutation(api.exercises.archive);
  const router = useRouter();
  const toast = useToast();
  const isYoga = category === "yoga";

  // Yoga reads as an A–Z reference; everything else keeps the library's own ordering.
  const rows = useMemo(() => {
    let out = list ?? [];
    if (isYoga && pattern) out = out.filter((e: any) => e.pattern === pattern);
    if (isYoga) out = [...out].sort((a: any, b: any) => a.name.localeCompare(b.name));
    return out;
  }, [list, isYoga, pattern]);

  function pickCategory(c: string) {
    const next = category === c ? undefined : c;
    setCategory(next);
    // The two secondary filters are mutually exclusive, so clear whichever no longer applies.
    setPattern(undefined);
    if (next === "yoga") setMuscle(undefined);
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2 pt-0.5">
        <button
          onClick={() => router.push("/train")}
          className="-m-1.5 rounded-xl p-3 text-muted hover:bg-surface-2 hover:text-ink"
          aria-label="Back to Train"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-tight">
          {isYoga ? "Yoga A–Z" : "Exercise library"}
        </h1>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isYoga ? "Search poses or Sanskrit names…" : "Search exercises…"}
          className="pl-10"
        />
      </div>

      <div className="no-scrollbar bleed flex gap-1.5 overflow-x-auto pb-0.5">
        <Chip active={!category && !muscle} onClick={() => { setCategory(undefined); setMuscle(undefined); setPattern(undefined); }}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => pickCategory(c)} className="capitalize">
            {c}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar bleed flex gap-1.5 overflow-x-auto pb-0.5">
        {isYoga
          ? YOGA_PATTERNS.map((p) => (
              <Chip key={p} active={pattern === p} onClick={() => setPattern(pattern === p ? undefined : p)}>
                {titleCase(p.replace("-", " "))}
              </Chip>
            ))
          : MUSCLES.map((m) => (
              <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? undefined : m)} className="capitalize">
                {m}
              </Chip>
            ))}
      </div>

      {list === undefined ? (
        <Skeleton className="h-72 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-5 w-5" />}
          title="No matches"
          body="Try another filter, or add it as a custom exercise."
          action={<Button size="sm" onClick={() => setCreating(true)}>Create exercise</Button>}
        />
      ) : (
        <>
          <div className="text-[11.5px] text-muted">
            {rows.length} {isYoga ? (rows.length === 1 ? "pose" : "poses") : rows.length === 1 ? "exercise" : "exercises"}
          </div>
          <div className="space-y-1.5">
            {rows.map((e: any) => (
              <button
                key={e._id}
                onClick={() => setSelected(e)}
                className="flex w-full items-center gap-2.5 rounded-2xl border border-line bg-surface p-2 text-left transition-colors active:scale-[0.99] hover:border-ink/15"
              >
                <MediaTile muscles={e.primaryMuscles} category={e.category} size={38} radius={12} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{e.name}</span>
                    {e.ownerUserId && <Pill tone="violet">mine</Pill>}
                  </div>
                  <div className="truncate text-[11.5px] capitalize text-muted">
                    {e.sanskrit ?? `${e.primaryMuscles.join(", ")} · ${e.equipment.join(", ") || "bodyweight"}`}
                  </div>
                </div>
                {e.holdSec ? (
                  <span className="tabular flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-[11px] font-semibold text-muted">
                    <Timer className="h-3 w-3" />
                    {e.holdSec}s
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] capitalize text-muted">{e.difficulty}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <ExerciseDetail
        exercise={selected}
        onClose={() => setSelected(null)}
        onArchive={async () => {
          await archive({ id: selected._id });
          setSelected(null);
          toast({ message: "Archived — past workouts keep it" });
        }}
      />
      <CreateExercise open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function ExerciseDetail({ exercise, onClose, onArchive }: { exercise: any; onClose: () => void; onArchive: () => void }) {
  const history = useQuery(api.exercises.history, exercise ? { exerciseId: exercise._id, limit: 8 } : "skip");
  if (!exercise) return null;
  return (
    <Sheet open={!!exercise} onClose={onClose} title={exercise.name} size="lg">
      <div className="space-y-3.5">
        {exercise.sanskrit && (
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold italic">{exercise.sanskrit}</span>
            {exercise.holdSec > 0 && (
              <span className="tabular flex shrink-0 items-center gap-1 text-[12px] text-muted">
                <Timer className="h-3.5 w-3.5" /> hold {exercise.holdSec}s
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {exercise.primaryMuscles.map((m: string) => (
            <Pill key={m} tone="accent">
              {m}
            </Pill>
          ))}
          {exercise.secondaryMuscles?.map((m: string) => (
            <Pill key={m}>{m}</Pill>
          ))}
          {exercise.equipment.map((m: string) => (
            <Pill key={m} tone="sky">
              {m}
            </Pill>
          ))}
          <Pill tone="amber">{exercise.difficulty}</Pill>
        </div>

        {exercise.instructions?.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              {exercise.category === "yoga" ? "How to get into it" : "How to do it"}
            </div>
            <ol className="space-y-2">
              {exercise.instructions.map((c: string, i: number) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface-2 text-[11px] font-bold text-muted">
                    {i + 1}
                  </span>
                  {c}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            <TrendingUp className="h-3.5 w-3.5" /> Your history
          </div>
          {history === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : history.length === 0 ? (
            <p className="text-[12.5px] text-muted">Not logged yet.</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((h: any) => (
                <div key={h.date} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{prettyDate(h.date)}</span>
                  <span className="tabular shrink-0 text-[11.5px] text-muted">
                    {h.sets.map((s: any) => `${s.weightKg ?? 0}×${s.reps ?? 0}`).join("  ")}
                  </span>
                  <span className="tabular shrink-0 text-[12px] font-bold">{Math.round(h.volume)} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {exercise.ownerUserId && (
          <ConfirmButton onConfirm={onArchive}>
            <Trash2 className="h-3.5 w-3.5" /> Archive this exercise
          </ConfirmButton>
        )}
      </div>
    </Sheet>
  );
}
