import Card from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export default function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-bold tabular-nums" style={{ color: color ?? '#334155' }}>
        {value}
      </div>
      <div className="text-xs font-medium text-slate-600 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </Card>
  );
}
