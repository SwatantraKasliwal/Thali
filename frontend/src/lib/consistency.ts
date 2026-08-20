import { LogEntry, FastEntry, Supplement, SupplementLog } from '@/types';
import { toISO, addDays, parseISO } from '@/lib/dates';

// Meals that must be covered (logged or fasted) for a day to count as consistent.
// Snack is intentionally optional.
export const REQUIRED_MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const;

export interface DayStatus {
  iso: string;
  day: number;            // day-of-month
  covered: Set<string>;   // meals with a food log OR a fast on this day
  complete: boolean;      // all REQUIRED_MEALS covered + every due supplement ticked
  future: boolean;        // date is after today (not yet actionable)
}

/**
 * Everything needed to judge a day: meal coverage plus the supplement
 * commitments in force and the ticks against them.
 */
export interface Consistency {
  coverage: Map<string, Set<string>>;
  supplements: Supplement[];
  /** `${supplementId}|${iso}` for every day a supplement was ticked. */
  checked: Set<string>;
}

/** Map of YYYY-MM-DD → set of meals covered by a log or a fast. */
export function buildCoverage(logs: LogEntry[], fasts: FastEntry[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (iso: string, meal: string) => {
    const s = map.get(iso) ?? new Set<string>();
    s.add(meal);
    map.set(iso, s);
  };
  for (const l of logs)  add(l.date, l.meal);
  for (const f of fasts) add(f.date, f.meal);
  return map;
}

export function buildConsistency(
  logs: LogEntry[],
  fasts: FastEntry[],
  supplements: Supplement[] = [],
  supplementLogs: SupplementLog[] = []
): Consistency {
  return {
    coverage: buildCoverage(logs, fasts),
    supplements,
    checked: new Set(supplementLogs.map(l => `${l.supplementId}|${l.date}`)),
  };
}

/**
 * Supplements the user is committed to on `iso`.
 *
 * A supplement counts only from the day it was added — adding creatine today
 * never reaches back and invalidates days that carried no such commitment —
 * and stops counting once it is deleted, though its history stays queryable.
 */
export function supplementsDueOn(supplements: Supplement[], iso: string): Supplement[] {
  return supplements.filter(s => s.startDate <= iso && (s.endDate === null || iso <= s.endDate));
}

export function isChecked(c: Consistency, supplementId: string, iso: string): boolean {
  return c.checked.has(`${supplementId}|${iso}`);
}

/** All required meals covered AND every supplement due that day ticked. */
export function isComplete(c: Consistency, iso: string): boolean {
  const covered = c.coverage.get(iso);
  if (!covered || !REQUIRED_MEALS.every(m => covered.has(m))) return false;
  return supplementsDueOn(c.supplements, iso).every(s => isChecked(c, s.id, iso));
}

/** Days of the month containing `ref`, with consistency status for each. */
export function monthGrid(c: Consistency, ref: Date = new Date()): DayStatus[] {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const todayISO = toISO(new Date());
  const count = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const iso = toISO(new Date(y, m, i + 1));
    const covered = c.coverage.get(iso) ?? new Set<string>();
    return { iso, day: i + 1, covered, complete: isComplete(c, iso), future: iso > todayISO };
  });
}

/** Consecutive complete days ending today (yesterday counts as the anchor until today is finished). */
export function currentStreak(c: Consistency, today: Date = new Date()): number {
  let cursor = new Date(today);
  if (!isComplete(c, toISO(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (isComplete(c, toISO(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of complete days from the first record up to today. */
export function bestStreak(c: Consistency): number {
  const isos = [...c.coverage.keys()].filter(iso => isComplete(c, iso)).sort();
  if (isos.length === 0) return 0;
  let best = 1, run = 1;
  for (let i = 1; i < isos.length; i++) {
    const prev = toISO(addDays(parseISO(isos[i]), -1));
    run = isos[i - 1] === prev ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Why a day isn't complete — used for the calendar tooltips. */
export function missingOn(c: Consistency, iso: string): string[] {
  const covered = c.coverage.get(iso) ?? new Set<string>();
  const out: string[] = REQUIRED_MEALS.filter(m => !covered.has(m));
  for (const s of supplementsDueOn(c.supplements, iso)) {
    if (!isChecked(c, s.id, iso)) out.push(s.name);
  }
  return out;
}

/** Flame tier for a streak: 0 = none, then escalates every 7 days (capped). */
export function flameTier(streak: number): number {
  if (streak < 1) return 0;
  return Math.min(1 + Math.floor(streak / 7), 4);
}
