'use client';

import { Flame, BarChart3, TrendingUp, UserRound } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TabId } from '@/types';
import TodayView from '@/components/today/TodayView';
import WeekView from '@/components/week/WeekView';
import MonthView from '@/components/month/MonthView';
import ProfileView from '@/components/profile/ProfileView';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'today',   label: 'Today',   icon: Flame },
  { id: 'week',    label: 'Week',    icon: BarChart3 },
  { id: 'month',   label: 'Month',   icon: TrendingUp },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
        T
      </span>
      <div>
        <h1 className="text-sm font-bold text-slate-800 leading-tight">Thali</h1>
        <p className="text-xs text-slate-400 leading-tight">calorie &amp; macro tracker</p>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { tab, setTab } = useApp();
  const activeLabel = TABS.find(t => t.id === tab)?.label ?? '';

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-20">
        <div className="px-5 py-5 border-b border-slate-100">
          <Logo />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon size={19} strokeWidth={tab === id ? 2.5 : 2} />
              {label}
            </button>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">Indian food · INDB data</p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">

        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-4 py-3">
            <Logo />
          </div>
          <nav className="grid grid-cols-4 border-t border-slate-100">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs border-b-2 transition-colors ${
                  tab === id
                    ? 'text-emerald-600 border-emerald-600'
                    : 'text-slate-400 border-transparent'
                }`}
              >
                <Icon size={19} strokeWidth={tab === id ? 2.4 : 2} />
                {label}
              </button>
            ))}
          </nav>
        </header>

        {/* Desktop page title bar */}
        <div className="hidden lg:flex items-center px-8 py-5 bg-white border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">{activeLabel}</h2>
        </div>

        {/* Content */}
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 pb-10 lg:px-8 lg:py-6">
          {tab === 'today'   && <TodayView />}
          {tab === 'week'    && <WeekView />}
          {tab === 'month'   && <MonthView />}
          {tab === 'profile' && <ProfileView />}
        </main>
      </div>
    </div>
  );
}
