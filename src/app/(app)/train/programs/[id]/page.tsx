"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Pill,
  SectionTitle,
  Select,
  Sheet,
  Skeleton,
  Stepper,
  useToast,
} from "@/components/ui";
import { ExercisePicker } from "@/components/exercise-picker";
import { ArrowLeft, ArrowDown, ArrowUp, Check, Play, Plus, Trash2 } from "lucide-react";
import { DAY_NAMES } from "@/lib/utils";

type Item = {
  exerciseId: any;
  sets: number;
  reps: string;
  restSec: number;
  targetWeightKg?: number;
  tempo?: string;
  notes?: string;
};

export default function ProgramEditor() {
  const { id } = useParams<{ id: string }>();
  const data = useQuery(api.programs.get, { id: id as any });
  const upsertDay = useMutation(api.programs.upsertDay);
  const deleteDay = useMutation(api.programs.deleteDay);
  const setActive = useMutation(api.programs.setActive);
  const updateProgram = useMutation(api.programs.updateProgram);
  const startWorkout = useMutation(api.workouts.start);
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<any>(null);

  if (data === undefined) return <Skeleton className="h-96 w-full" />;
  if (!data) return <div className="py-20 text-center text-muted">Plan not found.</div>;

  const exMap = new Map(data.exercises.map((e: any) => [e._id, e]));

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pt-1">
        <button onClick={() => router.push("/train/programs")} className="rounded-xl p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <input
            defaultValue={data.program.name}
            onBlur={(e) => e.target.value !== data.program.name && updateProgram({ id: data.program._id, name: e.target.value })}
            className="w-full bg-transparent text-[20px] font-bold tracking-tight outline-none"
          />
          <div className="text-[12px] text-muted">{data.program.description ?? `${data.days.length} sessions`}</div>
        </div>
        {!data.program.isActive && (
          <Button
            size="sm"
            onClick={async () => {
              await setActive({ id: data.program._id });
              toast({ message: "Plan activated" });
            }}
          >
            <Check className="h-3.5 w-3.5" /> Activate
          </Button>
        )}
      </header>

      {data.days.map((day: any) => (
        <Card key={day._id}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-bold">{day.title}</div>
              <div className="text-[12px] capitalize text-muted">
                {day.weekday != null ? DAY_NAMES[day.weekday] : `Day ${day.order + 1}`} · {day.focus} · ~{day.estMinutes} min
              </div>
            </div>
            <Button size="sm" variant="soft" onClick={() => setEditing({ ...day, items: [...day.items] })}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const wid = await startWorkout({ programDayId: day._id });
                router.push(`/train/session/${wid}`);
              }}
              aria-label="Start this session"
            >
              <Play className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 space-y-1.5">
            {day.items.map((it: Item, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5">
                <span className="w-4 text-[11px] font-bold text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                  {(exMap.get(it.exerciseId) as any)?.name ?? "Exercise"}
                </span>
                <span className="tabular text-[12px] text-muted">
                  {it.sets} × {it.reps} · {it.restSec}s
                </span>
              </div>
            ))}
            {day.items.length === 0 && <p className="text-[13px] text-muted">No exercises in this session yet.</p>}
          </div>
        </Card>
      ))}

      <Button
        variant="soft"
        size="lg"
        className="w-full"
        onClick={() =>
          setEditing({
            programId: data.program._id,
            order: data.days.length,
            weekday: undefined,
            title: `Day ${data.days.length + 1}`,
            focus: "full body",
            estMinutes: 45,
            items: [],
          })
        }
      >
        <Plus className="h-4 w-4" /> Add a session
      </Button>

      <DayEditor
        day={editing}
        onClose={() => setEditing(null)}
        onSave={async (d) => {
          await upsertDay({
            id: d._id,
            programId: data.program._id,
            order: d.order,
            weekday: d.weekday,
            title: d.title,
            focus: d.focus,
            estMinutes: d.estMinutes,
            items: d.items,
          });
          setEditing(null);
          toast({ message: "Session saved" });
        }}
        onDelete={
          editing?._id
            ? async () => {
                await deleteDay({ id: editing._id });
                setEditing(null);
                toast({ message: "Session removed" });
              }
            : undefined
        }
      />
    </div>
  );
}

