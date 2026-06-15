import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import {
  Flame, BarChart3, TrendingUp, UserRound, Plus, X, ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";

/* ---------- palette ---------- */
const C = {
  cal: "#10b981", protein: "#6366f1", carbs: "#f59e0b",
  fat: "#f43f5e", fibre: "#14b8a6", over: "#ef4444",
};

/* ---------- sample foods (per 100g) — replace with the INDB dataset ---------- */
const FOODS = [
  { id: "idli",        name: "Idli",            cal: 130, p: 4,   c: 26,  f: 1,   fib: 1,   tags: ["breakfast"] },
  { id: "dosa",        name: "Plain dosa",      cal: 165, p: 4,   c: 28,  f: 4,   fib: 2,   tags: ["breakfast"] },
  { id: "masaladosa",  name: "Masala dosa",     cal: 185, p: 4,   c: 30,  f: 6,   fib: 2,   tags: ["breakfast"] },
  { id: "poha",        name: "Poha",            cal: 130, p: 2.5, c: 27,  f: 1.5, fib: 1,   tags: ["breakfast"] },
  { id: "upma",        name: "Upma",            cal: 145, p: 4,   c: 24,  f: 4,   fib: 2,   tags: ["breakfast"] },
  { id: "paratha",     name: "Aloo paratha",    cal: 320, p: 6,   c: 40,  f: 15,  fib: 4,   tags: ["breakfast"] },
  { id: "egg",         name: "Boiled egg",      cal: 155, p: 13,  c: 1.1, f: 11,  fib: 0,   tags: ["breakfast","snack"] },
  { id: "roti",        name: "Roti / chapati",  cal: 297, p: 9,   c: 46,  f: 7,   fib: 5,   tags: ["side"] },
  { id: "rice",        name: "Plain rice",      cal: 130, p: 2.7, c: 28,  f: 0.3, fib: 0.4, tags: ["main"] },
  { id: "vbiryani",    name: "Veg biryani",     cal: 165, p: 4,   c: 27,  f: 5,   fib: 2,   tags: ["main"] },
  { id: "cbiryani",    name: "Chicken biryani", cal: 200, p: 9,   c: 26,  f: 7,   fib: 1.5, tags: ["main"] },
  { id: "dal",         name: "Dal (toor)",      cal: 120, p: 7,   c: 18,  f: 2,   fib: 4,   tags: ["side"] },
  { id: "dalmakhani",  name: "Dal makhani",     cal: 230, p: 9,   c: 18,  f: 13,  fib: 5,   tags: ["side"] },
  { id: "rajma",       name: "Rajma",           cal: 140, p: 8,   c: 22,  f: 1,   fib: 6,   tags: ["side"] },
  { id: "chole",       name: "Chole",           cal: 180, p: 9,   c: 22,  f: 6,   fib: 7,   tags: ["side"] },
  { id: "paneer",      name: "Paneer curry",    cal: 265, p: 18,  c: 6,   f: 20,  fib: 0,   tags: ["side"] },
  { id: "palak",       name: "Palak paneer",    cal: 180, p: 9,   c: 8,   f: 13,  fib: 3,   tags: ["side"] },
  { id: "chicken",     name: "Chicken curry",   cal: 180, p: 15,  c: 5,   f: 11,  fib: 1,   tags: ["side"] },
  { id: "aloo",        name: "Aloo sabzi",      cal: 120, p: 2,   c: 18,  f: 5,   fib: 2,   tags: ["side"] },
  { id: "sambar",      name: "Sambar",          cal: 85,  p: 4,   c: 12,  f: 2,   fib: 3,   tags: ["side"] },
  { id: "curd",        name: "Curd",            cal: 60,  p: 3.5, c: 4.7, f: 3.3, fib: 0,   tags: ["side","snack"] },
  { id: "raita",       name: "Raita",           cal: 60,  p: 2.5, c: 5,   f: 3,   fib: 0.5, tags: ["side"] },
  { id: "banana",      name: "Banana",          cal: 89,  p: 1.1, c: 23,  f: 0.3, fib: 2.6, tags: ["snack"] },
  { id: "samosa",      name: "Samosa",          cal: 260, p: 5,   c: 32,  f: 13,  fib: 3,   tags: ["snack"] },
];

/* ---------- helpers ---------- */
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const round1 = (n) => Math.round(n * 10) / 10;

function macrosFor(foodId, qty) {
  const f = FOODS.find((x) => x.id === foodId);
  const k = (Number(qty) || 0) / 100;
  return {
    calories: Math.round(f.cal * k),
    protein: round1(f.p * k),
    carbs: round1(f.c * k),
    fat: round1(f.f * k),
    fibre: round1(f.fib * k),
  };
}

function sumDay(logs, iso) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
  for (const l of logs) if (l.date === iso) {
    t.calories += l.calories; t.protein += l.protein;
    t.carbs += l.carbs; t.fat += l.fat; t.fibre += l.fibre;
  }
  return {
    calories: Math.round(t.calories), protein: round1(t.protein),
    carbs: round1(t.carbs), fat: round1(t.fat), fibre: round1(t.fibre),
  };
}

