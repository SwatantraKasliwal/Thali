'use client';

import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Cell, LabelList,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { sumDay } from '@/lib/nutrition';
import { toISO, addDays, parseISO, startOfWeek, weeksOfMonth } from '@/lib/dates';
import { COLORS, AXIS_TICK, TOOLTIP_STYLE } from '@/lib/constants';
import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import Dropdown from '@/components/ui/Dropdown';
import ConsistencyCard from './ConsistencyCard';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeekView() {
  const { logs, targets, supplementLogs } = useApp();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Every Mon→Sun week of the current month; weeks that straddle a month
  // boundary carry the tail of the previous month with them.
  const weeks = useMemo(() => weeksOfMonth(new Date()), []);
  const thisWeekISO = toISO(startOfWeek(new Date()));
  const [weekStart, setWeekStart] = useState(
    () => weeks.find(w => w.startISO === thisWeekISO)?.startISO ?? weeks[0].startISO
  );
  const week = weeks.find(w => w.startISO === weekStart) ?? weeks[0];

  // The selected week, Monday → Sunday.
  const data = useMemo(() => {
    const monday = parseISO(week.startISO);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i);
      return {
        name: DAY_NAMES[d.getDay()],
        date: toISO(d),
        dayLabel: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
        ...sumDay(logs, toISO(d), supplementLogs),
      };
    });
  }, [logs, supplementLogs, week.startISO]);

  // Toggle a bar: select it, or deselect if it's already selected.
  const toggle = (i: number) => setSelectedIdx(cur => (cur === i ? null : i));
  const sel = selectedIdx != null ? data[selectedIdx] : null;

  const pickWeek = (iso: string) => { setWeekStart(iso); setSelectedIdx(null); };

  const logged = data.filter(d => d.calories > 0);
  const avgCal = logged.length
    ? Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length)
    : 0;
  const avgPro = logged.length
    ? Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length)
    : 0;
  const onTarget = logged.filter(d => Math.abs(d.calories - targets.cal) <= targets.cal * 0.15).length;

  // Headroom above the tallest bar so the printed value never clips.
  const peak = Math.max(targets.cal, ...data.map(d => d.calories));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">
          {week.startISO === thisWeekISO ? 'This week' : week.label}
        </h2>
        <Dropdown
          ariaLabel="Select week"
          value={week.startISO}
          onChange={pickWeek}
          options={weeks.map(w => ({ value: w.startISO, label: w.label, hint: w.range }))}
        />
      </div>

      <Card glass className="p-4">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-ink-muted">Daily calories vs target</span>
          <span className="text-[11px] text-ink-muted tabular-nums">{week.range}</span>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 6, left: -18, bottom: 0 }}>
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} domain={[0, Math.ceil(peak * 1.12)]} />
              <Tooltip
                cursor={{ fill: 'var(--chart-cursor)' }}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: 'var(--ink)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--ink)' }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.dayLabel ?? ''}
                formatter={(v: number) => [`${Math.round(v)} kcal`, 'Calories']}
              />
              <ReferenceLine y={targets.cal} stroke={COLORS.cal} strokeDasharray="4 4" />
              <Bar
                dataKey="calories"
                radius={[6, 6, 0, 0]}
                onClick={(_: unknown, index: number) => toggle(index)}
                style={{ cursor: 'pointer' }}
              >
                {data.map((d, i) => {
                  const dim = selectedIdx != null && selectedIdx !== i;
                  return (
                    <Cell
                      key={i}
                      fill={d.calories > targets.cal ? COLORS.over : COLORS.cal}
                      fillOpacity={d.calories ? (dim ? 0.3 : 0.9) : 0.2}
                    />
                  );
                })}
                {/* The number every bar is actually about — printed, not hovered for. */}
                <LabelList
                  dataKey="calories"
                  position="top"
                  offset={6}
                  className="fill-ink"
                  style={{ fontSize: 10, fontWeight: 600 }}
                  formatter={(v: number) => (v > 0 ? Math.round(v) : '')}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Avg calories" value={avgCal} sub={`target ${targets.cal}`} />
        <StatCard label="Avg protein" value={`${avgPro}g`} sub={`target ${targets.protein}g`} color={COLORS.protein} />
        <StatCard label="On target" value={`${onTarget}/${logged.length}`} sub="days" color={COLORS.cal} />
      </div>

      <ConsistencyCard />

      <Card glass className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-ink-muted">
            {sel ? `Macro breakdown — ${sel.name}` : 'Macro breakdown (avg)'}
          </div>
          {sel ? (
            <button onClick={() => setSelectedIdx(null)} className="text-[11px] font-medium text-primary hover:text-primary-hover">
              Show average
            </button>
          ) : (
            <span className="text-[11px] text-ink-muted">tap a bar for a day</span>
          )}
        </div>
        <div className="space-y-3">
          {sel || logged.length > 0 ? (
            <>
              {sel && (
                <div className="text-xs text-ink-muted tabular-nums -mt-1">
                  {sel.calories > 0 ? `${Math.round(sel.calories)} kcal logged` : 'No food logged this day'}
                </div>
              )}
              {[
                { label: 'Protein', key: 'protein' as const, color: COLORS.protein, target: targets.protein },
                { label: 'Carbs',   key: 'carbs'   as const, color: COLORS.carbs,   target: targets.carbs },
                { label: 'Fat',     key: 'fat'      as const, color: COLORS.fat,     target: targets.fat },
                { label: 'Fibre',   key: 'fibre'   as const, color: COLORS.fibre,   target: targets.fibre },
              ].map(({ label, key, color, target }) => {
                const value = sel
                  ? Math.round(sel[key])
                  : Math.round(logged.reduce((s, d) => s + d[key], 0) / logged.length);
                const pct = Math.min(value / target, 1) * 100;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-ink-muted">{label}</span>
                      <span className="text-ink-muted tabular-nums">{value}g / {target}g</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-xs text-ink-muted">No data this week</p>
          )}
        </div>
      </Card>
    </div>
  );
}
