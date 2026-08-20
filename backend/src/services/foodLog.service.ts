import { Meal } from '@prisma/client';
import { prisma } from '../db/client';

function r2(n: number) { return Math.round(n * 100) / 100; }

// ─── Serialized shape sent to the frontend ────────────────────────────────

export interface LogEntry {
  id: number;
  date: string;         // YYYY-MM-DD
  meal: Meal;
  foodId: number;
  name: string;
  qty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

function toEntry(row: {
  id: bigint;
  logDate: Date;
  meal: Meal;
  foodId: bigint;
  quantityG: unknown;
  calories: unknown;
  protein: unknown;
  carbs: unknown;
  fat: unknown;
  fibre: unknown;
  food: { name: string };
}): LogEntry {
  return {
    id:       Number(row.id),
    date:     row.logDate.toISOString().slice(0, 10),
    meal:     row.meal,
    foodId:   Number(row.foodId),
    name:     row.food.name,
    qty:      Number(row.quantityG),
    calories: Number(row.calories),
    protein:  Number(row.protein),
    carbs:    Number(row.carbs),
    fat:      Number(row.fat),
    fibre:    Number(row.fibre),
  };
}

// ─── add_food_log ─────────────────────────────────────────────────────────

// quantity_g is Decimal(7,2) — cap merged totals so a runaway sum can't
// overflow the column.
const MAX_QTY = 99999.99;

/** Per-100g macros scaled to `quantityG`. */
function macrosFor(food: {
  caloriesPer100g: unknown; protein: unknown; carbs: unknown; fat: unknown; fibre: unknown;
}, quantityG: number) {
  const k = quantityG / 100;
  return {
    calories: r2(Number(food.caloriesPer100g) * k),
    protein:  r2(Number(food.protein) * k),
    carbs:    r2(Number(food.carbs) * k),
    fat:      r2(Number(food.fat) * k),
    fibre:    r2(Number(food.fibre) * k),
  };
}

/**
 * Log a dish.
 *
 * The same food logged twice into the same meal on the same day is one thing
 * eaten in two helpings, so the quantities merge into the existing row (100 g
 * then 200 g of white rice at breakfast → a single 300 g entry) and the macros
 * are recomputed from the combined weight. A different meal — or a different
 * day — stays its own entry, since that's a genuinely separate serving.
 */
export async function addFoodLog(
  userId: string,
  foodId: bigint,
  logDate: string,
  meal: Meal,
  quantityG: number
): Promise<LogEntry> {
  const food = await prisma.food.findUniqueOrThrow({ where: { id: foodId } });
  const date = new Date(logDate);

  const existing = await prisma.foodLog.findFirst({
    where:   { userId, foodId, logDate: date, meal },
    orderBy: { createdAt: 'asc' },
  });

  if (existing) {
    const merged = Math.min(r2(Number(existing.quantityG) + quantityG), MAX_QTY);
    const row = await prisma.foodLog.update({
      where: { id: existing.id },
      data:  { quantityG: merged, ...macrosFor(food, merged) },
      include: { food: { select: { name: true } } },
    });
    return toEntry(row);
  }

  const row = await prisma.foodLog.create({
    data: {
      userId,
      foodId,
      logDate:   date,
      meal,
      quantityG: r2(quantityG),
      ...macrosFor(food, quantityG),
    },
    include: { food: { select: { name: true } } },
  });

  return toEntry(row);
}

// ─── update_food_log (edit quantity → recompute macros) ─────────────────────

export async function updateFoodLog(
  logId: bigint,
  userId: string,
  quantityG: number
): Promise<LogEntry> {
  // Ownership-scoped fetch; pulls the food so we can recompute from per-100g.
  const existing = await prisma.foodLog.findFirst({
    where: { id: logId, userId },
    include: { food: true },
  });
  if (!existing) throw new Error('Log not found');

  const qty = Math.min(r2(quantityG), MAX_QTY);

  const row = await prisma.foodLog.update({
    where: { id: logId },
    data: { quantityG: qty, ...macrosFor(existing.food, qty) },
    include: { food: { select: { name: true } } },
  });

  return toEntry(row);
}

// ─── delete_food_log ──────────────────────────────────────────────────────

export async function deleteFoodLog(logId: bigint, userId: string) {
  await prisma.foodLog.deleteMany({ where: { id: logId, userId } });
}

// ─── get_logs_for_day ─────────────────────────────────────────────────────

export async function getLogsForDay(userId: string, date: string): Promise<LogEntry[]> {
  const rows = await prisma.foodLog.findMany({
    where:   { userId, logDate: new Date(date) },
    include: { food: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toEntry);
}

// ─── get_logs (all, for frontend initial load) ────────────────────────────

export async function getAllLogs(userId: string): Promise<LogEntry[]> {
  const rows = await prisma.foodLog.findMany({
    where:   { userId },
    include: { food: { select: { name: true } } },
    orderBy: { logDate: 'desc' },
  });
  return rows.map(toEntry);
}

// ─── get_daily_totals (weekly / monthly dashboards) ───────────────────────

export interface DayTotal {
  date: string;
  calories: number;
  protein:  number;
  carbs:    number;
  fat:      number;
  fibre:    number;
}

export async function getDailyTotals(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DayTotal[]> {
  const rows = await prisma.$queryRaw<
    { log_date: Date; calories: number; protein: number; carbs: number; fat: number; fibre: number }[]
  >`
    SELECT
      log_date,
      ROUND(SUM(calories)::numeric, 2) AS calories,
      ROUND(SUM(protein)::numeric,  2) AS protein,
      ROUND(SUM(carbs)::numeric,    2) AS carbs,
      ROUND(SUM(fat)::numeric,      2) AS fat,
      ROUND(SUM(fibre)::numeric,    2) AS fibre
    FROM food_logs
    WHERE user_id = ${userId}::uuid
      AND log_date BETWEEN ${new Date(startDate)} AND ${new Date(endDate)}
    GROUP BY log_date
    ORDER BY log_date ASC
  `;

  return rows.map(r => ({
    date:     r.log_date.toISOString().slice(0, 10),
    calories: Number(r.calories),
    protein:  Number(r.protein),
    carbs:    Number(r.carbs),
    fat:      Number(r.fat),
    fibre:    Number(r.fibre),
  }));
}
