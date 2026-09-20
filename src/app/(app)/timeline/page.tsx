"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { Card, EmptyState, Pill, Segmented, Skeleton } from "@/components/ui";
import { Activity, Dumbbell, HeartPulse, Moon, Scale, UtensilsCrossed } from "lucide-react";
import { cn, hhmm, prettyDate } from "@/lib/utils";

export default function Timeline() {
  const [days, setDays] = useState("14");
  const rows = useQuery(api.dashboard.timeline, { days: Number(days) });

  return (
    <div className="space-y-3">
      <header className="pt-1">
        <h1 className="text-[20px] font-bold tracking-tight sm:text-[26px]">Timeline</h1>
      </header>

      <Segmented
        value={days}
        onChange={setDays}
        options={[
          { value: "7", label: "Week" },
          { value: "14", label: "2 weeks" },
          { value: "30", label: "Month" },
          { value: "90", label: "3 months" },
        ]}
      />

      {rows === undefined ? (
        <Skeleton className="h-72 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Activity className="h-5 w-5" />} title="Nothing logged yet" body="Workouts, meals, sleep and weigh-ins land here." />
      ) : (
        <div className="space-y-2.5">
          {rows.map((d: any) => (
            <div key={d.date} className="relative min-w-0 pl-4">
              <span className="absolute left-0 top-2.5 h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="absolute bottom-0 left-[2.5px] top-5 w-px bg-line" />
              <div className="mb-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted">
                {prettyDate(d.date)}
              </div>
              <Card className="space-y-1.5">
                {d.workouts.map((w: any) => (
                  <Link key={w._id} href={`/train/session/${w._id}`} className="flex min-w-0 items-center gap-2 text-[13px]">
                    <Dumbbell className={cn("h-4 w-4 shrink-0", w.status === "completed" ? "text-accent" : "text-muted")} />
                    <span className="min-w-0 flex-1 truncate font-semibold">{w.title}</span>
                    {w.status === "skipped" ? (
                      <Pill>skipped</Pill>
                    ) : (
                      <span className="tabular shrink-0 text-[11.5px] text-muted">
                        {w.durationMin ? `${w.durationMin} min` : ""}
                        {w.totalVolumeKg ? ` · ${(w.totalVolumeKg / 1000).toFixed(1)}t` : ""}
                      </span>
                    )}
                  </Link>
                ))}
                {d.meals.count > 0 && (
                  <div className="flex min-w-0 items-center gap-2 text-[13px]">
                    <UtensilsCrossed className="h-4 w-4 shrink-0 text-sky" />
                    <span className="min-w-0 flex-1 truncate">{d.meals.count} items</span>
                    <span className="tabular shrink-0 text-[11.5px] text-muted">
                      {d.meals.kcal} kcal · {d.meals.protein} g P
                    </span>
                  </div>
                )}
                {!!d.sleepMinutes && (
                  <div className="flex min-w-0 items-center gap-2 text-[13px]">
                    <Moon className="h-4 w-4 shrink-0 text-violet" />
                    <span className="min-w-0 flex-1 truncate">Slept</span>
                    <span className="tabular shrink-0 text-[11.5px] text-muted">{hhmm(d.sleepMinutes)}</span>
                  </div>
                )}
                {!!d.body?.weightKg && (
                  <div className="flex min-w-0 items-center gap-2 text-[13px]">
                    <Scale className="h-4 w-4 shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 truncate">Weighed in</span>
                    <span className="tabular shrink-0 text-[11.5px] text-muted">{d.body.weightKg} kg</span>
                  </div>
                )}
                {d.checkin && (
                  <div className="flex min-w-0 items-center gap-2 text-[13px]">
                    <HeartPulse className="h-4 w-4 shrink-0 text-rose" />
                    <span className="min-w-0 flex-1 truncate">Check-in</span>
                    <span className="shrink-0 text-[11.5px] text-muted">
                      E{d.checkin.energy} · S{d.checkin.soreness}
                    </span>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