function DayEditor({
  day,
  onClose,
  onSave,
  onDelete,
}: {
  day: any;
  onClose: () => void;
  onSave: (d: any) => void;
  onDelete?: () => void;
}) {
  const [d, setD] = useState<any>(day);
  const [picker, setPicker] = useState(false);
  const exercises = useQuery(api.exercises.byIds, d?.items?.length ? { ids: d.items.map((i: Item) => i.exerciseId) } : "skip");

  useEffect(() => setD(day), [day]);
  if (!d) return null;
  const nameOf = (exId: any) => (exercises ?? []).find((e: any) => e._id === exId)?.name ?? "Exercise";

  const patchItem = (i: number, patch: Partial<Item>) =>
    setD((p: any) => ({ ...p, items: p.items.map((x: Item, j: number) => (j === i ? { ...x, ...patch } : x)) }));

  const move = (i: number, dir: number) =>
    setD((p: any) => {
      const items = [...p.items];
      const j = i + dir;
      if (j < 0 || j >= items.length) return p;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...p, items };
    });

  return (
    <>
      <Sheet
        open={!!day}
        onClose={onClose}
        title={d._id ? "Edit session" : "New session"}
        size="lg"
        footer={
          <div className="flex gap-2">
            {onDelete && (
              <ConfirmButton variant="danger" size="lg" onConfirm={onDelete}>
                <Trash2 className="h-4 w-4" />
              </ConfirmButton>
            )}
            <Button className="flex-1" size="lg" onClick={() => onSave(d)}>
              Save session
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title">
              <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
            </Field>
            <Field label="Focus">
              <Input value={d.focus} onChange={(e) => setD({ ...d, focus: e.target.value })} placeholder="chest, triceps" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Scheduled day">
              <Select
                value={d.weekday ?? ""}
                onChange={(e) => setD({ ...d, weekday: e.target.value === "" ? undefined : Number(e.target.value) })}
              >
                <option value="">Unscheduled</option>
                {DAY_NAMES.map((n, i) => (
                  <option key={n} value={i}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estimated minutes">
              <Stepper value={d.estMinutes} onChange={(v) => setD({ ...d, estMinutes: v ?? 45 })} step={5} min={10} max={180} />
            </Field>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Exercises</div>
            <div className="space-y-2">
              {d.items.map((it: Item, i: number) => (
                <div key={i} className="rounded-2xl border border-line bg-surface-2 p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{nameOf(it.exerciseId)}</span>
                    <button onClick={() => move(i, -1)} className="rounded-lg p-1 text-muted hover:text-ink" aria-label="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => move(i, 1)} className="rounded-lg p-1 text-muted hover:text-ink" aria-label="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setD((p: any) => ({ ...p, items: p.items.filter((_: any, j: number) => j !== i) }))}
                      className="rounded-lg p-1 text-muted hover:text-rose"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Field label="Sets">
                      <Stepper value={it.sets} onChange={(v) => patchItem(i, { sets: v ?? 3 })} step={1} min={1} max={12} />
                    </Field>
                    <Field label="Reps">
                      <Input value={it.reps} onChange={(e) => patchItem(i, { reps: e.target.value })} className="py-2 text-center" />
                    </Field>
                    <Field label="Rest (s)">
                      <Stepper value={it.restSec} onChange={(v) => patchItem(i, { restSec: v ?? 90 })} step={15} min={0} max={600} />
                    </Field>
                  </div>
                  <Input
                    value={it.notes ?? ""}
                    onChange={(e) => patchItem(i, { notes: e.target.value })}
                    placeholder="Note (optional) — e.g. leave 2 reps in reserve"
                    className="mt-2 py-2 text-[13px]"
                  />
                </div>
              ))}
            </div>
            <Button variant="soft" className="mt-2 w-full" onClick={() => setPicker(true)}>
              <Plus className="h-4 w-4" /> Add exercise
            </Button>
          </div>
        </div>
      </Sheet>
      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(exerciseId) => {
          setD((p: any) => ({
            ...p,
            items: [...p.items, { exerciseId, sets: 3, reps: "8-12", restSec: 90 }],
          }));
          setPicker(false);
        }}
      />
    </>
  );
}
