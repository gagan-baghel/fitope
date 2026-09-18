"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button, Chip, Field, Input, Segmented, Sheet, Stepper, useToast } from "@/components/ui";
import { Plus, X } from "lucide-react";
import { titleCase, errorText } from "@/lib/utils";

const CATEGORIES = [
  "breads", "south_indian", "breakfast", "grains", "rice_dishes", "dal_legumes", "sabzi",
  "curry_veg", "curry_nonveg", "meat_fish_eggs", "dairy", "fruits", "vegetables", "nuts_seeds",
  "snacks", "street_food", "sweets", "beverages", "protein_supplements", "packaged", "condiments",
  "oils_fats",
];

const COMMON_UNITS = ["katori", "bowl", "piece", "roti", "cup", "glass", "tbsp", "tsp", "serving", "plate"];

export function CreateFood({
  open,
  onClose,
  onCreated,
  initialName = "",
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (food: any) => void;
  initialName?: string;
}) {
  const create = useMutation(api.foods.createCustom);
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState("sabzi");
  const [veg, setVeg] = useState("1");
  const [state, setState] = useState("cooked");
  const [per100, setPer100] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const [servings, setServings] = useState<{ label: string; grams: number }[]>([{ label: "g", grams: 1 }]);
  const [newUnit, setNewUnit] = useState("");
  const [newGrams, setNewGrams] = useState<number | undefined>(100);
  const [busy, setBusy] = useState(false);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New food"
      size="lg"
      footer={
        <Button
          className="w-full"
          size="lg"
          loading={busy}
          disabled={!name.trim() || !per100.kcal}
          onClick={async () => {
            setBusy(true);
            try {
              const id = await create({
                name,
                category,
                veg: veg === "1",
                state,
                per100,
                servings: [...servings].sort((a, b) => b.grams - a.grams),
              });
              toast({ message: `${name} saved to your foods` });
              onCreated?.({
                _id: id,
                name,
                category,
                veg: veg === "1",
                state,
                per100,
                servings: [...servings].sort((a, b) => b.grams - a.grams),
                verified: false,
                ownerUserId: true,
              });
              setName("");
              setPer100({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
            } catch (e: any) {
              toast({ message: errorText(e), tone: "var(--rose)" });
            } finally {
              setBusy(false);
            }
          }}
        >
          Save food
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mum's rajma" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Veg or non-veg">
            <Segmented
              value={veg}
              onChange={setVeg}
              options={[
                { value: "1", label: "Veg" },
                { value: "0", label: "Non-veg" },
              ]}
            />
          </Field>
          <Field label="State" hint="Matters for rice, dal, pasta">
            <Segmented
              value={state}
              onChange={setState}
              options={[
                { value: "cooked", label: "Cooked" },
                { value: "raw", label: "Raw" },
                { value: "as_is", label: "As is" },
              ]}
            />
          </Field>
        </div>

        <Field label="Category">
          <div className="no-scrollbar flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {titleCase(c)}
              </Chip>
            ))}
          </div>
        </Field>

        <div>
          <div className="mb-2 text-[12px] font-semibold text-muted">Nutrition per 100 g / 100 ml</div>
          <div className="grid grid-cols-2 gap-3">
            {(["kcal", "protein", "carbs", "fat", "fiber"] as const).map((k) => (
              <Field key={k} label={k === "kcal" ? "Calories" : `${titleCase(k)} (g)`}>
                <Stepper
                  value={per100[k] || undefined}
                  onChange={(v) => setPer100((p) => ({ ...p, [k]: v ?? 0 }))}
                  step={k === "kcal" ? 10 : 1}
                  max={950}
                />
              </Field>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[12px] font-semibold text-muted">Serving sizes</div>
          <div className="space-y-1.5">
            {servings.map((s, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3.5 py-2.5">
                <span className="flex-1 text-[13.5px] font-semibold">
                  1 {s.label} <span className="font-normal text-muted">= {s.grams} g</span>
                </span>
                {servings.length > 1 && (
                  <button onClick={() => setServings((p) => p.filter((_, x) => x !== i))} className="text-muted hover:text-rose">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="katori"
              className="flex-1"
              list="units"
            />
            <datalist id="units">
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <Stepper value={newGrams} onChange={setNewGrams} step={10} max={2000} suffix="g" className="w-28 sm:w-32" />
            <Button
              variant="soft"
              size="icon"
              onClick={() => {
                if (!newUnit.trim() || !newGrams) return;
                setServings((p) => [{ label: newUnit.trim(), grams: newGrams }, ...p]);
                setNewUnit("");
              }}
              aria-label="Add serving size"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {COMMON_UNITS.filter((u) => !servings.some((s) => s.label === u)).slice(0, 6).map((u) => (
              <Chip key={u} onClick={() => setNewUnit(u)}>
                {u}
              </Chip>
            ))}
          </div>
        </div>

        <p className="text-[11.5px] leading-relaxed text-muted">
          Your food stays private to your account. Editing it later will not change meals you have
          already logged — those keep the values they had when you ate them.
        </p>
      </div>
    </Sheet>
  );
}
