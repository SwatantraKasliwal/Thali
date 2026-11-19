'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoginView from '@/components/auth/LoginView';
import OnboardingView from '@/components/auth/OnboardingView';
import AppShell from '@/components/layout/AppShell';
import Footer from '@/components/ui/Footer';
import Logo from '@/components/ui/Logo';
import WeightPrompt from '@/components/weight/WeightPrompt';
import UpdatePrompt from '@/components/system/UpdatePrompt';
import ReleaseNotes from '@/components/system/ReleaseNotes';

// Long enough for the logo to draw itself once; measured from navigation
// start, so a slow boot never adds extra wait on top.
const SPLASH_MIN_MS = 1350;
const SPLASH_FADE_MS = 420;

type SplashState = 'show' | 'leaving' | 'gone';

/** App-start screen: the animated mark + wordmark on the page colour. */
function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div className={`splash ${leaving ? 'splash-leaving' : ''}`} aria-hidden={leaving} role="status" aria-label="Loading Thali">
      <div className="splash-mark">
        <Logo size={96} animate="splash" className="rounded-3xl drop-shadow-sm" />
      </div>
      <p className="splash-word mt-4 font-brand text-2xl font-bold tracking-wide text-ink">Thali</p>
      <p className="splash-tag mt-0.5 text-xs text-ink-muted">calorie &amp; macro tracker</p>
    </div>
  );
}

export default function AppRoot() {
  const { user, ready } = useAuth();
  // Server-rendered as 'show', so the splash paints before any JS has run.
  const [splash, setSplash] = useState<SplashState>('show');

  useEffect(() => {
    if (!ready || splash !== 'show') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = reduce ? 0 : Math.max(0, SPLASH_MIN_MS - performance.now());
    const t = setTimeout(() => setSplash('leaving'), wait);
    return () => clearTimeout(t);
  }, [ready, splash]);

  useEffect(() => {
    if (splash !== 'leaving') return;
    const t = setTimeout(() => setSplash('gone'), SPLASH_FADE_MS);
    return () => clearTimeout(t);
  }, [splash]);

  // Mount the app as the splash starts to fade, so its entrance animation is
  // what the user actually sees (data is already loading in the providers).
  let content: React.ReactNode = null;
  let inApp = false;
  if (!ready || splash === 'show') {
    content = null;
  } else if (!user) {
    content = <LoginView />;
  } else if (!user.hasProfile) {
    content = <OnboardingView />;
  } else {
    content = <AppShell />;
    inApp = true;
  }

  return (
    <>
      {content}
      {splash !== 'gone' && <Splash leaving={splash === 'leaving'} />}
      {inApp && <WeightPrompt />}
      <Footer />
      {/* "New version ready" nudge, then the what's-new summary after the reload. */}
      <UpdatePrompt />
      <ReleaseNotes />
    </>
  );
}