function computeTargets(p) {
  const bmr = p.sex === "male"
    ? 10 * p.weight + 6.25 * p.height - 5 * p.age + 5
    : 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
  const tdee = bmr * p.activity;
  const adj = p.goal === "cut" ? -450 : p.goal === "bulk" ? 350 : 0;
  const cal = Math.round((tdee + adj) / 10) * 10;
  const protein = Math.round(p.weight * 1.8);
  const fat = Math.round((cal * 0.27) / 9);
  const carbs = Math.round((cal - protein * 4 - fat * 9) / 4);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), cal, protein, carbs, fat, fibre: 30 };
}

/* ---------- seed ~5 weeks of logs ---------- */
function seed() {
  const logs = [];
  let id = 1;
  const base = new Date();
  const byTag = (t) => FOODS.filter((f) => f.tags.includes(t));
  const bf = byTag("breakfast"), mains = byTag("main"), sides = byTag("side"), snacks = byTag("snack");
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const q = (lo, hi) => Math.round((lo + Math.random() * (hi - lo)) / 10) * 10;
  const roti = FOODS.find((f) => f.id === "roti");

  for (let i = 34; i >= 0; i--) {
    if (i !== 0 && Math.random() < 0.12) continue;
    const date = toISO(addDays(base, -i));
    const add = (meal, food, qty) =>
      logs.push({ id: id++, date, meal, foodId: food.id, name: food.name, qty, ...macrosFor(food.id, qty) });

    add("Breakfast", pick(bf), q(120, 240));
    if (Math.random() < 0.5) add("Breakfast", pick(snacks), q(80, 150));
    add("Lunch", pick(mains), q(150, 250));
    add("Lunch", pick(sides), q(100, 180));
    if (Math.random() < 0.6) add("Lunch", roti, q(40, 120));
    add("Dinner", pick(mains), q(120, 200));
    add("Dinner", pick(sides), q(100, 170));
    if (Math.random() < 0.4) add("Dinner", pick(snacks), q(60, 120));
  }
  return logs;
}

/* ---------- small UI pieces ---------- */
function Ring({ value, max }) {
  const r = 72, c = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const over = value > max;
  const color = over ? C.over : C.cal;
  return (
    <div className="relative w-44 h-44">
      <svg viewBox="0 0 180 180" className="w-44 h-44 -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-800 tabular-nums">{value}</span>
        <span className="text-xs text-slate-400">of {max} kcal</span>
        <span className="mt-1 text-xs font-medium" style={{ color }}>
          {over ? `${value - max} over` : `${max - value} left`}
        </span>
      </div>
    </div>
  );
}

