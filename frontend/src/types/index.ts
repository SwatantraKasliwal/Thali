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

export interface LogEntry {
  id: string;
  date: string;        // YYYY-MM-DD
  meal: string;
  foodId: number;
  name: string;
  qty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

// Field names match the backend (Prisma camelCase of snake_case columns)
export interface Profile {
  sex: 'male' | 'female';
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: number;
  goal: 'cut' | 'maintain' | 'bulk';
  name?: string;
}

export interface Targets {
  bmr: number;
  tdee: number;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

export interface DaySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

export interface WeightEntry {
  id: number;
  date: string;        // YYYY-MM-DD
  weightKg: number;
}

// A meal the user deliberately skipped (fasting) — counts toward consistency.
export interface FastEntry {
  date: string;        // YYYY-MM-DD
  meal: string;
}

// ─── Supplements ──────────────────────────────────────────────────────────

export const SUPPLEMENT_UNITS = ['g', 'mg', 'ml', 'capsule', 'tablet', 'scoop'] as const;
export type SupplementUnit = typeof SUPPLEMENT_UNITS[number];

export interface SupplementMacros {
  amount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

// One dose/macro revision, effective from a day onward. Appended on every edit
// so past days keep the amounts that were actually taken.
export interface SupplementVersion extends SupplementMacros {
  effectiveFrom: string;   // YYYY-MM-DD
}

export interface Supplement extends SupplementMacros {
  id: string;
  name: string;
  unit: SupplementUnit | string;
  startDate: string;         // first day it must be ticked
  endDate: string | null;    // last required day; null = still active
  deleted: boolean;          // soft-deleted — history only, no longer required
  versions: SupplementVersion[];
}

// One "took it" tick, with the dose in force that day snapshotted onto it.
export interface SupplementLog extends SupplementMacros {
  id: string;
  supplementId: string;
  date: string;              // YYYY-MM-DD
}

// Payload for adding a supplement / revising its dose.
export interface SupplementInput extends SupplementMacros {
  name: string;
  unit: SupplementUnit | string;
}

// Payload for a user-created "Others" dish (values per 100g).
export interface CustomFoodInput {
  name: string;
  caloriesPer100g: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

export type TabId = 'today' | 'week' | 'month' | 'profile';

// Month-view range selector
export type MonthRange = 'month' | 'lastMonth' | '3m' | '6m' | 'year' | 'all';
