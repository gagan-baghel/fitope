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
  // With no target there is nothing to be over or under — show what was eaten, not "+500 over".
  const kcalTarget = t?.kcal ?? 0;
  const left = Math.max(0, kcalTarget - day.totals.kcal);
  const over = kcalTarget > 0 ? day.totals.kcal - kcalTarget : 0;

  return (
    <div className="space-y-3">
      <header className="flex min-w-0 items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-[20px] font-bold tracking-tight">Nutrition</h1>
        <div className="flex shrink-0 items-center rounded-full border border-line bg-surface">
          <button
            onClick={() => setDate(addDays(date, -1))}
            className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[64px] text-center text-[11.5px] font-semibold sm:min-w-[88px] sm:text-[12.5px]">
            {prettyDate(date)}
          </span>
          <button
            disabled={date >= todayStr()}
            onClick={() => setDate(addDays(date, 1))}
            className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink disabled:opacity-30"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section
        className="relative overflow-hidden rounded-2xl p-3 shadow-[var(--shadow)]"
        style={{ background: over > 0 ? "var(--tile-4)" : "var(--tile-2)", color: "var(--tile-ink)" }}
      >
        <div className="relative flex items-center gap-3">
          <Ring
            value={day.totals.kcal}
            max={kcalTarget}
            size={74}
            stroke={7}
            color="var(--tile-ink)"
            track="rgba(0,0,0,0.10)"
            className="shrink-0"
          >
            <div className="text-center">
              <div className="tabular text-[17px] font-bold leading-none">
                {!kcalTarget ? day.totals.kcal : over > 0 ? `+${over}` : left}
              </div>
              <div className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-wider opacity-65">
                {!kcalTarget ? "kcal" : over > 0 ? "over" : "left"}
              </div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Macro label="Protein" value={day.totals.protein} target={t?.protein ?? 0} color="var(--tile-ink)" emphasis />
            <Macro label="Fiber" value={day.totals.fiber} target={t?.fiber ?? 0} color="var(--tile-ink)" emphasis />
            <Macro label="Carbs" value={day.totals.carbs} target={t?.carbs ?? 0} color="rgba(0,0,0,0.45)" />
            <Macro label="Fat" value={day.totals.fat} target={t?.fat ?? 0} color="rgba(0,0,0,0.45)" />
          </div>
        </div>
        <div className="relative mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 hero-rule border-t pt-2.5 text-[11px] opacity-75">
          {/* No target set yet? Show the bare number — never "of 0" or "of – kcal". */}
          <span className="tabular">
            {kcalTarget ? `${day.totals.kcal} of ${kcalTarget} kcal` : `${day.totals.kcal} kcal`}
          </span>
          {day.estimatedCount > 0 && (
            <span className="hero-inset rounded-full px-2 py-0.5 text-[10.5px] font-semibold">
              {day.estimatedCount} estimated
            </span>
          )}
          <Link href="/eat/foods" className="ml-auto shrink-0 font-bold underline-offset-2 hover:underline">
            My foods
          </Link>
        </div>
      </section>

      {/* Water */}
      <Card>
        <div className="flex min-w-0 items-center gap-2">
          <Droplets className="h-4 w-4 shrink-0 text-sky" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">Water</span>
          <span className="tabular shrink-0 text-[11.5px] text-muted">
            {(day.waterMl / 1000).toFixed(1)} / {((t?.waterMl ?? 3000) / 1000).toFixed(1)} L
          </span>
        </div>
        <Bar value={day.waterMl} max={t?.waterMl ?? 3000} color="var(--sky)" className="mt-2" height={5} />
        <div className="mt-2 flex gap-1.5">
          {[200, 250, 500].map((ml) => (
            <button
              key={ml}
              onClick={() => logWater({ ml, date })}
              className="h-10 min-w-0 flex-1 rounded-xl bg-surface-2 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-surface-3"
            >
              +{ml} ml
            </button>
          ))}
          <button
            onClick={() => undoWater({ date })}
            className="h-10 w-10 shrink-0 rounded-xl bg-surface-2 text-[13px] text-muted transition-colors hover:bg-surface-3"
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
                  className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-semibold text-ink hover:bg-surface-3"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Link>
              }
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Meta.icon className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="truncate">{Meta.label}</span>
                {m.totals.kcal > 0 && (
                  <span className="tabular shrink-0 text-[11px] font-medium normal-case tracking-normal">
                    {m.totals.kcal} kcal
                  </span>
                )}
              </span>
            </SectionTitle>
            {m.entries.length === 0 ? (
              <Link
                href={`/eat/add?meal=${m.meal}&date=${date}`}
                className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[12.5px] text-muted transition-colors hover:border-accent/40 hover:text-ink"
              >
                <Plus className="h-4 w-4" /> Log {Meta.label.toLowerCase()}
              </Link>
            ) : (
              <div className="space-y-1.5">
                {m.entries.map((e: any) => (
                  <RowCard
                    key={e._id}
                    onClick={() => {
                      setEditing(e);
                      setQty(e.qty);
                    }}
                    tile={<FoodTile category={e.category} />}
                    title={e.name}
                    subtitle={`${e.qty}\u00a0${e.unitLabel}${e.grams ? ` · ${e.grams}\u00a0g` : ""} · P\u00a0${e.nutrients.protein} · C\u00a0${e.nutrients.carbs} · F\u00a0${e.nutrients.fat}`}
                    trailing={
                      <div className="flex items-center gap-1.5">
                        <span className="tabular text-[14px] font-bold">{e.nutrients.kcal}</span>
                        <Pencil className="h-3.5 w-3.5 text-muted" />
                      </div>
                    }
                  />
                ))}
                <div className="flex items-center justify-between gap-2 px-0.5 text-[11px] text-muted">
                  <span className="min-w-0 truncate">
                    P {Math.round(m.totals.protein)} g · Fib {Math.round(m.totals.fiber)} g
                  </span>
                  {/* On today itself this would only duplicate what was just eaten. */}
                  {date < todayStr() && (
                    <button
                      className="-my-3 flex shrink-0 items-center gap-1 py-3 font-semibold text-ink"
                      onClick={async () => {
                        const n = await repeat({ fromDate: date, meal: m.meal, toDate: todayStr() });
                        toast({ message: `Copied ${n} items to today` });
                      }}
                    >
                      <Copy className="h-3 w-3" /> Repeat today
                    </button>
                  )}
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
          body="Search the food library, or copy yesterday in one tap."
          action={
            <div className="flex flex-wrap justify-center gap-2">
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
        <Card className="flex min-w-0 items-center gap-2.5 transition-colors hover:bg-surface-2">
          <CookingPot className="h-4 w-4 shrink-0 text-violet" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">Recipes & saved meals</div>
            <div className="truncate text-[11.5px] text-muted">Build a dish once, log it in one tap</div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
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
          <div className="space-y-3">
            <div className="rounded-2xl bg-surface-2 p-3 text-center">
              <div className="tabular text-[26px] font-bold leading-none">
                {Math.round((editing.nutrients.kcal / editing.qty) * (qty ?? 1))}
              </div>
              <div className="mt-1 text-[11px] text-muted">kcal</div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-[12.5px] font-semibold text-muted">Quantity</span>
              <Stepper value={qty} onChange={setQty} step={0.5} min={0.5} max={50} suffix={editing.unitLabel} className="min-w-0 flex-1" />
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {(["protein", "carbs", "fat", "fiber"] as const).map((k) => (
                <div key={k} className="min-w-0 rounded-xl bg-surface-2 py-2">
                  <div className="tabular truncate text-[14px] font-bold">
                    {Math.round((editing.nutrients[k] / editing.qty) * (qty ?? 1) * 10) / 10}
                  </div>
                  <div className="truncate text-[10px] capitalize text-muted">{k}</div>
                </div>
              ))}
            </div>
            {editing.estimated && (
              <p className="text-[11.5px] leading-snug text-muted">
                Estimated from a standard recipe — edit it in My foods if yours differs.
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
    <div className="min-w-0">
      <div className="mb-0.5 flex min-w-0 items-baseline justify-between gap-2">
        <span className={cn("truncate text-[11px] font-semibold", emphasis ? "" : "opacity-60")}>{label}</span>
        {/* No target set? Just the number — "27 / 0 g" is noise, not information. */}
        <span className="tabular shrink-0 text-[11px] opacity-70">
          <span className={cn(emphasis && "font-bold opacity-100")}>{Math.round(value)}</span>
          {target > 0 ? ` / ${Math.round(target)} g` : " g"}
        </span>
      </div>
      <div className="h-[5px] w-full overflow-hidden rounded-full bg-[color:var(--hero-rule)]">
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
