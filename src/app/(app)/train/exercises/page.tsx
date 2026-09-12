"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Chip, ConfirmButton, EmptyState, Input, Pill, Sheet, Skeleton, useToast } from "@/components/ui";
import { CreateExercise } from "@/components/exercise-picker";
import { ArrowLeft, Dumbbell, Plus, Search, Trash2, TrendingUp } from "lucide-react";
import { prettyDate } from "@/lib/utils";

const CATEGORIES = ["strength", "cardio", "core", "mobility"];
const MUSCLES = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "core", "calves"];

export default function Exercises() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [muscle, setMuscle] = useState<string | undefined>();
  const [selected, setSelected] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const list = useQuery(api.exercises.list, { search: q || undefined, category, muscle });
  const archive = useMutation(api.exercises.archive);
  const router = useRouter();
  const toast = useToast();

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pt-1">
        <button onClick={() => router.push("/train")} className="rounded-xl p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-[22px] font-bold tracking-tight">Exercise library</h1>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises…" className="pl-10" />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Chip active={!category && !muscle} onClick={() => { setCategory(undefined); setMuscle(undefined); }}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? undefined : c)} className="capitalize">
            {c}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {MUSCLES.map((m) => (
          <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? undefined : m)} className="capitalize">
            {m}
          </Chip>
        ))}
      </div>

      {list === undefined ? (
        <Skeleton className="h-72 w-full" />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-5 w-5" />}
          title="No matches"
          body="Try a different filter, or add it as a custom exercise."
          action={<Button onClick={() => setCreating(true)}>Create exercise</Button>}
        />
      ) : (
        <>
          <div className="text-[12px] text-muted">{list.length} exercises</div>
          <div className="space-y-1.5">
            {list.map((e: any) => (
              <button
                key={e._id}
                onClick={() => setSelected(e)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-accent/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold">{e.name}</span>
                    {e.ownerUserId && <Pill tone="violet">mine</Pill>}
                  </div>
                  <div className="truncate text-[11.5px] capitalize text-muted">
                    {e.primaryMuscles.join(", ")} · {e.equipment.join(", ") || "bodyweight"} · {e.difficulty}
                  </div>
                </div>
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
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
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
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">How to do it</div>
            <ol className="space-y-2.5">
              {exercise.instructions.map((c: string, i: number) => (
                <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-2">
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
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted">
            <TrendingUp className="h-3.5 w-3.5" /> Your history
          </div>
          {history === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : history.length === 0 ? (
            <p className="text-[13px] text-muted">You have not logged this exercise yet.</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((h: any) => (
                <div key={h.date} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5">
                  <span className="flex-1 text-[12.5px] font-semibold">{prettyDate(h.date)}</span>
                  <span className="tabular text-[12px] text-muted">
                    {h.sets.map((s: any) => `${s.weightKg ?? 0}×${s.reps ?? 0}`).join("  ")}
                  </span>
                  <span className="tabular text-[12px] font-bold">{Math.round(h.volume)} kg</span>
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
