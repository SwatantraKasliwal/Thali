'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DEFAULT_ACCENT, DEFAULT_HUE } from '@/lib/accent';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  /** Accent preset id — 'forest' keeps the original brand palette. */
  accent: string;
  /** Hue behind the 'custom' accent (0–360). */
  hue: number;
  setAccent: (id: string, hue?: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY  = 'thali_theme';
const ACCENT_KEY   = 'thali_accent';
const HUE_KEY      = 'thali_accent_hue';

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

// The palettes live in globals.css and derive from --h, so switching accent is
// just an attribute + one number. Mirrors the pre-paint script in layout.tsx.
function applyAccent(id: string, hue: number) {
  const root = document.documentElement;
  root.setAttribute('data-accent', id);
  root.style.setProperty('--h', String(hue));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState]   = useState<Theme>('light');
  const [accent, setAccentState] = useState<string>(DEFAULT_ACCENT);
  const [hue, setHue]            = useState<number>(DEFAULT_HUE);

  // Hydrate from storage / system preference on mount.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme =
      stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setThemeState(initial);
    apply(initial);

    const storedAccent = window.localStorage.getItem(ACCENT_KEY) ?? DEFAULT_ACCENT;
    const storedHue    = Number(window.localStorage.getItem(HUE_KEY)) || DEFAULT_HUE;
    setAccentState(storedAccent);
    setHue(storedHue);
    applyAccent(storedAccent, storedHue);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    window.localStorage.setItem(STORAGE_KEY, t);
    apply(t);
  }, []);

  const toggle = useCallback(
    () => setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark'),
    [setTheme]
  );

  const setAccent = useCallback((id: string, nextHue?: number) => {
    const h = nextHue ?? hue;
    setAccentState(id);
    setHue(h);
    window.localStorage.setItem(ACCENT_KEY, id);
    window.localStorage.setItem(HUE_KEY, String(h));
    applyAccent(id, h);
  }, [hue]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme, accent, hue, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
