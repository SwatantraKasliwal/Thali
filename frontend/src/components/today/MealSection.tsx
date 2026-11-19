'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, Trash2, Search, Loader2, Pencil, Check, Ban, PencilLine, History, Sparkles } from 'lucide-react';
import { FoodResult, LogEntry } from '@/types';
import { allowDecimals } from '@/lib/validate';
import { useApp } from '@/context/AppContext';
import {
  cachedSearch, fetchFoods, recentFoods, matchOwnFoods, highlight,
} from '@/lib/foodSearch';

interface MealSectionProps {
  meal: string;
  items: LogEntry[];
  isFasting?: boolean;
  onAdd: (foodId: number, qty: number) => void;
  onUpdate: (id: string, qty: number) => void;
  onDelete: (id: string) => void;
  onToggleFast?: () => void;
}

function r(n: number, decimals = 1) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

// Blank custom-food draft (values are for one serving; serving weight is separate).
const emptyCustom = { name: '', serving: '100', calories: '', protein: '', carbs: '', fat: '', fibre: '' };

// One-tap portion sizes under the grams box.
const QUICK_GRAMS = [50, 100, 150, 200, 250];

// Local foods answer first (~120 ms), the live databases after the user pauses.
const FAST_DELAY = 120;
const FULL_DELAY = 450;

/** Name with the typed words picked out — plain text nodes, nothing injected. */
function Highlighted({ name, query }: { name: string; query: string }) {
  return (
    <>
      {highlight(name, query).map((part, i) =>
        part.hit
          ? <mark key={i} className="bg-transparent font-semibold text-primary">{part.text}</mark>
          : <span key={i}>{part.text}</span>
      )}
    </>
  );
}

