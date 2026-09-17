import Card from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export default function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <Card className="min-w-0 p-3 sm:p-4">
      <div
        className="text-xl sm:text-2xl font-bold tabular-nums text-ink"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="text-xs font-medium text-ink-muted mt-0.5 leading-tight">{label}</div>
      {sub && <div className="text-xs text-ink-muted mt-0.5">{sub}</div>}
    </Card>
  );
}
