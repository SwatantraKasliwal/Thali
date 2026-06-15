import { env } from '../config/env';
import { prisma } from '../db/client';
import { Food } from '@prisma/client';

// ─── API Ninjas response shape ────────────────────────────────────────────

interface NinjaItem {
  name: string;
  calories: number;
  serving_size_g: number;
  fat_total_g: number;
  protein_g: number;
  carbohydrates_total_g: number;
  fiber_g: number;
}

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

// Normalize API Ninjas values (which are per serving_size_g) → per 100 g
function normalize(item: NinjaItem): Omit<FoodResult, 'id'> {
  const factor = 100 / (item.serving_size_g || 100);
  return {
    name: item.name,
    caloriesPer100g: round2(item.calories * factor),
    protein:         round2(item.protein_g * factor),
    carbs:           round2(item.carbohydrates_total_g * factor),
    fat:             round2(item.fat_total_g * factor),
    fibre:           round2(item.fiber_g * factor),
    source:          'api-ninjas',
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }

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

// ─── Public API ───────────────────────────────────────────────────────────

/** Search for foods. Checks DB cache first, then falls back to API Ninjas. */
export async function searchFoods(query: string): Promise<FoodResult[]> {
  // 1. Return cached DB results if any exist
  const cached = await prisma.food.findMany({
    where: { name: { contains: query, mode: 'insensitive' } },
    take: 20,
  });
  if (cached.length > 0) return cached.map(toResult);

  // 2. Fetch from API Ninjas
  const url = `${env.NUTRITION_API_URL}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'X-Api-Key': env.NUTRITION_API_KEY },
  });

  if (!res.ok) throw new Error(`API Ninjas error: ${res.status}`);

  const items = (await res.json()) as NinjaItem[];
  if (!items.length) return [];

  // 3. Upsert into DB (so next search is instant)
  const upserted = await Promise.all(
    items.map(item => {
      const data = normalize(item);
      return prisma.food.upsert({
        where:  { name_source: { name: data.name, source: data.source } } as never,
        update: data,
        create: data,
      });
    })
  );

  return upserted.map(toResult);
}

/** Fetch a single food by ID (used internally by foodLog service). */
export async function getFoodById(id: bigint): Promise<Food> {
  const food = await prisma.food.findUniqueOrThrow({ where: { id } });
  return food;
}
