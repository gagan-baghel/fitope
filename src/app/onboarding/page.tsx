"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  OptionGrid,
  Pill,
  Segmented,
  Stat,
  useToast,
} from "@/components/ui";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Sparkles } from "lucide-react";
import { DAY_LABELS, cn } from "@/lib/utils";

type Draft = {
  name: string;
  sex: "male" | "female" | "other" | "";
  birthYear: number | undefined;
  heightCm: number | undefined;
  startWeightKg: number | undefined;
  targetWeightKg: number | undefined;
  goal: string;
  experience: string;
  activityLevel: string;
  daysPerWeek: number;
  preferredDays: number[];
  sessionMinutes: number;
  equipment: string[];
  dietPreference: string;
  allergies: string[];
  bedtime: string;
  wakeTime: string;
  units: string;
};

const EMPTY: Draft = {
  name: "",
  sex: "",
  birthYear: undefined,
  heightCm: undefined,
  startWeightKg: undefined,
  targetWeightKg: undefined,
  goal: "",
  experience: "",
  activityLevel: "",
  daysPerWeek: 4,
  preferredDays: [1, 2, 4, 5],
  sessionMinutes: 45,
  equipment: [],
  dietPreference: "",
  allergies: [],
  bedtime: "23:00",
  wakeTime: "07:00",
  units: "metric",
};

const STEPS = ["You", "Goal", "Training", "Schedule", "Kit", "Food", "Sleep", "Plan"];

/** Waits for the profile query so the form can seed its state once, without a sync-in-effect. */
export default function OnboardingPage() {
  const me = useQuery(api.profiles.me, {});
  const router = useRouter();

  useEffect(() => {
    if (me?.profile?.onboardingComplete) router.replace("/home");
  }, [me, router]);

  if (me === undefined) {
    return (
      <main className="mx-auto max-w-lg space-y-4 px-5 py-10">
        <div className="skeleton h-2 w-full rounded-full" />
        <div className="skeleton h-10 w-2/3 rounded-2xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
      </main>
    );
  }
  return <Onboarding me={me} />;
}

function draftFrom(me: any): Draft {
  const p = me?.profile;
  if (!p) {
    return {
      ...EMPTY,
      name: me?.email ? me.email.split("@")[0].replace(/[._]/g, " ") : "",
    };
  }
  return {
    ...EMPTY,
    name: p.name ?? "",
    sex: (p.sex as any) ?? "",
    birthYear: p.birthYear,
    heightCm: p.heightCm,
    startWeightKg: p.startWeightKg,
    targetWeightKg: p.targetWeightKg,
    goal: p.goal ?? "",
    experience: p.experience ?? "",
    activityLevel: p.activityLevel ?? "",
    daysPerWeek: p.daysPerWeek ?? 4,
    preferredDays: p.preferredDays ?? [1, 2, 4, 5],
    sessionMinutes: p.sessionMinutes ?? 45,
    equipment: p.equipment ?? [],
    dietPreference: p.dietPreference ?? "",
    allergies: p.allergies ?? [],
    bedtime: p.bedtime ?? "23:00",
    wakeTime: p.wakeTime ?? "07:00",
    units: p.units ?? "metric",
  };
}

