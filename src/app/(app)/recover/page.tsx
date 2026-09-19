"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import {
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  Pill,
  Ring,
  SectionTitle,
  Segmented,
  Skeleton,
  Stat,
} from "@/components/ui";
import { CheckinSheet, SleepSheet } from "@/components/quick-log";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, LineChart, Line } from "recharts";
import { BedDouble, HeartPulse, Moon, Plus, Trash2 } from "lucide-react";
import { hhmm, prettyDate } from "@/lib/utils";

export default function Recover() {
  const [days, setDays] = useState("14");
  const readiness = useQuery(api.tracking.recovery, {});
  const sleep = useQuery(api.tracking.sleepHistory, { days: Number(days) });
  const checkins = useQuery(api.tracking.checkinHistory, { days: Number(days) });
  const me = useQuery(api.profiles.me, {});
  const deleteSleep = useMutation(api.tracking.deleteSleep);
  const [sheet, setSheet] = useState<null | "sleep" | "checkin">(null);

  if (readiness === undefined || sleep === undefined) return <Skeleton className="h-96 w-full" />;

  const chartData = (sleep.nights ?? []).map((n: any) => ({
    date: n.date.slice(5),
    hours: Math.round((n.minutes / 60) * 10) / 10,
    quality: n.quality ?? null,
  }));

  return (
    <div className="space-y-5">
      <header className="flex min-w-0 items-center justify-between gap-3 pt-1">
        <h1 className="min-w-0 text-[22px] font-bold tracking-tight sm:text-[26px]">Recovery</h1>
        <div className="flex shrink-0 gap-1.5">
          {/* Icon-only on phones so the title keeps its room at 320px. */}
          <Button size="sm" variant="soft" onClick={() => setSheet("checkin")} aria-label="Check in">
            <HeartPulse className="h-4 w-4" /> <span className="hidden sm:inline">Check in</span>
          </Button>
          <Button size="sm" onClick={() => setSheet("sleep")}>
            <Plus className="h-4 w-4" /> Sleep
          </Button>
        </div>
      </header>

      {/* Readiness */}
      <Card>
        {/* Stacks on phones — side by side the ring leaves the advice column
            too narrow to read on a 320px screen. */}
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-5 sm:text-left">
          <Ring
            value={readiness!.score}
            max={100}
            size={112}
            stroke={12}
            color={readiness!.score >= 70 ? "var(--mint)" : readiness!.score >= 45 ? "var(--amber)" : "var(--rose)"}
          >
            <div className="text-center">
              <div className="tabular text-[26px] font-bold leading-none">{readiness!.score}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">ready</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium leading-snug">{readiness!.advice}</p>
            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {readiness!.reasons.map((r: string) => (
                <Pill key={r}>{r}</Pill>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5 border-t border-line pt-4">
          <Stat label="Slept" value={readiness!.sleepMinutes ? hhmm(readiness!.sleepMinutes) : "–"} sub={`target ${hhmm(readiness!.sleepTarget)}`} />
          <Stat
            label="7-day load"
            value={(readiness!.weeklyVolume / 1000).toFixed(1)}
            unit="t"
            sub={
              readiness!.prevWeeklyVolume
                ? `${Math.round((readiness!.weeklyVolume / readiness!.prevWeeklyVolume - 1) * 100)}% vs prev`
                : "first week"
            }
          />
          <Stat label="Days since rest" value={readiness!.daysSinceRest} sub={readiness!.daysSinceRest >= 6 ? "consider a day off" : "fine"} />
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
          Readiness is a training suggestion built from what you logged — sleep, soreness, energy,
          stress and recent load. It is not a medical or physiological measurement.
        </p>
      </Card>

      <Segmented
        value={days}
        onChange={setDays}
        options={[
          { value: "7", label: "7 days" },
          { value: "14", label: "14 days" },
          { value: "30", label: "30 days" },
          { value: "90", label: "90 days" },
        ]}
      />

      {/* Sleep */}
      <Card>
        <SectionTitle>Sleep</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Average" value={hhmm(sleep.avgMinutes)} tone="var(--violet)" />
          <Stat label="Consistency" value={sleep.consistency} unit="%" sub={`±${sleep.bedtimeSpreadMin ?? 0} min bedtime`} />
          <Stat label="On target" value={sleep.adherence} unit="%" sub={`of ${sleep.loggedNights} nights`} />
          <Stat label="Target" value={hhmm(sleep.target)} />
        </div>
        <div className="mt-4 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} domain={[0, 10]} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={{
                  background: "var(--surface-3)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: any) => [`${v} h`, "Sleep"]}
              />
              <ReferenceLine y={sleep.target / 60} stroke="var(--data)" strokeDasharray="4 4" />
              <Bar dataKey="hours" fill="var(--violet)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[11.5px] text-muted">
          Dashed line is your {hhmm(sleep.target)} target. Gaps are nights you did not log.
        </p>
      </Card>

      {/* Check-ins */}
      <Card>
        <SectionTitle
          action={
            <button onClick={() => setSheet("checkin")} className="text-[12.5px] font-semibold text-accent">
              Add today
            </button>
          }
        >
          Energy, soreness & stress
        </SectionTitle>
        {checkins && checkins.length > 1 ? (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={checkins.map((c: any) => ({ ...c, date: c.date.slice(5) }))} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[1, 5]} ticks={[1, 3, 5]} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="energy" stroke="var(--data)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="soreness" stroke="var(--rose)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="stress" stroke="var(--amber)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<HeartPulse className="h-5 w-5" />}
            title="No check-ins yet"
            body="Two taps a day is enough to make the readiness score meaningful."
          />
        )}
        <div className="mt-3 flex gap-3 text-[11.5px]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> Energy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose" /> Soreness
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber" /> Stress
          </span>
        </div>
      </Card>

      {/* Sleep log list */}
      <section>
        <SectionTitle>Sleep log</SectionTitle>
        {(sleep.sessions ?? []).length === 0 ? (
          <EmptyState icon={<Moon className="h-5 w-5" />} title="No nights logged" body="Log last night and the trends start building." />
        ) : (
          <Card className="divide-y divide-line p-0">
            {(sleep.sessions ?? []).map((s: any) => (
              <div key={s._id} className="flex items-center gap-3 px-4 py-3">
                <BedDouble className="h-4 w-4 shrink-0 text-violet" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold">{prettyDate(s.date)}</div>
                  <div className="tabular text-[11.5px] text-muted">
                    {new Date(s.bedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} →{" "}
                    {new Date(s.wakeAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                    {s.quality ? ` · felt ${["", "awful", "poor", "ok", "good", "great"][s.quality]}` : ""}
                  </div>
                </div>
                <div className="tabular text-[13.5px] font-bold">{hhmm(s.minutes)}</div>
                <ConfirmButton variant="ghost" onConfirm={() => deleteSleep({ id: s._id })}>
                  <Trash2 className="h-4 w-4" />
                </ConfirmButton>
              </div>
            ))}
          </Card>
        )}
      </section>

      <SleepSheet
        open={sheet === "sleep"}
        onClose={() => setSheet(null)}
        defaults={{ bedtime: me?.profile?.bedtime, wakeTime: me?.profile?.wakeTime }}
      />
      <CheckinSheet open={sheet === "checkin"} onClose={() => setSheet(null)} initial={readiness?.checkin} />
    </div>
  );
}
