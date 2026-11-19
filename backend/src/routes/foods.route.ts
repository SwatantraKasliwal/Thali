import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { searchFoods, createCustomFood } from '../services/nutrition.service';

const router = Router();

// GET /api/foods/search?q=chicken[&fast=1]
//   fast=1 → local DB only (answers in a few hundred ms); omit for DB + live APIs.
//   X-Search-Corrected carries the spelling actually searched when the query
//   was auto-corrected ("chiken" → "chicken"); the body stays a plain array.
router.get('/search', authenticate, async (req, res: Response) => {
  const raw = typeof req.query.q === 'string' ? req.query.q : '';
  const q = raw.trim().slice(0, 80);
  if (q.length < 2) return res.status(400).json({ error: 'q must be at least 2 characters' });
  const fast = req.query.fast === '1';

  try {
    const { results, corrected } = await searchFoods(q, { fast });
    if (corrected) res.set('X-Search-Corrected', encodeURIComponent(corrected));
    res.set('Cache-Control', 'no-store');
    res.json(results);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Food search failed';
    res.status(502).json({ error: msg });
  }
});

// POST /api/foods  — create a custom "Others" dish (all macro fields required, per 100g)
const CustomFoodBody = z.object({
  name:            z.string().trim().min(1).max(120),
  caloriesPer100g: z.number().nonnegative(),
  protein:         z.number().nonnegative(),
  carbs:           z.number().nonnegative(),
  fat:             z.number().nonnegative(),
  fibre:           z.number().nonnegative(),
});

router.post('/', authenticate, async (req, res: Response) => {
  const parsed = CustomFoodBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const food = await createCustomFood(parsed.data);
    res.status(201).json(food);
  } catch (err: unknown) {
    console.error('[foods] custom create failed', err);
    res.status(500).json({ error: 'Failed to save custom food' });
  }
});

export default router;
