'use client';

import { useApp } from '@/context/AppContext';
import { Profile } from '@/types';
import { COLORS } from '@/lib/constants';
import Card from '@/components/ui/Card';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </div>
  );
}

const inputCls  = 'w-24 text-right text-sm text-slate-800 bg-slate-50 rounded-lg px-2 py-1.5 outline-none border border-slate-200 focus:border-emerald-400 transition-colors';
const selectCls = 'text-sm text-slate-800 bg-slate-50 rounded-lg px-2 py-1.5 outline-none border border-slate-200 focus:border-emerald-400 transition-colors';

export default function ProfileView() {
  const { profile, setProfile, targets } = useApp();
  const upd = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setProfile({ ...profile, [k]: v });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Your profile</h2>

      <Card className="px-4 py-1">
        <Field label="Sex">
          <select value={profile.sex} onChange={e => upd('sex', e.target.value as Profile['sex'])} className={selectCls}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
        <Field label="Age">
          <input type="number" value={profile.age} min={10} max={120}
            onChange={e => upd('age', +e.target.value)} className={inputCls} />
        </Field>
        <Field label="Height (cm)">
          <input type="number" value={profile.heightCm} min={100} max={250}
            onChange={e => upd('heightCm', +e.target.value)} className={inputCls} />
        </Field>
        <Field label="Weight (kg)">
          <input type="number" value={profile.weightKg} min={30} max={300}
            onChange={e => upd('weightKg', +e.target.value)} className={inputCls} />
        </Field>
        <Field label="Activity level">
          <select value={profile.activityLevel} onChange={e => upd('activityLevel', +e.target.value)} className={selectCls}>
            <option value={1.2}>Sedentary</option>
            <option value={1.375}>Lightly active</option>
            <option value={1.55}>Moderately active</option>
            <option value={1.725}>Very active</option>
            <option value={1.9}>Extremely active</option>
          </select>
        </Field>
        <Field label="Goal">
          <select value={profile.goal} onChange={e => upd('goal', e.target.value as Profile['goal'])} className={selectCls}>
            <option value="cut">Cut (lose weight)</option>
            <option value="maintain">Maintain</option>
            <option value="bulk">Bulk (gain weight)</option>
          </select>
        </Field>
      </Card>

      <Card className="p-4">
        <div className="text-xs font-medium text-slate-500 mb-3">Daily targets</div>
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-4xl font-bold text-slate-800 tabular-nums">{targets.cal}</div>
            <div className="text-xs text-slate-400 mt-0.5">kcal / day</div>
          </div>
          <div className="text-right text-xs text-slate-400 space-y-1">
            <div>BMR <span className="font-medium text-slate-600">{targets.bmr}</span></div>
            <div>TDEE <span className="font-medium text-slate-600">{targets.tdee}</span></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            ['Protein', targets.protein, COLORS.protein],
            ['Carbs',   targets.carbs,   COLORS.carbs],
            ['Fat',     targets.fat,     COLORS.fat],
            ['Fibre',   targets.fibre,   COLORS.fibre],
          ].map(([label, value, color]) => (
            <div key={label as string} className="bg-slate-50 rounded-xl py-3">
              <div className="text-xl font-bold tabular-nums" style={{ color: color as string }}>{value}g</div>
              <div className="text-xs text-slate-400 mt-0.5">{label as string}</div>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-slate-400 px-1 pb-2">
        Targets computed via Mifflin-St Jeor equation adjusted for activity and goal.
      </p>
    </div>
  );
}
