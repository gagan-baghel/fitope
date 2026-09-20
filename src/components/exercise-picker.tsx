"use client";

import { cn, errorText } from "@/lib/utils";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button, Chip, Field, Input, Pill, Select, Sheet, useToast } from "@/components/ui";
import { MediaTile } from "@/components/ui/media";
import { Plus, Search, Timer } from "lucide-react";

const CATEGORIES = ["yoga", "strength", "cardio", "core", "mobility"];

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
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search exercises and poses"
              className="pl-10"
            />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
            <Chip active={!cat} onClick={() => setCat(undefined)}>
              All
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)} className="capitalize">
                {c}
              </Chip>
            ))}
          </div>
          <div className="space-y-1">
            {(results ?? []).map((e: any) => (
              <button
                key={e._id}
                onClick={() => onPick(e._id)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface-2 p-2 text-left transition-colors hover:border-accent/40"
              >
                <MediaTile muscles={e.primaryMuscles} category={e.category} size={36} radius={11} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{e.name}</div>
                  {/* An asana is known by its Sanskrit name and its hold, not by gear. */}
                  <div className={cn("truncate text-[11.5px] text-muted", e.sanskrit ? "italic" : "capitalize")}>
                    {e.sanskrit ?? `${e.primaryMuscles.join(", ")} · ${e.equipment.join(", ") || "bodyweight"}`}
                  </div>
                </div>
                {!!e.holdSec && (
                  <span className="tabular flex shrink-0 items-center gap-1 text-[11px] text-muted">
                    <Timer className="h-3 w-3" />
                    {e.holdSec}s
                  </span>
                )}
                {e.ownerUserId && <Pill tone="violet" className="shrink-0">mine</Pill>}
                <Plus className="h-4 w-4 shrink-0 text-muted" />
              </button>
            ))}
            {results && results.length === 0 && (
              <button className="w-full py-6 text-center text-[12.5px] text-muted" onClick={() => setCreating(true)}>
                Nothing matched — <span className="font-semibold text-accent">create “{q}”</span>
              </button>
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
/** A custom asana needs a shape, or a generated sequence has no slot to put it in. */
const YOGA_SHAPES = [
  "standing", "balance", "seated", "forward-fold", "backbend",
  "twist", "inversion", "restorative", "core", "flow",
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
  const [shape, setShape] = useState("standing");
  const [sanskrit, setSanskrit] = useState("");
  const [holdSec, setHoldSec] = useState("45");
  const [busy, setBusy] = useState(false);
  const isYoga = category === "yoga";

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
                // Yoga is sequenced by shape, so a pose stores its shape rather than "yoga".
                pattern: isYoga ? shape : category === "strength" ? "isolation" : category,
                difficulty,
                sanskrit: isYoga ? sanskrit : undefined,
                holdSec: isYoga ? Math.max(0, Math.min(600, Number(holdSec) || 0)) : undefined,
                instructions: instructions.split("\n").map((s) => s.trim()).filter(Boolean),
              });
              toast({ message: `${name} added to your library` });
              onCreated?.(id);
              setName("");
              setMuscles([]);
              setSanskrit("");
            } catch (e: any) {
              toast({ message: errorText(e), tone: "var(--rose)" });
            } finally {
              setBusy(false);
            }
          }}
        >
          Create exercise
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Landmine rotation" />
        </Field>
        <Field label="Primary muscles">
          <div className="flex flex-wrap gap-1">
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
          <div className="flex flex-wrap gap-1">
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
        <div className="grid grid-cols-2 gap-2">
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
        {isYoga && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Shape">
                <Select value={shape} onChange={(e) => setShape(e.target.value)}>
                  {YOGA_SHAPES.map((p) => (
                    <option key={p} value={p} className="capitalize">
                      {p.replace("-", " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Hold (sec)">
                <Input
                  inputMode="numeric"
                  value={holdSec}
                  onChange={(e) => setHoldSec(e.target.value.replace(/\D/g, ""))}
                  placeholder="45"
                />
              </Field>
            </div>
            <Field label="Sanskrit name (optional)">
              <Input value={sanskrit} onChange={(e) => setSanskrit(e.target.value)} placeholder="Vrksasana" />
            </Field>
          </>
        )}
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
