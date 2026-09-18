/** Pure calendar helpers — no Convex imports, so scripts can test them in any TZ. */

export function safeTz(tz: string | undefined) {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** Calendar date (YYYY-MM-DD) in the given IANA zone. */
export function localDate(tz: string | undefined, at = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTz(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** UTC calendar date. Only for code with no user (seeding); user code uses todayFor. */
export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000
  );
}

export function weekday(date: string) {
  return new Date(date + "T00:00:00Z").getUTCDay();
}
