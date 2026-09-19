"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  Apple,
  Armchair,
  Carrot,
  Cookie,
  CookingPot,
  CupSoda,
  Droplet,
  Drumstick,
  Dumbbell,
  EggFried,
  Footprints,
  HeartPulse,
  IceCreamCone,
  Milk,
  MoveVertical,
  Nut,
  PersonStanding,
  Sandwich,
  Shell,
  Soup,
  UtensilsCrossed,
  Waves,
  Wheat,
  Zap,
} from "lucide-react";

/**
 * The references lean on photography for every card. We have no photo rights, so a
 * muscle-group gets a deterministic pastel tile + glyph instead: same job (instant visual
 * recognition down a list), no fake stock imagery.
 */
const MUSCLE_TILE: Record<string, { tile: string; icon: any }> = {
  chest: { tile: "var(--tile-3)", icon: Dumbbell },
  back: { tile: "var(--tile-1)", icon: MoveVertical },
  shoulders: { tile: "var(--tile-4)", icon: Zap },
  biceps: { tile: "var(--tile-6)", icon: Dumbbell },
  triceps: { tile: "var(--tile-5)", icon: Dumbbell },
  quads: { tile: "var(--tile-2)", icon: PersonStanding },
  hamstrings: { tile: "var(--tile-2)", icon: Footprints },
  glutes: { tile: "var(--tile-6)", icon: Armchair },
  calves: { tile: "var(--tile-5)", icon: Footprints },
  core: { tile: "var(--tile-4)", icon: Shell },
  cardio: { tile: "var(--tile-3)", icon: HeartPulse },
  mobility: { tile: "var(--tile-1)", icon: Waves },
  forearms: { tile: "var(--tile-5)", icon: Dumbbell },
  traps: { tile: "var(--tile-1)", icon: MoveVertical },
};

const FALLBACK = { tile: "var(--tile-3)", icon: Activity };

/** Food categories get their own tile + glyph, so a meal list reads as fast as the reference's. */
const FOOD_TILE: Record<string, { tile: string; icon: any }> = {
  breads: { tile: "var(--tile-4)", icon: Wheat },
  grains: { tile: "var(--tile-5)", icon: Wheat },
  rice_dishes: { tile: "var(--tile-5)", icon: CookingPot },
  south_indian: { tile: "var(--tile-4)", icon: CookingPot },
  breakfast: { tile: "var(--tile-5)", icon: EggFried },
  dal_legumes: { tile: "var(--tile-2)", icon: Soup },
  sabzi: { tile: "var(--tile-2)", icon: Carrot },
  curry_veg: { tile: "var(--tile-2)", icon: CookingPot },
  curry_nonveg: { tile: "var(--tile-6)", icon: Drumstick },
  meat_fish_eggs: { tile: "var(--tile-6)", icon: Drumstick },
  dairy: { tile: "var(--tile-3)", icon: Milk },
  fruits: { tile: "var(--tile-6)", icon: Apple },
  vegetables: { tile: "var(--tile-2)", icon: Carrot },
  nuts_seeds: { tile: "var(--tile-4)", icon: Nut },
  snacks: { tile: "var(--tile-4)", icon: Cookie },
  street_food: { tile: "var(--tile-4)", icon: Sandwich },
  sweets: { tile: "var(--tile-6)", icon: IceCreamCone },
  beverages: { tile: "var(--tile-3)", icon: CupSoda },
  protein_supplements: { tile: "var(--tile-1)", icon: Zap },
  packaged: { tile: "var(--tile-5)", icon: Cookie },
  condiments: { tile: "var(--tile-5)", icon: Soup },
  oils_fats: { tile: "var(--tile-5)", icon: Droplet },
  recipe: { tile: "var(--tile-1)", icon: CookingPot },
};

export function foodTileFor(category?: string) {
  return (category && FOOD_TILE[category]) || { tile: "var(--tile-5)", icon: UtensilsCrossed };
}

