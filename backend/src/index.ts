import './config/env';              // validate env vars first
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { prisma } from './db/client';
import apiRouter from './routes/index';

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Boot ─────────────────────────────────────────────────────────────────────
const PORT = Number(env.PORT);

async function start() {
  try {
    await prisma.$connect();
    console.log('✅  Database connected');
    app.listen(PORT, () => console.log(`🚀  API listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌  Failed to start:', err);
    process.exit(1);
  }
}

start();
