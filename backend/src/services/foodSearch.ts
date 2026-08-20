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
  // the name: exact word > word prefix > substring.
  let matched = 0, exactHits = 0, prefixHits = 0;
  let firstPos = Number.POSITIVE_INFINITY;
  const positions: number[] = [];

  for (const qt of qTok) {
    let kind = 0, at = -1;
    for (let i = 0; i < nTok.length; i++) {
      const nt = nTok[i];
      let k = 0;
      if (nt === qt) k = 3;
      else if (nt.startsWith(qt) && qt.length >= 3) k = 2;
      else if (qt.length >= 4 && nt.includes(qt)) k = 1;
      if (k > kind) { kind = k; at = i; }
      if (kind === 3) break;
    }
    if (kind === 0) continue;
    matched++;
    if (kind === 3) exactHits++;
    if (kind >= 2) prefixHits++;
    positions.push(at);
    if (at < firstPos) firstPos = at;
  }

  if (matched === 0 && !nSq.includes(qSq)) return Number.NEGATIVE_INFINITY;

  score += (matched / qTok.length) * 4_000;
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
