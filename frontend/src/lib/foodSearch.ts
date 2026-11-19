// Client side of food search: talks to /foods/search, remembers recent answers
// so back-spacing is instant, and mines the user's own log for dishes they
// actually eat (shown before anything the server sends back).

import { api } from '@/lib/api';
import { FoodResult, LogEntry } from '@/types';

export interface SearchResponse {
  results: FoodResult[];
  /** Spelling the server actually searched when it auto-corrected the query. */
  corrected: string | null;
}

/** Lowercase, every non-alphanumeric run collapsed to one space. */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// ─── Remembered answers ─────────────────────────────────────────────────────

const TTL = 5 * 60 * 1000;
const MAX = 80;
const memo = new Map<string, { at: number; value: SearchResponse }>();

export function cachedSearch(query: string): SearchResponse | null {
  const k = normalize(query);
  const hit = memo.get(k);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL) { memo.delete(k); return null; }
  return hit.value;
}

function remember(query: string, value: SearchResponse) {
  const k = normalize(query);
  memo.delete(k);
  memo.set(k, { at: Date.now(), value });
  while (memo.size > MAX) {
    const oldest = memo.keys().next().value;
    if (oldest === undefined) break;
    memo.delete(oldest);
  }
}

/** Forget every remembered answer — e.g. a new custom food was just saved. */
export function clearSearchCache() {
  memo.clear();
}

/**
 * One round-trip to the search endpoint. `fast` asks for the server's local
 * foods only (quick); without it the live nutrition databases are consulted too.
 */
export async function fetchFoods(query: string, fast: boolean, signal?: AbortSignal): Promise<SearchResponse> {
  const q = query.trim();
  const res = await api(`/foods/search?q=${encodeURIComponent(q)}${fast ? '&fast=1' : ''}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body?.error === 'string' ? body.error : `Search failed (${res.status})`);
  }
  const results: FoodResult[] = await res.json();
  const header = res.headers.get('X-Search-Corrected');
  let corrected: string | null = null;
  if (header) {
    try { corrected = decodeURIComponent(header); } catch { corrected = header; }
  }
  const value = { results, corrected };
  if (!fast) remember(q, value);
  return value;
}

// ─── The user's own foods ───────────────────────────────────────────────────

/**
 * Distinct dishes from the log, most recently eaten first, re-expressed per
 * 100 g so they slot straight into the same pick → grams flow as a search hit.
 */
export function recentFoods(logs: LogEntry[], limit = 60): FoodResult[] {
  const sorted = [...logs].sort(
    (a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id)
  );
  const seen = new Set<number>();
  const out: FoodResult[] = [];
  for (const l of sorted) {
    if (seen.has(l.foodId) || !(l.qty > 0)) continue;
    seen.add(l.foodId);
    const k = 100 / l.qty;
    out.push({
      id:              l.foodId,
      name:            l.name,
      caloriesPer100g: l.calories * k,
      protein:         l.protein * k,
      carbs:           l.carbs * k,
      fat:             l.fat * k,
      fibre:           l.fibre * k,
      source:          'history',
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * The user's own dishes that answer the query: every typed word must start a
 * word of the name ("but chi" → "Butter Chicken"), or the whole query must
 * appear once spacing is ignored ("vadapav" → "Vada Pav").
 */
export function matchOwnFoods(query: string, foods: FoodResult[], limit = 3): FoodResult[] {
  const qTok = normalize(query).split(' ').filter(Boolean);
  if (qTok.length === 0) return [];
  const qSq = qTok.join('');
  const hits: { f: FoodResult; score: number }[] = [];
  for (const f of foods) {
    const n = normalize(f.name);
    const words = n.split(' ');
    const every = qTok.every(t => words.some(w => w.startsWith(t)));
    const squashed = n.replace(/ /g, '').includes(qSq);
    if (!every && !squashed) continue;
    // Names that open with the query first, then shorter names.
    const score = (n.startsWith(qTok[0]) ? 1000 : 0) - n.length;
    hits.push({ f, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit).map(h => h.f);
}

// ─── Highlighting ───────────────────────────────────────────────────────────

/**
 * Split `name` into plain and matched runs: every place a word of the name
 * starts with a query word is marked. Pure string work, safe to render as text.
 */
export function highlight(name: string, query: string): { text: string; hit: boolean }[] {
  const qTok = normalize(query).split(' ').filter(t => t.length > 0);
  if (qTok.length === 0) return [{ text: name, hit: false }];

  const marks = new Array<boolean>(name.length).fill(false);
  const lower = name.toLowerCase();
  const wordStart = /[a-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = wordStart.exec(lower))) {
    const word = m[0];
    let best = 0;
    for (const t of qTok) if (word.startsWith(t) && t.length > best) best = t.length;
    for (let i = 0; i < best; i++) marks[m.index + i] = true;
  }

  const out: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < name.length; i++) {
    const last = out[out.length - 1];
    if (last && last.hit === marks[i]) last.text += name[i];
    else out.push({ text: name[i], hit: marks[i] });
  }
  return out;
}
