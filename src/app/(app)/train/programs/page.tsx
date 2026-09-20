"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ConfirmButton, EmptyState, Field, Input, Pill, SectionTitle, Sheet, Skeleton, Stepper, useToast } from "@/components/ui";
import { ArrowLeft, Check, Copy, Layers, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { prettyDate } from "@/lib/utils";

export default function Programs() {
  const programs = useQuery(api.programs.list, {});
  const generate = useMutation(api.programs.generate);
  const setActive = useMutation(api.programs.setActive);
  const duplicate = useMutation(api.programs.duplicateProgram);
  const remove = useMutation(api.programs.deleteProgram);
  const create = useMutation(api.programs.createProgram);
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState<number | undefined>(4);

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <button onClick={() => router.push("/train")} className="-m-1.5 rounded-xl p-3 text-muted hover:bg-surface-2 hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-tight">Training plans</h1>
      </header>

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const id = await generate({ activate: true });
            setBusy(false);
            toast({ message: "New plan generated from your profile" });
            router.push(`/train/programs/${id}`);
          }}
        >
          <Sparkles className="h-4 w-4" /> Generate
        </Button>
        <Button variant="soft" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Build own
        </Button>
      </div>

      {programs === undefined ? (
        <Skeleton className="h-40 w-full" />
      ) : programs.length === 0 ? (
        <EmptyState icon={<Layers className="h-5 w-5" />} title="No plans yet" body="Generate one from your profile." />
      ) : (
        <div className="space-y-2">
          {programs.map((p: any) => (
            <Card key={p._id}>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h3 className="min-w-0 flex-1 truncate text-[14.5px] font-bold">{p.name}</h3>
                  {p.isActive && <Pill tone="accent">Active</Pill>}
                </div>
                <p className="line-clamp-1 text-[11.5px] text-muted">{p.description}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Pill>{p.daysPerWeek} d/wk</Pill>
                  <Pill>{p.dayCount} days</Pill>
                  <Pill>{p.exerciseCount} ex</Pill>
                  <Pill>{p.source}</Pill>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {!p.isActive && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      await setActive({ id: p._id });
                      toast({ message: `${p.name} is now your active plan` });
                    }}
                  >
                    <Check className="h-3.5 w-3.5" /> Activate
                  </Button>
                )}
                <Link href={`/train/programs/${p._id}`}>
                  <Button size="sm" variant="soft">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await duplicate({ id: p._id });
                    toast({ message: "Duplicated" });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </Button>
                <ConfirmButton
                  onConfirm={async () => {
                    await remove({ id: p._id });
                    toast({ message: "Plan deleted — logged workouts are untouched" });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </ConfirmButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New plan"
        footer={
          <Button
            className="w-full"
            size="lg"
            disabled={!name.trim()}
            onClick={async () => {
              const id = await create({ name, daysPerWeek: days ?? 4 });
              setCreating(false);
              setName("");
              router.push(`/train/programs/${id}`);
            }}
          >
            Create and add days
          </Button>
        }
      >
        <div className="space-y-3">
          <Field label="Plan name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Winter strength block" />
          </Field>
          <Field label="Sessions per week">
            <Stepper value={days} onChange={setDays} step={1} min={1} max={7} suffix="days" />
          </Field>
        </div>
      </Sheet>
    </div>
  );
}
