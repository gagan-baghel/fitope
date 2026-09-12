"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Pill,
  Segmented,
  Sheet,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Flame,
  Info,
  MoreHorizontal,
  Plus,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { cn, prettyDate } from "@/lib/utils";
import { ExercisePicker } from "@/components/exercise-picker";

export default function Session() {
  const { id } = useParams<{ id: string }>();
  const workout = useQuery(api.workouts.get, { id: id as any });
  const updateSet = useMutation(api.workouts.updateSet);
  const addSet = useMutation(api.workouts.addSet);
  const deleteSet = useMutation(api.workouts.deleteSet);
  const addExercise = useMutation(api.workouts.addExercise);
  const removeExercise = useMutation(api.workouts.removeExercise);
  const complete = useMutation(api.workouts.complete);
  const updateWorkout = useMutation(api.workouts.updateWorkout);
  const removeWorkout = useMutation(api.workouts.remove);
  const router = useRouter();
  const toast = useToast();

  const [picker, setPicker] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [rest, setRest] = useState<{ total: number; endsAt: number } | null>(null);
  const [notes, setNotes] = useState("");
  const [rpe, setRpe] = useState("7");
  const [busy, setBusy] = useState(false);

  const done = workout?.status === "completed" || workout?.status === "skipped";
  const elapsed = useElapsed(workout?.startedAt, workout?.completedAt);

  const totals = useMemo(() => {
    if (!workout?.exercises) return { sets: 0, doneSets: 0, volume: 0 };
    let sets = 0;
    let doneSets = 0;
    let volume = 0;
    for (const e of workout.exercises as any[])
      for (const s of e.sets) {
        sets++;
        if (s.completed) {
          doneSets++;
          volume += (s.weightKg ?? 0) * (s.reps ?? 0);
        }
      }
    return { sets, doneSets, volume: Math.round(volume) };
  }, [workout]);

  if (workout === undefined) return <Skeleton className="h-96 w-full" />;
  if (!workout) return <div className="py-20 text-center text-muted">Session not found.</div>;

  return (
    <div className="space-y-4 pb-24">
      <header className="sticky top-0 z-30 -mx-4 -mt-5 bg-bg/85 px-4 pb-3 pt-5 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/train")} className="rounded-xl p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[18px] font-bold leading-tight tracking-tight">{workout.title}</h1>
            <div className="tabular text-[12px] text-muted">
              {prettyDate(workout.date)} · {totals.doneSets}/{totals.sets} sets
              {totals.volume > 0 && ` · ${totals.volume.toLocaleString("en-IN")} kg`}
              {!done && elapsed && ` · ${elapsed}`}
            </div>
          </div>
          {!done ? (
            <Button size="sm" onClick={() => setFinishing(true)} disabled={totals.doneSets === 0}>
              Finish
            </Button>
          ) : (
            <Pill tone="accent">
              <Check className="h-3 w-3" /> Done
            </Pill>
          )}
        </div>
      </header>

      {(workout.exercises as any[]).length === 0 && (
        <Card className="text-center">
          <p className="text-[14px] text-muted">This session is empty. Add your first exercise.</p>
        </Card>
      )}

      {(workout.exercises as any[]).map((we, idx) => (
        <ExerciseBlock
          key={we._id}
          we={we}
          index={idx}
          readOnly={done}
          onToggle={async (setId, patch) => {
            await updateSet({ id: setId, ...patch });
            if (patch.completed && we.restSec)
              setRest({ total: we.restSec, endsAt: Date.now() + we.restSec * 1000 });
          }}
          onAddSet={() => addSet({ workoutExerciseId: we._id })}
          onDeleteSet={(setId) => deleteSet({ id: setId })}
          onRemove={async () => {
            await removeExercise({ workoutExerciseId: we._id });
            toast({ message: `${we.exercise?.name} removed` });
          }}
        />
      ))}

      {!done && (
        <Button variant="soft" size="lg" className="w-full" onClick={() => setPicker(true)}>
          <Plus className="h-4 w-4" /> Add exercise
        </Button>
      )}

      {done && (
        <Card className="space-y-2">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-muted">Session notes</div>
          <p className="text-[14px] text-ink-2">{workout.notes || "No notes for this session."}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {workout.rpe && <Pill tone="amber">RPE {workout.rpe}</Pill>}
            {workout.durationMin && <Pill>{workout.durationMin} min</Pill>}
            {workout.totalVolumeKg ? <Pill tone="accent">{workout.totalVolumeKg.toLocaleString("en-IN")} kg volume</Pill> : null}
          </div>
          <div className="pt-2">
            <ConfirmButton
              onConfirm={async () => {
                await removeWorkout({ id: workout._id });
                toast({ message: "Session deleted" });
                router.push("/train");
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete session
            </ConfirmButton>
          </div>
        </Card>
      )}

      {/* Rest timer */}
      {rest && <RestTimer rest={rest} onDone={() => setRest(null)} />}

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={async (exerciseId) => {
          await addExercise({ workoutId: workout._id, exerciseId });
          setPicker(false);
        }}
      />

      <Sheet
        open={finishing}
        onClose={() => setFinishing(false)}
        title="Finish session"
        footer={
          <Button
            className="w-full"
            size="lg"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const res = await complete({ id: workout._id, notes: notes || undefined, rpe: Number(rpe) });
              setBusy(false);
              setFinishing(false);
              toast({
                message: res.prs
                  ? `Session saved — ${res.prs} personal record${res.prs > 1 ? "s" : ""}!`
                  : `Session saved · ${res.sets} sets · ${res.volume.toLocaleString("en-IN")} kg`,
                tone: res.prs ? "var(--accent)" : undefined,
              });
              router.push("/train");
            }}
          >
            Save session
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl bg-surface-2 p-3 text-center">
              <div className="tabular text-[20px] font-bold">{totals.doneSets}</div>
              <div className="text-[11px] text-muted">sets</div>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3 text-center">
              <div className="tabular text-[20px] font-bold">{(totals.volume / 1000).toFixed(1)}t</div>
              <div className="text-[11px] text-muted">volume</div>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3 text-center">
              <div className="tabular text-[20px] font-bold">{elapsed ?? "–"}</div>
              <div className="text-[11px] text-muted">duration</div>
            </div>
          </div>
          {totals.doneSets < totals.sets && (
            <div className="flex gap-2 rounded-2xl border border-amber/25 bg-amber/[0.07] p-3.5 text-[12.5px] text-ink-2">
              <Info className="h-4 w-4 shrink-0 text-amber" />
              {totals.sets - totals.doneSets} planned sets are unticked. Partial sessions still count —
              only what you logged gets saved.
            </div>
          )}
          <Field label="How hard was it?" hint="Rate of perceived exertion, 1 easy to 10 all-out.">
            <Segmented
              value={rpe}
              onChange={setRpe}
              options={["5", "6", "7", "8", "9", "10"].map((v) => ({ value: v, label: v }))}
            />
          </Field>
          <Field label="Notes (optional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Felt strong on the second lift…" />
          </Field>
        </div>
      </Sheet>
    </div>
  );
}

