/**
 * Text matching for food search.
 *
 * Two problems this solves:
 *  1. Casing / punctuation / spacing — "vadapav", "Vada Pav" and "VADA-PAV"
 *     must all find the same dish.
 *  2. Relevance — the USDA/OFF APIs return whatever their own ranking likes, so
 *     "white rice" used to bury "Rice, White, …" under branded noise. Everything
 *     (DB cache + API hits) is re-scored here against the raw query and sorted.
 */

/** Lowercase, collapse every non-alphanumeric run to a single space. */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Lowercase with ALL separators removed — "Vada Pav" and "vadapav" collide here. */
export function squash(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function tokenize(s: string): string[] {
  const n = normalize(s);
  return n ? n.split(' ') : [];
}

// Words that carry no discriminating power in food names — ignored when the
// query has other tokens, so "rice with milk" isn't dragged down by "with".
const STOP = new Set(['and', 'or', 'with', 'the', 'of', 'in', 'a', 'an', 'raw', 'nfs']);

/** Query tokens worth matching on (falls back to all tokens if all are stop words). */
export function queryTokens(query: string): string[] {
  const all = tokenize(query);
  const kept = all.filter(t => !STOP.has(t));
  return kept.length ? kept : all;
}

// Where a result came from, as a tie-breaker only — never enough to outrank a
// genuinely better name match.
const SOURCE_BONUS: Record<string, number> = {
  custom:         900,
  usda:           250,
  openfoodfacts:  0,
};

export function sourceBonus(source: string): number {
  return SOURCE_BONUS[source] ?? 0;
}

/**
 * Word index at which the normalized query appears as a whole phrase inside the
 * normalized name, or -1 if it doesn't. Both arguments must already be
 * normalized.
 */
function phraseWordIndex(name: string, query: string): number {
  const at = name.indexOf(query);
  if (at < 0) return -1;
  const startsWord = at === 0 || name[at - 1] === ' ';
  const endsWord   = at + query.length === name.length || name[at + query.length] === ' ';
  if (!startsWord || !endsWord) return -1;
  return at === 0 ? 0 : name.slice(0, at).trim().split(' ').length;
}

/**
 * Relevance of `name` for `query`. Higher is better; a result that matches
 * nothing at all scores below MIN_SCORE and should be dropped.
 */
export function scoreName(name: string, query: string): number {
  const q = normalize(query);
  if (!q) return 0;

  const n    = normalize(name);
  const nSq  = squash(name);
  const qSq  = squash(query);
  const nTok = n ? n.split(' ') : [];
  const qTok = queryTokens(query);
  if (qTok.length === 0) return 0;

  // Exact hit (ignoring case/spacing) always wins; shorter name breaks ties.
  if (nSq === qSq) return 100_000 - Math.min(name.length, 200);

  let score = 0;

  // Whole-query containment — catches the "vadapav" ↔ "Vada Pav" case.
  // Weighted by where the phrase sits: a name that *opens* with the query is
  // the dish, one that only mentions it late is something else that happens to
  // contain it ("Rice, White, Long-Grain" vs "Black Beans And White Rice").
  if (nSq.startsWith(qSq)) {
    score += 6_000;
  } else {
    const at = phraseWordIndex(n, q);
    if (at > 0)                 score += Math.max(1_000, 5_000 - at * 1_800);
    else if (nSq.includes(qSq)) score += 3_000;
  }

  // Per-token coverage. Each query token scores against its best position in
  // the name: exact word > word prefix > substring > near-miss spelling.
  let matched = 0, exactHits = 0, prefixHits = 0, typoHits = 0;
  let firstPos = Number.POSITIVE_INFINITY;
  const positions: number[] = [];

  for (const qt of qTok) {
    let kind = 0, at = -1;
    for (let i = 0; i < nTok.length; i++) {
      const nt = nTok[i];
      let k = 0;
      if (nt === qt) k = 4;
      else if (nt.startsWith(qt) && qt.length >= 2) k = 3;
      else if (qt.length >= 4 && nt.includes(qt)) k = 2;
      else if (kind < 1 && fuzzyWordMatch(qt, nt)) k = 1;
      if (k > kind) { kind = k; at = i; }
      if (kind === 4) break;
    }
    if (kind === 0) continue;
    matched++;
    if (kind === 4) exactHits++;
    if (kind >= 3) prefixHits++;
    if (kind === 1) typoHits++;
    positions.push(at);
    if (at < firstPos) firstPos = at;
  }

  if (matched === 0 && !nSq.includes(qSq)) return Number.NEGATIVE_INFINITY;

  score += (matched / qTok.length) * 4_000;
  // A misspelt word still counts as present, but a correctly spelt hit wins.
  score -= typoHits * 900;
  if (matched === qTok.length) score += 2_500;          // every word the user typed is present
  score += exactHits * 400 + prefixHits * 150;

  // Reward matches that start early in the name. Food databases lead with the
  // food itself and trail off into qualifiers — "Rice, White, Long-Grain" is rice,
  // while "Beans And White Rice" is a beans dish — so a hit on the head of the
  // name means far more than one buried at the end.
  if (Number.isFinite(firstPos)) score += Math.max(0, 800 - firstPos * 220);
  if (nTok.length > 0 && qTok.includes(nTok[0])) score += 900;

  // Every query word landing in the head of the name means it *is* that dish,
  // however the source chose to word it — food databases invert constantly
  // ("Rice, White, Short-Grain" is white rice; "Beans And White Rice" is not).
  if (matched === qTok.length && Math.max(...positions) <= qTok.length) score += 1_200;

  // Reward the query's words appearing close together, in order.
  if (positions.length > 1) {
    const span = Math.max(...positions) - Math.min(...positions);
    score += Math.max(0, 500 - span * 90);
    const inOrder = positions.every((p, i) => i === 0 || p >= positions[i - 1]);
    if (inOrder) score += 200;
  }

  // Prefer concise, specific names over long branded/prepared descriptions.
  score -= Math.min(nTok.length, 24) * 45;
  score -= Math.min(name.length, 160) * 3;

  return score;
}

/** Below this a result is noise rather than a match. */
export const MIN_SCORE = 0;

// ─── Typo tolerance ─────────────────────────────────────────────────────────

/**
 * Optimal-string-alignment distance (Levenshtein + adjacent swaps), giving up
 * as soon as it must exceed `max`. "chiken"→"chicken" = 1, "panner"→"paneer" = 1.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  let prev2: number[] = [];
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[n];
}

/** How many typos a word of this length may carry and still count as a match. */
export function typoBudget(len: number): number {
  if (len < 4) return 0;
  return len < 7 ? 1 : 2;
}

/**
 * Does query word `qt` look like a misspelling of name word `nt` — either the
 * whole word, or (while the user is still typing) the start of it?
 */
export function fuzzyWordMatch(qt: string, nt: string): boolean {
  const budget = typoBudget(qt.length);
  if (budget === 0) return false;
  if (editDistance(qt, nt, budget) <= budget) return true;
  if (nt.length > qt.length) {
    // "chik" → "chicken": compare against the head of the longer word.
    const head = nt.slice(0, qt.length);
    if (editDistance(qt, head, 1) <= 1 && qt[0] === nt[0]) return true;
  }
  return false;
}

// ─── Regional vocabulary ────────────────────────────────────────────────────
// USDA / Open Food Facts speak American English; people logging Indian meals
// type "aloo", "dahi", "bhindi". Each regional word maps to the term the
// databases actually use. Used *additionally* to the original query — results
// that match what was typed always outrank the translated ones.

export const SYNONYMS: Record<string, string> = {
  // vegetables
  aloo: 'potato', alu: 'potato', batata: 'potato',
  gobi: 'cauliflower', gobhi: 'cauliflower', phoolgobi: 'cauliflower',
  bandgobhi: 'cabbage',
  bhindi: 'okra', ladyfinger: 'okra',
  baingan: 'eggplant', brinjal: 'eggplant', aubergine: 'eggplant',
  palak: 'spinach', methi: 'fenugreek', saag: 'greens',
  matar: 'peas', mutter: 'peas', mattar: 'peas',
  gajar: 'carrot', mooli: 'radish', kheera: 'cucumber', kakdi: 'cucumber',
  pyaz: 'onion', pyaaz: 'onion', kanda: 'onion', tamatar: 'tomato',
  karela: 'bitter gourd', lauki: 'gourd', dudhi: 'gourd', tinda: 'gourd',
  capsicum: 'sweet pepper', courgette: 'zucchini', shakarkandi: 'sweet potato',
  makai: 'corn', makka: 'corn', bhutta: 'corn',
  adrak: 'ginger', lehsun: 'garlic', lahsun: 'garlic', haldi: 'turmeric',
  jeera: 'cumin', dhania: 'coriander', pudina: 'mint',
  // pulses & grains
  dal: 'lentils', daal: 'lentils', dhal: 'lentils', masoor: 'lentils',
  chana: 'chickpeas', channa: 'chickpeas', chole: 'chickpeas', chhole: 'chickpeas',
  rajma: 'kidney beans', moong: 'mung beans', mung: 'mung beans',
  toor: 'pigeon peas', arhar: 'pigeon peas', lobia: 'cowpeas',
  chawal: 'rice', chaawal: 'rice',
  atta: 'whole wheat flour', maida: 'wheat flour white', besan: 'chickpea flour',
  sooji: 'semolina', suji: 'semolina', rava: 'semolina',
  jowar: 'sorghum', bajra: 'millet', ragi: 'millet', nachni: 'millet',
  roti: 'chapati', chapatti: 'chapati', phulka: 'chapati',
  // dairy, eggs, meat
  dahi: 'yogurt', curd: 'yogurt', yoghurt: 'yogurt',
  doodh: 'milk', chaas: 'buttermilk', makhan: 'butter', ghee: 'butter oil',
  anda: 'egg', ande: 'egg', murgh: 'chicken', murg: 'chicken',
  gosht: 'lamb', mutton: 'lamb', keema: 'ground', mince: 'ground',
  machli: 'fish', machhi: 'fish', jhinga: 'shrimp', prawn: 'shrimp', prawns: 'shrimp',
  // fruit & nuts
  kela: 'banana', aam: 'mango', seb: 'apple', santra: 'orange', angoor: 'grapes',
  anar: 'pomegranate', amrood: 'guava', papita: 'papaya', tarbooz: 'watermelon',
  nimbu: 'lemon', nariyal: 'coconut', khajur: 'dates', chikoo: 'sapodilla',
  badam: 'almonds', kaju: 'cashew', akhrot: 'walnuts', kishmish: 'raisins',
  moongfali: 'peanuts', mungfali: 'peanuts', mungphali: 'peanuts',
  cheeni: 'sugar', shakkar: 'sugar', shahad: 'honey',
};

/**
 * The query with every regional word swapped for its database term, or null
 * when nothing in it needed translating. "aloo gobi" → "potato cauliflower".
 */
export function translateQuery(query: string): string | null {
  const toks = tokenize(query);
  let changed = false;
  const out = toks.map(t => {
    const s = SYNONYMS[t];
    if (s) { changed = true; return s; }
    return t;
  });
  return changed ? out.join(' ') : null;
}

/**
 * Spell-correct a query against the words that actually occur in food names
 * (`vocab`: word → how many names use it). Words that are already known, are
 * the start of a known word (still typing), contain digits or are regional
 * terms are left alone. Returns null when nothing changed.
 */
export function correctQuery(query: string, vocab: Map<string, number>): string | null {
  if (vocab.size === 0) return null;
  const toks = tokenize(query);
  let changed = false;

  const out = toks.map(t => {
    if (t.length < 4 || vocab.has(t) || SYNONYMS[t] || /\d/.test(t)) return t;
    const budget = typoBudget(t.length);
    let best = '', bestD = budget + 1, bestN = 0;
    for (const [w, n] of vocab) {
      if (w.startsWith(t)) return t;                     // a prefix of a real word
      if (Math.abs(w.length - t.length) > budget) continue;
      const d = editDistance(t, w, budget);
      if (d > budget) continue;
      // Fewer edits first; among equals the word more names use.
      if (d < bestD || (d === bestD && n > bestN)) { best = w; bestD = d; bestN = n; }
    }
    if (!best) return t;
    changed = true;
    return best;
  });

  return changed ? out.join(' ') : null;
}
