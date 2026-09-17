export const toISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Monday 00:00 of the week containing `d` (weeks start on Monday). */
export const startOfWeek = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();                     // 0 Sun … 6 Sat
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
};

export const parseISO = (iso: string): Date => new Date(iso + 'T00:00:00');

export const formatDay = (iso: string): string => {
  const today = toISO(new Date());
  if (iso === today) return 'Today';
  const d = parseISO(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

// ─── Weeks of a month ─────────────────────────────────────────────────────

export interface WeekOption {
  index: number;      // 1-based — "Week 1", "Week 2", …
  startISO: string;   // Monday
  endISO: string;     // Sunday
  label: string;      // "Week 2"
  range: string;      // "8 – 14 Sep"
}

/**
 * Every Monday→Sunday week that touches the month containing `ref`.
 *
 * A week belongs to the month holding its days, so week 1 starts on the Monday
 * of the week containing the 1st — which usually reaches back into the previous
 * month (September 2026 opens with Mon 31 Aug), and the final week runs on into
 * the next one. That tail week is also week 1 of the following month.
 */
export function weeksOfMonth(ref: Date = new Date()): WeekOption[] {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const last  = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const out: WeekOption[] = [];
  let cursor = startOfWeek(first);
  const stop = startOfWeek(last);
  for (let i = 1; cursor <= stop; i++) {
    const end = addDays(cursor, 6);
    out.push({
      index:    i,
      startISO: toISO(cursor),
      endISO:   toISO(end),
      label:    `Week ${i}`,
      range:    formatRange(cursor, end),
    });
    cursor = addDays(cursor, 7);
  }
  return out;
}

/** "8 – 14 Sep", or "31 Aug – 6 Sep" when the week straddles two months. */
export function formatRange(start: Date, end: Date): string {
  const day   = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric' });
  const full  = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return start.getMonth() === end.getMonth()
    ? `${day(start)} – ${full(end)}`
    : `${full(start)} – ${full(end)}`;
}
