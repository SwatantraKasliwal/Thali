'use client';

import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { buildConsistency, currentStreak, flameTier } from '@/lib/consistency';

// The flame runs hotter as the streak grows: amber → orange → red → crimson →
// blue (the hottest part of a real flame). Index matches flameTier(); RGB
// triplets feed the rgba() glow.
const TIER_RGB = ['', '240,180,41', '249,115,22', '239,68,68', '220,38,38', '56,189,248'];

export default function StreakBadge({ className = '' }: { className?: string }) {
  const { logs, fasts, supplements, supplementLogs } = useApp();

  const streak = useMemo(
    () => currentStreak(buildConsistency(logs, fasts, supplements, supplementLogs)),
    [logs, fasts, supplements, supplementLogs]
  );

  // streak 0 → no badge at all (per spec)
  if (streak < 1) return null;

  const rgb = TIER_RGB[flameTier(streak)];   // tier 1‥5
  const i   = Math.min(streak / 30, 1);      // glow ramps to full at 30 days

  return (
    <div
      title={
        `${streak}-day streak — log Breakfast, Lunch & Dinner (or fast) every day to keep it alive` +
        (supplements.some(s => !s.deleted) ? ', and tick every supplement you’re due' : '')
      }
      aria-label={`${streak} day streak`}
      // Chassis stays quiet — only the flame burns.
      className={`inline-flex items-center gap-1.5 h-9 pl-2 pr-2.5 rounded-xl border border-line bg-surface-2 ${className}`}
    >
      <Flame
        size={16}
        strokeWidth={2.5}
        className="shrink-0"
        style={{
          color: `rgb(${rgb})`,
          fill: `rgba(${rgb},${0.25 + 0.35 * i})`,
          filter: `drop-shadow(0 0 ${3 + 5 * i}px rgba(${rgb},${0.55 + 0.4 * i}))`
                + ` drop-shadow(0 0 ${8 + 12 * i}px rgba(${rgb},${0.3 + 0.35 * i}))`,
        }}
      />
      <span className="text-sm font-bold tabular-nums leading-none text-ink">{streak}</span>
    </div>
  );
}
