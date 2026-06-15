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

export type TabId = 'today' | 'week' | 'month' | 'profile';
