"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button, Chip, Field, Input, Pill, Select, Sheet, useToast } from "@/components/ui";
import { Plus, Search } from "lucide-react";

const CATEGORIES = ["strength", "cardio", "core", "mobility"];

export function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (id: any) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const results = useQuery(api.exercises.list, { search: q || undefined, category: cat, limit: 80 });

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Add exercise" size="lg">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search 100+ exercises…"
              className="pl-10"
            />
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <Chip active={!cat} onClick={() => setCat(undefined)}>
              All
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)} className="capitalize">
                {c}
              </Chip>
            ))}
          </div>
          <div className="space-y-1.5">
            {(results ?? []).map((e: any) => (
              <button
                key={e._id}
                onClick={() => onPick(e._id)}
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-left transition-colors hover:border-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{e.name}</div>
                  <div className="truncate text-[11.5px] capitalize text-muted">
                    {e.primaryMuscles.join(", ")} · {e.equipment.join(", ") || "bodyweight"}
                  </div>
                </div>
                {e.ownerUserId && <Pill tone="violet">Custom</Pill>}
                <Plus className="h-4 w-4 shrink-0 text-muted" />
              </button>
            ))}
            {results && results.length === 0 && (
              <div className="py-8 text-center text-[13px] text-muted">
                Nothing matched “{q}”.
                <button className="mt-2 block w-full font-semibold text-accent" onClick={() => setCreating(true)}>
                  Create “{q}” as a custom exercise
                </button>
              </div>
            )}
          </div>
          <Button variant="soft" className="w-full" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Create custom exercise
          </Button>
        </div>
      </Sheet>
      <CreateExercise
        open={creating}
        initialName={q}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          onPick(id);
        }}
      />
    </>
  );
}

const MUSCLES = [
  "chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes",
  "calves", "core", "forearms", "traps", "cardio", "mobility",
];
const EQUIPMENT = [
  "bodyweight", "dumbbell", "barbell", "machine", "cable", "kettlebell", "bench",
  "rack", "pull-up bar", "band", "box",
];

export function CreateExercise({
  open,
  onClose,
  onCreated,
  initialName = "",
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: any) => void;
  initialName?: string;
}) {
  const create = useMutation(api.exercises.create);
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [muscles, setMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>(["bodyweight"]);
  const [category, setCategory] = useState("strength");
  const [difficulty, setDifficulty] = useState("beginner");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New exercise"
      footer={
        <Button
          className="w-full"
          size="lg"
          loading={busy}
          disabled={!name.trim() || muscles.length === 0}
          onClick={async () => {
            setBusy(true);
            try {
              const id = await create({
                name,
                primaryMuscles: muscles,
                equipment,
                category,
                pattern: category === "strength" ? "isolation" : category,
                difficulty,
                instructions: instructions.split("\n").map((s) => s.trim()).filter(Boolean),
              });
              toast({ message: `${name} added to your library` });
              onCreated?.(id);
              setName("");
              setMuscles([]);
            } catch (e: any) {
              toast({ message: e.message, tone: "var(--rose)" });
            } finally {
              setBusy(false);
            }
          }}
        >
          Create exercise
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Landmine rotation" />
        </Field>
        <Field label="Primary muscles">
          <div className="flex flex-wrap gap-1.5">
            {MUSCLES.map((m) => (
              <Chip
                key={m}
                active={muscles.includes(m)}
                onClick={() => setMuscles((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]))}
                className="capitalize"
              >
                {m}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Equipment">
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT.map((m) => (
              <Chip
                key={m}
                active={equipment.includes(m)}
                onClick={() => setEquipment((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]))}
              >
                {m}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Difficulty">
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {["beginner", "intermediate", "advanced"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Cues (one per line, optional)">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={"Brace before you move\nControl the eccentric"}
            className="min-h-24 w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[16px] outline-none focus:border-accent/60"
          />
        </Field>
      </div>
    </Sheet>
  );
}
