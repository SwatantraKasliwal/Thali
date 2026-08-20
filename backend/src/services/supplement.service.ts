import { prisma } from '../db/client';
import { Prisma } from '@prisma/client';

function r2(n: number) { return Math.round(n * 100) / 100; }
const iso  = (d: Date) => d.toISOString().slice(0, 10);
const date = (s: string) => new Date(`${s}T00:00:00.000Z`);
const num  = (v: Prisma.Decimal | number | null | undefined) => (v == null ? 0 : Number(v));

/** UTC "today" as YYYY-MM-DD — matches how @db.Date values round-trip. */
export function todayISO(): string {
  return iso(new Date());
}

function shiftISO(s: string, days: number): string {
  const d = date(s);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

// ─── Serialized shapes ────────────────────────────────────────────────────

export interface SupplementMacros {
  amount:   number;
  calories: number;
  protein:  number;
  carbs:    number;
  fat:      number;
  fibre:    number;
}

export interface SupplementVersionDTO extends SupplementMacros {
  effectiveFrom: string;
}

export interface SupplementDTO extends SupplementMacros {
  id:        string;
  name:      string;
  unit:      string;
  startDate: string;
  endDate:   string | null;   // null = still required every day
  deleted:   boolean;
  versions:  SupplementVersionDTO[];   // full dose history, oldest first
}

export interface SupplementLogDTO extends SupplementMacros {
  id:           string;
  supplementId: string;
  date:         string;
}

type VersionRow = {
  effectiveFrom: Date;
  amount: Prisma.Decimal; calories: Prisma.Decimal; protein: Prisma.Decimal;
  carbs: Prisma.Decimal;  fat: Prisma.Decimal;      fibre: Prisma.Decimal;
};

function toVersion(v: VersionRow): SupplementVersionDTO {
  return {
    effectiveFrom: iso(v.effectiveFrom),
    amount:   num(v.amount),
    calories: num(v.calories),
    protein:  num(v.protein),
    carbs:    num(v.carbs),
    fat:      num(v.fat),
    fibre:    num(v.fibre),
  };
}

function toSupplement(row: {
  id: bigint; name: string; unit: string; startDate: Date; endDate: Date | null;
  deletedAt: Date | null; versions: VersionRow[];
}): SupplementDTO {
  // versions arrive oldest-first; the newest is what the user is taking now.
  const versions = row.versions.map(toVersion);
  const current  = versions[versions.length - 1];
  return {
    id:        String(row.id),
    name:      row.name,
    unit:      row.unit,
    startDate: iso(row.startDate),
    endDate:   row.endDate ? iso(row.endDate) : null,
    deleted:   row.deletedAt != null,
    amount:    current?.amount   ?? 0,
    calories:  current?.calories ?? 0,
    protein:   current?.protein  ?? 0,
    carbs:     current?.carbs    ?? 0,
    fat:       current?.fat      ?? 0,
    fibre:     current?.fibre    ?? 0,
    versions,
  };
}

function toLog(row: {
  id: bigint; supplementId: bigint; logDate: Date;
  amount: Prisma.Decimal; calories: Prisma.Decimal; protein: Prisma.Decimal;
  carbs: Prisma.Decimal;  fat: Prisma.Decimal;      fibre: Prisma.Decimal;
}): SupplementLogDTO {
  return {
    id:           String(row.id),
    supplementId: String(row.supplementId),
    date:         iso(row.logDate),
    amount:   num(row.amount),
    calories: num(row.calories),
    protein:  num(row.protein),
    carbs:    num(row.carbs),
    fat:      num(row.fat),
    fibre:    num(row.fibre),
  };
}

const withVersions = { versions: { orderBy: { effectiveFrom: 'asc' } } } as const;

// ─── Reads ────────────────────────────────────────────────────────────────

/**
 * Everything the client needs: every supplement the user has ever added
 * (deleted ones included, so past days still render and the history graphs
 * have data) plus every tick.
 */
export async function getSupplements(userId: string): Promise<SupplementDTO[]> {
  const rows = await prisma.supplement.findMany({
    where:   { userId },
    include: withVersions,
    orderBy: [{ deletedAt: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(toSupplement);
}

export async function getSupplementLogs(userId: string): Promise<SupplementLogDTO[]> {
  const rows = await prisma.supplementLog.findMany({
    where:   { userId },
    orderBy: { logDate: 'asc' },
  });
  return rows.map(toLog);
}

// ─── Writes ───────────────────────────────────────────────────────────────

export interface SupplementInput {
  name:      string;
  unit:      string;
  amount:    number;
  calories:  number;
  protein:   number;
  carbs:     number;
  fat:       number;
  fibre:     number;
  startDate?: string;
}

function macroData(i: SupplementInput | SupplementUpdate) {
  return {
    amount:   r2(i.amount),
    calories: r2(i.calories),
    protein:  r2(i.protein),
    carbs:    r2(i.carbs),
    fat:      r2(i.fat),
    fibre:    r2(i.fibre),
  };
}

/**
 * Add a supplement. It becomes required from `startDate` (default today) — so
 * the day it is added is the first day the user has to tick it, and every day
 * from then on counts against the streak until it is deleted.
 */
export async function createSupplement(
  userId: string,
  input: SupplementInput
): Promise<SupplementDTO> {
  const start = input.startDate ?? todayISO();
  const row = await prisma.supplement.create({
    data: {
      userId,
      name:      input.name.trim().slice(0, 80),
      unit:      input.unit,
      startDate: date(start),
      versions:  { create: { effectiveFrom: date(start), ...macroData(input) } },
    },
    include: withVersions,
  });
  return toSupplement(row);
}

export interface SupplementUpdate {
  name?:     string;
  unit?:     string;
  amount:    number;
  calories:  number;
  protein:   number;
  carbs:     number;
  fat:       number;
  fibre:     number;
  effectiveFrom?: string;
}

/**
 * Change the dose/macros from a given day forward (default today). Earlier
 * versions are left untouched, and already-ticked days keep their snapshot, so
 * going 5 g → 7 g never rewrites the 5 g history.
 */
export async function updateSupplement(
  userId: string,
  id: bigint,
  input: SupplementUpdate
): Promise<SupplementDTO> {
  const existing = await prisma.supplement.findFirst({ where: { id, userId } });
  if (!existing) throw new Error('Supplement not found');

  // A new version can never predate the supplement itself.
  const requested = input.effectiveFrom ?? todayISO();
  const startISO  = iso(existing.startDate);
  const from      = requested < startISO ? startISO : requested;

  await prisma.supplementVersion.upsert({
    where:  { supplementId_effectiveFrom: { supplementId: id, effectiveFrom: date(from) } },
    update: macroData(input),
    create: { supplementId: id, effectiveFrom: date(from), ...macroData(input) },
  });

  const name = input.name?.trim().slice(0, 80);
  const row = await prisma.supplement.update({
    where: { id },
    data:  {
      ...(name ? { name } : {}),
      ...(input.unit ? { unit: input.unit } : {}),
    },
    include: withVersions,
  });

  // Ticks already recorded under this version follow the new dose — but only up
  // to the next version's effective day, which owns everything after it.
  const next = await prisma.supplementVersion.findFirst({
    where:   { supplementId: id, effectiveFrom: { gt: date(from) } },
    orderBy: { effectiveFrom: 'asc' },
    select:  { effectiveFrom: true },
  });
  await prisma.supplementLog.updateMany({
    where: {
      supplementId: id,
      userId,
      logDate: { gte: date(from), ...(next ? { lt: next.effectiveFrom } : {}) },
    },
    data: macroData(input),
  });

  return toSupplement(row);
}

/**
 * Soft-delete: the supplement stops being required (and stops rendering) from
 * `from` — default today — but every past tick and dose version stays in the
 * database for the history views.
 */
export async function deleteSupplement(
  userId: string,
  id: bigint,
  from?: string
): Promise<void> {
  const existing = await prisma.supplement.findFirst({ where: { id, userId } });
  if (!existing) throw new Error('Supplement not found');

  const cutoff  = from ?? todayISO();
  const startISO = iso(existing.startDate);
  // Required through the day before the cutoff. Deleting on the same day it was
  // added leaves endDate < startDate → never required, which is what we want.
  const endISO  = shiftISO(cutoff < startISO ? startISO : cutoff, -1);

  await prisma.supplement.update({
    where: { id },
    data:  { endDate: date(endISO), deletedAt: new Date() },
  });
}

/** The dose/macros in force on `dateISO` (the newest version at or before it). */
async function versionFor(supplementId: bigint, dateISO: string): Promise<VersionRow> {
  const at = await prisma.supplementVersion.findFirst({
    where:   { supplementId, effectiveFrom: { lte: date(dateISO) } },
    orderBy: { effectiveFrom: 'desc' },
  });
  if (at) return at;
  // Ticking a day before the first version (shouldn't happen) → use the oldest.
  const first = await prisma.supplementVersion.findFirst({
    where:   { supplementId },
    orderBy: { effectiveFrom: 'asc' },
  });
  if (!first) throw new Error('Supplement has no dose recorded');
  return first;
}

/** Tick a supplement for a day, snapshotting the dose in force. Idempotent. */
export async function checkSupplement(
  userId: string,
  id: bigint,
  dateISO: string
): Promise<SupplementLogDTO> {
  const sup = await prisma.supplement.findFirst({ where: { id, userId } });
  if (!sup) throw new Error('Supplement not found');
  if (dateISO < iso(sup.startDate)) throw new Error('Supplement was not active on that date');
  if (sup.endDate && dateISO > iso(sup.endDate)) throw new Error('Supplement was not active on that date');

  const v = await versionFor(id, dateISO);
  const m = {
    amount:   num(v.amount),
    calories: num(v.calories),
    protein:  num(v.protein),
    carbs:    num(v.carbs),
    fat:      num(v.fat),
    fibre:    num(v.fibre),
  };
  const row = await prisma.supplementLog.upsert({
    where:  { supplementId_logDate: { supplementId: id, logDate: date(dateISO) } },
    update: m,
    create: { userId, supplementId: id, logDate: date(dateISO), ...m },
  });
  return toLog(row);
}

/** Untick a supplement for a day. Idempotent. */
export async function uncheckSupplement(userId: string, id: bigint, dateISO: string): Promise<void> {
  await prisma.supplementLog.deleteMany({
    where: { supplementId: id, userId, logDate: date(dateISO) },
  });
}
