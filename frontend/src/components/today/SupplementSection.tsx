'use client';

import { useMemo, useState } from 'react';
import { Plus, X, Trash2, Check, Pill, Loader2, Pencil } from 'lucide-react';
import { Supplement, SupplementLog, SUPPLEMENT_UNITS } from '@/types';
import { allowDecimals } from '@/lib/validate';
import { supplementsDueOn } from '@/lib/consistency';
import { useApp } from '@/context/AppContext';
import Dropdown from '@/components/ui/Dropdown';

interface Props {
  date: string;                       // the day being viewed
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
}

const emptyDraft = {
  name: '', unit: 'g' as string, amount: '',
  calories: '', protein: '', carbs: '', fat: '', fibre: '',
};
type Draft = typeof emptyDraft;

const NUMERIC = ['amount', 'calories', 'protein', 'carbs', 'fat', 'fibre'] as const;

function r(n: number, decimals = 1) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

const inputCls =
  'w-full bg-surface-2 rounded-lg border border-line px-2.5 py-2 text-sm text-ink outline-none focus:border-primary transition-colors';

/**
 * Daily supplement checklist.
 *
 * Everything the user is committed to on this day gets a checkbox; ticking it
 * folds its macros into the day's totals, and leaving one unticked breaks the
 * streak just like a missed meal. A supplement is only due from the day it was
 * added onward, so earlier days are never retroactively marked incomplete.
 */
