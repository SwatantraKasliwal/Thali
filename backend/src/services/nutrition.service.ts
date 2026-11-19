import { env } from '../config/env';
import { getJSON, postJSON } from '../config/http';
import { prisma } from '../db/client';
import { Food, Prisma } from '@prisma/client';
import {
  scoreName, sourceBonus, squash, normalize, queryTokens, tokenize,
  correctQuery, translateQuery, SYNONYMS, MIN_SCORE,
} from './foodSearch';

export interface FoodResult {
  id: number;
  name: string;
  caloriesPer100g: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  source: string;
}

type NewFood = Omit<FoodResult, 'id'>;

function round2(n: number) { return Math.round(n * 100) / 100; }
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? round2(n) : 0;
}

// ─── USDA FoodData Central (primary) ────────────────────────────────────────
// Free. Get a key at https://fdc.nal.usda.gov/api-key-signup.html
// DEMO_KEY works but is heavily rate-limited (≈30/hr) — set FDC_API_KEY.

const FDC_KEY = env.FDC_API_KEY || 'DEMO_KEY';
// Whole/generic foods first — they're what someone typing "white rice" means.
// Branded is a separate, lower-priority pass so brand noise can't drown them.
const FDC_GENERIC = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'];
const FDC_BRANDED = ['Branded'];

interface FDCNutrient { nutrientId?: number; value?: number }
interface FDCFood { description?: string; foodNutrients?: FDCNutrient[] }

// USDA nutrient ids
const N_ENERGY = 1008, N_PROTEIN = 1003, N_CARB = 1005, N_FAT = 1004, N_FIBRE = 1079;

