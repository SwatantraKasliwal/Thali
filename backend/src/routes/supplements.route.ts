import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  getSupplements,
  getSupplementLogs,
  createSupplement,
  updateSupplement,
  deleteSupplement,
  checkSupplement,
  uncheckSupplement,
} from '../services/supplement.service';

const router = Router();

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const UNITS = ['g', 'mg', 'ml', 'capsule', 'tablet', 'scoop'] as const;

const Macros = {
  amount:   z.number().positive().max(100000),
  calories: z.number().nonnegative().max(99999),
  protein:  z.number().nonnegative().max(9999),
  carbs:    z.number().nonnegative().max(9999),
  fat:      z.number().nonnegative().max(9999),
  fibre:    z.number().nonnegative().max(9999),
};

const CreateBody = z.object({
  name: z.string().trim().min(1).max(80),
  unit: z.enum(UNITS).default('g'),
  startDate: ISO_DATE.optional(),
  ...Macros,
});

const UpdateBody = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  unit: z.enum(UNITS).optional(),
  effectiveFrom: ISO_DATE.optional(),
  ...Macros,
});

const DateBody = z.object({ date: ISO_DATE });

/** Path-param guard — BigInt() throws on anything non-numeric. */
function parseId(raw: string): bigint | null {
  return /^\d+$/.test(raw) ? BigInt(raw) : null;
}

function notFound(err: unknown): boolean {
  return err instanceof Error && err.message === 'Supplement not found';
}

// GET /api/supplements  → definitions (incl. deleted, for history) + every tick
router.get('/', authenticate, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  try {
    const [supplements, logs] = await Promise.all([
      getSupplements(userId),
      getSupplementLogs(userId),
    ]);
    res.json({ supplements, logs });
  } catch (err) {
    console.error('[supplements] fetch failed', err);
    res.status(500).json({ error: 'Failed to fetch supplements' });
  }
});

// POST /api/supplements  — add one; required daily from startDate (default today)
router.post('/', authenticate, async (req, res: Response) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const sup = await createSupplement((req as AuthRequest).userId, parsed.data);
    res.status(201).json(sup);
  } catch (err) {
    console.error('[supplements] create failed', err);
    res.status(500).json({ error: 'Failed to save supplement' });
  }
});

// PATCH /api/supplements/:id  — new dose from `effectiveFrom` (default today);
// earlier days keep the amounts they were logged with.
router.patch('/:id', authenticate, async (req, res: Response) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ error: 'Invalid supplement id' });

  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const sup = await updateSupplement((req as AuthRequest).userId, id, parsed.data);
    res.json(sup);
  } catch (err) {
    if (notFound(err)) return res.status(404).json({ error: 'Supplement not found' });
    console.error('[supplements] update failed', err);
    res.status(500).json({ error: 'Failed to update supplement' });
  }
});

// DELETE /api/supplements/:id  — soft delete; history is kept
router.delete('/:id', authenticate, async (req, res: Response) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ error: 'Invalid supplement id' });

  const from = typeof req.body?.date === 'string' && ISO_DATE.safeParse(req.body.date).success
    ? (req.body.date as string)
    : undefined;

  try {
    await deleteSupplement((req as AuthRequest).userId, id, from);
    res.status(204).send();
  } catch (err) {
    if (notFound(err)) return res.status(404).json({ error: 'Supplement not found' });
    console.error('[supplements] delete failed', err);
    res.status(500).json({ error: 'Failed to delete supplement' });
  }
});

// POST /api/supplements/:id/check  — tick a day (snapshots the dose in force)
router.post('/:id/check', authenticate, async (req, res: Response) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ error: 'Invalid supplement id' });

  const parsed = DateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const log = await checkSupplement((req as AuthRequest).userId, id, parsed.data.date);
    res.status(201).json(log);
  } catch (err) {
    if (notFound(err)) return res.status(404).json({ error: 'Supplement not found' });
    if (err instanceof Error && err.message.startsWith('Supplement was not active')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[supplements] check failed', err);
    res.status(500).json({ error: 'Failed to save supplement check' });
  }
});

// DELETE /api/supplements/:id/check  — untick a day
router.delete('/:id/check', authenticate, async (req, res: Response) => {
  const id = parseId(String(req.params.id));
  if (!id) return res.status(400).json({ error: 'Invalid supplement id' });

  const parsed = DateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    await uncheckSupplement((req as AuthRequest).userId, id, parsed.data.date);
    res.status(204).send();
  } catch (err) {
    console.error('[supplements] uncheck failed', err);
    res.status(500).json({ error: 'Failed to remove supplement check' });
  }
});

export default router;
