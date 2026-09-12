"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { Card, EmptyState, Pill, Segmented, Skeleton } from "@/components/ui";
import { Activity, Camera, Dumbbell, HeartPulse, Moon, Scale, UtensilsCrossed } from "lucide-react";
import { cn, hhmm, prettyDate } from "@/lib/utils";

export default function Timeline() {
  const [days, setDays] = useState("14");
  const rows = useQuery(api.dashboard.timeline, { days: Number(days) });

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-[26px] font-bold tracking-tight">Timeline</h1>
        <p className="mt-1 text-[13px] text-muted">Everything you logged, day by day.</p>
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
        <EmptyState icon={<Activity className="h-5 w-5" />} title="Nothing logged yet" body="Workouts, meals, sleep, weigh-ins and photos all land here." />
      ) : (
        <div className="space-y-3">
          {rows.map((d: any) => (
            <div key={d.date} className="relative pl-6">
              <span className="absolute left-1.5 top-3 h-2 w-2 rounded-full bg-accent" />
              <span className="absolute bottom-0 left-[9px] top-6 w-px bg-line" />
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted">
                {prettyDate(d.date)}
              </div>
              <Card className="space-y-2 p-4">
                {d.workouts.map((w: any) => (
                  <Link key={w._id} href={`/train/session/${w._id}`} className="flex items-center gap-2.5 text-[13.5px]">
                    <Dumbbell className={cn("h-4 w-4 shrink-0", w.status === "completed" ? "text-accent" : "text-muted")} />
                    <span className="min-w-0 flex-1 truncate font-semibold">{w.title}</span>
                    {w.status === "skipped" ? (
                      <Pill>skipped</Pill>
                    ) : (
                      <span className="tabular text-[12px] text-muted">
                        {w.durationMin ? `${w.durationMin} min` : ""}
                        {w.totalVolumeKg ? ` · ${(w.totalVolumeKg / 1000).toFixed(1)}t` : ""}
                      </span>
                    )}
                  </Link>
                ))}
                {d.meals.count > 0 && (
                  <div className="flex items-center gap-2.5 text-[13.5px]">
                    <UtensilsCrossed className="h-4 w-4 shrink-0 text-sky" />
                    <span className="flex-1">
                      {d.meals.count} items logged
                    </span>
                    <span className="tabular text-[12px] text-muted">
                      {d.meals.kcal} kcal · {d.meals.protein} g P
                    </span>
                  </div>
                )}
                {d.sleepMinutes && (
                  <div className="flex items-center gap-2.5 text-[13.5px]">
                    <Moon className="h-4 w-4 shrink-0 text-violet" />
                    <span className="flex-1">Slept</span>
                    <span className="tabular text-[12px] text-muted">{hhmm(d.sleepMinutes)}</span>
                  </div>
                )}
                {d.body?.weightKg && (
                  <div className="flex items-center gap-2.5 text-[13.5px]">
                    <Scale className="h-4 w-4 shrink-0 text-accent" />
                    <span className="flex-1">Weighed in</span>
                    <span className="tabular text-[12px] text-muted">{d.body.weightKg} kg</span>
                  </div>
                )}
                {d.checkin && (
                  <div className="flex items-center gap-2.5 text-[13.5px]">
                    <HeartPulse className="h-4 w-4 shrink-0 text-rose" />
                    <span className="flex-1">Check-in</span>
                    <span className="text-[12px] text-muted">
                      energy {d.checkin.energy} · soreness {d.checkin.soreness}
                    </span>
                  </div>
                )}
                {d.photos > 0 && (
                  <Link href="/progress/photos" className="flex items-center gap-2.5 text-[13.5px]">
                    <Camera className="h-4 w-4 shrink-0 text-muted" />
                    <span className="flex-1">
                      {d.photos} progress photo{d.photos > 1 ? "s" : ""}
                    </span>
                  </Link>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