function pick(arr: FDCNutrient[] | undefined, id: number): number {
  return num(arr?.find(n => n.nutrientId === id)?.value);
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

async function searchUSDA(
  query: string,
  dataType: string[],
  requireAllWords: boolean,
  pageSize = 20
): Promise<NewFood[]> {
  // POST (JSON body) — the GET endpoint returns nginx 400 for some encoded queries.
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${FDC_KEY}`;
  const data = await postJSON<{ foods?: FDCFood[] }>(url, {
    query,
    pageSize,
    dataType,
    requireAllWords,
  });
  const out: NewFood[] = [];
  for (const f of data.foods ?? []) {
    const name = f.description?.trim();
    const kcal = pick(f.foodNutrients, N_ENERGY);
    if (!name || kcal <= 0) continue;
    out.push({
      name:            titleCase(name).slice(0, 120),
      caloriesPer100g: kcal,
      protein:         pick(f.foodNutrients, N_PROTEIN),
      carbs:           pick(f.foodNutrients, N_CARB),
      fat:             pick(f.foodNutrients, N_FAT),
      fibre:           pick(f.foodNutrients, N_FIBRE),
      source:          'usda',
    });
  }
  return out;
}

// ─── Open Food Facts (fallback) ─────────────────────────────────────────────
// Free, no key. Used when USDA returns nothing.

const OFF_URL = 'https://search.openfoodfacts.org/search';

interface OFFNutriments {
  'energy-kcal_100g'?: number | string;
  proteins_100g?: number | string;
  carbohydrates_100g?: number | string;
  fat_100g?: number | string;
  fiber_100g?: number | string;
}
interface OFFProduct { product_name?: string; brands?: string | string[]; nutriments?: OFFNutriments }

async function searchOFF(query: string): Promise<NewFood[]> {
  const url =
    `${OFF_URL}?q=${encodeURIComponent(query)}` +
    `&page_size=20&fields=product_name,brands,nutriments`;

  const body = await getJSON<{ hits?: OFFProduct[] }>(url, {
    'User-Agent': 'Thali/0.1 (calorie tracker)',
  });
  const out: NewFood[] = [];
  for (const p of body.hits ?? []) {
    const name = p.product_name?.trim();
    const kcal = Number(p.nutriments?.['energy-kcal_100g']);
    if (!name || !Number.isFinite(kcal) || kcal <= 0) continue;
    const brandsArr = Array.isArray(p.brands) ? p.brands : p.brands ? p.brands.split(',') : [];
    const brand = brandsArr[0]?.trim();
    out.push({
      name:            (brand ? `${name} (${brand})` : name).slice(0, 120),
      caloriesPer100g: round2(kcal),
      protein:         num(p.nutriments?.proteins_100g),
      carbs:           num(p.nutriments?.carbohydrates_100g),
      fat:             num(p.nutriments?.fat_100g),
      fibre:           num(p.nutriments?.fiber_100g),
      source:          'openfoodfacts',
    });
  }
  return out;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toResult(f: Food): FoodResult {
  return {
    id:              Number(f.id),
    name:            f.name,
    caloriesPer100g: Number(f.caloriesPer100g),
    protein:         Number(f.protein),
    carbs:           Number(f.carbs),
    fat:             Number(f.fat),
    fibre:           Number(f.fibre),
    source:          f.source,
  };
}

/**
 * Best-effort external lookup, most relevant first:
 *   1. generic USDA foods, every query word required   → "white rice" ⇒ "Rice, White, …"
 *   2. branded USDA, still requiring every word        → only to top up a thin list
 *   3. generic USDA with the words relaxed             → partial phrases
 *   4. Open Food Facts                                 → USDA knows nothing
 * Steps 1 and 2 run side by side so the slow leg is paid once, not twice.
 * Never throws while any step produced results.
 */
async function fetchFromApis(query: string): Promise<NewFood[]> {
  const multiWord = queryTokens(query).length > 1;
  let usdaFailed = false;

  const tryUSDA = async (dataType: string[], requireAllWords: boolean, pageSize?: number) => {
    try {
      return await searchUSDA(query, dataType, requireAllWords, pageSize);
    } catch (err) {
      usdaFailed = true;
      console.warn('[nutrition] USDA failed:', (err as Error).message);
      return [] as NewFood[];
    }
  };

  const [generic, branded] = await Promise.all([
    tryUSDA(FDC_GENERIC, multiWord),
    tryUSDA(FDC_BRANDED, multiWord, 15),
  ]);
  const out = generic.length >= 8 ? generic : [...generic, ...branded];
  if (out.length === 0 && multiWord) out.push(...await tryUSDA(FDC_GENERIC, false));
  if (out.length > 0) return out;

  try {
    return await searchOFF(query);
  } catch (err) {
    console.warn('[nutrition] OFF failed:', (err as Error).message);
    // Only surface an error if BOTH sources failed AND we have nothing.
    if (usdaFailed) throw new Error('Food lookup is temporarily unavailable. Please try again.');
    return [];
  }
}

// ─── In-memory caches ───────────────────────────────────────────────────────
// Per process, so they reset on a restart — that only costs one slow search.

class TtlCache<V> {
  private map = new Map<string, { at: number; value: V }>();
  constructor(private max: number, private ttlMs: number) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.at > this.ttlMs) { this.map.delete(key); return undefined; }
    // Re-insert so the Map's insertion order doubles as LRU order.
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key: string, value: V): void {
    this.map.delete(key);
    this.map.set(key, { at: Date.now(), value });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  clear(): void { this.map.clear(); }
}

// USDA/OFF answers barely change — keep them a day, keyed by the API query.
const apiCache = new TtlCache<FoodResult[]>(500, 24 * 60 * 60 * 1000);
// Final ranked answers — short-lived so new custom foods surface quickly.
const resultCache = new TtlCache<SearchOutcome>(400, 10 * 60 * 1000);
// Identical lookups already on the wire share one request.
const inflight = new Map<string, Promise<FoodResult[] | null>>();

// Every word used in a food name, with how many names use it. Feeds the spell
// corrector, so "chiken" becomes "chicken" because "chicken" is a real word here.
const VOCAB_TTL = 30 * 60 * 1000;
let vocab = new Map<string, number>();
let vocabAt = 0;
let vocabLoading: Promise<void> | null = null;

function addToVocab(names: string[]): void {
  for (const name of names) {
    for (const w of tokenize(name)) {
      if (w.length >= 3 && !/^\d+$/.test(w)) vocab.set(w, (vocab.get(w) ?? 0) + 1);
    }
  }
}

async function loadVocab(): Promise<void> {
  const rows = await prisma.$queryRaw<{ word: string; n: number }[]>`
    SELECT word, COUNT(*)::int AS n
    FROM (SELECT regexp_split_to_table(lower(name), '[^a-z0-9]+') AS word FROM foods) w
    WHERE length(word) >= 3 AND word !~ '^[0-9]+$'
    GROUP BY word
  `;
  const next = new Map<string, number>();
  for (const r of rows) next.set(r.word, Number(r.n));
  // Regional terms and their translations are always "real" words.
  for (const [k, v] of Object.entries(SYNONYMS)) {
    next.set(k, Math.max(next.get(k) ?? 0, 1));
    for (const w of tokenize(v)) next.set(w, Math.max(next.get(w) ?? 0, 1));
  }
  vocab = next;
  vocabAt = Date.now();
}

async function getVocab(): Promise<Map<string, number>> {
  if (vocabAt && Date.now() - vocabAt < VOCAB_TTL) return vocab;
  if (!vocabLoading) {
    vocabLoading = loadVocab()
      .catch(err => console.warn('[nutrition] vocab load failed:', (err as Error).message))
      .finally(() => { vocabLoading = null; });
  }
  // Serve the previous copy while a refresh runs; only the very first search waits.
  if (vocabAt) return vocab;
  await vocabLoading;
  return vocab;
}

// ─── Public API ─────────────────────────────────────────────────────────────

// Persist API results so their rows have ids the log can point at. Two
// round-trips however many rows — the pooled DATABASE_URL runs with
// connection_limit=1, so a per-row upsert loop used to dominate search time.
async function persist(items: NewFood[]): Promise<FoodResult[]> {
  const byKey = new Map<string, NewFood>();
  for (const it of items) {
    const k = `${it.name}::${it.source}`;
    if (!byKey.has(k)) byKey.set(k, it);
  }
  const rows = [...byKey.values()];
  if (rows.length === 0) return [];

  await prisma.food.createMany({ data: rows, skipDuplicates: true });
  const saved = await prisma.food.findMany({
    where: { OR: rows.map(r => ({ name: r.name, source: r.source })) },
  });
  return saved.map(toResult);
}

/** External results for one query: memory cache → in-flight share → APIs. */
async function apiResults(query: string): Promise<FoodResult[] | null> {
  const key = normalize(query);
  const cached = apiCache.get(key);
  if (cached) return cached;

  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        const found = await persist(await fetchFromApis(query));
        apiCache.set(key, found);
        addToVocab(found.map(f => f.name));
        return found;
      } catch (err) {
        console.warn('[nutrition] API search failed:', (err as Error).message);
        return null;   // tolerate — fall back to DB-only
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, pending);
  }
  return pending;
}

/**
 * Candidate rows from the local cache for every spelling of the query.
 *
 * Matching is done on a separator-stripped, lower-cased copy of the name, so
 * casing and spacing never decide a hit: "vadapav", "Vada Pav" and "VADA-PAV"
 * all reach the same row. Individual query words are matched too, so a
 * multi-word query still finds names that only carry some of them. Rows that
 * start with the query, then short names, come first so the LIMIT never cuts
 * the obvious answer.
 */
async function searchCache(queries: string[]): Promise<Food[]> {
  const NORM = Prisma.sql`regexp_replace(lower(name), '[^a-z0-9]+', '', 'g')`;
  const patterns = new Set<string>();
  const heads: string[] = [];
  for (const q of queries) {
    const qSq = squash(q);
    if (!qSq) continue;
    patterns.add(qSq);
    heads.push(qSq);
    for (const t of queryTokens(q)) if (t.length >= 2) patterns.add(t);
  }
  if (patterns.size === 0) return [];

  const conds = [...patterns].map(p => Prisma.sql`${NORM} LIKE ${`%${p}%`}`);
  const headConds = heads.map(h => Prisma.sql`${NORM} LIKE ${`${h}%`}`);

  return prisma.$queryRaw<Food[]>`
    SELECT id, name, calories_per_100g AS "caloriesPer100g", protein, carbs, fat, fibre, source
    FROM foods
    WHERE ${Prisma.join(conds, ' OR ')}
    ORDER BY (${Prisma.join(headConds, ' OR ')}) DESC, length(name) ASC
    LIMIT 400
  `;
}

export interface SearchOutcome {
  results: FoodResult[];
  /** The spelling actually searched when the query was auto-corrected. */
  corrected: string | null;
}

/**
 * Search for foods from BOTH the local DB (custom + cached) AND the live APIs,
 * merged, then ranked by how well each name actually answers the query.
 *
 *  • Typos are corrected against words that really occur in food names.
 *  • Regional words ("aloo", "dahi") are also searched as their database term.
 *  • `fast` skips the live APIs — the UI shows those answers within a few
 *    hundred ms while the full search is still on its way.
 */
export async function searchFoods(query: string, opts: { fast?: boolean } = {}): Promise<SearchOutcome> {
  const norm = normalize(query);
  const fullKey = `a:${norm}`;
  const key = opts.fast ? `f:${norm}` : fullKey;
  // A full answer is also the best possible fast answer.
  const memo = resultCache.get(fullKey) ?? (opts.fast ? resultCache.get(key) : undefined);
  if (memo) return memo;

  const words      = await getVocab();
  const corrected  = correctQuery(query, words);
  const base       = corrected ?? query;
  const translated = translateQuery(base);
  const variants   = [...new Set([query, base, ...(translated ? [translated] : [])])];

  // Run DB and external lookups together; the API call is the slow leg.
  const [cached, apiFound] = await Promise.all([
    searchCache(variants).catch(err => {
      console.warn('[nutrition] cache search failed:', (err as Error).message);
      return [] as Food[];
    }),
    opts.fast
      ? Promise.resolve([] as FoodResult[])
      : Promise.all([apiResults(base), translated ? apiResults(translated) : Promise.resolve(null)])
          .then(([a, b]) => (a === null && b === null ? null : [...(a ?? []), ...(b ?? [])])),
  ]);

  const dbResults = cached.map(toResult);
  const fromApis  = apiFound ?? [];

  // Both sources empty AND the API actually errored → surface the failure.
  if (dbResults.length === 0 && apiFound === null) {
    throw new Error('Food lookup is temporarily unavailable. Please try again.');
  }

  // What was typed outranks the corrected spelling, which outranks the translation.
  const relevance = (name: string) => {
    let s = scoreName(name, query);
    if (corrected)  s = Math.max(s, scoreName(name, corrected) - 600);
    if (translated) s = Math.max(s, scoreName(name, translated) - 900);
    return s;
  };

  // Merge, dedup by name (case/spacing-insensitive), keeping the best-scoring
  // row for each dish, then rank everything by relevance to the query.
  const best = new Map<string, { food: FoodResult; score: number }>();
  for (const f of [...dbResults, ...fromApis]) {
    const nameScore = relevance(f.name);
    if (nameScore <= MIN_SCORE) continue;
    const score = nameScore + sourceBonus(f.source);
    const k     = squash(f.name);
    const prev  = best.get(k);
    if (!prev || score > prev.score) best.set(k, { food: f, score });
  }

  const outcome: SearchOutcome = {
    results: [...best.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(e => e.food),
    corrected: corrected && normalize(corrected) !== norm ? corrected : null,
  };
  // Don't pin an answer that came back without its API half.
  if (opts.fast || apiFound !== null) resultCache.set(key, outcome);
  return outcome;
}

export interface CustomFoodInput {
  name:            string;
  caloriesPer100g: number;
  protein:         number;
  carbs:           number;
  fat:             number;
  fibre:           number;
}

/**
 * Persist a custom "Others" dish. Shared globally — once any user adds it, it
 * shows up in everyone's searches. Re-adding the same name overwrites it.
 */
export async function createCustomFood(input: CustomFoodInput): Promise<FoodResult> {
  const data = {
    name:            titleCase(input.name.trim()).slice(0, 120),
    caloriesPer100g: round2(input.caloriesPer100g),
    protein:         round2(input.protein),
    carbs:           round2(input.carbs),
    fat:             round2(input.fat),
    fibre:           round2(input.fibre),
    source:          'custom',
  };
  const row = await prisma.food.upsert({
    where:  { name_source: { name: data.name, source: 'custom' } },
    update: data,
    create: data,
  });
  // Make the new dish findable straight away, misspelt or not.
  resultCache.clear();
  addToVocab([row.name]);
  return toResult(row);
}

/** Fetch a single food by ID (used internally by foodLog service). */
export async function getFoodById(id: bigint): Promise<Food> {
  return prisma.food.findUniqueOrThrow({ where: { id } });
}