function MacroBar({ label, value, target, color }) {
  const pct = target ? Math.min(value / target, 1) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs text-slate-400 tabular-nums">
          <span className="text-slate-700 font-semibold">{Math.round(value)}</span>/{target}g
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

/* ---------- meal section with inline add ---------- */
function MealSection({ meal, items, onAdd, onDelete }) {
  const [open, setOpen] = useState(false);
  const [foodId, setFoodId] = useState(FOODS[0].id);
  const [qty, setQty] = useState("100");
  const total = Math.round(items.reduce((s, i) => s + i.calories, 0));
  const preview = macrosFor(foodId, qty);

  const submit = () => {
    if (!(Number(qty) > 0)) return;
    onAdd({ meal, foodId, qty: Number(qty) });
    setQty("100"); setOpen(false);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{meal}</h3>
          <span className="text-xs text-slate-400 tabular-nums">{total} kcal</span>
        </div>
        <button onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
          {open ? <X size={15} /> : <Plus size={15} />}{open ? "Close" : "Add"}
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <span className="text-slate-700">{i.name}</span>
                <span className="text-slate-400"> · {i.qty}g</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-500 tabular-nums">{i.calories} kcal</span>
                <button onClick={() => onDelete(i.id)} className="text-slate-300 hover:text-rose-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          <select value={foodId} onChange={(e) => setFoodId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-slate-50">
            {FOODS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex-1">
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none" />
              <span className="text-xs text-slate-400">grams</span>
            </div>
            <button onClick={submit}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Add
            </button>
          </div>
          <p className="text-xs text-slate-400 tabular-nums">
            ≈ {preview.calories} kcal · {preview.protein}p · {preview.carbs}c · {preview.fat}f
          </p>
        </div>
      )}
    </Card>
  );
}

/* ---------- views ---------- */
function TodayView({ logs, targets, selectedDate, setSelectedDate, onAdd, onDelete }) {
  const today = toISO(new Date());
  const t = sumDay(logs, selectedDate);
  const dayItems = (meal) => logs.filter((l) => l.date === selectedDate && l.meal === meal);
  const isToday = selectedDate === today;
  const label = isToday ? "Today" :
    new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setSelectedDate(toISO(addDays(new Date(selectedDate + "T00:00:00"), -1)))}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft size={18} /></button>
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <button disabled={isToday}
          onClick={() => setSelectedDate(toISO(addDays(new Date(selectedDate + "T00:00:00"), 1)))}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
      </div>

      <Card className="p-5 flex flex-col items-center">
        <Ring value={t.calories} max={targets.cal} />
        <div className="mt-5 w-full grid grid-cols-2 gap-x-5 gap-y-3">
          <MacroBar label="Protein" value={t.protein} target={targets.protein} color={C.protein} />
          <MacroBar label="Carbs" value={t.carbs} target={targets.carbs} color={C.carbs} />
          <MacroBar label="Fat" value={t.fat} target={targets.fat} color={C.fat} />
          <MacroBar label="Fibre" value={t.fibre} target={targets.fibre} color={C.fibre} />
        </div>
      </Card>

      {["Breakfast", "Lunch", "Dinner", "Snack"].map((m) => (
        <MealSection key={m} meal={m} items={dayItems(m)} onAdd={onAdd} onDelete={onDelete} />
      ))}
    </div>
  );
}

function Stat({ label, value, sub, color }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-bold tabular-nums" style={{ color: color || "#334155" }}>{value}</div>
      <div className="text-xs font-medium text-slate-600">{label}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </Card>
  );
}

