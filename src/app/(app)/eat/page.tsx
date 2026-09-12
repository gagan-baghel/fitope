"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  Button,
  Card,
  EmptyState,
  Pill,
  Ring,
  SectionTitle,
  Sheet,
  Skeleton,
  Stepper,
  useToast,
} from "@/components/ui";
import { FoodTile, RowCard } from "@/components/ui/media";
import {
  ChevronLeft,
  ChevronRight,
  CookingPot,
  Copy,
  Droplets,
  Egg,
  Moon,
  Pencil,
  Plus,
  Salad,
  Sandwich,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { addDays, cn, prettyDate, todayStr } from "@/lib/utils";

const MEAL_META: Record<string, { label: string; icon: any }> = {
  breakfast: { label: "Breakfast", icon: Egg },
  lunch: { label: "Lunch", icon: UtensilsCrossed },
  dinner: { label: "Dinner", icon: Moon },
  snack: { label: "Snacks", icon: Sandwich },
};

export default function Eat() {
  const [date, setDate] = useState(todayStr());
  const day = useQuery(api.nutrition.day, { date });
  const repeat = useMutation(api.nutrition.repeatMeal);
  const logWater = useMutation(api.nutrition.logWater);
  const undoWater = useMutation(api.nutrition.undoWater);
  const deleteEntry = useMutation(api.nutrition.deleteEntry);
  const restore = useMutation(api.nutrition.restoreEntry);
  const updateEntry = useMutation(api.nutrition.updateEntry);
  const toast = useToast();
  const [editing, setEditing] = useState<any>(null);
  const [qty, setQty] = useState<number | undefined>(1);

  if (day === undefined) return <Skeleton className="h-96 w-full" />;
  if (!day) return null;
  const t = day.targets;
  const left = Math.max(0, (t?.kcal ?? 0) - day.totals.kcal);
  const over = day.totals.kcal - (t?.kcal ?? 0);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between pt-1">
        <h1 className="text-[26px] font-bold tracking-tight">Nutrition</h1>
        <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1">
          <button onClick={() => setDate(addDays(date, -1))} className="rounded-xl p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[92px] text-center text-[12.5px] font-semibold">{prettyDate(date)}</span>
          <button
            disabled={date >= todayStr()}
            onClick={() => setDate(addDays(date, 1))}
            className="rounded-xl p-1.5 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section
        className="relative overflow-hidden rounded-[28px] p-5 shadow-[var(--shadow)]"
        style={{ background: over > 0 ? "var(--tile-4)" : "var(--tile-2)", color: "var(--tile-ink)" }}
      >
        <div className="hero-blob -right-14 -top-16 h-52 w-52" />
        <div className="relative flex items-center gap-5">
          <Ring
            value={day.totals.kcal}
            max={t?.kcal ?? 2000}
            size={116}
            stroke={10}
            color="var(--tile-ink)"
            track="rgba(0,0,0,0.10)"
          >
            <div className="text-center">
              <div className="tabular text-[26px] font-bold leading-none">{over > 0 ? `+${over}` : left}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider opacity-65">
                {over > 0 ? "kcal over" : "kcal left"}
              </div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1 space-y-2.5">
            <Macro label="Protein" value={day.totals.protein} target={t?.protein ?? 0} color="var(--tile-ink)" emphasis />
            <Macro label="Fiber" value={day.totals.fiber} target={t?.fiber ?? 0} color="var(--tile-ink)" emphasis />
            <Macro label="Carbs" value={day.totals.carbs} target={t?.carbs ?? 0} color="rgba(0,0,0,0.45)" />
            <Macro label="Fat" value={day.totals.fat} target={t?.fat ?? 0} color="rgba(0,0,0,0.45)" />
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2 hero-rule border-t pt-3.5 text-[12px] opacity-75">
          <span className="tabular">
            {day.totals.kcal} of {t?.kcal ?? "–"} kcal
          </span>
          {day.estimatedCount > 0 && (
            <span className="hero-inset rounded-full px-2.5 py-1 text-[11px] font-semibold">
              {day.estimatedCount} estimated
            </span>
          )}
          <Link href="/eat/foods" className="ml-auto font-bold underline-offset-2 hover:underline">
            My foods & recipes
          </Link>
        </div>
      </section>

      {/* Water */}
      <Card className="py-4">
        <div className="flex items-center gap-3">
          <Droplets className="h-5 w-5 shrink-0 text-sky" />
          <span className="flex-1 text-[13px] font-semibold">Water</span>
          <span className="tabular text-[12px] text-muted">
            {(day.waterMl / 1000).toFixed(2)} / {((t?.waterMl ?? 3000) / 1000).toFixed(1)} L
          </span>
        </div>
        <Bar value={day.waterMl} max={t?.waterMl ?? 3000} color="var(--sky)" className="mt-2.5" />
        <div className="mt-3 flex gap-2">
          {[200, 250, 500].map((ml) => (
            <button
              key={ml}
              onClick={() => logWater({ ml, date })}
              className="flex-1 rounded-xl bg-surface-2 py-2 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-3"
            >
              +{ml} ml
            </button>
          ))}
          <button
            onClick={() => undoWater({ date })}
            className="rounded-xl bg-surface-2 px-3 py-2 text-[12px] text-muted transition-colors hover:bg-surface-3"
            aria-label="Undo last water log"
          >
            ↺
          </button>
        </div>
      </Card>

      {/* Meals */}
      {day.byMeal.map((m) => {
        const Meta = MEAL_META[m.meal];
        return (
          <section key={m.meal}>
            <SectionTitle
              action={
                <Link
                  href={`/eat/add?meal=${m.meal}&date=${date}`}
                  className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-surface-3"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Link>
              }
            >
              <span className="flex items-center gap-2">
                <Meta.icon className="h-4 w-4 text-muted" />
                {Meta.label}
                {m.totals.kcal > 0 && (
                  <span className="tabular text-[12px] font-medium text-muted">{m.totals.kcal} kcal</span>
                )}
              </span>
            </SectionTitle>
            {m.entries.length === 0 ? (
              <Link
                href={`/eat/add?meal=${m.meal}&date=${date}`}
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-4 text-[13px] text-muted transition-colors hover:border-accent/40 hover:text-ink"
              >
                <Plus className="h-4 w-4" /> Log {Meta.label.toLowerCase()}
              </Link>
            ) : (
              <div className="space-y-2">
                {m.entries.map((e: any) => (
                  <RowCard
                    key={e._id}
                    onClick={() => {
                      setEditing(e);
                      setQty(e.qty);
                    }}
                    tile={<FoodTile category={e.category} />}
                    title={e.name}
                    subtitle={`${e.qty} ${e.unitLabel}${e.grams ? ` · ${e.grams} g` : ""} · P ${e.nutrients.protein} · C ${e.nutrients.carbs} · F ${e.nutrients.fat}`}
                    trailing={
                      <div className="flex items-center gap-2">
                        <span className="tabular text-[15px] font-bold">{e.nutrients.kcal}</span>
                        <Pencil className="h-3.5 w-3.5 text-muted" />
                      </div>
                    }
                  />
                ))}
                <div className="flex items-center justify-between px-2 text-[11.5px] text-muted">
                  <span>
                    P {Math.round(m.totals.protein)} g · Fiber {Math.round(m.totals.fiber)} g
                  </span>
                  <button
                    className="flex items-center gap-1 font-semibold text-ink"
                    onClick={async () => {
                      const n = await repeat({ fromDate: date, meal: m.meal, toDate: todayStr() });
                      toast({ message: `Copied ${n} items to today` });
                    }}
                  >
                    <Copy className="h-3 w-3" /> Repeat today
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {day.entryCount === 0 && (
        <EmptyState
          icon={<Salad className="h-5 w-5" />}
          title="Nothing logged yet"
          body="Search 265 Indian foods, or copy yesterday's day in one tap."
          action={
            <div className="flex gap-2">
              <Link href={`/eat/add?meal=breakfast&date=${date}`}>
                <Button>
                  <Plus className="h-4 w-4" /> Add food
                </Button>
              </Link>
              <Button
                variant="soft"
                onClick={async () => {
                  const n = await repeat({ fromDate: addDays(date, -1), toDate: date });
                  toast({ message: n ? `Copied ${n} items from yesterday` : "Nothing logged yesterday" });
                }}
              >
                <Copy className="h-4 w-4" /> Copy yesterday
              </Button>
            </div>
          }
        />
      )}

      <Link href="/eat/recipes" className="block">
        <Card className="flex items-center gap-3 py-4 transition-colors hover:bg-surface-2">
          <CookingPot className="h-5 w-5 text-violet" />
          <div className="flex-1">
            <div className="text-[14px] font-semibold">Recipes & saved meals</div>
            <div className="text-[12px] text-muted">Build a dish once, log it in one tap after that</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Card>
      </Link>

      {/* Edit entry */}
      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.name}
        footer={
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="lg"
              onClick={async () => {
                const removed = await deleteEntry({ id: editing._id });
                setEditing(null);
                toast({
                  message: `${removed.name} removed`,
                  action: {
                    label: "Undo",
                    run: () =>
                      restore({
                        date: removed.date,
                        meal: removed.meal,
                        name: removed.name,
                        qty: removed.qty,
                        unitLabel: removed.unitLabel,
                        grams: removed.grams,
                        nutrients: removed.nutrients,
                        foodId: removed.foodId,
                        estimated: removed.estimated,
                      }),
                  },
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              className="flex-1"
              size="lg"
              onClick={async () => {
                await updateEntry({ id: editing._id, qty: qty ?? 1 });
                setEditing(null);
                toast({ message: "Updated" });
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-2 p-4 text-center">
              <div className="tabular text-[32px] font-bold">
                {Math.round((editing.nutrients.kcal / editing.qty) * (qty ?? 1))}
              </div>
              <div className="text-[12px] text-muted">kcal</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold text-muted">Quantity</span>
              <Stepper value={qty} onChange={setQty} step={0.5} min={0.5} max={50} suffix={editing.unitLabel} className="flex-1" />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {(["protein", "carbs", "fat", "fiber"] as const).map((k) => (
                <div key={k} className="rounded-xl bg-surface-2 py-2.5">
                  <div className="tabular text-[15px] font-bold">
                    {Math.round((editing.nutrients[k] / editing.qty) * (qty ?? 1) * 10) / 10}
                  </div>
                  <div className="text-[10.5px] capitalize text-muted">{k}</div>
                </div>
              ))}
            </div>
            {editing.estimated && (
              <p className="text-[12px] leading-relaxed text-muted">
                These values are estimated from a standard recipe. Home cooking varies — edit the food
                in <span className="text-ink">My foods</span> if yours is consistently different.
              </p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Macro({
  label,
  value,
  target,
  color,
  emphasis,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className={cn("text-[12px] font-semibold", emphasis ? "" : "opacity-60")}>{label}</span>
        <span className="tabular text-[12px] opacity-70">
          <span className={cn(emphasis && "font-bold opacity-100")}>{Math.round(value)}</span> / {Math.round(target)} g
        </span>
      </div>
      <div className="h-[7px] w-full overflow-hidden rounded-full bg-[color:var(--hero-rule)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${target > 0 ? Math.min(100, (value / target) * 100) : 0}%`,
            background: color,
            transition: "width 600ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
    </div>
  );
}
