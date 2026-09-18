"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  Chip,
  Field,
  Input,
  Pill,
  Segmented,
  Sheet,
  Skeleton,
  Stepper,
  useToast,
} from "@/components/ui";
import { ArrowLeft, Clock, CookingPot, Plus, Search, Star, Utensils, Zap } from "lucide-react";
import { cn, titleCase, todayStr } from "@/lib/utils";
import { CreateFood } from "@/components/create-food";
import { FoodTile } from "@/components/ui/media";

const MEALS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function guessMeal() {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export default function AddFoodPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AddFood />
    </Suspense>
  );
}

function AddFood() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const date = params.get("date") ?? todayStr();
  const [meal, setMeal] = useState(() => {
    const m = params.get("meal");
    return !m || m === "auto" ? guessMeal() : m;
  });
  const [tab, setTab] = useState<"search" | "recent" | "mine" | "recipes">("search");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [selected, setSelected] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);

  const foods = useQuery(api.foods.search, tab === "search" ? { q: q || undefined, category, limit: 60 } : "skip");
  const categories = useQuery(api.foods.categories, {});
  const rf = useQuery(api.foods.recentsAndFavorites, {});
  const myFoods = useQuery(api.foods.myFoods, tab === "mine" ? {} : "skip");
  const recipes = useQuery(api.foods.listRecipes, tab === "recipes" ? {} : "skip");
  const logEntry = useMutation(api.nutrition.logEntry);
  const logTemplate = useMutation(api.nutrition.logTemplate);

  async function quickLog(foodId: any, qty: number, unitLabel: string, name: string) {
    await logEntry({ date, meal, foodId, qty, unitLabel });
    toast({ message: `${name} added to ${meal}` });
  }

  return (
    <div className="space-y-4 pb-28">
      <header className="sticky top-[var(--safe-top)] z-30 -mx-4 -mt-5 space-y-3 bg-bg/90 px-4 pb-3 pt-5 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/eat")} className="-m-1.5 rounded-xl p-3 text-muted hover:bg-surface-2 hover:text-ink">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-[18px] font-bold tracking-tight">Log food</h1>
          <button onClick={() => setQuickAdd(true)} className="flex items-center gap-1 text-[12.5px] font-semibold text-accent">
            <Zap className="h-3.5 w-3.5" /> Quick add
          </button>
        </div>
        <Segmented value={meal} onChange={setMeal} options={MEALS} />
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setTab("search");
            }}
            placeholder="Search dal, roti, paneer, chicken…"
            className="pl-10"
          />
        </div>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {[
          { k: "search", label: "All foods", icon: Utensils },
          { k: "recent", label: "Recent & favourites", icon: Clock },
          { k: "mine", label: "My foods", icon: Star },
          { k: "recipes", label: "Recipes", icon: CookingPot },
        ].map((t) => (
          <Chip key={t.k} active={tab === t.k} onClick={() => setTab(t.k as any)}>
            <t.icon className="mr-1 inline h-3.5 w-3.5" />
            {t.label}
          </Chip>
        ))}
      </div>

      {tab === "search" && (
        <>
          {!q && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <Chip active={!category} onClick={() => setCategory(undefined)}>
                Everything
              </Chip>
              {(categories ?? []).map((c: any) => (
                <Chip key={c.category} active={category === c.category} onClick={() => setCategory(c.category)}>
                  {titleCase(c.category)} <span className="ml-1 text-muted">{c.count}</span>
                </Chip>
              ))}
            </div>
          )}
          {foods === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : foods.length === 0 ? (
            <Card className="text-center">
              <p className="text-[14px] text-muted">No match for “{q}”.</p>
              <Button className="mt-3" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Create “{q || "a custom food"}”
              </Button>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {foods.map((f: any) => (
                <FoodRow key={f._id} food={f} onOpen={() => setSelected(f)} onQuick={() => quickLog(f._id, 1, f.servings[0].label, f.name)} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "recent" && (
        <div className="space-y-5">
          {rf?.templates && rf.templates.length > 0 && (
            <section>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Saved meals</div>
              <div className="space-y-1.5">
                {rf.templates.map((t: any) => (
                  <button
                    key={t._id}
                    onClick={async () => {
                      const n = await logTemplate({ templateId: t._id, date, meal });
                      toast({ message: `${t.name} · ${n} items added` });
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left hover:border-accent/40"
                  >
                    <CookingPot className="h-4 w-4 text-violet" />
                    <div className="flex-1 text-[13.5px] font-semibold">{t.name}</div>
                    <Plus className="h-4 w-4 text-muted" />
                  </button>
                ))}
              </div>
            </section>
          )}
          <section>
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Most logged</div>
            {rf?.favorites?.length ? (
              <div className="space-y-1.5">
                {rf.favorites.map((e: any) => (
                  <PastEntryRow key={e._id} entry={e} onLog={() => e.foodId && quickLog(e.foodId, e.qty, e.unitLabel, e.name)} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">Log a few meals and your regulars show up here.</p>
            )}
          </section>
          <section>
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Recent</div>
            <div className="space-y-1.5">
              {(rf?.recents ?? []).map((e: any) => (
                <PastEntryRow key={e._id} entry={e} onLog={() => e.foodId && quickLog(e.foodId, e.qty, e.unitLabel, e.name)} />
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "mine" && (
        <div className="space-y-2">
          <Button variant="soft" className="w-full" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Create a custom food
          </Button>
          {(myFoods ?? []).map((f: any) => (
            <FoodRow key={f._id} food={f} onOpen={() => setSelected(f)} onQuick={() => quickLog(f._id, 1, f.servings[0].label, f.name)} />
          ))}
          {myFoods?.length === 0 && (
            <p className="py-6 text-center text-[13px] text-muted">
              Nothing yet. Custom foods are for the things only you eat — your mum&apos;s rajma, your gym&apos;s
              shake, a packaged product.
            </p>
          )}
        </div>
      )}

      {tab === "recipes" && (
        <div className="space-y-2">
          <Link href="/eat/recipes">
            <Button variant="soft" className="w-full">
              <Plus className="h-4 w-4" /> Build a recipe
            </Button>
          </Link>
          {(recipes ?? []).map((r: any) => (
            <button
              key={r._id}
              onClick={async () => {
                await logEntry({ date, meal, recipeId: r._id, qty: 1 });
                toast({ message: `${r.name} added` });
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left hover:border-accent/40"
            >
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{r.name}</div>
                <div className="tabular text-[11.5px] text-muted">
                  {r.perServing.kcal} kcal · P {r.perServing.protein} · per serving
                </div>
              </div>
              <Plus className="h-4 w-4 text-muted" />
            </button>
          ))}
        </div>
      )}

      <FoodSheet
        food={selected}
        meal={meal}
        date={date}
        onClose={() => setSelected(null)}
        onLogged={(name) => {
          setSelected(null);
          toast({ message: `${name} added to ${meal}` });
        }}
      />
      <CreateFood open={creating} initialName={q} onClose={() => setCreating(false)} onCreated={(f) => { setCreating(false); setSelected(f); }} />
      <QuickAdd open={quickAdd} onClose={() => setQuickAdd(false)} meal={meal} date={date} />
    </div>
  );
}

function FoodRow({ food, onOpen, onQuick }: { food: any; onOpen: () => void; onQuick: () => void }) {
  const s = food.servings[0];
  const per = Math.round((food.per100.kcal * s.grams) / 100);
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-line bg-surface p-3 transition-colors hover:border-ink/15">
      <FoodTile category={food.category} />
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-start gap-2">
          <span className={cn("mt-[7px] h-2 w-2 shrink-0 rounded-full", food.veg ? "bg-mint" : "bg-rose")} />
          <span className="line-clamp-2 min-w-0 text-[14.5px] font-bold leading-snug">{food.name}</span>
          {food.state === "raw" && <Pill tone="amber">raw</Pill>}
          {food.ownerUserId && <Pill tone="violet">mine</Pill>}
        </div>
        <div className="tabular mt-0.5 truncate text-[12px] text-muted">
          {per} kcal · {s.label === "g" || s.label === "ml" ? `100 ${s.label}` : `1 ${s.label}`} · P{" "}
          {Math.round((food.per100.protein * s.grams) / 100)} g
        </div>
      </button>
      <button
        onClick={onQuick}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink transition-colors hover:bg-ink hover:text-ground"
        aria-label={`Quick add ${food.name}`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function PastEntryRow({ entry, onLog }: { entry: any; onLog: () => void }) {
  return (
    <button
      onClick={onLog}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left hover:border-accent/40"
    >
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{entry.name}</div>
        <div className="tabular text-[11.5px] text-muted">
          {entry.qty} {entry.unitLabel} · {entry.nutrients.kcal} kcal
          {entry.timesLogged ? ` · logged ${entry.timesLogged}×` : ""}
        </div>
      </div>
      <Plus className="h-4 w-4 shrink-0 text-muted" />
    </button>
  );
}

function FoodSheet({
  food,
  meal,
  date,
  onClose,
  onLogged,
}: {
  food: any;
  meal: string;
  date: string;
  onClose: () => void;
  onLogged: (name: string) => void;
}) {
  const logEntry = useMutation(api.nutrition.logEntry);
  const [qty, setQty] = useState<number | undefined>(1);
  const [unit, setUnit] = useState(0);
  const [busy, setBusy] = useState(false);

  const serving = food?.servings?.[unit] ?? food?.servings?.[0];
  const grams = (serving?.grams ?? 0) * (qty ?? 0);
  const n = useMemo(() => {
    if (!food) return null;
    const f = (x: number) => Math.round(((x * grams) / 100) * 10) / 10;
    return {
      kcal: Math.round((food.per100.kcal * grams) / 100),
      protein: f(food.per100.protein),
      carbs: f(food.per100.carbs),
      fat: f(food.per100.fat),
      fiber: f(food.per100.fiber),
    };
  }, [food, grams]);

  return (
    <Sheet
      open={!!food}
      onClose={onClose}
      title={food?.name}
      footer={
        <Button
          className="w-full"
          size="lg"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await logEntry({ date, meal, foodId: food._id, qty: qty ?? 1, unitLabel: serving.label });
              onLogged(food.name);
              setQty(1);
              setUnit(0);
            } finally {
              setBusy(false);
            }
          }}
        >
          Add {n?.kcal} kcal to {meal}
        </Button>
      }
    >
      {food && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <FoodTile category={food.category} size={64} radius={20} />
            <div className="min-w-0">
              <div className="line-clamp-2 text-[15px] font-bold leading-snug">{food.name}</div>
              <div className="text-[12px] text-muted">
                {food.per100.kcal} kcal · P {food.per100.protein} g per 100 g
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone={food.veg ? "mint" : "rose"}>{food.veg ? "Veg" : "Non-veg"}</Pill>
            <Pill>{titleCase(food.category)}</Pill>
            {food.state !== "as_is" && <Pill tone="amber">{food.state}</Pill>}
            {!food.verified && <Pill tone="amber">estimated</Pill>}
          </div>

          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-muted">Serving</div>
            <div className="flex flex-wrap gap-1.5">
              {food.servings.map((s: any, i: number) => (
                <Chip key={s.label} active={unit === i} onClick={() => setUnit(i)}>
                  {s.label === "g" || s.label === "ml" ? `per ${s.label}` : s.label} · {s.grams} g
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-muted">How much</span>
            <Stepper
              value={qty}
              onChange={setQty}
              step={serving?.label === "g" || serving?.label === "ml" ? 25 : 0.5}
              min={0}
              max={2000}
              suffix={serving?.label}
              className="flex-1"
            />
          </div>

          <div className="rounded-2xl border border-line bg-surface-2 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-semibold">{Math.round(grams)} g total</span>
              <span className="tabular text-[26px] font-bold">{n?.kcal} kcal</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {(
                [
                  ["Protein", n?.protein, "var(--accent)"],
                  ["Carbs", n?.carbs, "var(--sky)"],
                  ["Fat", n?.fat, "var(--amber)"],
                  ["Fiber", n?.fiber, "var(--mint)"],
                ] as const
              ).map(([label, val, color]) => (
                <div key={label} className="rounded-xl bg-surface py-2.5">
                  <div className="tabular text-[15px] font-bold" style={{ color }}>
                    {val}
                  </div>
                  <div className="text-[10.5px] text-muted">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11.5px] leading-relaxed text-muted">
            Values are per 100 g of the {food.state === "raw" ? "raw" : "prepared"} food from standard
            composition data. Oil, portion size and recipe change real numbers — treat this as a good
            estimate.
          </p>
        </div>
      )}
    </Sheet>
  );
}

function QuickAdd({ open, onClose, meal, date }: { open: boolean; onClose: () => void; meal: string; date: string }) {
  const logEntry = useMutation(api.nutrition.logEntry);
  const toast = useToast();
  const [name, setName] = useState("");
  const [v, setV] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const [busy, setBusy] = useState(false);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Quick add"
      footer={
        <Button
          className="w-full"
          size="lg"
          loading={busy}
          disabled={!name.trim() || !v.kcal}
          onClick={async () => {
            setBusy(true);
            await logEntry({ date, meal, qty: 1, manual: { name, ...v } });
            setBusy(false);
            toast({ message: `${name} added` });
            setName("");
            setV({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
            onClose();
          }}
        >
          Add to {meal}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-muted">
          For when you know the numbers but not the food — a restaurant meal, a label, a rough
          estimate. It gets marked as estimated.
        </p>
        <Field label="What was it?">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Office lunch thali" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {(["kcal", "protein", "carbs", "fat", "fiber"] as const).map((k) => (
            <Field key={k} label={k === "kcal" ? "Calories" : `${titleCase(k)} (g)`}>
              <Stepper
                value={v[k] || undefined}
                onChange={(x) => setV((p) => ({ ...p, [k]: x ?? 0 }))}
                step={k === "kcal" ? 50 : 5}
                max={5000}
              />
            </Field>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
