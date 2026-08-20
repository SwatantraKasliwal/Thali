import { env } from '../config/env';
import { ping } from '../config/http';

/**
 * Idle keep-alive for hosts that sleep an inactive web service (Render's free
 * tier spins down after ~15 minutes without an INBOUND request).
 *
 * The ping goes out to the service's own PUBLIC url, not to localhost — it has
 * to arrive through the platform's router to count as traffic. Render injects
 * RENDER_EXTERNAL_URL automatically, so this needs no configuration there;
 * KEEP_ALIVE_URL overrides it on any other host.
 *
 * Limits worth knowing:
 *  • This only keeps an AWAKE service awake. Once the instance has slept (a
 *    crash, a failed deploy, a gap before this shipped) the process is gone and
 *    cannot ping itself back up — an external pinger is the only cure for that,
 *    which is what .github/workflows/keep-alive.yml is for.
 *  • Render's free plan bills instance-hours (750/month). Staying up 24/7 is
 *    ~730 of them, so this is affordable for exactly ONE free service.
 */
export function startKeepAlive(): void {
  if (!env.KEEP_ALIVE_ENABLED) {
    return;
  }

  const base = (env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL || '').trim();
  if (!base) {
    console.log('💤  Keep-alive skipped — set KEEP_ALIVE_URL to the public API url');
    return;
  }
  if (!/^https:\/\//i.test(base)) {
    console.error(`❌  KEEP_ALIVE_URL must be an https:// url — got "${base}"`);
    return;
  }

  const url      = `${base.replace(/\/+$/, '')}/health`;
  const minutes  = env.KEEP_ALIVE_MINUTES;
  const everyMs  = minutes * 60 * 1000;

  const tick = async () => {
    try {
      // Any response counts — the point is that the request reached the router.
      await ping(url, { 'User-Agent': 'Thali/keep-alive' }, 10_000);
    } catch (err) {
      // Never fatal — a missed ping just risks a cold start on the next visit.
      console.warn('[keep-alive] ping failed:', (err as Error).message);
    }
  };

  // unref() so this timer never holds the process open during a shutdown.
  setInterval(tick, everyMs).unref();
  console.log(`💓  Keep-alive pinging ${url} every ${minutes} min`);
}