/** Square thumbnail for a food row. */
export function FoodTile({
  category,
  size = 40,
  radius = 13,
  className,
}: {
  category?: string;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const { tile, icon: Icon } = foodTileFor(category);
  return (
    <div
      className={cn("relative grid shrink-0 place-items-center overflow-hidden", className)}
      style={{ width: size, height: size, borderRadius: radius, background: tile }}
      aria-hidden
    >
      <div
        className="absolute -right-2 -top-2 rounded-full opacity-40"
        style={{ width: size * 0.66, height: size * 0.66, background: "rgba(255,255,255,0.6)" }}
      />
      <Icon className="relative" style={{ width: size * 0.42, height: size * 0.42, color: "var(--tile-ink)" }} strokeWidth={1.9} />
    </div>
  );
}

export function tileFor(muscles?: string[], category?: string) {
  for (const m of muscles ?? []) if (MUSCLE_TILE[m]) return MUSCLE_TILE[m];
  if (category === "cardio") return MUSCLE_TILE.cardio;
  if (category === "mobility") return MUSCLE_TILE.mobility;
  if (category === "core") return MUSCLE_TILE.core;
  return FALLBACK;
}

/** Square thumbnail used at the left of every workout/exercise row. */
export function MediaTile({
  muscles,
  category,
  size = 44,
  radius = 14,
  className,
  label,
}: {
  muscles?: string[];
  category?: string;
  size?: number;
  radius?: number;
  className?: string;
  label?: string;
}) {
  const { tile, icon: Icon } = tileFor(muscles, category);
  return (
    <div
      className={cn("relative grid shrink-0 place-items-center overflow-hidden", className)}
      style={{ width: size, height: size, borderRadius: radius, background: tile }}
      aria-hidden={!label}
      aria-label={label}
    >
      <div
        className="absolute -right-3 -top-3 rounded-full opacity-40"
        style={{ width: size * 0.7, height: size * 0.7, background: "rgba(255,255,255,0.55)" }}
      />
      <Icon className="relative" style={{ width: size * 0.4, height: size * 0.4, color: "var(--tile-ink)" }} strokeWidth={1.9} />
    </div>
  );
}

/**
 * Circular duration badge — the "12 Mins" ring on every row in the reference.
 * The arc reads as progress when a value is given, decoration otherwise.
 */
export function MinutesRing({
  minutes,
  progress = 0.72,
  size = 38,
  label = "Mins",
  color = "var(--ink)",
  track = "var(--surface-3)",
}: {
  minutes: number | string;
  progress?: number;
  size?: number;
  label?: string;
  color?: string;
  track?: string;
}) {
  // The arc is decorative (the number is a duration, not a percentage), so it never
  // closes into a heavy solid ring.
  const stroke = Math.max(2, size * 0.045);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(0.93, Math.max(0, progress)))}
        />
      </svg>
      <div className="relative text-center leading-none">
        <div className="tabular font-bold" style={{ fontSize: size * 0.3 }}>
          {minutes}
        </div>
        <div className="text-muted" style={{ fontSize: size * 0.19, marginTop: 1 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/** Row card: tile + title/subtitle + trailing slot. The reference's list unit. */
export function RowCard({
  tile,
  title,
  subtitle,
  trailing,
  leading,
  onClick,
  href,
  className,
}: {
  tile?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const inner = (
    <>
      {leading}
      {tile}
      <div className="min-w-0 flex-1">
        {/* Two lines before clipping: at 320px a single line cuts ordinary exercise names. */}
        <div className="line-clamp-2 break-words text-[14px] font-bold leading-tight">{title}</div>
        {subtitle && <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">{subtitle}</div>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </>
  );
  const cls = cn(
    "flex w-full items-center gap-2.5 rounded-2xl border border-line bg-surface p-2.5 text-left transition-all",
    onClick || href ? "active:scale-[0.99] hover:border-ink/15" : "",
    className
  );
  if (href)
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  if (onClick)
    return (
      <button onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  return <div className={cls}>{inner}</div>;
}

/** Icon + value + label cell, four of which make the reference's "Plan Details" grid. */
export function MetaCell({
  icon: Icon,
  value,
  label,
}: {
  icon: any;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface-2 px-3 py-2.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface text-ink">
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-bold leading-tight">{value}</div>
        <div className="text-[11px] text-muted">{label}</div>
      </div>
    </div>
  );
}

/** Icon pill — "Fat Burn · Heart Boost · Body Tone" in the reference. */
export function TagChip({ icon: Icon, children }: { icon?: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-2 text-[12.5px] font-semibold text-ink-2">
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2} />}
      {children}
    </span>
  );
}

export function Accordion({
  title,
  subtitle,
  defaultOpen,
  children,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  icon?: any;
}) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-3.5 text-left">
        {Icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2">
            <Icon className="h-4 w-4" strokeWidth={1.9} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold">{title}</span>
          {subtitle && <span className="block text-[12px] text-muted">{subtitle}</span>}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="border-t border-line px-3.5 py-3">{children}</div>}
    </div>
  );
}