function WeekView({ logs, targets }) {
  const data = useMemo(() => {
    const arr = []; const base = new Date();
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(base, -i);
      arr.push({ name: names[d.getDay()], ...sumDay(logs, toISO(d)) });
    }
    return arr;
  }, [logs]);

  const logged = data.filter((d) => d.calories > 0);
  const avgCal = logged.length ? Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length) : 0;
  const avgPro = logged.length ? Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length) : 0;
  const onTarget = logged.filter((d) => Math.abs(d.calories - targets.cal) <= targets.cal * 0.15).length;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">This week</h2>
      <Card className="p-4">
        <div className="text-xs font-medium text-slate-500 mb-3">Daily calories vs target</div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#f1f5f9" }}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <ReferenceLine y={targets.cal} stroke={C.cal} strokeDasharray="4 4" />
              <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.calories > targets.cal ? C.over : C.cal} fillOpacity={d.calories ? 0.85 : 0.2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Avg calories" value={avgCal} sub={`target ${targets.cal}`} />
        <Stat label="Avg protein" value={`${avgPro}g`} sub={`target ${targets.protein}g`} color={C.protein} />
        <Stat label="On target" value={`${onTarget}/${logged.length}`} sub="days" color={C.cal} />
      </div>
    </div>
  );
}

function MonthView({ logs, targets }) {
  const days = useMemo(() => {
    const arr = []; const base = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = addDays(base, -i);
      arr.push({ iso: toISO(d), label: String(d.getDate()), ...sumDay(logs, toISO(d)) });
    }
    return arr;
  }, [logs]);

  const logged = days.filter((d) => d.calories > 0);
  const avg = (key) => logged.length ? logged.reduce((s, d) => s + d[key], 0) / logged.length : 0;
  const macroData = [
    { name: "Protein", value: Math.round(avg("protein") * 4), color: C.protein },
    { name: "Carbs", value: Math.round(avg("carbs") * 4), color: C.carbs },
    { name: "Fat", value: Math.round(avg("fat") * 9), color: C.fat },
  ];

  const cellColor = (cal) => {
    if (!cal) return "#f1f5f9";
    const r = cal / targets.cal;
    if (r > 1.1) return C.over;
    if (r >= 0.6) return C.cal;
    return "#a7f3d0";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Last 30 days</h2>

      <Card className="p-4">
        <div className="text-xs font-medium text-slate-500 mb-3">Calorie trend</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <ReferenceLine y={targets.cal} stroke={C.cal} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="calories" stroke={C.cal} fill={C.cal} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500 mb-1">Avg macro split</div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={macroData} dataKey="value" innerRadius={28} outerRadius={48} paddingAngle={2}>
                  {macroData.map((m, i) => <Cell key={i} fill={m.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-3 text-xs">
            {macroData.map((m) => (
              <span key={m.name} className="flex items-center gap-1 text-slate-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />{m.name}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500 mb-2">Logging consistency</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => (
              <div key={d.iso} className="aspect-square rounded-sm" style={{ backgroundColor: cellColor(d.calories) }}
                title={`${d.label}: ${d.calories} kcal`} />
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-400">{logged.length}/30 days logged</div>
        </Card>
      </div>
    </div>
  );
}

function ProfileField({ label, children }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
      <span className="text-sm text-slate-600">{label}</span>{children}
    </div>
  );
}

function ProfileView({ profile, setProfile, targets }) {
  const upd = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const num = "w-20 text-right text-sm text-slate-800 bg-slate-50 rounded-lg px-2 py-1 outline-none border border-slate-200";
  const sel = "text-sm text-slate-800 bg-slate-50 rounded-lg px-2 py-1 outline-none border border-slate-200";

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-800">Your profile</h2>
      <Card className="px-4 py-1">
        <ProfileField label="Sex">
          <select value={profile.sex} onChange={(e) => upd("sex", e.target.value)} className={sel}>
            <option value="male">Male</option><option value="female">Female</option>
          </select>
        </ProfileField>
        <ProfileField label="Age"><input type="number" value={profile.age} onChange={(e) => upd("age", +e.target.value)} className={num} /></ProfileField>
        <ProfileField label="Height (cm)"><input type="number" value={profile.height} onChange={(e) => upd("height", +e.target.value)} className={num} /></ProfileField>
        <ProfileField label="Weight (kg)"><input type="number" value={profile.weight} onChange={(e) => upd("weight", +e.target.value)} className={num} /></ProfileField>
        <ProfileField label="Activity">
          <select value={profile.activity} onChange={(e) => upd("activity", +e.target.value)} className={sel}>
            <option value={1.2}>Sedentary</option><option value={1.375}>Light</option>
            <option value={1.55}>Moderate</option><option value={1.725}>Very active</option>
          </select>
        </ProfileField>
        <ProfileField label="Goal">
          <select value={profile.goal} onChange={(e) => upd("goal", e.target.value)} className={sel}>
            <option value="cut">Cut</option><option value="maintain">Maintain</option><option value="bulk">Bulk</option>
          </select>
        </ProfileField>
      </Card>

      <Card className="p-4">
        <div className="text-xs font-medium text-slate-500 mb-3">Your daily targets</div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-3xl font-bold text-slate-800 tabular-nums">{targets.cal}</div>
            <div className="text-xs text-slate-400">kcal / day</div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>BMR {targets.bmr}</div><div>TDEE {targets.tdee}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[["Protein", targets.protein, C.protein], ["Carbs", targets.carbs, C.carbs],
            ["Fat", targets.fat, C.fat], ["Fibre", targets.fibre, C.fibre]].map(([l, v, c]) => (
            <div key={l}>
              <div className="text-lg font-semibold tabular-nums" style={{ color: c }}>{v}g</div>
              <div className="text-xs text-slate-400">{l}</div>
            </div>
          ))}
        </div>
      </Card>
      <p className="text-xs text-slate-400 px-1">
        Targets recompute from your stats (Mifflin-St Jeor + activity, adjusted for goal) and feed every dashboard.
      </p>
    </div>
  );
}

/* ---------- app shell ---------- */
const TABS = [
  { id: "today", label: "Today", icon: Flame },
  { id: "week", label: "Week", icon: BarChart3 },
  { id: "month", label: "Month", icon: TrendingUp },
  { id: "profile", label: "Profile", icon: UserRound },
];

export default function App() {
  const [logs, setLogs] = useState(seed);
  const [tab, setTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState(toISO(new Date()));
  const [profile, setProfile] = useState({ sex: "male", age: 28, height: 175, weight: 72, activity: 1.55, goal: "maintain" });
  const targets = useMemo(() => computeTargets(profile), [profile]);

  const addLog = ({ meal, foodId, qty }) => {
    const f = FOODS.find((x) => x.id === foodId);
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), date: selectedDate, meal, foodId, name: f.name, qty, ...macrosFor(foodId, qty) }]);
  };
  const delLog = (id) => setLogs((prev) => prev.filter((l) => l.id !== id));

  return (
    <div className="bg-slate-100 flex justify-center font-sans min-h-screen">
      <div className="w-full max-w-md bg-slate-50">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="px-5 pt-4 pb-3 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">T</span>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-none">Thali</h1>
              <p className="text-xs text-slate-400">calorie &amp; macro tracker</p>
            </div>
          </div>
          <nav className="grid grid-cols-4">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs border-b-2 ${
                  tab === id ? "text-emerald-600 border-emerald-600" : "text-slate-400 border-transparent"}`}>
                <Icon size={19} strokeWidth={tab === id ? 2.4 : 2} />
                {label}
              </button>
            ))}
          </nav>
        </header>

        <main className="px-4 py-4 pb-10">
          {tab === "today" && (
            <TodayView logs={logs} targets={targets} selectedDate={selectedDate}
              setSelectedDate={setSelectedDate} onAdd={addLog} onDelete={delLog} />
          )}
          {tab === "week" && <WeekView logs={logs} targets={targets} />}
          {tab === "month" && <MonthView logs={logs} targets={targets} />}
          {tab === "profile" && <ProfileView profile={profile} setProfile={setProfile} targets={targets} />}
        </main>
      </div>
    </div>
  );
}
