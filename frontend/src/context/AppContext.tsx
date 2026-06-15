'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { LogEntry, Profile, Targets, TabId } from '@/types';
import { computeTargets } from '@/lib/nutrition';
import { toISO } from '@/lib/dates';

// All fetch calls use Next.js rewrite  /api/* → backend /api/*
// See next.config.js rewrites — no hardcoded port in the browser bundle
const BASE = '/api';

interface AppContextValue {
  logs: LogEntry[];
  profile: Profile;
  targets: Targets;
  tab: TabId;
  selectedDate: string;
  loading: boolean;
  error: string | null;
  setProfile: (p: Profile) => Promise<void>;
  setTab: (t: TabId) => void;
  setSelectedDate: (d: string) => void;
  addLog: (meal: string, foodId: number, qty: number) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  refreshLogs: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_PROFILE: Profile = {
  sex: 'male',
  age: 28,
  heightCm: 175,
  weightKg: 72,
  activityLevel: 1.55,
  goal: 'maintain',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const [tab, setTab]           = useState<TabId>('today');
  const [selectedDate, setSelectedDate] = useState(toISO(new Date()));
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── Fetch all logs ────────────────────────────────────────────────────
  const refreshLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/logs`);
      if (res.ok) {
        const data: LogEntry[] = await res.json();
        setLogs(data.map(l => ({ ...l, id: String(l.id) })));
      } else {
        setError(`Failed to load logs (${res.status})`);
      }
    } catch {
      setError('Backend unreachable — check that the server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/profile`);
        if (res.ok) {
          const data = await res.json();
          setProfileState({
            sex:           data.sex,
            age:           data.age,
            heightCm:      Number(data.heightCm),
            weightKg:      Number(data.weightKg),
            activityLevel: Number(data.activityLevel),
            goal:          data.goal,
            name:          data.name ?? undefined,
          });
        }
      } catch {
        // backend not yet available — defaults stay
      }
    })();
    refreshLogs();
  }, [refreshLogs]);

  const targets = useMemo(() => computeTargets(profile), [profile]);

  // ── Profile ───────────────────────────────────────────────────────────
  const setProfile = useCallback(async (p: Profile) => {
    setProfileState(p);
    try {
      await fetch(`${BASE}/profile`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(p),
      });
    } catch {
      // local state already updated; sync later
    }
  }, []);

  // ── Add log ───────────────────────────────────────────────────────────
  const addLog = useCallback(
    async (meal: string, foodId: number, qty: number) => {
      try {
        const res = await fetch(`${BASE}/logs`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ foodId, meal, date: selectedDate, quantity: qty }),
        });
        if (res.ok) {
          const saved = await res.json();
          setLogs(prev => [...prev, { ...saved, id: String(saved.id) }]);
        } else {
          setError(`Could not add entry (${res.status})`);
        }
      } catch {
        setError('Add failed — is the backend running?');
      }
    },
    [selectedDate]
  );

  // ── Delete log ────────────────────────────────────────────────────────
  const deleteLog = useCallback(async (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));   // optimistic
    try {
      await fetch(`${BASE}/logs/${id}`, { method: 'DELETE' });
    } catch {
      // revert by refreshing
      refreshLogs();
    }
  }, [refreshLogs]);

  return (
    <AppContext.Provider
      value={{
        logs, profile, targets, tab, selectedDate, loading, error,
        setProfile, setTab, setSelectedDate, addLog, deleteLog, refreshLogs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
