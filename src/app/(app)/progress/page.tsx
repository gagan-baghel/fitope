"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import {
  Bar as BarMeter,
  Button,
  Card,
  EmptyState,
  Pill,
  SectionTitle,
  Segmented,
  Skeleton,
  Stat,
} from "@/components/ui";
import { WeightSheet } from "@/components/quick-log";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, Ruler, Scale, Sparkles, Trophy } from "lucide-react";
import { cn, prettyDate, titleCase } from "@/lib/utils";
import { useUnits } from "@/lib/units";

export default function Progress() {
  const [days, setDays] = useState("90");
  const data = useQuery(api.analytics.overview, { days: Number(days) });
  const body = useQuery(api.tracking.bodyHistory, { days: Number(days) });
  const summary = useQuery(api.analytics.weeklySummary, {});
  const insights = useQuery(api.analytics.insights, {});
  const [logging, setLogging] = useState(false);
  const u = useUnits();

  if (data === undefined || body === undefined) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  const weightData = data.weight.points.map((p: any) => ({
    date: p.date.slice(5),
    weight: u.outWeight(p.value),
    trend: u.outWeight(p.trend),
  }));

  return (
    <div className="space-y-3">
      <header className="flex min-w-0 items-center justify-between gap-2 pt-1">
        <h1 className="min-w-0 text-[20px] font-bold tracking-tight sm:text-[26px]">Progress</h1>
        <Button size="sm" className="shrink-0" onClick={() => setLogging(true)}>
          <Plus className="h-4 w-4" /> Weigh in
        </Button>
      </header>

      <Segmented
        value={days}
        onChange={setDays}
        options={[
          { value: "30", label: "30 days" },
          { value: "90", label: "3 months" },
          { value: "180", label: "6 months" },
          { value: "365", label: "1 year" },
        ]}
      />

      {/* Weekly summary */}
      {summary && (
        <Card className="border-accent/20 bg-gradient-to-br from-accent-soft/40 to-surface">
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-[12px] font-semibold">Last 7 days</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Sessions" value={summary.workouts} sub={summary.minutes ? `${summary.minutes} min` : undefined} />
            <Stat label="Volume" value={(summary.volume / 1000).toFixed(1)} unit="t" />
            <Stat label="Avg protein" value={summary.avgProtein} unit="g" tone="var(--data)" />
            <Stat label="Avg sleep" value={`${Math.floor(summary.avgSleep / 60)}h ${summary.avgSleep % 60}m`} />
          </div>
        </Card>
      )}

      {/* Weight */}
      <Card>
        <SectionTitle
          action={
            data.weight.slopePerWeek !== 0 ? (
              <Pill tone={data.weight.slopePerWeek < 0 ? "mint" : "amber"}>
                {data.weight.slopePerWeek > 0 ? "+" : ""}
                {u.outWeight(data.weight.slopePerWeek)} {u.weightUnit}/wk
              </Pill>
            ) : undefined
          }
        >
          Body weight
        </SectionTitle>
        {weightData.length < 2 ? (
          <EmptyState
            icon={<Scale className="h-5 w-5" />}
            title="Not enough weigh-ins yet"
            body="A few logs a week and the trend line appears."
            action={<Button onClick={() => setLogging(true)}>Log weight</Button>}
          />
        ) : (
          <>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--data)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--data)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tick={{ fontSize: 10, fill: "var(--muted)" }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any, k: any) => [`${v} ${u.weightUnit}`, k === "trend" ? "Trend" : "Logged"]}
                  />
                  <Area type="monotone" dataKey="trend" stroke="var(--data)" strokeWidth={2.5} fill="url(#wg)" />
                  <Line type="monotone" dataKey="weight" stroke="var(--muted)" strokeWidth={0} dot={{ r: 1.8, fill: "var(--muted)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Stat label="Now" value={u.outWeight(body.latest?.weightKg) ?? "–"} unit={u.weightUnit} />
              <Stat
                label="Change"
                value={`${data.weight.change > 0 ? "+" : ""}${u.outWeight(data.weight.change)}`}
                unit={u.weightUnit}
                tone={data.weight.change < 0 ? "var(--mint)" : data.weight.change > 0 ? "var(--amber)" : undefined}
              />
              <Stat label="Weigh-ins" value={data.weight.points.length} />
            </div>
            <p className="mt-1.5 text-[11px] text-muted">Filled line is trend weight; dots are raw logs.</p>
          </>
        )}
      </Card>

      {/* Measurements */}
      {body.measurements.length > 0 && (
        <Card>
          <SectionTitle>Measurements</SectionTitle>
          <div className="space-y-1.5">
            {measurementDeltas(body.measurements).map((m) => (
              <div key={m.key} className="flex min-w-0 items-center gap-2 rounded-xl bg-surface-2 px-2.5 py-2">
                <Ruler className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold capitalize">{m.key}</span>
                <span className="tabular shrink-0 text-[11.5px] text-muted">
                  {u.outLength(m.first)} → {u.length(m.last)}
                </span>
                <Pill tone={m.delta < 0 ? "mint" : m.delta > 0 ? "sky" : "muted"}>
                  {m.delta > 0 ? "+" : ""}
                  {m.delta.toFixed(1)}
                </Pill>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Strength */}
      <Card>
        <SectionTitle>Strength progression</SectionTitle>
        {data.strength.length === 0 || data.strength.every((s: any) => s.points.length < 2) ? (
          <EmptyState icon={<Trophy className="h-5 w-5" />} title="Log a lift twice" body="Estimated 1RM curves need two sessions to compare." />
        ) : (
          <div className="space-y-2.5">
            {data.strength
              .filter((s: any) => s.points.length > 1)
              .map((s: any) => (
                <div key={s.exerciseId} className="min-w-0">
                  <div className="flex min-w-0 items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-[13px] font-semibold">{s.name}</span>
                    <span className={cn("tabular shrink-0 text-[11.5px] font-semibold", s.change >= 0 ? "text-mint" : "text-rose")}>
                      {s.change > 0 ? "+" : ""}
                      {s.change} kg 1RM
                    </span>
                  </div>
                  <div className="h-14">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={s.points.map((p: any) => ({ ...p, date: p.date.slice(5) }))}>
                        <Tooltip
                          contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                          formatter={(v: any) => [`${v} kg`, "est. 1RM"]}
                        />
                        <Line type="monotone" dataKey="value" stroke="var(--data)" strokeWidth={2} dot={false} />
                        <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                        <XAxis dataKey="date" hide />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Muscle balance */}
      {data.muscles.some((m: any) => m.sets > 0) && (
        <Card>
          <SectionTitle>Muscle group balance</SectionTitle>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.muscles.filter((m: any) => m.sets > 0)} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="muscle"
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={54}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any) => [`${v} sets`, "Logged"]}
                />
                <Bar dataKey="sets" fill="var(--data)" radius={[0, 6, 6, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {(() => {
            const neglected = data.muscles.filter((m: any) => m.sets === 0);
            return neglected.length ? (
              <p className="mt-1.5 text-[11px] text-muted">
                Nothing logged for <span className="text-ink">{neglected.map((m: any) => m.muscle).join(", ")}</span>.
              </p>
            ) : null;
          })()}
        </Card>
      )}

      {/* Nutrition adherence */}
      <Card>
        <SectionTitle>Nutrition adherence</SectionTitle>
        {data.nutrition.loggedDays === 0 ? (
          <EmptyState title="No meals logged in this window" body="Log a few days to see adherence." />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Protein hit" value={data.nutrition.proteinAdherence} unit="%" tone="var(--data)" sub={`avg ${data.nutrition.avgProtein} g`} />
              <Stat label="Fiber hit" value={data.nutrition.fiberAdherence} unit="%" tone="var(--mint)" sub={`avg ${data.nutrition.avgFiber} g`} />
              <Stat label="Kcal in range" value={data.nutrition.kcalAdherence} unit="%" sub={`avg ${data.nutrition.avgKcal}`} />
            </div>
            <div className="mt-2.5 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.nutrition.days.map((d: any) => ({ ...d, date: d.date.slice(5) }))}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={34} />
                  <Tooltip
                    cursor={{ fill: "var(--surface-2)" }}
                    contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="protein" fill="var(--data)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-[11px] text-muted">Daily protein, {data.nutrition.loggedDays} logged days.</p>
          </>
        )}
      </Card>

      {/* Training volume */}
      {data.weeks.length > 0 && (
        <Card>
          <SectionTitle>Volume by week</SectionTitle>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeks.map((w: any) => ({ ...w, week: w.week.slice(5), tonnes: Math.round(w.volume / 100) / 10 }))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={34} />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any, k: any) => (k === "tonnes" ? [`${v} t`, "Volume"] : [v, "Sessions"])}
                />
                <Bar dataKey="tonnes" fill="var(--sky)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Stat label="Sessions" value={data.totals.workouts} sub={data.totals.skipped ? `${data.totals.skipped} skipped` : undefined} />
            <Stat label="Sets" value={data.totals.sets} />
            <Stat label="Time" value={Math.round(data.totals.minutes / 60)} unit="h" />
          </div>
        </Card>
      )}

      {/* Insights */}
      {!!insights?.length && (
        <section>
          <SectionTitle>Read of your data</SectionTitle>
          <div className="space-y-2">
            {insights.map((i: any, idx: number) => (
              <div
                key={idx}
                className={cn(
                  "min-w-0 rounded-2xl border p-2.5",
                  i.tone === "good" ? "border-mint/25 bg-mint/[0.06]" : i.tone === "warn" ? "border-amber/25 bg-amber/[0.06]" : "border-line bg-surface"
                )}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[13px] font-semibold">{i.title}</span>
                  <Pill className="shrink-0">{titleCase(i.kind)}</Pill>
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{i.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Milestones */}
      <section>
        <SectionTitle>Milestones</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {data.milestones.map((m: any) => (
            <div
              key={m.label}
              className={cn(
                "min-w-0 rounded-2xl border p-2.5",
                m.unlocked ? "border-accent/25 bg-accent-soft/40" : "border-line bg-surface"
              )}
            >
              <div className={cn("truncate text-[12.5px] font-semibold", m.unlocked ? "text-ink" : "text-muted")}>{m.label}</div>
              {m.next ? (
                <>
                  <BarMeter value={m.value} max={m.next} className="mt-1.5" height={4} />
                  <div className="tabular mt-1 text-[11px] text-muted">
                    {m.value} / {m.next} {m.unit}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[11px] text-accent">Top tier reached</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* PRs */}
      {data.prs.length > 0 && (
        <section>
          <SectionTitle>Recent personal records</SectionTitle>
          <Card className="divide-y divide-line p-0">
            {data.prs.map((p: any) => (
              <div key={p._id} className="flex min-w-0 items-center gap-2 px-3 py-2">
                <Trophy className="h-3.5 w-3.5 shrink-0 text-amber" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{p.exercise?.name}</div>
                  <div className="truncate text-[11px] text-muted">{prettyDate(p.date)}</div>
                </div>
                <div className="tabular shrink-0 text-[13px] font-bold text-accent">{p.value} kg</div>
              </div>
            ))}
          </Card>
        </section>
      )}

      <WeightSheet open={logging} onClose={() => setLogging(false)} initial={body.latest?.weightKg} />
    </div>
  );
}

function measurementDeltas(rows: any[]) {
  const keys = ["waist", "chest", "arms", "shoulders", "thighs", "hips", "neck", "calves"];
  const out: { key: string; first: number; last: number; delta: number }[] = [];
  for (const key of keys) {
    const withKey = rows.filter((r) => r.measurements?.[key] != null);
    if (withKey.length < 1) continue;
    const first = withKey[0].measurements[key];
    const last = withKey[withKey.length - 1].measurements[key];
    out.push({ key, first, last, delta: Math.round((last - first) * 10) / 10 });
  }
  return out;
}
