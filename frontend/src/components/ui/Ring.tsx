interface RingProps {
  value: number;
  max: number;
}

// Progress-based ring colour: greener as intake climbs, red once over budget.
//   < 25%  → neutral (just getting started)
//   ≥ 25%  → green
//   ≥ 50%  → yellow
//   ≥ 75%  → orange
//   > 100% → red (over budget)
const RING = {
  base:   '#94A3B8',
  green:  '#22C55E',
  yellow: '#EAB308',
  orange: '#F97316',
  red:    '#EF4444',
} as const;

function ringColor(pct: number, over: boolean): string {
  if (over)        return RING.red;
  if (pct >= 0.75) return RING.orange;
  if (pct >= 0.5)  return RING.yellow;
  if (pct >= 0.25) return RING.green;
  return RING.base;
}

export default function Ring({ value, max }: RingProps) {
  const r = 72;
  const circumference = 2 * Math.PI * r;
  const ratio = max > 0 ? value / max : 0;
  const pct = Math.min(ratio, 1);
  const over = value > max;
  const color = ringColor(ratio, over);

  return (
    <div className="relative w-44 h-44">
      <svg viewBox="0 0 180 180" className="w-44 h-44 -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" style={{ stroke: 'var(--surface-2)' }} strokeWidth="14" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-ink tabular-nums">{value}</span>
        <span className="text-xs text-ink-muted">of {max} kcal</span>
        <span className="mt-1 text-xs font-semibold" style={{ color }}>
          {over ? `${value - max} over` : `${max - value} left`}
        </span>
      </div>
    </div>
  );
}
