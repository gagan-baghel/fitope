"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
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
import { Camera, ChevronRight, Plus, Ruler, Scale, Sparkles, Trophy } from "lucide-react";
import { cn, prettyDate, titleCase } from "@/lib/utils";

export default function Progress() {
  const [days, setDays] = useState("90");
  const data = useQuery(api.analytics.overview, { days: Number(days) });
  const body = useQuery(api.tracking.bodyHistory, { days: Number(days) });
  const summary = useQuery(api.analytics.weeklySummary, {});
  const insights = useQuery(api.analytics.insights, {});
  const [logging, setLogging] = useState(false);

  if (data === undefined || body === undefined) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  const weightData = data.weight.points.map((p: any) => ({
    date: p.date.slice(5),
    weight: p.value,
    trend: p.trend,
  }));

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between pt-1">
        <h1 className="text-[26px] font-bold tracking-tight">Progress</h1>
        <div className="flex gap-2">
          <Link href="/progress/photos">
            <Button size="sm" variant="soft">
              <Camera className="h-4 w-4" /> Photos
            </Button>
          </Link>
          <Button size="sm" onClick={() => setLogging(true)}>
            <Plus className="h-4 w-4" /> Weigh in
          </Button>
        </div>
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
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-[13px] font-semibold">Last 7 days</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Sessions" value={summary.workouts} sub={`${summary.minutes} min`} />
            <Stat label="Volume" value={(summary.volume / 1000).toFixed(1)} unit="t" />
            <Stat label="Avg protein" value={summary.avgProtein} unit="g" tone="var(--accent)" />
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
                {data.weight.slopePerWeek} kg / week
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
            body="Log your weight a few times a week. The trend line filters out day-to-day water noise."
            action={<Button onClick={() => setLogging(true)}>Log weight</Button>}
          />
        ) : (
          <>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tick={{ fontSize: 10, fill: "var(--muted)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any, k: any) => [`${v} kg`, k === "trend" ? "Trend" : "Logged"]}
                  />
                  <Area type="monotone" dataKey="trend" stroke="var(--accent)" strokeWidth={2.5} fill="url(#wg)" />
                  <Line type="monotone" dataKey="weight" stroke="var(--muted)" strokeWidth={0} dot={{ r: 1.8, fill: "var(--muted)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2.5">
              <Stat label="Now" value={body.latest?.weightKg?.toFixed(1) ?? "–"} unit="kg" />
              <Stat
                label="Change"
                value={`${data.weight.change > 0 ? "+" : ""}${data.weight.change}`}
                unit="kg"
                tone={data.weight.change < 0 ? "var(--mint)" : data.weight.change > 0 ? "var(--amber)" : undefined}
              />
              <Stat label="Weigh-ins" value={data.weight.points.length} />
            </div>
            <p className="mt-2 text-[11.5px] text-muted">
              The filled line is your trend weight — an exponentially weighted average. Dots are the
              raw numbers you logged.
            </p>
          </>
        )}
      </Card>

      {/* Measurements */}
      {body.measurements.length > 0 && (
        <Card>
          <SectionTitle>Measurements</SectionTitle>
          <div className="space-y-2">
            {measurementDeltas(body.measurements).map((m) => (
              <div key={m.key} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5">
                <Ruler className="h-4 w-4 text-muted" />
                <span className="flex-1 text-[13.5px] font-semibold capitalize">{m.key}</span>
                <span className="tabular text-[12px] text-muted">
                  {m.first} → {m.last} cm
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
          <EmptyState
            icon={<Trophy className="h-5 w-5" />}
            title="Log two sessions of the same lift"
            body="Estimated 1RM curves appear once there is something to compare."
          />
        ) : (
          <div className="space-y-4">
            {data.strength
              .filter((s: any) => s.points.length > 1)
              .map((s: any) => (
                <div key={s.exerciseId}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-[13.5px] font-semibold">{s.name}</span>
                    <span className={cn("tabular text-[12px] font-semibold", s.change >= 0 ? "text-mint" : "text-rose")}>
                      {s.change > 0 ? "+" : ""}
                      {s.change} kg est. 1RM
                    </span>
                  </div>
                  <div className="h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={s.points.map((p: any) => ({ ...p, date: p.date.slice(5) }))}>
                        <Tooltip
                          contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                          formatter={(v: any) => [`${v} kg`, "est. 1RM"]}
                        />
                        <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
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
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.muscles.filter((m: any) => m.sets > 0)} layout="vertical" margin={{ left: 22, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="muscle"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any) => [`${v} sets`, "Logged"]}
                />
                <Bar dataKey="sets" fill="var(--accent)" radius={[0, 6, 6, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {(() => {
            const neglected = data.muscles.filter((m: any) => m.sets === 0);
            return neglected.length ? (
              <p className="mt-2 text-[12px] text-muted">
                Nothing logged for{" "}
                <span className="text-ink">{neglected.map((m: any) => m.muscle).join(", ")}</span> in this
                window.
              </p>
            ) : null;
          })()}
        </Card>
      )}

      {/* Nutrition adherence */}
      <Card>
        <SectionTitle>Nutrition adherence</SectionTitle>
        {data.nutrition.loggedDays === 0 ? (
          <EmptyState title="No meals logged in this window" body="Nutrition analytics need a few logged days to say anything useful." />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <Stat label="Protein hit" value={data.nutrition.proteinAdherence} unit="%" tone="var(--accent)" sub={`avg ${data.nutrition.avgProtein} g`} />
              <Stat label="Fiber hit" value={data.nutrition.fiberAdherence} unit="%" tone="var(--mint)" sub={`avg ${data.nutrition.avgFiber} g`} />
              <Stat label="Calories in range" value={data.nutrition.kcalAdherence} unit="%" sub={`avg ${data.nutrition.avgKcal}`} />
            </div>
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.nutrition.days.map((d: any) => ({ ...d, date: d.date.slice(5) }))}
                  margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
                >
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--surface-2)" }}
                    contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="protein" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-[11.5px] text-muted">Daily protein, {data.nutrition.loggedDays} logged days.</p>
          </>
        )}
      </Card>

      {/* Training volume */}
      {data.weeks.length > 0 && (
        <Card>
          <SectionTitle>Training volume by week</SectionTitle>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeks.map((w: any) => ({ ...w, week: w.week.slice(5), tonnes: Math.round(w.volume / 100) / 10 }))} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any, k: any) => (k === "tonnes" ? [`${v} t`, "Volume"] : [v, "Sessions"])}
                />
                <Bar dataKey="tonnes" fill="var(--sky)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <Stat label="Sessions" value={data.totals.workouts} sub={`${data.totals.skipped} skipped`} />
            <Stat label="Sets" value={data.totals.sets} />
            <Stat label="Time" value={Math.round(data.totals.minutes / 60)} unit="h" />
          </div>
        </Card>
      )}

      {/* Insights */}
      {insights && insights.length > 0 && (
        <section>
          <SectionTitle>Read of your data</SectionTitle>
          <div className="space-y-2.5">
            {insights.map((i: any, idx: number) => (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl border p-4",
                  i.tone === "good" ? "border-mint/25 bg-mint/[0.06]" : i.tone === "warn" ? "border-amber/25 bg-amber/[0.06]" : "border-line bg-surface"
                )}
              >
                <div className="text-[14px] font-semibold">{i.title}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{i.detail}</p>
                <Pill className="mt-2">{titleCase(i.kind)}</Pill>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PRs */}
      {data.prs.length > 0 && (
        <section>
          <SectionTitle>Recent personal records</SectionTitle>
          <Card className="divide-y divide-line p-0">
            {data.prs.map((p: any) => (
              <div key={p._id} className="flex items-center gap-3 px-4 py-3">
                <Trophy className="h-4 w-4 text-amber" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{p.exercise?.name}</div>
                  <div className="text-[11.5px] text-muted">{prettyDate(p.date)}</div>
                </div>
                <div className="tabular text-[13.5px] font-bold text-accent">{p.value} kg</div>
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
