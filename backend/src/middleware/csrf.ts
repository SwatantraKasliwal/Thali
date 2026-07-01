import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { parseCookies, COOKIE } from '../config/cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Auth endpoints that create or destroy a session are exempt from the CSRF check.
// CSRF attacks require an existing authenticated session to forge — login/register
// have no session yet, so they cannot be exploited. Exempting them also prevents
// a "stale token" lockout: if thali_token lingers in the browser after a failed
// network logout, the missing thali_csrf would otherwise block the next login.
const CSRF_EXEMPT = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/logout',
]);

/** Constant-time string compare (guards the token check against timing probes). */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * Double-submit CSRF guard. Only cookie-authenticated sessions are at risk (a
 * browser auto-attaches cookies to forged cross-site requests), so we enforce
 * the check exactly when the request carries our session cookie. Bearer-token
 * clients and pre-login requests have no session cookie → nothing to forge.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();
  if (CSRF_EXEMPT.has(req.path)) return next();

  const cookies = parseCookies(req);
  if (!cookies[COOKIE.TOKEN]) return next();   // not a cookie session → not CSRF-eligible

  const cookieToken = cookies[COOKIE.CSRF];
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    res.status(403).json({ error: 'Invalid or missing CSRF token' });
    return;
  }
  next();
}
