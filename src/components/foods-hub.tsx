"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  Field,
  Input,
  Pill,
  Segmented,
  Sheet,
  Stepper,
  Textarea,
  useToast,
} from "@/components/ui";
import { ArrowLeft, CookingPot, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { CreateFood } from "@/components/create-food";
import { titleCase } from "@/lib/utils";

export function FoodsHub({ initialTab = "foods" }: { initialTab?: "foods" | "recipes" }) {
  const [tab, setTab] = useState<string>(initialTab);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pt-1">
        <button onClick={() => router.push("/eat")} className="-m-1.5 rounded-xl p-3 text-muted hover:bg-surface-2 hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-[22px] font-bold tracking-tight">My food library</h1>
      </header>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "foods", label: "Custom foods" },
          { value: "recipes", label: "Recipes" },
        ]}
      />
      {tab === "foods" ? <MyFoods /> : <Recipes />}
    </div>
  );
}

function MyFoods() {
  const foods = useQuery(api.foods.myFoods, {});
  const archive = useMutation(api.foods.archiveCustom);
  const update = useMutation(api.foods.updateCustom);
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [per100, setPer100] = useState<any>(null);

  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={() => setCreating(true)}>
        <Plus className="h-4 w-4" /> New custom food
      </Button>
      {foods === undefined ? null : foods.length === 0 ? (
        <EmptyState
          title="No custom foods yet"
          body="Create one when the library is missing something you eat often — a home recipe, a local brand, your protein shake."
        />
      ) : (
        <div className="space-y-2">
          {foods.map((f: any) => (
            <Card key={f._id} className="flex items-center gap-3 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{f.name}</div>
                <div className="tabular text-[11.5px] text-muted">
                  {f.per100.kcal}&nbsp;kcal · P&nbsp;{f.per100.protein} · C&nbsp;{f.per100.carbs} · F&nbsp;{f.per100.fat} · Fib{"\u00a0"}
                  {f.per100.fiber} / 100 g
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {f.servings.slice(0, 3).map((s: any) => (
                    <Pill key={s.label}>
                      {s.label} {s.grams}g
                    </Pill>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  setEditing(f);
                  setPer100(f.per100);
                }}
                className="rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-ink"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <ConfirmButton
                variant="ghost"
                onConfirm={async () => {
                  await archive({ id: f._id });
                  toast({ message: `${f.name} archived — past logs keep their values` });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </ConfirmButton>
            </Card>
          ))}
        </div>
      )}

      <CreateFood open={creating} onClose={() => setCreating(false)} />

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? ""}`}
        footer={
          <Button
            className="w-full"
            size="lg"
            onClick={async () => {
              await update({ id: editing._id, per100 });
              toast({ message: "Updated — past logs unchanged" });
              setEditing(null);
            }}
          >
            Save changes
          </Button>
        }
      >
        {editing && per100 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(["kcal", "protein", "carbs", "fat", "fiber"] as const).map((k) => (
                <Field key={k} label={k === "kcal" ? "Calories" : `${titleCase(k)} (g)`}>
                  <Stepper
                    value={per100[k] || undefined}
                    onChange={(v) => setPer100((p: any) => ({ ...p, [k]: v ?? 0 }))}
                    step={k === "kcal" ? 10 : 1}
                    max={950}
                  />
                </Field>
              ))}
            </div>
            <p className="text-[12px] leading-relaxed text-muted">
              Meals you already logged keep the numbers they were saved with. Only future entries use
              the new values.
            </p>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Recipes() {
  const recipes = useQuery(api.foods.listRecipes, {});
  const del = useMutation(api.foods.deleteRecipe);
  const [building, setBuilding] = useState(false);
  const toast = useToast();

  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={() => setBuilding(true)}>
        <CookingPot className="h-4 w-4" /> Build a recipe
      </Button>
      {recipes === undefined ? null : recipes.length === 0 ? (
        <EmptyState
          icon={<CookingPot className="h-5 w-5" />}
          title="No recipes yet"
          body="Add the ingredients once and FitOpe works out the nutrition per serving. Great for dal, curries and anything you cook in batches."
        />
      ) : (
        <div className="space-y-2">
          {recipes.map((r: any) => (
            <Card key={r._id}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">{r.name}</div>
                  <div className="tabular text-[12px] text-muted">
                    {r.servings} servings · {Math.round(r.gramsTotal)} g total
                  </div>
                </div>
                <ConfirmButton
                  variant="ghost"
                  onConfirm={async () => {
                    await del({ id: r._id });
                    toast({ message: "Recipe deleted" });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </ConfirmButton>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1.5 text-center">
                {(
                  [
                    ["kcal", r.perServing.kcal],
                    ["P", r.perServing.protein],
                    ["C", r.perServing.carbs],
                    ["F", r.perServing.fat],
                    ["Fib", r.perServing.fiber],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-surface-2 py-2">
                    <div className="tabular text-[14px] font-bold">{v}</div>
                    <div className="text-[10px] text-muted">{k}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11.5px] text-muted">
                {r.ingredients.map((i: any) => `${i.food.name} ${i.grams}g`).join(" · ")}
              </div>
            </Card>
          ))}
        </div>
      )}
      <RecipeBuilder open={building} onClose={() => setBuilding(false)} />
    </div>
  );
}

function RecipeBuilder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const save = useMutation(api.foods.saveRecipe);
  const toast = useToast();
  const [name, setName] = useState("");
  const [servings, setServings] = useState<number | undefined>(4);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<{ food: any; grams: number }[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const results = useQuery(api.foods.search, q.length > 1 ? { q, limit: 12 } : "skip");

  const total = items.reduce(
    (a, i) => ({
      kcal: a.kcal + (i.food.per100.kcal * i.grams) / 100,
      protein: a.protein + (i.food.per100.protein * i.grams) / 100,
      carbs: a.carbs + (i.food.per100.carbs * i.grams) / 100,
      fat: a.fat + (i.food.per100.fat * i.grams) / 100,
      fiber: a.fiber + (i.food.per100.fiber * i.grams) / 100,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
  const per = (v: number) => Math.round((v / Math.max(1, servings ?? 1)) * 10) / 10;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Build a recipe"
      size="lg"
      footer={
        <Button
          className="w-full"
          size="lg"
          loading={busy}
          disabled={!name.trim() || items.length === 0}
          onClick={async () => {
            setBusy(true);
            try {
              await save({
                name,
                servings: servings ?? 1,
                notes: notes || undefined,
                items: items.map((i) => ({ foodId: i.food._id, grams: i.grams })),
                alsoCreateFood: true,
              });
              toast({ message: `${name} saved — log it from Recipes` });
              setName("");
              setItems([]);
              onClose();
            } catch (e: any) {
              toast({ message: e.message, tone: "var(--rose)" });
            } finally {
              setBusy(false);
            }
          }}
        >
          Save recipe
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Recipe name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sunday chole" />
        </Field>
        <Field label="How many servings does it make?">
          <Stepper value={servings} onChange={setServings} step={1} min={1} max={50} suffix="servings" />
        </Field>

        <div>
          <div className="mb-2 text-[12px] font-semibold text-muted">Ingredients</div>
          <div className="space-y-1.5">
            {items.map((i, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{i.food.name}</span>
                <Stepper
                  value={i.grams}
                  onChange={(v) => setItems((p) => p.map((x, j) => (j === idx ? { ...x, grams: v ?? 0 } : x)))}
                  step={25}
                  max={5000}
                  suffix="g"
                  className="w-28 sm:w-32"
                />
                <button onClick={() => setItems((p) => p.filter((_, j) => j !== idx))} className="text-muted hover:text-rose">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add an ingredient…" className="pl-10" />
          </div>
          {q.length > 1 && (
            <div className="mt-1.5 max-h-52 space-y-1 overflow-y-auto">
              {(results ?? []).map((f: any) => (
                <button
                  key={f._id}
                  onClick={() => {
                    setItems((p) => [...p, { food: f, grams: f.servings[0].grams }]);
                    setQ("");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left text-[13px] hover:border-accent/40"
                >
                  <span className="flex-1 truncate">{f.name}</span>
                  <Plus className="h-3.5 w-3.5 text-muted" />
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="rounded-2xl border border-line bg-surface-2 p-4">
            <div className="mb-2 text-[12px] font-semibold text-muted">Per serving</div>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {(
                [
                  ["kcal", Math.round(per(total.kcal))],
                  ["P", per(total.protein)],
                  ["C", per(total.carbs)],
                  ["F", per(total.fat)],
                  ["Fib", per(total.fiber)],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-surface py-2">
                  <div className="tabular text-[15px] font-bold">{v}</div>
                  <div className="text-[10px] text-muted">{k}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Field label="Notes (optional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cooked in 2 tbsp oil" />
        </Field>
      </div>
    </Sheet>
  );
}
