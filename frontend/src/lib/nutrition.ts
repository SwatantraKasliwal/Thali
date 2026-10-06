import { LogEntry, Profile, Targets, DaySummary, SupplementLog } from '@/types';

const round1 = (n: number) => Math.round(n * 10) / 10;

// The five canonical activity multipliers (must match the <option> values
// rendered in the profile/onboarding selects).
export const ACTIVITY_LEVELS = [1.2, 1.375, 1.55, 1.725, 1.9] as const;

// Protein (g per kg) for each level above — a little over the 0.8 g RDA when
// sedentary, climbing through the ISSN 1.4–2.0 g/kg band for people who train.
const PROTEIN_PER_KG = [1.0, 1.2, 1.4, 1.6, 1.8] as const;
// An energy deficit raises the need: extra protein holds on to muscle on a cut.
export const CUT_PROTEIN_BONUS = 0.4;

export const GOAL_ADJUST: Record<Profile['goal'], number> = { cut: -450, maintain: 0, bulk: 350 };

// A cut never goes below these without medical supervision.
export const MIN_CUT_CAL: Record<Profile['sex'], number> = { male: 1500, female: 1200 };

// Snap a stored/raw multiplier to the nearest canonical value. Protects the
// <select> from falling back to its first option ("Sedentary") when an
// imprecise value (e.g. a legacy 1.38 / 1.73 row) matches no <option>.
export function snapActivityLevel(v: number): number {
  if (!Number.isFinite(v)) return 1.55;
  return ACTIVITY_LEVELS.reduce((best, lvl) =>
    Math.abs(lvl - v) < Math.abs(best - v) ? lvl : best
  );
}

/**
 * A day's totals. Ticked supplements carry their own macros, so checking one
 * off folds it straight into the day's calories and macros — no separate entry
 * to log.
 */
export function sumDay(
  logs: LogEntry[],
  iso: string,
  supplementLogs: SupplementLog[] = []
): DaySummary {
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
  for (const s of supplementLogs) {
    if (s.date === iso) {
      t.calories += s.calories;
      t.protein  += s.protein;
      t.carbs    += s.carbs;
      t.fat      += s.fat;
      t.fibre    += s.fibre;
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
  const tdee = bmr * p.activityLevel;
  const raw  = tdee + GOAL_ADJUST[p.goal];
  // A cut stops at the safe minimum — or at TDEE, when TDEE is already below it.
  const floor      = p.goal === 'cut' ? Math.min(tdee, MIN_CUT_CAL[p.sex]) : 0;
  const calFloored = raw < floor;
  const cal        = Math.round(Math.max(raw, floor) / 10) * 10;

  // Protein follows activity (and the goal), dosed on body weight — capped at
  // the weight a BMI of 25 gives for this height, since extra body fat adds
  // nothing to the need.
  const snapped        = snapActivityLevel(p.activityLevel);
  const level          = ACTIVITY_LEVELS.findIndex(l => l === snapped);
  const proteinPerKg   = round1(PROTEIN_PER_KG[level] + (p.goal === 'cut' ? CUT_PROTEIN_BONUS : 0));
  const bmi25Kg        = p.heightCm > 0 ? 25 * (p.heightCm / 100) ** 2 : Infinity;
  const proteinBasisKg = round1(Math.min(p.weightKg, bmi25Kg));
  const protein = Math.round(proteinBasisKg * proteinPerKg);
  const fat     = Math.round((cal * 0.27) / 9);
  const carbs   = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));
  // IOM: 14 g fibre per 1000 kcal, held within the 25–38 g adult range.
  const fibre   = Math.min(38, Math.max(25, Math.round((cal * 14) / 1000)));
  return {
    bmr: Math.round(bmr), tdee: Math.round(tdee), cal, protein, carbs, fat, fibre,
    proteinPerKg, proteinBasisKg, calFloored,
  };
}