export default function SupplementSection({ date, supplements, supplementLogs }: Props) {
  const { addSupplement, updateSupplement, removeSupplement, toggleSupplement } = useApp();

  const [open, setOpen]       = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [draft, setDraft]     = useState<Draft>(emptyDraft);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  const due = useMemo(() => supplementsDueOn(supplements, date), [supplements, date]);

  // Ticks for this day, keyed by supplement.
  const takenById = useMemo(() => {
    const m = new Map<string, SupplementLog>();
    for (const l of supplementLogs) if (l.date === date) m.set(l.supplementId, l);
    return m;
  }, [supplementLogs, date]);

  const total = Math.round(
    due.reduce((s, sup) => s + (takenById.get(sup.id)?.calories ?? 0), 0)
  );
  const doneCount = due.filter(s => takenById.has(s.id)).length;

  const set = (k: keyof Draft, v: string) => setDraft(d => ({ ...d, [k]: v }));

  const valid =
    draft.name.trim().length > 0 &&
    Number(draft.amount) > 0 &&
    NUMERIC.every(k => draft[k] !== '' && Number(draft[k]) >= 0);

  const closeForm = () => {
    setOpen(false);
    setEditId(null);
    setDraft(emptyDraft);
    setErr(null);
  };

  const startAdd = () => {
    setEditId(null);
    setDraft(emptyDraft);
    setErr(null);
    setOpen(true);
  };

  const startEdit = (s: Supplement) => {
    setEditId(s.id);
    setDraft({
      name: s.name,
      unit: s.unit,
      amount:   String(s.amount),
      calories: String(s.calories),
      protein:  String(s.protein),
      carbs:    String(s.carbs),
      fat:      String(s.fat),
      fibre:    String(s.fibre),
    });
    setErr(null);
    setOpen(true);
  };

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setErr(null);
    const payload = {
      name:     draft.name.trim(),
      unit:     draft.unit,
      amount:   Number(draft.amount),
      calories: Number(draft.calories),
      protein:  Number(draft.protein),
      carbs:    Number(draft.carbs),
      fat:      Number(draft.fat),
      fibre:    Number(draft.fibre),
    };
    try {
      if (editId) await updateSupplement(editId, payload);
      else        await addSupplement(payload);
      closeForm();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save supplement');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Supplement) => {
    if (!window.confirm(`Stop taking ${s.name}? Past days keep their history.`)) return;
    try {
      await removeSupplement(s.id);
      if (editId === s.id) closeForm();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete supplement');
    }
  };

  return (
    <div className="glass rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
            <Pill size={14} className="text-primary" /> Supplements
          </h3>
          <span className="text-xs text-ink-muted tabular-nums">
            {due.length > 0 ? `${doneCount}/${due.length} taken · ${total} kcal` : 'none added yet'}
          </span>
        </div>
        <button
          onClick={() => (open ? closeForm() : startAdd())}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover py-1.5 px-3 rounded-lg hover:bg-accent-soft transition-colors"
        >
          {open ? <X size={14} /> : <Plus size={14} />}
          {open ? 'Close' : 'Add'}
        </button>
      </div>

      {/* Checklist */}
      {due.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {due.map(s => {
            const log   = takenById.get(s.id);
            const taken = !!log;
            // Past days show the dose that was actually in force back then.
            const shown = log ?? s;
            return (
              <li key={s.id} className="text-sm py-1">
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taken}
                      onChange={() => toggleSupplement(s.id, date, !taken)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)] cursor-pointer"
                      aria-label={`Took ${s.name}`}
                    />
                    <span className="min-w-0">
                      <span className={`break-words ${taken ? 'text-ink' : 'text-ink-muted'}`}>
                        {s.name}
                      </span>
                      <span className="block text-xs text-ink-muted tabular-nums">
                        {r(Number(shown.amount), 2)} {s.unit} · {Math.round(Number(shown.calories))} kcal ·{' '}
                        {r(Number(shown.protein))}p · {r(Number(shown.carbs))}c · {r(Number(shown.fat))}f
                      </span>
                    </span>
                  </label>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(s)}
                      className="text-ink-muted hover:text-primary transition-colors p-0.5"
                      aria-label={`Edit ${s.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => remove(s)}
                      className="text-ink-muted hover:text-danger transition-colors p-0.5"
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {due.length > 0 && doneCount < due.length && (
        <p className="mt-3 text-[11px] text-ink-muted">
          Tick each one — an unticked supplement breaks the streak like a missed meal.
        </p>
      )}

      {/* Add / edit form */}
      {open && (
        <div className="mt-3 pt-3 border-t border-line space-y-2">
          <span className="text-xs font-semibold text-ink">
            {editId ? 'Update dose & macros' : 'Add a supplement'}
          </span>

          <input
            type="text"
            placeholder="Name (e.g. Creatine)"
            value={draft.name}
            maxLength={80}
            autoFocus
            onChange={e => set('name', e.target.value)}
            className={inputCls}
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-ink-muted">Amount</span>
              <input
                type="text"
                inputMode="decimal"
                value={draft.amount}
                placeholder="5"
                onChange={e => { if (allowDecimals(e.target.value, 2)) set('amount', e.target.value); }}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-ink-muted">Unit</span>
              <Dropdown
                fullWidth
                align="left"
                ariaLabel="Unit"
                value={draft.unit}
                onChange={v => set('unit', v)}
                options={SUPPLEMENT_UNITS.map(u => ({ value: u, label: u }))}
                className="mt-1"
              />
            </label>
            {([
              ['calories', 'Calories'],
              ['protein',  'Protein (g)'],
              ['carbs',    'Carbs (g)'],
              ['fat',      'Fat (g)'],
              ['fibre',    'Fibre (g)'],
            ] as const).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-[11px] text-ink-muted">{label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft[key]}
                  placeholder="0"
                  onChange={e => { if (allowDecimals(e.target.value, 2)) set(key, e.target.value); }}
                  className={inputCls}
                />
              </label>
            ))}
          </div>

          <p className="text-[11px] text-ink-muted">
            {editId
              ? 'The new dose applies from today. Days already logged keep the amounts you took then.'
              : 'Values for one daily dose. From today it becomes a checkbox you tick each day, and its macros count toward that day.'}
          </p>
          {err && <p className="text-xs text-danger">{err}</p>}

          <button
            onClick={submit}
            disabled={!valid || saving}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {editId ? 'Save changes' : 'Add supplement'}
          </button>
        </div>
      )}
    </div>
  );
}
