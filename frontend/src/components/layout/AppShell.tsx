'use client';

import { Flame, BarChart3, TrendingUp, UserRound, LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { TabId } from '@/types';
import TodayView from '@/components/today/TodayView';
import WeekView from '@/components/week/WeekView';
import MonthView from '@/components/month/MonthView';
import ProfileView from '@/components/profile/ProfileView';
import ThemeToggle from '@/components/ui/ThemeToggle';
import StreakBadge from '@/components/ui/StreakBadge';
import Avatar from '@/components/ui/Avatar';
import Mark from '@/components/ui/Logo';
import { useAvatar } from '@/lib/useAvatar';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'today',   label: 'Today',   icon: Flame },
  { id: 'week',    label: 'Week',    icon: BarChart3 },
  { id: 'month',   label: 'Month',   icon: TrendingUp },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

function Logo() {
  return (
    <div className="group flex items-center gap-2.5 min-w-0">
      <Mark size={36} className="rounded-xl transition-transform duration-300 group-hover:-rotate-6" />
      <div className="min-w-0 animate-fade">
        <h1 className="font-brand text-base font-bold text-ink leading-tight tracking-wide truncate">Thali</h1>
        <p className="text-xs text-ink-muted leading-tight truncate">calorie &amp; macro tracker</p>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { tab, setTab, profile } = useApp();
  const { user, logout } = useAuth();
  const { avatarId } = useAvatar();
  const activeLabel = TABS.find(t => t.id === tab)?.label ?? '';
  const tabIndex = Math.max(0, TABS.findIndex(t => t.id === tab));
  const displayName = profile.name || user?.name || user?.email || '';

  // The Profile tab shows who you picked to be, not a generic person glyph.
  // Every icon sits in the same 24px box, so the larger avatar neither drops
  // the Profile label below the others nor shifts it sideways.
  const tabIcon = (id: TabId, Icon: React.ElementType, active: boolean) => (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
      {id === 'profile' ? (
        <Avatar
          id={avatarId}
          name={displayName}
          size={24}
          className={active ? 'rounded-full ring-2 ring-primary' : ''}
        />
      ) : (
        <Icon size={19} strokeWidth={active ? 2.5 : 2} />
      )}
    </span>
  );

  return (
    <div className="min-h-dvh-safe bg-app flex">
      {/* Soft colour fields behind everything — gives the glass something to blur. */}
      <div aria-hidden className="aurora" />

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-surface border-r border-line z-20 pt-safe pb-safe">
        <div className="px-5 py-5 border-b border-line">
          <Logo />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-accent-soft text-primary'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {tabIcon(id, Icon, tab === id)}
              {label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-line space-y-1">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-danger transition-colors"
          >
            <LogOut size={18} />
            Log out
          </button>
          <p className="px-4 pt-1 text-xs text-ink-muted truncate">{user?.email}</p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="relative z-10 flex-1 lg:ml-60 flex flex-col min-h-dvh-safe min-w-0">

        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-10 bg-surface border-b border-line pt-safe px-safe">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <Logo />
            <div className="flex items-center gap-1 shrink-0">
              <StreakBadge className="mr-0.5" />
              <ThemeToggle />
              <button
                onClick={logout}
                aria-label="Log out"
                className="p-2 rounded-xl text-ink-muted hover:bg-surface-2 hover:text-danger transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <nav className="relative grid grid-cols-4 border-t border-line">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors duration-200 ${
                  tab === id ? 'text-primary' : 'text-ink-muted'
                }`}
              >
                <span className={`transition-transform duration-300 ${tab === id ? '-translate-y-px scale-110' : ''}`}>
                  {tabIcon(id, Icon, tab === id)}
                </span>
                {label}
              </button>
            ))}
            {/* One underline that glides to the active tab. */}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-1/4 transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${tabIndex * 100}%)` }}
            >
              <span className="mx-auto block h-full w-3/5 rounded-full bg-primary" />
            </span>
          </nav>
        </header>

        {/* Desktop page title bar */}
        <div className="hidden lg:flex items-center justify-between px-8 py-5 bg-surface border-b border-line">
          <h2 key={activeLabel} className="animate-fade text-lg font-semibold text-ink">{activeLabel}</h2>
          <div className="flex items-center gap-2">
            <StreakBadge />
            <ThemeToggle />
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 w-full max-w-2xl mx-auto py-4 pb-16 lg:py-6 page-gutter">
          {tab === 'today'   && <TodayView />}
          {tab === 'week'    && <WeekView />}
          {tab === 'month'   && <MonthView />}
          {tab === 'profile' && <ProfileView />}
        </main>
      </div>
    </div>
  );
}
