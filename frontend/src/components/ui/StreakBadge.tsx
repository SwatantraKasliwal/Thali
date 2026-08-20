'use client';

import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { buildConsistency, currentStreak, flameTier } from '@/lib/consistency';

// Warmer hue as the streak climbs through each 7-day tier. RGB triplets feed the rgba() glow.
const TIER_RGB = ['', '224,161,27', '249,115,22', '239,68,68', '220,38,38'];

export default function StreakBadge({ className = '' }: { className?: string }) {
  const { logs, fasts, supplements, supplementLogs } = useApp();

  const streak = useMemo(
    () => currentStreak(buildConsistency(logs, fasts, supplements, supplementLogs)),
    [logs, fasts, supplements, supplementLogs]
  );

  // streak 0 → no badge at all (per spec)
  if (streak < 1) return null;

  const rgb = TIER_RGB[flameTier(streak)];   // tier 1‥4
  const i   = Math.min(streak / 30, 1);      // glow ramps to full at 30 days

  return (
    <div
      title={
        `${streak}-day streak — log Breakfast, Lunch & Dinner (or fast) every day to keep it alive` +
        (supplements.some(s => !s.deleted) ? ', and tick every supplement you\u2019re due' : '')
      }
      aria-label={`${streak} day streak`}
      className={`relative inline-flex items-center gap-1.5 h-9 pl-2 pr-2.5 rounded-xl border overflow-hidden backdrop-blur-md ${className}`}
      style={{
        background: `linear-gradient(145deg, rgba(${rgb},${0.28 + 0.24 * i}), rgba(${rgb},${0.12 + 0.14 * i}))`,
        borderColor: `rgba(${rgb},${0.55 + 0.35 * i})`,
        boxShadow: [
          `0 0 ${8 + 16 * i}px ${1 + 3 * i}px rgba(${rgb},${0.3 + 0.4 * i})`,
          `inset 0 1px 0 rgba(255,255,255,0.4)`,
          `inset 0 -8px 12px -8px rgba(${rgb},0.7)`,
        ].join(', '),
      }}
    >
      {/* glass sheen */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1/2 rounded-t-xl pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0))' }}
      />
      <Flame
        size={16}
        strokeWidth={2.5}
        className="relative shrink-0"
        style={{ color: `rgb(${rgb})`, fill: `rgba(${rgb},0.35)` }}
      />
      <span
        className="relative text-sm font-extrabold tabular-nums leading-none"
        style={{ color: `rgb(${rgb})`, textShadow: '0 1px 1px rgba(0,0,0,0.15)' }}
      >
        {streak}
      </span>
    </div>
  );
}
