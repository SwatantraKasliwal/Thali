import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { searchFoods } from '../services/nutrition.service';

const router = Router();

// GET /api/foods/search?q=chicken
router.get('/search', authenticate, async (req, res: Response) => {
  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 2) return res.status(400).json({ error: 'q must be at least 2 characters' });

  try {
    const foods = await searchFoods(q);
    res.json(foods);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Food search failed';
    res.status(502).json({ error: msg });
  }
});

export default router;
