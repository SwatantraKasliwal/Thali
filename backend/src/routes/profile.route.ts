import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getProfile, upsertProfile } from '../services/profile.service';
import { Sex, Goal } from '@prisma/client';

const router = Router();

const ProfileBody = z.object({
  name:          z.string().optional(),
  sex:           z.nativeEnum(Sex),
  age:           z.number().int().min(10).max(120),
  heightCm:      z.number().positive(),
  weightKg:      z.number().positive(),
  activityLevel: z.number().min(1).max(2.5),
  goal:          z.nativeEnum(Goal),
});

// GET /api/profile
router.get('/', authenticate, async (req, res: Response) => {
  try {
    const profile = await getProfile((req as AuthRequest).userId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile  — create or update (recomputes targets)
router.put('/', authenticate, async (req, res: Response) => {
  const parsed = ProfileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const profile = await upsertProfile((req as AuthRequest).userId, parsed.data);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

export default router;
