'use client';

import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { buildCoverage, currentStreak, flameTier } from '@/lib/consistency';

// Warmer hue as the streak climbs through each 7-day tier. RGB triplets feed the rgba() glow.
const TIER_RGB = ['', '224,161,27', '249,115,22', '239,68,68', '220,38,38'];

export default function StreakBadge({ className = '' }: { className?: string }) {
  const { logs, fasts } = useApp();

  const streak = useMemo(
    () => currentStreak(buildCoverage(logs, fasts)),
    [logs, fasts]
  );

  // streak 0 → no badge at all (per spec)
  if (streak < 1) return null;

  const rgb = TIER_RGB[flameTier(streak)];   // tier 1‥4
  const i   = Math.min(streak / 30, 1);      // glow ramps to full at 30 days

  return (
    <div
      title={`${streak}-day streak — log Breakfast, Lunch & Dinner (or fast) every day to keep it alive`}
      aria-label={`${streak} day streak`}
      className={`relative grid place-items-center min-w-8 h-8 px-1.5 rounded-xl border overflow-hidden backdrop-blur-md ${className}`}
      style={{
        background: `linear-gradient(145deg, rgba(${rgb},${0.16 + 0.22 * i}), rgba(${rgb},${0.04 + 0.1 * i}))`,
        borderColor: `rgba(${rgb},${0.35 + 0.35 * i})`,
        boxShadow: [
          `0 0 ${6 + 16 * i}px ${1 + 3 * i}px rgba(${rgb},${0.22 + 0.4 * i})`,
          `inset 0 1px 0 rgba(255,255,255,0.35)`,
          `inset 0 -8px 12px -8px rgba(${rgb},0.65)`,
        ].join(', '),
      }}
    >
      {/* glass sheen */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0))' }}
      />
      <span className="relative text-xs font-bold tabular-nums" style={{ color: `rgb(${rgb})` }}>
        {streak}
      </span>
    </div>
  );
}