function ExerciseBlock({
  we,
  index,
  readOnly,
  onToggle,
  onAddSet,
  onDeleteSet,
  onRemove,
}: {
  we: any;
  index: number;
  readOnly: boolean;
  onToggle: (setId: any, patch: any) => Promise<void>;
  onAddSet: () => void;
  onDeleteSet: (id: any) => void;
  onRemove: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [info, setInfo] = useState(false);
  const ex = we.exercise;

  return (
    <Card className="p-0">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-[12px] font-bold text-muted">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <button onClick={() => setInfo(true)} className="text-left">
            <div className="text-[15px] font-bold leading-tight">{ex?.name ?? "Exercise"}</div>
            <div className="mt-0.5 truncate text-[11.5px] capitalize text-muted">
              {ex?.primaryMuscles?.join(", ")}
              {we.notes ? ` · ${we.notes}` : ""}
            </div>
          </button>
          {we.last && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-[11.5px] text-muted">
              <Flame className="h-3 w-3 text-amber" />
              Last {prettyDate(we.last.date)}: {we.last.topWeight ? `${we.last.topWeight} kg × ${we.last.topReps}` : `${we.last.topReps} reps`}
              {" · "}
              {we.last.sets} sets
            </div>
          )}
        </div>
        {!readOnly && (
          <button onClick={() => setMenu(!menu)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      {menu && !readOnly && (
        <div className="mx-4 mb-3 flex gap-2 rounded-xl bg-surface-2 p-2">
          <Button variant="ghost" size="sm" onClick={() => { setInfo(true); setMenu(false); }}>
            How to
          </Button>
          <ConfirmButton onConfirm={onRemove} confirmLabel="Confirm remove">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </ConfirmButton>
        </div>
      )}

      <div className="px-4 pb-4">
        <div className="mb-1.5 grid grid-cols-[26px_1fr_1fr_44px] items-center gap-2 px-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted">
          <span>Set</span>
          <span>Weight (kg)</span>
          <span>Reps</span>
          <span className="text-right">Done</span>
        </div>
        <div className="space-y-1.5">
          {we.sets.map((s: any, i: number) => (
            <SetRow
              key={s._id}
              set={s}
              index={i}
              readOnly={readOnly}
              onToggle={onToggle}
              onDelete={() => onDeleteSet(s._id)}
            />
          ))}
        </div>
        {!readOnly && (
          <button
            onClick={onAddSet}
            className="mt-2 w-full rounded-xl border border-dashed border-line py-2 text-[12.5px] font-semibold text-muted transition-colors hover:border-ink/25 hover:text-ink"
          >
            + Add set
          </button>
        )}
      </div>

      <Sheet open={info} onClose={() => setInfo(false)} title={ex?.name}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ex?.primaryMuscles?.map((m: string) => (
              <Pill key={m} tone="accent">
                {m}
              </Pill>
            ))}
            {ex?.equipment?.map((m: string) => (
              <Pill key={m}>{m}</Pill>
            ))}
            {ex?.difficulty && <Pill tone="amber">{ex.difficulty}</Pill>}
          </div>
          <ol className="space-y-2.5">
            {ex?.instructions?.map((c: string, i: number) => (
              <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface-2 text-[11px] font-bold text-muted">
                  {i + 1}
                </span>
                {c}
              </li>
            ))}
          </ol>
        </div>
      </Sheet>
    </Card>
  );
}

function SetRow({
  set,
  index,
  readOnly,
  onToggle,
  onDelete,
}: {
  set: any;
  index: number;
  readOnly: boolean;
  onToggle: (id: any, patch: any) => Promise<void>;
  onDelete: () => void;
}) {
  const [weight, setWeight] = useState<string>(set.weightKg?.toString() ?? "");
  const [reps, setReps] = useState<string>(set.reps?.toString() ?? "");

  useEffect(() => {
    setWeight(set.weightKg?.toString() ?? "");
    setReps(set.reps?.toString() ?? "");
  }, [set.weightKg, set.reps]);

  const commit = (patch: any) => onToggle(set._id, patch);

  return (
    <div
      className={cn(
        "grid grid-cols-[26px_1fr_1fr_44px] items-center gap-2 rounded-xl px-1 py-1 transition-colors",
        set.completed && "bg-accent-soft/60"
      )}
    >
      <div className="text-center text-[12px] font-bold text-muted">{index + 1}</div>
      <input
        inputMode="decimal"
        disabled={readOnly}
        value={weight}
        placeholder={set.targetReps ? "–" : "0"}
        onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ""))}
        onBlur={() => weight !== (set.weightKg?.toString() ?? "") && commit({ weightKg: weight === "" ? 0 : Number(weight) })}
        className="tabular h-10 w-full rounded-lg border border-line bg-surface-2 text-center text-[14px] font-semibold outline-none focus:border-accent/60 disabled:opacity-70"
      />
      <input
        inputMode="numeric"
        disabled={readOnly}
        value={reps}
        placeholder={set.targetReps ?? "0"}
        onChange={(e) => setReps(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={() => reps !== (set.reps?.toString() ?? "") && commit({ reps: reps === "" ? 0 : Number(reps) })}
        className="tabular h-10 w-full rounded-lg border border-line bg-surface-2 text-center text-[14px] font-semibold outline-none focus:border-accent/60 disabled:opacity-70"
      />
      <div className="flex justify-end gap-1">
        {readOnly ? (
          <div className={cn("grid h-10 w-10 place-items-center rounded-lg", set.completed ? "text-accent" : "text-muted/40")}>
            <Check className="h-4 w-4" strokeWidth={3} />
          </div>
        ) : (
          <button
            onClick={() => {
              const patch: any = { completed: !set.completed };
              if (!set.completed) {
                if (reps === "") patch.reps = Number(set.targetReps?.split("-")[0] ?? 10);
                if (weight === "" && set.weightKg == null) patch.weightKg = 0;
              }
              commit(patch);
            }}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-lg border transition-all active:scale-90",
              set.completed
                ? "border-transparent bg-accent text-accent-ink"
                : "border-line bg-surface-2 text-muted hover:border-accent/50"
            )}
            aria-label={set.completed ? "Mark set incomplete" : "Mark set complete"}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  );
}

function RestTimer({ rest, onDone }: { rest: { total: number; endsAt: number }; onDone: () => void }) {
  const [left, setLeft] = useState(Math.ceil((rest.endsAt - Date.now()) / 1000));
  useEffect(() => {
    const i = setInterval(() => {
      const l = Math.ceil((rest.endsAt - Date.now()) / 1000);
      setLeft(l);
      if (l <= 0) {
        clearInterval(i);
        onDone();
      }
    }, 250);
    return () => clearInterval(i);
  }, [rest.endsAt, onDone]);

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 lg:bottom-8">
      <div className="flex w-full max-w-sm animate-pop items-center gap-3 rounded-2xl border border-line bg-surface-3 px-4 py-3 shadow-xl">
        <Timer className="h-4 w-4 text-accent" />
        <div className="flex-1">
          <div className="tabular text-[15px] font-bold">
            {Math.floor(Math.max(0, left) / 60)}:{String(Math.max(0, left) % 60).padStart(2, "0")}
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.max(0, (left / rest.total) * 100)}%` }}
            />
          </div>
        </div>
        <button onClick={onDone} className="rounded-lg p-1.5 text-muted hover:text-ink" aria-label="Dismiss rest timer">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function useElapsed(startedAt?: number, completedAt?: number) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!startedAt || completedAt) return;
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [startedAt, completedAt]);
  if (!startedAt) return null;
  const ms = (completedAt ?? Date.now()) - startedAt;
  const mins = Math.floor(ms / 60000);
  return `${mins}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
}
