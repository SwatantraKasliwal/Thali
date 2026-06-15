export const COLORS = {
  cal: '#10b981',
  protein: '#6366f1',
  carbs: '#f59e0b',
  fat: '#f43f5e',
  fibre: '#14b8a6',
  over: '#ef4444',
} as const;

export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
export type Meal = typeof MEALS[number];
