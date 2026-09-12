"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button, Field, Input, Segmented, Sheet, Stepper, Textarea, useToast } from "@/components/ui";
import { todayStr } from "@/lib/utils";

export function WeightSheet({
  open,
  onClose,
  date,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  date?: string;
  initial?: number;
}) {
  const log = useMutation(api.tracking.logBody);
  const toast = useToast();
  const [weight, setWeight] = useState<number | undefined>(initial);
  const [bf, setBf] = useState<number | undefined>();
  const [m, setM] = useState<Record<string, number | undefined>>({});
  const [showMeasure, setShowMeasure] = useState(false);
  const [busy, setBusy] = useState(false);

  const FIELDS = ["waist", "chest", "arms", "shoulders", "thighs", "hips", "neck", "calves"];

  async function save() {
    setBusy(true);
    try {
      await log({
        date: date ?? todayStr(),
        weightKg: weight,
        bodyFatPct: bf,
        measurements: Object.keys(m).length
          ? (Object.fromEntries(Object.entries(m).filter(([, v]) => v != null)) as any)
          : undefined,
      });
      toast({ message: "Body log saved" });
      onClose();
    } catch (e: any) {
      toast({ message: e.message, tone: "var(--rose)" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log body"
      footer={
        <Button className="w-full" size="lg" loading={busy} onClick={save} disabled={!weight && !Object.keys(m).length}>
          Save
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Weight (kg)" hint="Weigh at the same time of day — first thing after waking is the most consistent.">
          <Stepper value={weight} onChange={setWeight} step={0.1} min={20} max={400} suffix="kg" />
        </Field>
        <Field label="Body fat % (optional)">
          <Stepper value={bf} onChange={setBf} step={0.5} min={2} max={70} suffix="%" />
        </Field>
        <button
          className="text-[13px] font-semibold text-accent"
          onClick={() => setShowMeasure((s) => !s)}
        >
          {showMeasure ? "Hide" : "Add"} tape measurements
        </button>
        {showMeasure && (
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <Field key={f} label={f[0].toUpperCase() + f.slice(1) + " (cm)"}>
                <Stepper
                  value={m[f]}
                  onChange={(v) => setM((prev) => ({ ...prev, [f]: v }))}
                  step={0.5}
                  min={0}
                  max={250}
                />
              </Field>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

export function SleepSheet({ open, onClose, defaults }: { open: boolean; onClose: () => void; defaults?: { bedtime?: string; wakeTime?: string } }) {
  const log = useMutation(api.tracking.logSleep);
  const toast = useToast();
  const [bed, setBed] = useState(defaults?.bedtime ?? "23:00");
  const [wake, setWake] = useState(defaults?.wakeTime ?? "07:00");
  const [quality, setQuality] = useState("3");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const duration = (() => {
    const [bh, bm] = bed.split(":").map(Number);
    const [wh, wm] = wake.split(":").map(Number);
    let mins = wh * 60 + wm - (bh * 60 + bm);
    if (mins <= 0) mins += 1440;
    return mins;
  })();

  async function save() {
    setBusy(true);
    try {
      const wakeDate = new Date(`${todayStr()}T${wake}:00`);
      const bedDate = new Date(wakeDate.getTime() - duration * 60000);
      await log({
        bedAt: bedDate.getTime(),
        wakeAt: wakeDate.getTime(),
        quality: Number(quality),
        notes: notes || undefined,
      });
      toast({ message: "Sleep logged" });
      onClose();
    } catch (e: any) {
      toast({ message: e.message, tone: "var(--rose)" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log last night"
      footer={
        <Button className="w-full" size="lg" loading={busy} onClick={save}>
          Save {Math.floor(duration / 60)}h {duration % 60 ? `${duration % 60}m` : ""}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Went to bed">
            <Input type="time" value={bed} onChange={(e) => setBed(e.target.value)} />
          </Field>
          <Field label="Woke up">
            <Input type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
          </Field>
        </div>
        <div className="rounded-2xl border border-line bg-surface-2 p-4 text-center">
          <div className="text-[12px] text-muted">Time in bed</div>
          <div className="text-[30px] font-bold text-sky">
            {Math.floor(duration / 60)}h {duration % 60 ? `${duration % 60}m` : ""}
          </div>
        </div>
        <Field label="How rested do you feel?">
          <Segmented
            value={quality}
            onChange={setQuality}
            options={[
              { value: "1", label: "Awful" },
              { value: "2", label: "Poor" },
              { value: "3", label: "OK" },
              { value: "4", label: "Good" },
              { value: "5", label: "Great" },
            ]}
          />
        </Field>
        <Field label="Notes (optional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Woke twice, late caffeine…" />
        </Field>
      </div>
    </Sheet>
  );
}

export function CheckinSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: any }) {
  const log = useMutation(api.tracking.logCheckin);
  const toast = useToast();
  const [energy, setEnergy] = useState(String(initial?.energy ?? 3));
  const [soreness, setSoreness] = useState(String(initial?.soreness ?? 2));
  const [stress, setStress] = useState(String(initial?.stress ?? 2));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const scale = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Daily check-in"
      footer={
        <Button
          className="w-full"
          size="lg"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await log({
              energy: Number(energy),
              soreness: Number(soreness),
              stress: Number(stress),
              notes: notes || undefined,
            });
            toast({ message: "Check-in saved" });
            setBusy(false);
            onClose();
          }}
        >
          Save check-in
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Energy" hint="1 = flat, 5 = buzzing">
          <Segmented value={energy} onChange={setEnergy} options={scale} />
        </Field>
        <Field label="Soreness" hint="1 = fresh, 5 = very sore">
          <Segmented value={soreness} onChange={setSoreness} options={scale} />
        </Field>
        <Field label="Stress" hint="1 = calm, 5 = wired">
          <Segmented value={stress} onChange={setStress} options={scale} />
        </Field>
        <Field label="Notes (optional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" />
        </Field>
      </div>
    </Sheet>
  );
}
