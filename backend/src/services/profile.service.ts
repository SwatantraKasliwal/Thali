import { Goal, Sex } from '@prisma/client';
import { prisma } from '../db/client';

export interface ProfileInput {
  name?: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: number;
  goal: Goal;
}

// ─── Mifflin-St Jeor → TDEE → macro targets ──────────────────────────────
// Mirrors computeTargets() in frontend/src/lib/nutrition.ts — keep in sync.

const ACTIVITY_LEVELS   = [1.2, 1.375, 1.55, 1.725, 1.9];
const PROTEIN_PER_KG    = [1.0, 1.2, 1.4, 1.6, 1.8];   // g/kg per level above
const CUT_PROTEIN_BONUS = 0.4;
const GOAL_ADJUST: Record<Goal, number> = { cut: -450, maintain: 0, bulk: 350 };
const MIN_CUT_CAL: Record<Sex, number>  = { male: 1500, female: 1200 };

function round1(n: number) { return Math.round(n * 10) / 10; }

function computeTargets(input: ProfileInput) {
  const { sex, age, heightCm, weightKg, activityLevel, goal } = input;
  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const tdee  = bmr * activityLevel;
  // A cut stops at the safe minimum — or at TDEE, when TDEE is already below it.
  const floor = goal === 'cut' ? Math.min(tdee, MIN_CUT_CAL[sex]) : 0;
  const cal   = Math.round(Math.max(tdee + GOAL_ADJUST[goal], floor) / 10) * 10;

  // Protein follows the nearest activity level (+ a bump on a cut), dosed on
  // body weight capped at BMI 25 for this height.
  const level = ACTIVITY_LEVELS.reduce((best, lvl, i) =>
    Math.abs(lvl - activityLevel) < Math.abs(ACTIVITY_LEVELS[best] - activityLevel) ? i : best, 0);
  const perKg   = round1(PROTEIN_PER_KG[level] + (goal === 'cut' ? CUT_PROTEIN_BONUS : 0));
  const basisKg = round1(Math.min(weightKg, 25 * (heightCm / 100) ** 2));

  const protein = Math.round(basisKg * perKg);
  const fat     = Math.round((cal * 0.27) / 9);
  const carbs   = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));
  // IOM: 14 g fibre per 1000 kcal, held within the 25–38 g adult range.
  const fibre   = Math.min(38, Math.max(25, Math.round((cal * 14) / 1000)));

  return { calTarget: cal, proteinTarget: protein, carbTarget: carbs, fatTarget: fat, fibreTarget: fibre };
}

// ─── Data-access ──────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  return prisma.profile.findUnique({ where: { id: userId } });
}

export async function upsertProfile(userId: string, input: ProfileInput) {
  const targets = computeTargets(input);
  const data = {
    name:          input.name ?? null,
    sex:           input.sex,
    age:           input.age,
    heightCm:      input.heightCm,
    weightKg:      input.weightKg,
    activityLevel: input.activityLevel,
    goal:          input.goal,
    ...targets,
  };
  return prisma.profile.upsert({
    where:  { id: userId },
    create: { id: userId, ...data },
    update: data,
  });
}
