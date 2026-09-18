"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Loader2, X } from "lucide-react";

/* ---------------------------------- Card ---------------------------------- */

export function Card({
  className,
  children,
  as: As = "div",
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { as?: any }) {
  return (
    <As className={cn("card p-4", className)} {...rest}>
      {children}
    </As>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex min-w-0 items-end justify-between gap-3", className)}>
      <h2 className="min-w-0 text-[15px] font-semibold leading-tight tracking-tight text-ink">{children}</h2>
      {/* Text links here are ~18px tall; pad the hit area to ~44px without moving anything. */}
      {action && (
        <div className="shrink-0 [&>a]:-my-3 [&>a]:inline-flex [&>a]:py-3 [&>button]:-my-3 [&>button]:py-3">{action}</div>
      )}
    </div>
  );
}

/* --------------------------------- Button --------------------------------- */

const VARIANTS = {
  primary: "bg-accent text-accent-ink hover:brightness-105 active:brightness-95",
  dark: "bg-ink text-ground hover:opacity-90",
  soft: "bg-surface-2 text-ink hover:bg-surface-3 border border-line",
  ghost: "text-ink-2 hover:bg-surface-2",
  danger: "bg-rose/15 text-rose hover:bg-rose/25 border border-rose/25",
  outline: "border border-line text-ink hover:bg-surface-2",
};

const SIZES = {
  sm: "h-9 px-3.5 text-[13px] rounded-xl",
  md: "h-11 px-4 text-sm rounded-2xl",
  lg: "h-14 px-6 text-[15px] rounded-2xl",
  icon: "h-10 w-10 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  loading,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}

/* ---------------------------------- Chips --------------------------------- */

export function Chip({
  active,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all active:scale-95",
        active
          ? "border-transparent bg-ink text-ground"
          : "border-line bg-surface text-ink-2 hover:border-ink/25 hover:text-ink",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = "muted", className }: { children: React.ReactNode; tone?: string; className?: string }) {
  const tones: Record<string, string> = {
    muted: "bg-surface-2 text-muted border-line",
    accent: "bg-accent-soft text-accent border-accent/25",
    mint: "bg-mint/12 text-mint border-mint/25",
    amber: "bg-amber/12 text-amber border-amber/25",
    rose: "bg-rose/12 text-rose border-rose/25",
    sky: "bg-sky/12 text-sky border-sky/25",
    violet: "bg-violet/12 text-violet border-violet/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        tones[tone] ?? tones.muted,
        className
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------- Inputs --------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-[12px] font-semibold text-muted">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1.5 block text-[12px] text-rose">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/* 16px, not 15: iOS Safari force-zooms the viewport whenever a focused field is
   smaller than that, which wrecks the layout on every tap. */
export const inputClass =
  "w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[16px] text-ink placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:bg-surface focus:outline-none";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "min-h-24 resize-y", props.className)} />;
}

export function Select({
  children,
  className,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...rest} className={cn(inputClass, "appearance-none pr-10", className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            /* `min-w-0` is the load-bearing part: without it a flex item refuses to
               shrink below its min-content width, so a four-option control with
               labels like "3 months" forced the whole page ~11px wider than a
               320px phone. `truncate` is the backstop if a label still won't fit;
               the tighter phone padding/size is what keeps it from ever engaging. */
            "min-w-0 flex-1 truncate rounded-xl px-1 py-2 text-[12px] font-semibold transition-all min-[360px]:px-2 sm:px-3 sm:text-[13px]",
            value === o.value ? "bg-ink text-ground shadow-sm" : "text-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  multi,
  cols = 2,
}: {
  options: { value: T; label: string; hint?: string; icon?: React.ReactNode }[];
  value: T | T[];
  onChange: (v: any) => void;
  multi?: boolean;
  cols?: number;
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div className={cn("grid gap-2.5", cols === 1 ? "grid-cols-1" : cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => {
            if (multi) {
              const arr = Array.isArray(value) ? value : [];
              onChange(arr.includes(o.value) ? arr.filter((x) => x !== o.value) : [...arr, o.value]);
            } else onChange(o.value);
          }}
          className={cn(
            "relative rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]",
            selected(o.value)
              ? "border-accent bg-accent-soft"
              : "border-line bg-surface-2 hover:border-ink/20"
          )}
        >
          {o.icon && <div className="mb-2 text-ink">{o.icon}</div>}
          <div className={cn("text-[14px] font-semibold", selected(o.value) ? "text-accent" : "text-ink")}>
            {o.label}
          </div>
          {o.hint && <div className="mt-0.5 text-[12px] leading-snug text-muted">{o.hint}</div>}
          {multi && selected(o.value) && (
            <Check className="absolute right-3 top-3 h-4 w-4 text-accent" strokeWidth={3} />
          )}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- Rings ---------------------------------- */

export function Ring({
  value,
  max,
  size = 128,
  stroke = 12,
  color = "var(--accent)",
  track = "var(--surface-3)",
  children,
  className,
  rounded = true,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
  className?: string;
  rounded?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap={rounded ? "round" : "butt"}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Bar({
  value,
  max,
  color = "var(--accent)",
  className,
  height = 8,
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-surface-3", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color, transition: "width 600ms cubic-bezier(0.22,1,0.36,1)" }}
      />
    </div>
  );
}

/* ------------------------------ Sheet / Modal ----------------------------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "full";
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[92dvh] w-full animate-sheet flex-col overflow-hidden border border-line bg-surface shadow-2xl",
          "rounded-t-[28px] sm:rounded-[28px]",
          size === "lg" ? "sm:max-w-2xl" : size === "full" ? "sm:max-w-4xl" : "sm:max-w-md"
        )}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 truncate text-[15px] font-semibold">{title}</div>
            <button
              onClick={onClose}
              className="-m-1.5 shrink-0 rounded-xl p-3 text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line bg-surface px-5 pt-3.5 pb-[max(0.875rem,var(--safe-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Tap again to confirm",
  className,
  variant = "danger",
  size = "sm",
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  confirmLabel?: string;
  className?: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => {
        if (armed) {
          onConfirm();
          setArmed(false);
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

/* --------------------------------- States --------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-[22px] border border-dashed border-line px-6 py-7 text-center", className)}>
      {icon && <div className="mb-2.5 grid h-10 w-10 place-items-center rounded-2xl bg-surface-2 text-muted">{icon}</div>}
      <div className="text-[14px] font-semibold text-ink">{title}</div>
      {body && <p className="mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
}

export function Stat({
  label,
  value,
  unit,
  sub,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-2xl border border-line bg-surface-2 p-2.5 sm:p-3.5", className)}>
      {/* Labels and subs wrap instead of truncating: three of these share ~240px on a 320px phone. */}
      <div className="line-clamp-2 break-words text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted sm:text-[11px] sm:tracking-wider">
        {label}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-1">
        <span
          className="tabular whitespace-nowrap text-[16px] font-bold leading-tight min-[360px]:text-[17px] sm:text-[22px]"
          style={tone ? { color: tone } : undefined}
        >
          {value}
        </span>
        {unit && <span className="shrink-0 text-[11px] font-medium text-muted sm:text-[12px]">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted sm:text-[12px]">{sub}</div>}
    </div>
  );
}

/* --------------------------------- Toasts --------------------------------- */

type Toast = { id: number; message: string; action?: { label: string; run: () => void }; tone?: string };
const ToastCtx = React.createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => React.useContext(ToastCtx);

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  // Safety net: any server call that fails without its own handler still tells the user why
  // (rate limit, validation) instead of failing silently.
  React.useEffect(() => {
    const onReject = (e: PromiseRejectionEvent) => {
      const data = (e.reason as any)?.data;
      const msg = String((e.reason as any)?.message ?? "");
      // Only backend failures — ignore unrelated rejections (a cancelled share sheet etc.).
      if (typeof data === "string") push({ message: data, tone: "var(--rose)" });
      else if (/\[CONVEX|Server Error/.test(msg))
        push({ message: "Something went wrong — check your connection and try again", tone: "var(--rose)" });
    };
    window.addEventListener("unhandledrejection", onReject);
    return () => window.removeEventListener("unhandledrejection", onReject);
  }, [push]);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-8">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm animate-pop items-center gap-3 rounded-2xl border border-line bg-surface-3 px-4 py-3 text-[13px] shadow-xl"
          >
            <span className="flex-1" style={t.tone ? { color: t.tone } : undefined}>
              {t.message}
            </span>
            {t.action && (
              <button
                className="shrink-0 font-semibold text-accent"
                onClick={() => {
                  t.action!.run();
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------- Number pad ------------------------------- */

export function Stepper({
  value,
  onChange,
  step = 2.5,
  min = 0,
  max = 999,
  suffix,
  className,
  placeholder = "–",
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 rounded-xl border border-line bg-surface-2", className)}>
      <button
        type="button"
        className="h-10 w-9 rounded-l-xl text-muted transition-colors hover:bg-surface-3 hover:text-ink"
        onClick={() => onChange(Math.max(min, Math.round(((value ?? 0) - step) * 100) / 100))}
        aria-label="Decrease"
      >
        –
      </button>
      <input
        inputMode="decimal"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.]/g, "");
          onChange(v === "" ? undefined : Math.min(max, Number(v)));
        }}
        className="tabular w-full min-w-0 bg-transparent py-2 text-center text-[15px] font-semibold outline-none"
      />
      {suffix && <span className="pr-1 text-[11px] text-muted">{suffix}</span>}
      <button
        type="button"
        className="h-10 w-9 rounded-r-xl text-muted transition-colors hover:bg-surface-3 hover:text-ink"
        onClick={() => onChange(Math.min(max, Math.round(((value ?? 0) + step) * 100) / 100))}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

/* ---------------------------------- Logo ---------------------------------- */

/** The FitOpe mark on a white tile — the black "F" stays legible in dark mode too. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-[28%] bg-white shadow-sm ring-1 ring-black/5", className)}
      style={{ width: size, height: size }}
    >
      <img src="/brand/mark.png" alt="FitOpe" width={size * 0.64} height={size * 0.64} className="object-contain" />
    </span>
  );
}