export default function MealSection({ meal, items, isFasting, onAdd, onUpdate, onDelete, onToggleFast }: MealSectionProps) {
  const { addCustomFood, logs } = useApp();

  const [open, setOpen]                     = useState(false);
  const [search, setSearch]                 = useState('');
  const [results, setResults]               = useState<FoodResult[]>([]);
  const [corrected, setCorrected]           = useState<string | null>(null);
  const [selectedFood, setSelectedFood]     = useState<FoodResult | null>(null);
  const [qty, setQty]                       = useState('100');
  const [searching, setSearching]           = useState(false);
  const [searchErr, setSearchErr]           = useState<string | null>(null);
  // The live lookup failed but local foods were found — say so, keep them.
  const [partial, setPartial]               = useState(false);
  // Keyboard-highlighted row in the results list.
  const [active, setActive]                 = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  // Custom "Others" food state
  const [customMode, setCustomMode] = useState(false);
  const [custom, setCustom]         = useState(emptyCustom);
  const [savingCustom, setSavingCustom] = useState(false);
  const [customErr, setCustomErr]   = useState<string | null>(null);

  // Inline edit state for an already-logged item.
  const [editId, setEditId]   = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');

  // ── Search ────────────────────────────────────────────────────────────
  // Two passes per pause in typing: a fast one over foods already saved on the
  // server, then the full one that also asks the nutrition databases. Every
  // request is aborted the moment the query changes, so an old, slow answer can
  // never overwrite the results for what's in the box now.
  useEffect(() => {
    const q = search.trim();
    setActive(0);
    if (customMode || q.length < 2) {
      setResults([]); setCorrected(null); setSearching(false); setSearchErr(null); setPartial(false);
      return;
    }

    const memo = cachedSearch(q);
    if (memo) {
      setResults(memo.results); setCorrected(memo.corrected);
      setSearching(false); setSearchErr(null); setPartial(false);
      return;
    }

    const ctrl = new AbortController();
    let fullIn = false;
    let fastFound = 0;
    setSearching(true);
    setSearchErr(null);

    const fastTimer = setTimeout(() => {
      fetchFoods(q, true, ctrl.signal)
        .then(r => {
          if (fullIn || ctrl.signal.aborted) return;
          fastFound = r.results.length;
          setResults(r.results);
          setCorrected(r.corrected);
        })
        .catch(() => { /* the full pass reports errors */ });
    }, FAST_DELAY);

    const fullTimer = setTimeout(() => {
      fetchFoods(q, false, ctrl.signal)
        .then(r => {
          if (ctrl.signal.aborted) return;
          fullIn = true;
          setResults(r.results);
          setCorrected(r.corrected);
          setPartial(false);
        })
        .catch(e => {
          if (ctrl.signal.aborted) return;
          fullIn = true;
          if (fastFound > 0) { setPartial(true); return; }
          setResults([]);
          setSearchErr(e instanceof TypeError ? 'Cannot reach server' : e instanceof Error ? e.message : 'Search failed');
        })
        .finally(() => { if (!ctrl.signal.aborted) setSearching(false); });
    }, FULL_DELAY);

    return () => { clearTimeout(fastTimer); clearTimeout(fullTimer); ctrl.abort(); };
  }, [search, customMode]);

  // Dishes this user has logged before — instant matches and the "Recent" list.
  const ownFoods = useMemo(() => recentFoods(logs), [logs]);
  const query    = search.trim();
  // Match the user's own dishes on what was typed and on the corrected spelling.
  const own = query.length >= 2
    ? [...new Map(
        [...matchOwnFoods(query, ownFoods), ...(corrected ? matchOwnFoods(corrected, ownFoods) : [])]
          .map(f => [f.id, f] as const)
      ).values()].slice(0, 3)
    : [];
  const ownIds   = new Set(own.map(f => f.id));
  // Prefer the server's copy of a dish (exact per-100 g values) when it has one.
  const list: FoodResult[] = [
    ...own.map(o => results.find(r => r.id === o.id) ?? o),
    ...results.filter(f => !ownIds.has(f.id)),
  ];
  const markQuery = corrected ? `${query} ${corrected}` : query;

  // Keep the keyboard-highlighted row in view.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-i="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && list.length) {
      e.preventDefault();
      setActive(i => Math.min(i + 1, list.length - 1));
    } else if (e.key === 'ArrowUp' && list.length) {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && list[active]) {
      e.preventDefault();
      pick(list[active]);
    } else if (e.key === 'Escape') {
      if (search) setSearch(''); else close();
    }
  };

  const total   = Math.round(items.reduce((s, i) => s + i.calories, 0));
  const qtyNum  = Number(qty) || 0;
  const preview = selectedFood && qtyNum > 0
    ? {
        calories: Math.round(selectedFood.caloriesPer100g * qtyNum / 100),
        protein:  r(selectedFood.protein * qtyNum / 100),
        carbs:    r(selectedFood.carbs * qtyNum / 100),
        fat:      r(selectedFood.fat * qtyNum / 100),
        fibre:    r(selectedFood.fibre * qtyNum / 100),
      }
    : null;

  // Pick a dish → drop it into the quantity step so the user can edit grams.
  const pick = (f: FoodResult) => {
    setSelectedFood(f);
    setQty('100');
    setResults([]);
    setCorrected(null);
    setSearch('');
  };

  const submit = () => {
    if (!selectedFood || !(qtyNum > 0)) return;
    onAdd(selectedFood.id, qtyNum);
    reset();
  };

  const reset = () => {
    setQty('100');
    setSearch('');
    setResults([]);
    setCorrected(null);
    setPartial(false);
    setSelectedFood(null);
    setCustomMode(false);
    setCustom(emptyCustom);
    setCustomErr(null);
  };

  const close = () => { setOpen(false); reset(); };

  // ── Custom food handlers ──────────────────────────────────────────────
  const cu = (k: keyof typeof custom, v: string) => setCustom(c => ({ ...c, [k]: v }));
  const servingNum = Number(custom.serving) || 0;
  const customValid =
    custom.name.trim().length > 0 &&
    servingNum > 0 &&
    (['calories', 'protein', 'carbs', 'fat', 'fibre'] as const).every(k => custom[k] !== '' && Number(custom[k]) >= 0);

  const submitCustom = async () => {
    if (!customValid || savingCustom) return;
    setSavingCustom(true);
    setCustomErr(null);
    try {
      // Convert the per-serving values the user typed into the per-100g shape the DB stores.
      const factor = 100 / servingNum;
      const food = await addCustomFood({
        name:            custom.name.trim(),
        caloriesPer100g: Number(custom.calories) * factor,
        protein:         Number(custom.protein)  * factor,
        carbs:           Number(custom.carbs)    * factor,
        fat:             Number(custom.fat)      * factor,
        fibre:           Number(custom.fibre)    * factor,
      });
      onAdd(food.id, servingNum);   // log exactly the serving the user described
      close();
    } catch (e) {
      setCustomErr(e instanceof Error ? e.message : 'Failed to save food');
    } finally {
      setSavingCustom(false);
    }
  };

  // ── Inline edit handlers ──────────────────────────────────────────────
  const startEdit = (i: LogEntry) => { setEditId(i.id); setEditQty(String(i.qty)); };
  const cancelEdit = () => { setEditId(null); setEditQty(''); };
  const saveEdit = (id: string) => {
    const n = Number(editQty);
    if (n > 0) onUpdate(id, n);
    cancelEdit();
  };

  const customInput = 'w-full bg-surface-2 rounded-lg border border-line px-2.5 py-2 text-sm text-ink outline-none focus:border-primary transition-colors';

  return (
    <div className="glass rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{meal}</h3>
          <span className="text-xs text-ink-muted tabular-nums">
            {total} kcal{isFasting && ' · fasting'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onToggleFast && (
            <button
              onClick={onToggleFast}
              title={isFasting ? 'Fasting — counts toward your streak. Tap to undo.' : 'Skipping this meal? Mark it as a fast so it keeps your streak.'}
              className={`flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors ${
                isFasting
                  ? 'text-primary bg-accent-soft'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <Ban size={13} />
              {isFasting ? 'Fasting' : 'Fast'}
            </button>
          )}
          <button
            onClick={() => (open ? close() : setOpen(true))}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover py-1.5 px-3 rounded-lg hover:bg-accent-soft transition-colors"
          >
            <span className={`inline-flex transition-transform duration-300 ${open ? 'rotate-90' : ''}`}>
              {open ? <X size={14} /> : <Plus size={14} />}
            </span>
            {open ? 'Close' : 'Add'}
          </button>
        </div>
      </div>

      {isFasting && items.length === 0 && (
        <p className="animate-fade mt-3 text-xs text-ink-muted flex items-center gap-1.5">
          <Ban size={13} className="text-primary" /> Marked as a fast — this won&apos;t break your streak.
        </p>
      )}

      {/* Log items */}
      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map(i => (
            <li key={i.id} className="animate-row text-sm py-1">
              {editId === i.id ? (
                /* ── Inline edit row ── */
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 break-words text-ink">{i.name}</span>
                  <div className="flex items-center rounded-lg border border-primary bg-surface-2 px-2 py-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editQty}
                      autoFocus
                      onChange={e => { if (allowDecimals(e.target.value, 2)) setEditQty(e.target.value); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(i.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="w-12 bg-transparent text-right text-sm text-ink outline-none tabular-nums"
                    />
                    <span className="text-xs text-ink-muted">g</span>
                  </div>
                  <button
                    onClick={() => saveEdit(i.id)}
                    className="text-primary hover:text-primary-hover p-1"
                    aria-label="Save"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-ink-muted hover:text-ink p-1"
                    aria-label="Cancel"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                /* ── Display row ── */
                <div className="flex items-start justify-between gap-2">
                  {/* Long dish names wrap instead of forcing a horizontal scroll */}
                  <span className="min-w-0 flex-1 text-ink break-words">{i.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Calories + weight aligned in their own right-hand column */}
                    <div className="text-right leading-tight">
                      <div className="text-ink tabular-nums text-sm font-medium">{i.calories} kcal</div>
                      <div className="text-ink-muted tabular-nums text-xs">{i.qty} g</div>
                    </div>
                    <button
                      onClick={() => startEdit(i)}
                      className="text-ink-muted hover:text-primary transition-colors p-0.5"
                      aria-label="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => onDelete(i.id)}
                      className="text-ink-muted hover:text-danger transition-colors p-0.5"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add panel */}
      {open && (
        <div className="animate-expand mt-3 pt-3 border-t border-line space-y-2">
          {customMode ? (
            /* ── Custom "Others" food form ── */
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <PencilLine size={13} className="text-primary" /> Add a custom food
                </span>
                <button
                  onClick={() => { setCustomMode(false); setCustomErr(null); }}
                  className="text-xs font-medium text-ink-muted hover:text-ink"
                >
                  Back to search
                </button>
              </div>

              <input
                type="text"
                placeholder="Food name (e.g. Grandma's dal)"
                value={custom.name}
                maxLength={120}
                autoFocus
                onChange={e => cu('name', e.target.value)}
                className={customInput}
              />

              <div className="grid grid-cols-2 gap-2">
                {([
                  ['serving',  'Serving (g)'],
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
                      value={custom[key]}
                      placeholder="0"
                      onChange={e => { if (allowDecimals(e.target.value, 2)) cu(key, e.target.value); }}
                      className={customInput}
                    />
                  </label>
                ))}
              </div>

              <p className="text-[11px] text-ink-muted">
                Enter the values for one serving — all fields are required. Saved to your foods for next time.
              </p>
              {customErr && <p className="text-xs text-danger">{customErr}</p>}

              <button
                onClick={submitCustom}
                disabled={!customValid || savingCustom}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-40 transition-colors"
              >
                {savingCustom ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save &amp; add to {meal}
              </button>
            </>
          ) : !selectedFood ? (
            <>
              {/* Search input */}
              <div className="relative">
                {searching
                  ? <Loader2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                  : <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                }
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Search foods (e.g. chicken, aloo, dal)…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={onSearchKey}
                  role="combobox"
                  aria-expanded={list.length > 0}
                  aria-controls={`results-${meal}`}
                  aria-activedescendant={list[active] ? `result-${meal}-${active}` : undefined}
                  className="w-full pl-8 pr-8 py-2 rounded-lg border border-line text-sm text-ink bg-surface-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-[border-color,box-shadow]"
                  autoFocus
                />
                {searching && <div aria-hidden className="search-progress" />}
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); inputRef.current?.focus(); }}
                    aria-label="Clear search"
                    className="animate-pop absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-muted hover:text-ink hover:bg-surface"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {searchErr && <p className="animate-fade text-xs text-danger">{searchErr}</p>}

              {corrected && query.length >= 2 && (
                <p className="animate-fade flex items-center gap-1 px-1 text-xs text-ink-muted">
                  <Sparkles size={12} className="text-primary" />
                  Showing results for
                  <button
                    type="button"
                    onClick={() => setSearch(corrected)}
                    className="font-semibold text-primary hover:underline"
                  >
                    {corrected}
                  </button>
                </p>
              )}

              {/* Nothing typed yet → the dishes this user logs most recently */}
              {query.length < 2 && ownFoods.length > 0 && (
                <div className="animate-fade">
                  <p className="mb-1.5 flex items-center gap-1 px-1 text-[11px] font-medium text-ink-muted">
                    <History size={11} /> Recent
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ownFoods.slice(0, 6).map((f, i) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => pick(f)}
                        style={{ animationDelay: `${i * 30}ms` }}
                        className="animate-pop max-w-full truncate rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-ink hover:border-primary hover:text-primary transition-colors"
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results list — click / Enter to select */}
              {query.length >= 2 && list.length > 0 && (
                <div
                  ref={listRef}
                  id={`results-${meal}`}
                  role="listbox"
                  className="max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-line divide-y divide-line"
                >
                  {list.map((f, i) => (
                    <button
                      key={f.id}
                      id={`result-${meal}-${i}`}
                      data-i={i}
                      role="option"
                      aria-selected={i === active}
                      onClick={() => pick(f)}
                      onMouseMove={() => { if (i !== active) setActive(i); }}
                      style={{ animationDelay: `${Math.min(i, 8) * 22}ms` }}
                      className={`animate-row w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors ${
                        i === active ? 'bg-surface-2' : ''
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink break-words">
                          <Highlighted name={f.name} query={markQuery} />
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-ink-muted tabular-nums">
                          {ownIds.has(f.id) && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-soft px-1.5 font-medium text-primary">
                              <History size={10} /> Yours
                            </span>
                          )}
                          <span>P {r(f.protein)}</span>
                          <span aria-hidden>·</span>
                          <span>C {r(f.carbs)}</span>
                          <span aria-hidden>·</span>
                          <span>F {r(f.fat)}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right leading-tight">
                        <span className="block text-sm font-semibold text-ink tabular-nums">{Math.round(f.caloriesPer100g)}</span>
                        <span className="block text-[10px] text-ink-muted">kcal/100g</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* First answer still on its way */}
              {query.length >= 2 && searching && list.length === 0 && (
                <div aria-hidden className="rounded-xl border border-line divide-y divide-line overflow-hidden">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="flex items-center justify-between gap-3 px-3 py-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="skeleton h-3 rounded" style={{ width: `${70 - i * 15}%` }} />
                        <div className="skeleton h-2 w-1/3 rounded" />
                      </div>
                      <div className="skeleton h-3 w-10 rounded" />
                    </div>
                  ))}
                </div>
              )}

              {partial && (
                <p className="px-1 text-[11px] text-ink-muted">
                  Showing saved foods — the online lookup didn&apos;t answer this time.
                </p>
              )}

              {query.length >= 2 && !searching && list.length === 0 && !searchErr && (
                <p className="animate-fade text-xs text-ink-muted px-1">No results — add it as a custom food below</p>
              )}

              {/* Others → custom food */}
              <button
                onClick={() => { setCustomMode(true); setSearch(''); setResults([]); setCorrected(null); setSearchErr(null); }}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-xs font-semibold text-ink-muted hover:text-primary hover:border-primary transition-colors"
              >
                <PencilLine size={13} /> Others — add a food not listed
              </button>
            </>
          ) : (
            <>
              {/* Selected dish → edit grams → add */}
              <div className="animate-pop flex items-center justify-between rounded-lg bg-accent-soft px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-primary break-words">{selectedFood.name}</div>
                  <div className="text-xs text-ink-muted tabular-nums">
                    {Math.round(selectedFood.caloriesPer100g)} kcal/100g
                  </div>
                </div>
                <button
                  onClick={reset}
                  className="text-xs font-medium text-ink-muted hover:text-ink shrink-0 ml-2"
                >
                  Change
                </button>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 flex items-center rounded-lg border border-line bg-surface-2 px-3 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={qty}
                    autoFocus
                    onChange={e => { if (allowDecimals(e.target.value, 2)) setQty(e.target.value); }}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    className="w-full bg-transparent text-sm text-ink outline-none"
                  />
                  <span className="text-xs text-ink-muted">g</span>
                </div>
                <button
                  onClick={submit}
                  disabled={!(qtyNum > 0)}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-40 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* One-tap portions */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_GRAMS.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setQty(String(g))}
                    className={`rounded-full border px-2.5 py-0.5 text-xs tabular-nums transition-colors ${
                      qtyNum === g
                        ? 'border-primary bg-accent-soft text-primary font-semibold'
                        : 'border-line text-ink-muted hover:text-ink'
                    }`}
                  >
                    {g} g
                  </button>
                ))}
              </div>

              {/* Live macro preview */}
              {preview && (
                <p className="text-xs text-ink-muted tabular-nums">
                  ≈ {preview.calories} kcal · {preview.protein}p · {preview.carbs}c · {preview.fat}f · {preview.fibre} fibre
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
