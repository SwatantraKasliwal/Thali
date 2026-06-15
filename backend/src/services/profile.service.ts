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

function computeTargets(input: ProfileInput) {
  const { sex, age, heightCm, weightKg, activityLevel, goal } = input;
  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const tdee = bmr * activityLevel;
  const adj  = goal === 'cut' ? -450 : goal === 'bulk' ? 350 : 0;
  const cal  = Math.round((tdee + adj) / 10) * 10;

  const protein = Math.round(weightKg * 1.8);
  const fat     = Math.round((cal * 0.27) / 9);
  const carbs   = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));

  return { calTarget: cal, proteinTarget: protein, carbTarget: carbs, fatTarget: fat, fibreTarget: 30 };
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
