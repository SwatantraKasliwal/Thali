import { prisma } from '../db/client';

export interface WeightEntry {
  id: number;
  date: string;
  weightKg: number;
}

function toEntry(row: { id: bigint; logDate: Date; weightKg: unknown }): WeightEntry {
  return {
    id:       Number(row.id),
    date:     row.logDate.toISOString().slice(0, 10),
    weightKg: Number(row.weightKg),
  };
}

// ─── upsert_weight ────────────────────────────────────────────────────────

export async function upsertWeight(
  userId: string,
  date: string,
  weightKg: number
): Promise<WeightEntry> {
  const logDate = new Date(date);
  const row = await prisma.weightLog.upsert({
    where:  { userId_logDate: { userId, logDate } },
    create: { userId, logDate, weightKg },
    update: { weightKg },
  });
  return toEntry(row);
}

// ─── get_weight_logs ──────────────────────────────────────────────────────

export async function getWeightLogs(
  userId: string,
  from?: string,
  to?: string
): Promise<WeightEntry[]> {
  const rows = await prisma.weightLog.findMany({
    where: {
      userId,
      ...(from || to
        ? {
            logDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to   ? { lte: new Date(to)   } : {}),
            },
          }
        : {}),
    },
    orderBy: { logDate: 'asc' },
  });
  return rows.map(toEntry);
}