function Onboarding({ me }: { me: any }) {
  const save = useMutation(api.profiles.saveProfile);
  const complete = useMutation(api.profiles.completeOnboarding);
  const generate = useMutation(api.programs.generate);
  const loadSample = useMutation(api.seed.loadSampleHistory);
  const ensureLibrary = useMutation(api.seed.ensureLibrary);
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<number>(me?.profile?.onboardingStep ?? 0);
  const [d, setD] = useState<Draft>(() => draftFrom(me));
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  async function persist(next: number) {
    setStep(next);
    await save({
      name: d.name || undefined,
      sex: (d.sex || undefined) as any,
      birthYear: d.birthYear,
      heightCm: d.heightCm,
      startWeightKg: d.startWeightKg,
      targetWeightKg: d.targetWeightKg,
      goal: d.goal || undefined,
      experience: d.experience || undefined,
      activityLevel: d.activityLevel || undefined,
      daysPerWeek: d.daysPerWeek,
      preferredDays: d.preferredDays,
      sessionMinutes: d.sessionMinutes,
      equipment: d.equipment,
      dietPreference: d.dietPreference || undefined,
      allergies: d.allergies,
      bedtime: d.bedtime,
      wakeTime: d.wakeTime,
      units: d.units,
      onboardingStep: next,
    });
  }

  const preview = useMemo(() => estimate(d), [d]);

  async function finish(withSample: boolean) {
    setBusy(true);
    try {
      await persist(STEPS.length - 1);
      await ensureLibrary();
      await complete({ withSampleData: withSample });
      await generate({ activate: true });
      if (withSample) await loadSample({ weeks: 6, tzOffsetMinutes: new Date().getTimezoneOffset() });
      toast({ message: withSample ? "Plan built with 6 weeks of sample history" : "Your plan is ready" });
      router.replace("/home");
    } catch (e: any) {
      toast({ message: e?.message ?? "Something went wrong", tone: "var(--rose)" });
      setBusy(false);
    }
  }

  const canNext = [
    d.heightCm && d.startWeightKg,
    d.goal,
    d.experience && d.activityLevel,
    true,
    true,
    true,
    true,
    true,
  ][step];

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-6">
      <header className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="rounded-xl p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex flex-1 gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-accent" : "bg-surface-3")}
              />
            ))}
          </div>
          <span className="tabular text-[12px] font-semibold text-muted">
            {step + 1}/{STEPS.length}
          </span>
        </div>
      </header>

      <div key={step} className="flex-1 animate-rise">
        {step === 0 && (
          <Step title="Let's set up your profile" sub="Used to estimate calories and protein. You can change any of it later.">
            <Field label="What should we call you?">
              <Input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your name" />
            </Field>
            <Field label="Sex" hint="Only used for the calorie formula. Choose 'Prefer not to say' to use a neutral estimate.">
              <OptionGrid
                cols={3}
                value={d.sex}
                onChange={(v) => set({ sex: v })}
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Prefer not" },
                ]}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Birth year">
                <Input
                  inputMode="numeric"
                  value={d.birthYear ?? ""}
                  onChange={(e) => set({ birthYear: num(e.target.value) })}
                  placeholder="1998"
                />
              </Field>
              <Field label="Height (cm)">
                <Input
                  inputMode="decimal"
                  value={d.heightCm ?? ""}
                  onChange={(e) => set({ heightCm: num(e.target.value) })}
                  placeholder="175"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Current weight (kg)">
                <Input
                  inputMode="decimal"
                  value={d.startWeightKg ?? ""}
                  onChange={(e) => set({ startWeightKg: num(e.target.value) })}
                  placeholder="72"
                />
              </Field>
              <Field label="Target weight (kg)" hint="Optional">
                <Input
                  inputMode="decimal"
                  value={d.targetWeightKg ?? ""}
                  onChange={(e) => set({ targetWeightKg: num(e.target.value) })}
                  placeholder="68"
                />
              </Field>
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step title="What are you training for?" sub="This sets your calorie direction and rep ranges.">
            <OptionGrid
              cols={1}
              value={d.goal}
              onChange={(v) => set({ goal: v })}
              options={[
                { value: "fat_loss", label: "Lose fat", hint: "Moderate deficit, protein kept high" },
                { value: "muscle_gain", label: "Build muscle", hint: "Small surplus, progressive overload" },
                { value: "recomp", label: "Recomposition", hint: "Hold weight, change what it's made of" },
                { value: "strength", label: "Get stronger", hint: "Lower reps, longer rest, heavier loads" },
                { value: "endurance", label: "Endurance", hint: "Conditioning-led with strength support" },
                { value: "general", label: "General fitness", hint: "Balanced, sustainable, no extremes" },
              ]}
            />
          </Step>
        )}

        {step === 2 && (
          <Step title="Where are you starting from?" sub="Honest answers give better plans than optimistic ones.">
            <Field label="Training experience">
              <OptionGrid
                cols={1}
                value={d.experience}
                onChange={(v) => set({ experience: v })}
                options={[
                  { value: "beginner", label: "Beginner", hint: "New, or returning after a long break" },
                  { value: "intermediate", label: "Intermediate", hint: "6+ months of consistent training" },
                  { value: "advanced", label: "Advanced", hint: "Years in, know your numbers" },
                ]}
              />
            </Field>
            <Field label="Daily activity outside the gym">
              <OptionGrid
                cols={1}
                value={d.activityLevel}
                onChange={(v) => set({ activityLevel: v })}
                options={[
                  { value: "sedentary", label: "Mostly sitting", hint: "Desk job, little walking" },
                  { value: "light", label: "Lightly active", hint: "Some walking most days" },
                  { value: "moderate", label: "Moderately active", hint: "On your feet a fair bit" },
                  { value: "active", label: "Very active", hint: "Physical job or lots of steps" },
                ]}
              />
            </Field>
          </Step>
        )}

        {step === 3 && (
          <Step title="When can you train?" sub="We'll fit the split to the days you actually have.">
            <Field label={`Sessions per week — ${d.daysPerWeek}`}>
              <input
                type="range"
                min={2}
                max={6}
                value={d.daysPerWeek}
                onChange={(e) => set({ daysPerWeek: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </Field>
            <Field label="Preferred days">
              <div className="flex gap-2">
                {DAY_LABELS.map((l, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      set({
                        preferredDays: d.preferredDays.includes(i)
                          ? d.preferredDays.filter((x) => x !== i)
                          : [...d.preferredDays, i].sort(),
                      })
                    }
                    className={cn(
                      "h-11 flex-1 rounded-xl border text-[13px] font-semibold transition-all",
                      d.preferredDays.includes(i)
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-line bg-surface-2 text-muted"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Session length">
              <Segmented
                value={String(d.sessionMinutes)}
                onChange={(v) => set({ sessionMinutes: Number(v) })}
                options={[
                  { value: "30", label: "30 min" },
                  { value: "45", label: "45 min" },
                  { value: "60", label: "60 min" },
                  { value: "90", label: "90 min" },
                ]}
              />
            </Field>
          </Step>
        )}

        {step === 4 && (
          <Step title="What can you train with?" sub="Pick everything you have access to. Bodyweight is always included.">
            <OptionGrid
              multi
              value={d.equipment}
              onChange={(v) => set({ equipment: v })}
              options={[
                { value: "dumbbell", label: "Dumbbells" },
                { value: "barbell", label: "Barbell" },
                { value: "rack", label: "Squat rack" },
                { value: "bench", label: "Bench" },
                { value: "machine", label: "Machines" },
                { value: "cable", label: "Cables" },
                { value: "kettlebell", label: "Kettlebell" },
                { value: "pull-up bar", label: "Pull-up bar" },
                { value: "treadmill", label: "Treadmill" },
                { value: "bike", label: "Bike" },
              ]}
            />
          </Step>
        )}

        {step === 5 && (
          <Step title="How do you eat?" sub="Shapes food suggestions. The whole database stays searchable either way.">
            <Field label="Diet preference">
              <OptionGrid
                value={d.dietPreference}
                onChange={(v) => set({ dietPreference: v })}
                options={[
                  { value: "veg", label: "Vegetarian" },
                  { value: "egg", label: "Eggetarian" },
                  { value: "nonveg", label: "Non-vegetarian" },
                  { value: "vegan", label: "Vegan" },
                ]}
              />
            </Field>
            <Field label="Anything to avoid?" hint="Comma separated — e.g. peanuts, lactose">
              <Input
                value={d.allergies.join(", ")}
                onChange={(e) => set({ allergies: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="peanuts, shellfish"
              />
            </Field>
          </Step>
        )}

        {step === 6 && (
          <Step title="Sleep schedule" sub="Sets your sleep target and feeds the recovery score.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Usual bedtime">
                <Input type="time" value={d.bedtime} onChange={(e) => set({ bedtime: e.target.value })} />
              </Field>
              <Field label="Usual wake time">
                <Input type="time" value={d.wakeTime} onChange={(e) => set({ wakeTime: e.target.value })} />
              </Field>
            </div>
            <Card className="bg-surface-2 p-4">
              <div className="text-[13px] text-muted">That&apos;s a target of</div>
              <div className="text-[28px] font-bold text-accent">{preview.sleepLabel}</div>
            </Card>
          </Step>
        )}

        {step === 7 && (
          <Step
            title="Here's your starting point"
            sub="Estimates from your height, weight, age and activity — every one is editable later."
          >
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Calories" value={preview.kcal} unit="kcal" />
              <Stat label="Protein" value={preview.protein} unit="g" tone="var(--accent)" />
              <Stat label="Carbs" value={preview.carbs} unit="g" />
              <Stat label="Fat" value={preview.fat} unit="g" />
              <Stat label="Fiber" value={preview.fiber} unit="g" tone="var(--mint)" />
              <Stat label="Water" value={preview.water} unit="ml" tone="var(--sky)" />
            </div>
            <div className="rounded-2xl border border-line bg-surface-2 p-4 text-[12.5px] leading-relaxed text-muted">
              <Pill tone="amber" className="mb-2">
                Estimate
              </Pill>
              <p>
                Calculated with the Mifflin-St Jeor equation and your activity level. Real-world
                results vary — after two weeks of logging, adjust using your own trend weight rather
                than the formula.
              </p>
            </div>
            <div className="space-y-2.5 pt-1">
              <Button size="lg" className="w-full" loading={busy} onClick={() => finish(false)}>
                <Check className="h-4 w-4" /> Start clean
              </Button>
              <Button size="lg" variant="soft" className="w-full" loading={busy} onClick={() => finish(true)}>
                <Sparkles className="h-4 w-4" /> Start with 6 weeks of sample data
              </Button>
              <p className="px-2 text-center text-[11.5px] text-muted">
                Sample data is clearly labelled and can be wiped in one tap from Settings.
              </p>
            </div>
          </Step>
        )}
      </div>

      {step < STEPS.length - 1 && (
        <footer className="sticky bottom-0 -mx-5 mt-6 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-2 pt-4">
          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => persist(step + 1)}>
              Skip
            </Button>
            <Button size="lg" className="flex-1" disabled={!canNext} onClick={() => persist(step + 1)}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </footer>
      )}
    </main>
  );
}

function Step({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

const num = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(/[^0-9.]/g, "")));

/** Mirrors convex/lib/fitness.ts so the preview matches what gets saved. */
function estimate(d: Draft) {
  const weight = d.startWeightKg ?? 70;
  const height = d.heightCm ?? 172;
  const age = d.birthYear ? new Date().getFullYear() - d.birthYear : 28;
  const base = 10 * weight + 6.25 * height - 5 * age + (d.sex === "male" ? 5 : d.sex === "female" ? -161 : -78);
  const factors: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = base * (factors[d.activityLevel] ?? 1.55);
  let kcal = tdee;
  if (d.goal === "fat_loss") kcal = tdee - Math.min(600, Math.max(300, tdee * 0.18));
  else if (d.goal === "muscle_gain") kcal = tdee + 300;
  else if (d.goal === "recomp") kcal = tdee - 100;
  else if (d.goal === "strength") kcal = tdee + 150;
  const anchor = d.goal === "fat_loss" && d.targetWeightKg ? (weight + d.targetWeightKg) / 2 : weight;
  const protein = Math.round(anchor * (d.goal === "fat_loss" ? 2 : d.goal === "muscle_gain" ? 1.8 : 1.7));
  const fat = Math.round(Math.max(0.7 * weight, (kcal * 0.25) / 9));
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const [bh, bm] = d.bedtime.split(":").map(Number);
  const [wh, wm] = d.wakeTime.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 1440;
  return {
    kcal: Math.round(kcal / 10) * 10,
    protein,
    carbs,
    fat,
    fiber: Math.round(Math.min(45, Math.max(25, (kcal / 1000) * 14))),
    water: Math.round((weight * 35) / 100) * 100,
    sleepLabel: `${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ""}`.trim(),
  };
}
