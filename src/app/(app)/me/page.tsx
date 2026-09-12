"use client";

import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Chip,
  ConfirmButton,
  Field,
  Input,
  OptionGrid,
  Pill,
  SectionTitle,
  Segmented,
  Select,
  Sheet,
  Skeleton,
  Stat,
  Stepper,
  useToast,
} from "@/components/ui";
import {
  Bell,
  ChevronRight,
  Download,
  Info,
  LogOut,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  User,
} from "lucide-react";
import { DAY_LABELS, cn, hhmm, titleCase } from "@/lib/utils";
import { useUnits } from "@/lib/units";

export default function Me() {
  const me = useQuery(api.profiles.me, {});
  const goals = useQuery(api.profiles.listGoals, {});
  const reminders = useQuery(api.tracking.listReminders, {});
  const exportData = useQuery(api.account.exportData, {});
  const saveProfile = useMutation(api.profiles.saveProfile);
  const setCustomTargets = useMutation(api.profiles.setCustomTargets);
  const recompute = useMutation(api.profiles.recomputeTargets);
  const upsertGoal = useMutation(api.profiles.upsertGoal);
  const deleteGoal = useMutation(api.profiles.deleteGoal);
  const upsertReminder = useMutation(api.tracking.upsertReminder);
  const deleteReminder = useMutation(api.tracking.deleteReminder);
  const clearSample = useMutation(api.seed.clearSampleData);
  const deleteAll = useMutation(api.account.deleteAccountData);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const toast = useToast();

  const [theme, setTheme] = useState(() =>
    typeof document === "undefined" ? "dark" : (document.documentElement.dataset.theme ?? "dark")
  );
  const [sheet, setSheet] = useState<null | "targets" | "profile" | "goal" | "reminder">(null);
  const [t, setT] = useState<any>(null);
  const [goalDraft, setGoalDraft] = useState<any>(null);
  const [reminderDraft, setReminderDraft] = useState<any>(null);
  const u = useUnits();

  function applyTheme(v: string) {
    setTheme(v);
    document.documentElement.dataset.theme = v;
    try {
      localStorage.setItem("fitope-theme", v);
    } catch {}
  }

  if (me === undefined) return <Skeleton className="h-96 w-full" />;
  const p = me?.profile;
  const target = me?.targets;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4 pt-1">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-[20px] font-bold text-accent-ink">
          {(p?.name ?? me?.email ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-bold tracking-tight">{p?.name ?? "Your profile"}</h1>
          <div className="truncate text-[13px] text-muted">{me?.email}</div>
        </div>
      </header>

      {/* Snapshot */}
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Goal" value={<span className="text-[15px]">{titleCase(p?.goal ?? "–")}</span>} />
        <Stat
          label="Weight"
          value={u.outWeight(me?.currentWeightKg) ?? "–"}
          unit={u.weightUnit}
          sub={p?.targetWeightKg ? `target ${u.outWeight(p.targetWeightKg)}` : undefined}
        />
        <Stat label="Training" value={p?.daysPerWeek ?? "–"} unit="d/wk" />
      </div>

      {/* Targets */}
      <Card>
        <SectionTitle
          action={
            <button
              onClick={() => {
                setT({ ...target });
                setSheet("targets");
              }}
              className="text-[12.5px] font-semibold text-accent"
            >
              Edit
            </button>
          }
        >
          Daily targets
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Calories" value={target?.kcal ?? "–"} unit="kcal" />
          <Stat label="Protein" value={target?.protein ?? "–"} unit="g" tone="var(--accent)" />
          <Stat label="Fiber" value={target?.fiber ?? "–"} unit="g" tone="var(--mint)" />
          <Stat label="Carbs" value={target?.carbs ?? "–"} unit="g" />
          <Stat label="Fat" value={target?.fat ?? "–"} unit="g" />
          <Stat label="Water" value={target?.waterMl ?? "–"} unit="ml" tone="var(--sky)" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
          <Pill tone={target?.source === "custom" ? "violet" : "amber"}>
            {target?.source === "custom" ? "Your numbers" : "Estimated"}
          </Pill>
          {target?.basis && (
            <span>
              BMR {target.basis.bmr} · TDEE {target.basis.tdee} · {target.basis.method}
            </span>
          )}
          <button
            className="ml-auto font-semibold text-accent"
            onClick={async () => {
              await recompute({});
              toast({ message: "Targets recalculated from your latest weight" });
            }}
          >
            Recalculate
          </button>
        </div>
      </Card>

      {/* Goals */}
      <section>
        <SectionTitle
          action={
            <button
              onClick={() => {
                setGoalDraft({ type: "custom", title: "", metric: "weight", status: "active" });
                setSheet("goal");
              }}
              className="text-[12.5px] font-semibold text-accent"
            >
              Add goal
            </button>
          }
        >
          Goals
        </SectionTitle>
        {goals && goals.length > 0 ? (
          <Card className="divide-y divide-line p-0">
            {goals.map((g: any) => (
              <div key={g._id} className="flex items-center gap-3 px-4 py-3">
                <Target className={cn("h-4 w-4", g.status === "achieved" ? "text-mint" : "text-accent")} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{g.title}</div>
                  <div className="text-[11.5px] text-muted">
                    {g.startValue != null && g.targetValue != null
                      ? `${g.startValue} → ${g.targetValue} ${g.unit ?? ""}`
                      : titleCase(g.metric)}
                    {g.targetDate ? ` · by ${g.targetDate}` : ""}
                  </div>
                </div>
                <Pill tone={g.status === "achieved" ? "mint" : "muted"}>{g.status}</Pill>
                <ConfirmButton variant="ghost" onConfirm={() => deleteGoal({ id: g._id })}>
                  <Trash2 className="h-4 w-4" />
                </ConfirmButton>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="text-[13px] text-muted">
            No explicit goals set. Your training goal ({titleCase(p?.goal ?? "general")}) still drives the plan
            and targets.
          </Card>
        )}
      </section>

      {/* Reminders */}
      <section>
        <SectionTitle
          action={
            <button
              onClick={() => {
                setReminderDraft({ kind: "workout", label: "Train", time: "18:30", days: [1, 2, 3, 4, 5], enabled: true });
                setSheet("reminder");
              }}
              className="text-[12.5px] font-semibold text-accent"
            >
              Add
            </button>
          }
        >
          Reminders
        </SectionTitle>
        <Card className="p-0">
          {reminders && reminders.length > 0 ? (
            <div className="divide-y divide-line">
              {reminders.map((r: any) => (
                <div key={r._id} className="flex items-center gap-3 px-4 py-3">
                  <Bell className={cn("h-4 w-4", r.enabled ? "text-accent" : "text-muted")} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold">{r.label}</div>
                    <div className="tabular text-[11.5px] text-muted">
                      {r.time} · {r.days.map((d: number) => DAY_LABELS[d]).join(" ")}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      upsertReminder({
                        id: r._id,
                        kind: r.kind,
                        label: r.label,
                        time: r.time,
                        days: r.days,
                        enabled: !r.enabled,
                      })
                    }
                    className={cn(
                      "h-6 w-11 rounded-full p-0.5 transition-colors",
                      r.enabled ? "bg-accent" : "bg-surface-3"
                    )}
                    aria-label="Toggle reminder"
                  >
                    <span
                      className={cn(
                        "block h-5 w-5 rounded-full bg-surface transition-transform",
                        r.enabled && "translate-x-5"
                      )}
                    />
                  </button>
                  <ConfirmButton variant="ghost" onConfirm={() => deleteReminder({ id: r._id })}>
                    <Trash2 className="h-4 w-4" />
                  </ConfirmButton>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-[13px] text-muted">
              No reminders yet. Due reminders appear on your home screen and clear themselves once you log the thing — nothing is pushed or emailed.
            </div>
          )}
        </Card>
      </section>

      {/* Preferences */}
      <Card className="space-y-4">
        <SectionTitle>Preferences</SectionTitle>
        <Field label="Theme">
          <Segmented
            value={theme}
            onChange={applyTheme}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
        </Field>
        <Field label="Body measurement units" hint="Training loads stay in kg — that is how plates are marked.">
          <Segmented
            value={p?.units ?? "metric"}
            onChange={(v) => saveProfile({ units: v })}
            options={[
              { value: "metric", label: "kg / cm" },
              { value: "imperial", label: "lb / in" },
            ]}
          />
        </Field>
        <button
          onClick={() => setSheet("profile")}
          className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left"
        >
          <User className="h-4 w-4 text-muted" />
          <span className="flex-1 text-[13.5px] font-semibold">Edit profile & training setup</span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </button>
      </Card>

      {/* Data */}
      <Card className="space-y-3">
        <SectionTitle>Your data</SectionTitle>
        <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
          <p className="text-[12.5px] leading-relaxed text-muted">
            Everything you log is tied to your account and visible only to you. Photos, meals, weights
            and workouts are never shared with other users.
          </p>
        </div>
        <Button
          variant="soft"
          className="w-full"
          onClick={() => {
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `fitope-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ message: "Export downloaded" });
          }}
        >
          <Download className="h-4 w-4" /> Export everything as JSON
        </Button>
        {p?.hasSampleData && (
          <ConfirmButton
            variant="soft"
            size="md"
            className="w-full"
            confirmLabel="Tap again to wipe sample data"
            onConfirm={async () => {
              const r = await clearSample({});
              toast({ message: `Removed ${r.removed} sample records` });
            }}
          >
            <Sparkles className="h-4 w-4" /> Remove sample data
          </ConfirmButton>
        )}
        <ConfirmButton
          className="w-full"
          size="md"
          confirmLabel="Tap again to permanently delete everything"
          onConfirm={async () => {
            await deleteAll({});
            toast({ message: "All your data was deleted" });
            router.replace("/onboarding");
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete all my data
        </ConfirmButton>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <p className="text-[12px] leading-relaxed text-muted">
            FitOpe is a tracking tool, not a medical device. Calorie and protein figures are estimates
            from standard formulas and public food composition data. It does not diagnose, treat or
            give medical advice — talk to a doctor or a registered dietitian for that.
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full"
          onClick={async () => {
            await signOut();
            router.replace("/welcome");
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </Card>

      {/* Targets sheet */}
      <Sheet
        open={sheet === "targets"}
        onClose={() => setSheet(null)}
        title="Daily targets"
        footer={
          <Button
            className="w-full"
            size="lg"
            onClick={async () => {
              await setCustomTargets({
                kcal: t.kcal,
                protein: t.protein,
                carbs: t.carbs,
                fat: t.fat,
                fiber: t.fiber,
                waterMl: t.waterMl,
                sleepMinutes: t.sleepMinutes,
              });
              setSheet(null);
              toast({ message: "Targets updated — history keeps the old ones" });
            }}
          >
            Save my targets
          </Button>
        }
      >
        {t && (
          <div className="space-y-4">
            <p className="text-[12.5px] leading-relaxed text-muted">
              Overriding these switches your targets to “custom”. Days you already logged keep the
              targets that were live at the time.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["kcal", "Calories", 50],
                  ["protein", "Protein (g)", 5],
                  ["carbs", "Carbs (g)", 10],
                  ["fat", "Fat (g)", 5],
                  ["fiber", "Fiber (g)", 1],
                  ["waterMl", "Water (ml)", 250],
                ] as const
              ).map(([k, label, step]) => (
                <Field key={k} label={label}>
                  <Stepper value={t[k]} onChange={(v) => setT({ ...t, [k]: v ?? 0 })} step={step} max={20000} />
                </Field>
              ))}
            </div>
            <Field label="Sleep target">
              <Stepper
                value={t.sleepMinutes}
                onChange={(v) => setT({ ...t, sleepMinutes: v ?? 480 })}
                step={15}
                min={240}
                max={720}
                suffix="min"
              />
              <div className="mt-1 text-[12px] text-muted">{hhmm(t.sleepMinutes)} per night</div>
            </Field>
          </div>
        )}
      </Sheet>

      {/* Profile sheet */}
      <ProfileSheet key={sheet === "profile" ? "open" : "closed"} open={sheet === "profile"} onClose={() => setSheet(null)} profile={p} />

      {/* Goal sheet */}
      <Sheet
        open={sheet === "goal"}
        onClose={() => setSheet(null)}
        title="New goal"
        footer={
          <Button
            className="w-full"
            size="lg"
            disabled={!goalDraft?.title?.trim()}
            onClick={async () => {
              await upsertGoal(goalDraft);
              setSheet(null);
              toast({ message: "Goal saved" });
            }}
          >
            Save goal
          </Button>
        }
      >
        {goalDraft && (
          <div className="space-y-4">
            <Field label="What do you want to achieve?">
              <Input
                value={goalDraft.title}
                onChange={(e) => setGoalDraft({ ...goalDraft, title: e.target.value })}
                placeholder="Reach 74 kg without losing bench strength"
              />
            </Field>
            <Field label="Track it by">
              <Select value={goalDraft.metric} onChange={(e) => setGoalDraft({ ...goalDraft, metric: e.target.value })}>
                <option value="weight">Body weight</option>
                <option value="bodyfat">Body fat %</option>
                <option value="strength">Strength (est. 1RM)</option>
                <option value="consistency">Consistency</option>
                <option value="custom">Something else</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start value">
                <Stepper value={goalDraft.startValue} onChange={(v) => setGoalDraft({ ...goalDraft, startValue: v })} step={0.5} />
              </Field>
              <Field label="Target value">
                <Stepper value={goalDraft.targetValue} onChange={(v) => setGoalDraft({ ...goalDraft, targetValue: v })} step={0.5} />
              </Field>
            </div>
            <Field label="Target date (optional)">
              <Input
                type="date"
                value={goalDraft.targetDate ?? ""}
                onChange={(e) => setGoalDraft({ ...goalDraft, targetDate: e.target.value || undefined })}
              />
            </Field>
          </div>
        )}
      </Sheet>

      {/* Reminder sheet */}
      <Sheet
        open={sheet === "reminder"}
        onClose={() => setSheet(null)}
        title="New reminder"
        footer={
          <Button
            className="w-full"
            size="lg"
            onClick={async () => {
              await upsertReminder(reminderDraft);
              setSheet(null);
              toast({ message: "Reminder added" });
            }}
          >
            Save reminder
          </Button>
        }
      >
        {reminderDraft && (
          <div className="space-y-4">
            <Field label="What for?">
              <OptionGrid
                cols={2}
                value={reminderDraft.kind}
                onChange={(v) =>
                  setReminderDraft({
                    ...reminderDraft,
                    kind: v,
                    label: { workout: "Train", meal: "Log your meal", water: "Drink water", sleep: "Wind down", weigh_in: "Weigh in", photo: "Progress photo" }[v as string],
                  })
                }
                options={[
                  { value: "workout", label: "Workout" },
                  { value: "meal", label: "Meal logging" },
                  { value: "water", label: "Water" },
                  { value: "sleep", label: "Bedtime" },
                  { value: "weigh_in", label: "Weigh in" },
                  { value: "photo", label: "Progress photo" },
                ]}
              />
            </Field>
            <Field label="Time">
              <Input type="time" value={reminderDraft.time} onChange={(e) => setReminderDraft({ ...reminderDraft, time: e.target.value })} />
            </Field>
            <Field label="Days">
              <div className="flex gap-2">
                {DAY_LABELS.map((l, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setReminderDraft({
                        ...reminderDraft,
                        days: reminderDraft.days.includes(i)
                          ? reminderDraft.days.filter((x: number) => x !== i)
                          : [...reminderDraft.days, i].sort(),
                      })
                    }
                    className={cn(
                      "h-11 flex-1 rounded-xl border text-[13px] font-semibold",
                      reminderDraft.days.includes(i) ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-muted"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function ProfileSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: any }) {
  const u = useUnits();
  const save = useMutation(api.profiles.saveProfile);
  const recompute = useMutation(api.profiles.recomputeTargets);
  const generate = useMutation(api.programs.generate);
  const toast = useToast();
  const [d, setD] = useState<any>(profile ?? {});
  const [busy, setBusy] = useState(false);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Profile & training setup"
      size="lg"
      footer={
        <Button
          className="w-full"
          size="lg"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await save({
              name: d.name,
              sex: d.sex,
              birthYear: d.birthYear,
              heightCm: d.heightCm,
              targetWeightKg: d.targetWeightKg,
              goal: d.goal,
              experience: d.experience,
              activityLevel: d.activityLevel,
              daysPerWeek: d.daysPerWeek,
              preferredDays: d.preferredDays,
              sessionMinutes: d.sessionMinutes,
              equipment: d.equipment,
              dietPreference: d.dietPreference,
              bedtime: d.bedtime,
              wakeTime: d.wakeTime,
            });
            await recompute({});
            setBusy(false);
            onClose();
            toast({
              message: "Profile updated",
              action: {
                label: "Rebuild plan",
                run: async () => {
                  await generate({ activate: true });
                  toast({ message: "New plan generated" });
                },
              },
            });
          }}
        >
          Save changes
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={d.name ?? ""} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Height (${u.lengthUnit})`}>
            <Stepper
              value={u.outLength(d.heightCm)}
              onChange={(v) => setD({ ...d, heightCm: u.inLength(v) })}
              step={1}
              min={30}
              max={250}
            />
          </Field>
          <Field label={`Target weight (${u.weightUnit})`}>
            <Stepper
              value={u.outWeight(d.targetWeightKg)}
              onChange={(v) => setD({ ...d, targetWeightKg: u.inWeight(v) })}
              step={u.imperial ? 1 : 0.5}
              min={20}
              max={900}
            />
          </Field>
        </div>
        <Field label="Goal">
          <Select value={d.goal ?? ""} onChange={(e) => setD({ ...d, goal: e.target.value })}>
            {["fat_loss", "muscle_gain", "recomp", "strength", "endurance", "general"].map((g) => (
              <option key={g} value={g}>
                {titleCase(g)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Experience">
            <Select value={d.experience ?? ""} onChange={(e) => setD({ ...d, experience: e.target.value })}>
              {["beginner", "intermediate", "advanced"].map((g) => (
                <option key={g} value={g}>
                  {titleCase(g)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Activity level">
            <Select value={d.activityLevel ?? ""} onChange={(e) => setD({ ...d, activityLevel: e.target.value })}>
              {["sedentary", "light", "moderate", "active", "very_active"].map((g) => (
                <option key={g} value={g}>
                  {titleCase(g)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sessions per week">
            <Stepper value={d.daysPerWeek} onChange={(v) => setD({ ...d, daysPerWeek: v })} step={1} min={1} max={7} />
          </Field>
          <Field label="Session length (min)">
            <Stepper value={d.sessionMinutes} onChange={(v) => setD({ ...d, sessionMinutes: v })} step={5} min={15} max={180} />
          </Field>
        </div>
        <Field label="Preferred training days">
          <div className="flex gap-2">
            {DAY_LABELS.map((l, i) => (
              <button
                key={i}
                onClick={() =>
                  setD({
                    ...d,
                    preferredDays: (d.preferredDays ?? []).includes(i)
                      ? d.preferredDays.filter((x: number) => x !== i)
                      : [...(d.preferredDays ?? []), i].sort(),
                  })
                }
                className={cn(
                  "h-11 flex-1 rounded-xl border text-[13px] font-semibold",
                  (d.preferredDays ?? []).includes(i) ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-muted"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Equipment">
          <div className="flex flex-wrap gap-1.5">
            {["dumbbell", "barbell", "rack", "bench", "machine", "cable", "kettlebell", "pull-up bar", "treadmill", "bike"].map((e) => (
              <Chip
                key={e}
                active={(d.equipment ?? []).includes(e)}
                onClick={() =>
                  setD({
                    ...d,
                    equipment: (d.equipment ?? []).includes(e)
                      ? d.equipment.filter((x: string) => x !== e)
                      : [...(d.equipment ?? []), e],
                  })
                }
              >
                {e}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bedtime">
            <Input type="time" value={d.bedtime ?? "23:00"} onChange={(e) => setD({ ...d, bedtime: e.target.value })} />
          </Field>
          <Field label="Wake time">
            <Input type="time" value={d.wakeTime ?? "07:00"} onChange={(e) => setD({ ...d, wakeTime: e.target.value })} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
