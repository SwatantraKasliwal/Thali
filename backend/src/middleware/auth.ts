import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  userId: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // ── Development bypass ───────────────────────────────────────────────
  if (env.NODE_ENV === 'development' && env.DEV_USER_ID) {
    (req as AuthRequest).userId = env.DEV_USER_ID;
    next();
    return;
  }

  // ── JWT verification ─────────────────────────────────────────────────
  if (!env.JWT_SECRET) {
    res.status(500).json({ error: 'JWT_SECRET not configured. Set DEV_USER_ID for local development.' });
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    const userId = payload.sub ?? payload.userId;
    if (!userId || typeof userId !== 'string') throw new Error('No user id in token');
    (req as AuthRequest).userId = userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
