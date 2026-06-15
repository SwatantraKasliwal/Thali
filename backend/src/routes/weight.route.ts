import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upsertWeight, getWeightLogs } from '../services/weight.service';

const router = Router();

const WeightBody = z.object({
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().positive(),
});

// GET /api/weight?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', authenticate, async (req, res: Response) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  try {
    const logs = await getWeightLogs((req as AuthRequest).userId, from, to);
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to fetch weight logs' });
  }
});

// POST /api/weight  — upsert (one entry per user per day)
router.post('/', authenticate, async (req, res: Response) => {
  const parsed = WeightBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const entry = await upsertWeight(
      (req as AuthRequest).userId,
      parsed.data.date,
      parsed.data.weightKg
    );
    res.status(201).json(entry);
  } catch {
    res.status(500).json({ error: 'Failed to save weight' });
  }
});

export default router;
