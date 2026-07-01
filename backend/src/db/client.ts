import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  // prevent multiple instances in dev hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Prisma 7 connects through a driver adapter. The long-lived backend uses the
// standard pg pool over the (pooled) DATABASE_URL.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  global.__prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

// Make BigInt JSON-serializable (Prisma returns BigInt for autoincrement PKs)
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};
