import { LogEntry, Profile, Targets, DaySummary } from '@/types';

const round1 = (n: number) => Math.round(n * 10) / 10;

export function sumDay(logs: LogEntry[], iso: string): DaySummary {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
  for (const l of logs) {
    if (l.date === iso) {
      t.calories += l.calories;
      t.protein  += l.protein;
      t.carbs    += l.carbs;
      t.fat      += l.fat;
      t.fibre    += l.fibre;
    }
  }
  return {
    calories: Math.round(t.calories),
    protein:  round1(t.protein),
    carbs:    round1(t.carbs),
    fat:      round1(t.fat),
    fibre:    round1(t.fibre),
  };
}

export function computeTargets(p: Profile): Targets {
  const bmr =
    p.sex === 'male'
      ? 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + 5
      : 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age - 161;
  const tdee    = bmr * p.activityLevel;
  const adj     = p.goal === 'cut' ? -450 : p.goal === 'bulk' ? 350 : 0;
  const cal     = Math.round((tdee + adj) / 10) * 10;
  const protein = Math.round(p.weightKg * 1.8);
  const fat     = Math.round((cal * 0.27) / 9);
  const carbs   = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), cal, protein, carbs, fat, fibre: 30 };
}
