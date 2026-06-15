'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
  PieChart, Pie, Cell,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { sumDay } from '@/lib/nutrition';
import { toISO, addDays } from '@/lib/dates';
import { COLORS } from '@/lib/constants';
import Card from '@/components/ui/Card';

export default function MonthView() {
  const { logs, targets } = useApp();

  const days = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = addDays(base, i - 29);
      return { iso: toISO(d), label: String(d.getDate()), ...sumDay(logs, toISO(d)) };
    });
  }, [logs]);

  const logged = days.filter(d => d.calories > 0);
  const avg = (key: keyof typeof days[0]) =>
    logged.length ? logged.reduce((s, d) => s + (d[key] as number), 0) / logged.length : 0;

  const macroData = [
    { name: 'Protein', value: Math.round(avg('protein') * 4), color: COLORS.protein },
    { name: 'Carbs',   value: Math.round(avg('carbs') * 4),   color: COLORS.carbs },
    { name: 'Fat',     value: Math.round(avg('fat') * 9),     color: COLORS.fat },
  ];

  const cellColor = (cal: number) => {
    if (!cal) return '#f1f5f9';
    const r = cal / targets.cal;
    if (r > 1.1) return COLORS.over;
    if (r >= 0.6) return COLORS.cal;
    return '#a7f3d0';
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Last 30 days</h2>

      <Card className="p-4">
        <div className="text-xs font-medium text-slate-500 mb-3">Calorie trend</div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <ReferenceLine y={targets.cal} stroke={COLORS.cal} strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="calories"
                stroke={COLORS.cal}
                fill={COLORS.cal}
                fillOpacity={0.12}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500 mb-1">Avg macro split</div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroData}
                  dataKey="value"
                  innerRadius={28}
                  outerRadius={48}
                  paddingAngle={2}
                >
                  {macroData.map((m, i) => <Cell key={i} fill={m.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-3 mt-1">
            {macroData.map(m => (
              <span key={m.name} className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                {m.name}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500 mb-3">Logging streak</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(d => (
              <div
                key={d.iso}
                className="aspect-square rounded-sm"
                style={{ backgroundColor: cellColor(d.calories) }}
                title={`${d.label}: ${d.calories} kcal`}
              />
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-400">{logged.length}/30 days logged</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-sm bg-slate-200 inline-block" /> none
            <span className="w-2 h-2 rounded-sm bg-emerald-200 inline-block" /> low
            <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> on target
            <span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> over
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-xs font-medium text-slate-500 mb-2">Monthly averages</div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Calories', value: Math.round(avg('calories')), color: COLORS.cal, unit: 'kcal' },
            { label: 'Protein',  value: Math.round(avg('protein')),  color: COLORS.protein, unit: 'g' },
            { label: 'Fibre',    value: Math.round(avg('fibre')),    color: COLORS.fibre, unit: 'g' },
          ].map(({ label, value, color, unit }) => (
            <div key={label}>
              <div className="text-xl font-bold tabular-nums" style={{ color }}>{value}<span className="text-xs font-normal ml-0.5">{unit}</span></div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
