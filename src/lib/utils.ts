import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...i: ClassValue[]) => twMerge(clsx(i));

export const fmt = (n: number | null | undefined, digits = 0) =>
  n == null || Number.isNaN(n) ? "–" : n.toLocaleString("en-IN", { maximumFractionDigits: digits });

export const kg = (n?: number | null) => (n == null ? "–" : `${Math.round(n * 10) / 10} kg`);

export const hhmm = (minutes?: number | null) => {
  if (minutes == null || minutes <= 0) return "–";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
};

/** Today's calendar date on this device (not UTC — toISOString would be yesterday/tomorrow for much of the world). */
export const todayStr = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Pure calendar arithmetic, done in UTC so the device's zone can never shift the result. */
export const addDays = (date: string, n: number) => {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const deviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const prettyDate = (date: string) => {
  const t = todayStr();
  if (date === t) return "Today";
  if (date === addDays(t, -1)) return "Yesterday";
  if (date === addDays(t, 1)) return "Tomorrow";
  return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

export const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Minutes since midnight -> "7:15 am" */
export const clockFromMinutes = (m: number) => {
  const h24 = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const ampm = h24 < 12 ? "am" : "pm";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(mm).padStart(2, "0")} ${ampm}`;
};

export const timeOf = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/**
 * The user-facing text of a failed Convex call. Server messages arrive as ConvexError `data`
 * (production redacts plain messages); anything else gets the fallback.
 */
export function errorText(e: any, fallback = "Something went wrong — try again") {
  return typeof e?.data === "string" ? e.data : fallback;
}

/** ["height","age"] -> "height and age". Keeps prompt copy readable without branching at each call. */
export const listOf = (items?: string[]) => {
  const xs = items ?? [];
  if (xs.length <= 1) return xs[0] ?? "details";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
};
