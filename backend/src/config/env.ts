import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT:                z.string().default('5000'),
  NODE_ENV:            z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL:        z.string().min(1),
  JWT_SECRET:          z.string().optional(),
  JWT_EXPIRES_IN:      z.string().default('7d'),
  DEV_USER_ID:         z.string().optional(),
  CLIENT_URL:          z.string().default('http://localhost:3000'),
  NUTRITION_API_URL:   z.string().min(1),
  NUTRITION_API_KEY:   z.string().min(1),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
