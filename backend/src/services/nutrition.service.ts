import { env } from '../config/env';
import { getJSON, postJSON } from '../config/http';
import { prisma } from '../db/client';
import { Food, Prisma } from '@prisma/client';
import { scoreName, sourceBonus, squash, queryTokens, MIN_SCORE } from './foodSearch';

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
 * Best-effort external lookup, cheapest-and-most-relevant first:
 *   1. generic USDA foods, every query word required   → "white rice" ⇒ "Rice, White, …"
 *   2. branded USDA, still requiring every word        → only to top up a thin list
 *   3. generic USDA with the words relaxed             → typos / partial phrases
 *   4. Open Food Facts                                 → USDA knows nothing
 * Never throws while any step produced results.
 */
async function fetchFromApis(query: string): Promise<NewFood[]> {
  const multiWord = queryTokens(query).length > 1;
  const out: NewFood[] = [];
  let usdaFailed = false;

  const tryUSDA = async (dataType: string[], requireAllWords: boolean, pageSize?: number) => {
    try {
      out.push(...await searchUSDA(query, dataType, requireAllWords, pageSize));
    } catch (err) {
      usdaFailed = true;
      console.warn('[nutrition] USDA failed:', (err as Error).message);
    }
  };

  await tryUSDA(FDC_GENERIC, multiWord);
  if (out.length < 8) await tryUSDA(FDC_BRANDED, multiWord, 15);
  if (out.length === 0 && multiWord) await tryUSDA(FDC_GENERIC, false);
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

// ─── Public API ─────────────────────────────────────────────────────────────

// Persist API results so repeat searches are instant. Sequential — the pooled
// DATABASE_URL runs with connection_limit=1.
async function persist(items: NewFood[]): Promise<FoodResult[]> {
  const byKey = new Map<string, NewFood>();
  for (const it of items) {
    const k = `${it.name}::${it.source}`;
    if (!byKey.has(k)) byKey.set(k, it);
  }
  const saved: Food[] = [];
  for (const data of byKey.values()) {
    saved.push(
      await prisma.food.upsert({
        where:  { name_source: { name: data.name, source: data.source } },
        update: data,
        create: data,
      })
    );
  }
  return saved.map(toResult);
}

/**
 * Candidate rows from the local cache.
 *
 * Matching is done on a separator-stripped, lower-cased copy of the name, so
 * casing and spacing never decide a hit: "vadapav", "Vada Pav" and "VADA-PAV"
 * all reach the same row. Individual query words are matched too, so a
 * multi-word query still finds names that only carry some of them.
 */
async function searchCache(query: string): Promise<Food[]> {
  const qSq = squash(query);
  if (!qSq) return [];

  const NORM = Prisma.sql`regexp_replace(lower(name), '[^a-z0-9]+', '', 'g')`;
  const conds: Prisma.Sql[] = [Prisma.sql`${NORM} LIKE ${`%${qSq}%`}`];
  for (const t of queryTokens(query)) {
    if (t.length >= 2) conds.push(Prisma.sql`${NORM} LIKE ${`%${t}%`}`);
  }

  return prisma.$queryRaw<Food[]>`
    SELECT id, name, calories_per_100g AS "caloriesPer100g", protein, carbs, fat, fibre, source
    FROM foods
    WHERE ${Prisma.join(conds, ' OR ')}
    LIMIT 400
  `;
}

/**
 * Search for foods from BOTH the local DB (custom + cached) AND the live APIs,
 * merged, then ranked by how well each name actually answers the query. The DB
 * is never the sole source — fresh API matches always surface too.
 */
export async function searchFoods(query: string): Promise<FoodResult[]> {
  // Run DB and external lookups together; the API call is the slow leg.
  const [cached, apiResult] = await Promise.all([
    searchCache(query).catch(err => {
      console.warn('[nutrition] cache search failed:', (err as Error).message);
      return [] as Food[];
    }),
    fetchFromApis(query).catch(err => {
      console.warn('[nutrition] API search failed:', (err as Error).message);
      return null;   // tolerate — fall back to DB-only
    }),
  ]);

  const dbResults  = cached.map(toResult);
  const apiResults = apiResult ? await persist(apiResult) : [];

  // Both sources empty AND the API actually errored → surface the failure.
  if (dbResults.length === 0 && apiResult === null) {
    throw new Error('Food lookup is temporarily unavailable. Please try again.');
  }

  // Merge, dedup by name (case/spacing-insensitive), keeping the best-scoring
  // row for each dish, then rank everything by relevance to the query.
  const best = new Map<string, { food: FoodResult; score: number }>();
  for (const f of [...dbResults, ...apiResults]) {
    const nameScore = scoreName(f.name, query);
    if (nameScore <= MIN_SCORE) continue;
    const score = nameScore + sourceBonus(f.source);
    const key   = squash(f.name);
    const prev  = best.get(key);
    // Same dish from two sources → keep the higher-ranked one, but always
    // prefer a row that already lives in the DB cache over a duplicate.
    if (!prev || score > prev.score) best.set(key, { food: f, score });
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map(e => e.food);
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
  return toResult(row);
}

/** Fetch a single food by ID (used internally by foodLog service). */
export async function getFoodById(id: bigint): Promise<Food> {
  return prisma.food.findUniqueOrThrow({ where: { id } });
}
