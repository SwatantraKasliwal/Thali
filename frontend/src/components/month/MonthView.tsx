'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
  PieChart, Pie, Cell,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { addDays, parseISO, startOfWeek, toISO } from '@/lib/dates';
import { COLORS, AXIS_TICK, TOOLTIP_STYLE } from '@/lib/constants';
import { MonthRange } from '@/types';
import Card from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';

const WEIGHT_COLOR = 'var(--primary)';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;
// Past this many days a point per day gets too dense for a phone-width chart,
// so the trend folds into weekly averages. "Last 6 months" always stays daily.
const WEEKLY_AFTER_DAYS = 186;

interface DayAgg { calories: number; protein: number; carbs: number; fat: number; fibre: number }
const emptyAgg = (): DayAgg => ({ calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });

export default function MonthView() {
  const { logs, weights, targets, supplementLogs } = useApp();
  const [range, setRange] = useState<MonthRange>('month');

  // Daily totals from all logs — ticked supplements count toward the day too.
  const dayMap = useMemo(() => {
    const m = new Map<string, DayAgg>();
    const add = (date: string, x: DayAgg) => {
      const d = m.get(date) ?? emptyAgg();
      d.calories += x.calories; d.protein += x.protein; d.carbs += x.carbs;
      d.fat += x.fat; d.fibre += x.fibre;
      m.set(date, d);
    };
    for (const l of logs) add(l.date, l);
    for (const s of supplementLogs) add(s.date, s);
    return m;
  }, [logs, supplementLogs]);

  const now = new Date(); now.setHours(0, 0, 0, 0);

  // A single-calendar-month view: the current month (up to today) or last month.
  const singleMonth = range === 'month' || range === 'lastMonth';

  // Range start date
  const start = useMemo(() => {
    if (range === 'month')     return new Date(now.getFullYear(), now.getMonth(), 1);
    if (range === 'lastMonth') return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (range === '3m')        return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (range === '6m')        return new Date(now.getFullYear(), now.getMonth() - 5, 1);
    if (range === 'year')      return new Date(now.getFullYear(), 0, 1);
    const all = [...logs.map(l => l.date), ...weights.map(w => w.date)].sort();
    return all.length ? parseISO(all[0]) : new Date(now.getFullYear(), now.getMonth(), 1);
  }, [range, logs, weights]); // eslint-disable-line react-hooks/exhaustive-deps

  // Range end: last month ends on the last day of the previous month; every
  // other range runs up to today.
  const end = useMemo(
    () => (range === 'lastMonth' ? new Date(now.getFullYear(), now.getMonth(), 0) : now),
    [range] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const endISO = toISO(end);

  const inRange = (iso: string) => iso >= toISO(start) && iso <= endISO;

  const headerLabel =
    range === 'month'     ? now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) :
    range === 'lastMonth' ? start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) :
    range === 'year'      ? String(now.getFullYear()) :
    range === '3m'        ? 'Last 3 months' :
    range === '6m'        ? 'Last 6 months' : 'All time';

  // ── Trend data ──────────────────────────────────────────────────────────
  // Every range plots real days on a date axis, so each logged day shows up.
  // (Multi-month ranges used to average whole months into 3–10 points, which
  // flattened months of logging into one near-straight line.) Long spans fold
  // into Mon→Sun weekly averages. The line starts on the first day anything was
  // logged — earlier dates stay blank rather than 0 — and a missed day after
  // that reads as 0.
  const weekly = (end.getTime() - start.getTime()) / DAY_MS + 1 > WEEKLY_AFTER_DAYS;

  const trend = useMemo(() => {
    let first: string | undefined;
    for (const iso of dayMap.keys()) if (!first || iso < first) first = iso;
    if (!first) return [];

    const days: { t: number; calories: number }[] = [];
    const from = new Date(Math.max(start.getTime(), parseISO(first).getTime()));
    for (let d = from; d <= end; d = addDays(d, 1)) {
      days.push({ t: d.getTime(), calories: Math.round(dayMap.get(toISO(d))?.calories ?? 0) });
    }
    if (!weekly) return days;

    // Average only the days actually logged; each week sits on its first day in range.
    const weeks = new Map<number, { t: number; sum: number; n: number }>();
    for (const d of days) {
      const key = startOfWeek(new Date(d.t)).getTime();
      const w = weeks.get(key) ?? { t: d.t, sum: 0, n: 0 };
      if (d.calories > 0) { w.sum += d.calories; w.n++; }
      weeks.set(key, w);
    }
    return [...weeks.values()].map(w => ({ t: w.t, calories: w.n ? Math.round(w.sum / w.n) : 0 }));
  }, [dayMap, start, end, weekly]);

  // X ticks: every 5th day inside a single month; otherwise the 1st of each
  // month, plus the start date itself when it falls mid-month ("Till now").
  const ticks = useMemo(() => {
    const out: number[] = [];
    if (singleMonth) {
      for (let d = start; d <= end; d = addDays(d, 5)) out.push(d.getTime());
      return out;
    }
    if (start.getDate() !== 1) out.push(start.getTime());
    let d = new Date(start.getFullYear(), start.getMonth() + (start.getDate() === 1 ? 0 : 1), 1);
    for (; d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push(d.getTime());
    return out;
  }, [singleMonth, start, end]);

  const multiYear = start.getFullYear() !== end.getFullYear();
  const tickLabel = (t: number) => {
    const d = new Date(t);
    if (singleMonth) return String(d.getDate());
    const yy = multiYear ? ` '${String(d.getFullYear()).slice(2)}` : '';
    return `${d.getDate() === 1 ? '' : `${d.getDate()} `}${MONTHS[d.getMonth()]}${yy}`;
  };
  const tipLabel = (t: number) => {
    const day = new Date(t).toLocaleDateString(undefined, {
      ...(weekly ? {} : { weekday: 'short' as const }),
      day: 'numeric', month: 'short',
      ...(weekly || multiYear ? { year: 'numeric' as const } : {}),
    });
    return weekly ? `Week of ${day}` : day;
  };

  // ── Averages over range ───────────────────────────────────────────────────
  const avg = useMemo(() => {
    const days = [...dayMap.entries()].filter(([iso, a]) => inRange(iso) && a.calories > 0).map(([, a]) => a);
    const mean = (sel: (a: DayAgg) => number) =>
      days.length ? Math.round(days.reduce((s, a) => s + sel(a), 0) / days.length) : 0;
    return {
      logged:   days.length,
      calories: mean(a => a.calories),
      protein:  mean(a => a.protein),
      carbs:    mean(a => a.carbs),
      fat:      mean(a => a.fat),
      fibre:    mean(a => a.fibre),
    };
  }, [dayMap, start]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Weight trend — always the FULL lifetime history, independent of the
  // range dropdown, so the whole weight journey is always visible.
  const weightSeries = useMemo(() => {
    const fmt = (iso: string) =>
      parseISO(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
    // weights are stored ascending by date
    return weights.map(w => ({ label: fmt(w.date), weight: w.weightKg }));
  }, [weights]);

  // Avg weight in the stats card stays tied to the selected range, carrying the
  // most recent weigh-in from BEFORE the range forward when none exists inside it.
  const avgWeight = useMemo(() => {
    const startISO = toISO(start);
    const within = weights.filter(w => inRange(w.date)).map(w => w.weightKg);
    if (within.length === 0) {
      const prior = [...weights].reverse().find(w => w.date < startISO);
      if (prior) within.push(prior.weightKg);
    }
    if (within.length === 0) return null;
    return Math.round((within.reduce((s, w) => s + w, 0) / within.length) * 10) / 10;
  }, [weights, start, endISO]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Macro split (avg grams/day, incl. fibre) ──────────────────────────────
  const macroData = [
    { name: 'Protein', value: avg.protein, color: COLORS.protein },
    { name: 'Carbs',   value: avg.carbs,   color: COLORS.carbs },
    { name: 'Fat',     value: avg.fat,     color: COLORS.fat },
    { name: 'Fibre',   value: avg.fibre,   color: COLORS.fibre },
  ];

  const tooltipStyle = TOOLTIP_STYLE;

  const RANGES: { value: MonthRange; label: string }[] = [
    { value: 'month',     label: 'This month' },
    { value: 'lastMonth', label: 'Last month' },
    { value: '3m',        label: 'Last 3 months' },
    { value: '6m',        label: 'Last 6 months' },
    { value: 'year',      label: 'This year' },
    { value: 'all',       label: 'Till now' },
  ];

  const stats: [string, number | string, string][] = [
    ['Calories', avg.calories, COLORS.cal],
    ['Protein',  `${avg.protein}g`, COLORS.protein],
    ['Carbs',    `${avg.carbs}g`,   COLORS.carbs],
    ['Fat',      `${avg.fat}g`,     COLORS.fat],
    ['Fibre',    `${avg.fibre}g`,   COLORS.fibre],
    ['Avg weight', avgWeight != null ? `${avgWeight}kg` : '—', WEIGHT_COLOR],
  ];

  return (
    <div className="space-y-4">
      {/* Header + range dropdown */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{headerLabel}</h2>
        <Dropdown
          ariaLabel="Select range"
          value={range}
          onChange={v => setRange(v as MonthRange)}
          options={RANGES.map(r => ({ value: r.value, label: r.label }))}
        />
      </div>

      {/* Calorie trend */}
      <Card glass className="p-4">
        <div className="text-xs font-medium text-ink-muted mb-3">
          {weekly ? 'Avg daily calories / week' : 'Daily calories'}
        </div>
        <div className="h-44">
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <XAxis dataKey="t" type="number" domain={[start.getTime(), end.getTime()]}
                  ticks={ticks} tickFormatter={tickLabel} interval="equidistantPreserveStart" minTickGap={8}
                  tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--ink)', fontWeight: 600 }} itemStyle={{ color: 'var(--ink)' }}
                  labelFormatter={tipLabel}
                  formatter={(v: number) => [`${v} kcal`, weekly ? 'Avg / day' : 'Calories']} />
                {/* extendDomain keeps the target in view even when every day sits below
                    it. yAxisId is spelled out because React 19 no longer copies class
                    defaultProps onto elements, so recharts' domain scan skips the line
                    without it. */}
                <ReferenceLine y={targets.cal} yAxisId={0} ifOverflow="extendDomain"
                  stroke={COLORS.cal} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="calories" stroke={COLORS.cal} fill={COLORS.cal} fillOpacity={0.14} strokeWidth={2}
                  dot={trend.length === 1} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-ink-muted">
              Nothing logged in this range
            </div>
          )}
        </div>
      </Card>

      {/* Weight trend — lifetime */}
      <Card glass className="p-4">
        <div className="text-xs font-medium text-ink-muted mb-3">Weight trend · all time</div>
        <div className="h-40">
          {weightSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightSeries} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false}
                  interval="preserveStartEnd" minTickGap={24} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--ink)', fontWeight: 600 }} itemStyle={{ color: 'var(--ink)' }} />
                <Line type="monotone" dataKey="weight" stroke={WEIGHT_COLOR} strokeWidth={2} dot={{ r: 3, fill: WEIGHT_COLOR }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-ink-muted">
              No weight logged yet
            </div>
          )}
        </div>
      </Card>

      {/* Macro split + averages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card glass className="p-4">
          <div className="text-xs font-medium text-ink-muted mb-1">Avg macro split (g)</div>
          <div className="h-32">
            {avg.logged > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={macroData} dataKey="value" innerRadius={28} outerRadius={48} paddingAngle={2}>
                    {macroData.map((m, i) => <Cell key={i} fill={m.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--ink)', fontWeight: 600 }} itemStyle={{ color: 'var(--ink)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-ink-muted">No data</div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
            {macroData.map(m => (
              <span key={m.name} className="flex items-center gap-1 text-xs text-ink-muted">
                <span className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                {m.name}
              </span>
            ))}
          </div>
        </Card>

        <Card glass className="p-4">
          <div className="text-xs font-medium text-ink-muted mb-3">Averages ({avg.logged} days)</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {stats.map(([label, value, color]) => (
              <div key={label}>
                <div className="text-lg font-bold tabular-nums leading-none" style={{ color }}>{value}</div>
                <div className="text-[11px] text-ink-muted mt-1">{label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
