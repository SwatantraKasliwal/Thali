import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 moved connection URLs out of schema.prisma. This config supplies the
// database URL to CLI commands (migrate / db push / studio). The application
// runtime connects separately via the pg driver adapter in src/db/client.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Direct (non-pooled) URL for schema operations; fall back to DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
