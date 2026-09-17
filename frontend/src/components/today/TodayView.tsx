'use client';

import { useApp } from '@/context/AppContext';
import { sumDay } from '@/lib/nutrition';
import { addDays, toISO, formatDay } from '@/lib/dates';
import { COLORS, MEALS } from '@/lib/constants';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Ring from '@/components/ui/Ring';
import MacroBar from '@/components/ui/MacroBar';
import Card from '@/components/ui/Card';
import MealSection from './MealSection';
import SupplementSection from './SupplementSection';

export default function TodayView() {
  const {
    logs, targets, fasts, supplements, supplementLogs,
    selectedDate, setSelectedDate, addLog, updateLog, deleteLog, addFast, removeFast,
  } = useApp();
  const today = toISO(new Date());
  // Today plus the six days before it — the log stays a short, honest window
  // rather than an archive you can wander back through.
  const HISTORY_DAYS = 7;
  const earliest = toISO(addDays(new Date(), -(HISTORY_DAYS - 1)));
  // Ticked supplements carry macros, so the day's rings include them.
  const t = sumDay(logs, selectedDate, supplementLogs);
  const isToday = selectedDate === today;
  const atEarliest = selectedDate <= earliest;

  const dayItems = (meal: string) =>
    logs.filter(l => l.date === selectedDate && l.meal === meal);

  const isFasting = (meal: string) =>
    fasts.some(f => f.date === selectedDate && f.meal === meal);
  const toggleFast = (meal: string) =>
    isFasting(meal) ? removeFast(selectedDate, meal) : addFast(selectedDate, meal);

  const go = (n: number) => {
    const next = toISO(addDays(new Date(selectedDate + 'T00:00:00'), n));
    if (next < earliest || next > today) return;
    setSelectedDate(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          disabled={atEarliest}
          title={atEarliest ? `You can look back ${HISTORY_DAYS} days` : undefined}
          onClick={() => go(-1)}
          className="p-2 rounded-xl hover:bg-surface-2 text-ink-muted disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-semibold text-ink">{formatDay(selectedDate)}</span>
        <button
          disabled={isToday}
          onClick={() => go(1)}
          className="p-2 rounded-xl hover:bg-surface-2 text-ink-muted disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <Card glass className="p-5 flex flex-col items-center">
        <Ring value={t.calories} max={targets.cal} />
        <div className="mt-5 w-full grid grid-cols-2 gap-x-6 gap-y-3">
          <MacroBar label="Protein" value={t.protein} target={targets.protein} color={COLORS.protein} />
          <MacroBar label="Carbs"   value={t.carbs}   target={targets.carbs}   color={COLORS.carbs} />
          <MacroBar label="Fat"     value={t.fat}     target={targets.fat}     color={COLORS.fat} />
          <MacroBar label="Fibre"   value={t.fibre}   target={targets.fibre}   color={COLORS.fibre} />
        </div>
      </Card>

      {MEALS.map(meal => (
        <div key={meal} className="space-y-4">
          <MealSection
            meal={meal}
            items={dayItems(meal)}
            isFasting={isFasting(meal)}
            onAdd={(foodId: number, qty: number) => addLog(meal, foodId, qty)}
            onUpdate={updateLog}
            onDelete={deleteLog}
            onToggleFast={() => toggleFast(meal)}
          />
          {/* Supplements sit directly under Dinner — a daily commitment rather
              than a meal, but held to the same streak rules. */}
          {meal === 'Dinner' && (
            <SupplementSection
              date={selectedDate}
              supplements={supplements}
              supplementLogs={supplementLogs}
            />
          )}
        </div>
      ))}
    </div>
  );
}
