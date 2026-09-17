'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

const CHECK_EVERY = 15 * 60 * 1000;   // re-ask the server for a newer build

/**
 * "A new version is ready" toast.
 *
 * The service worker calls skipWaiting(), so a fresh build takes control of the
 * page as soon as it installs — while the tab is still running the old bundle.
 * `controllerchange` is that moment, and this is the nudge to reload into it.
 * The release notes follow on the next load (see ReleaseNotes).
 */
export default function UpdatePrompt() {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;

    // A controller arriving where there was none is just the first install on a
    // fresh visit — not an update worth interrupting anyone for.
    const hadController = !!sw.controller;
    const onController = () => { if (hadController) setReady(true); };
    sw.addEventListener('controllerchange', onController);

    let timer: ReturnType<typeof setInterval> | undefined;
    let check = () => {};
    sw.getRegistration().then(reg => {
      if (!reg) return;
      if (reg.waiting && hadController) setReady(true);
      check = () => { reg.update().catch(() => {}); };
      check();
      timer = setInterval(check, CHECK_EVERY);
    });

    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      sw.removeEventListener('controllerchange', onController);
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) clearInterval(timer);
    };
  }, []);

  if (!ready || hidden) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none">
      <div className="glass animate-rise pointer-events-auto flex items-center gap-3 rounded-2xl py-2.5 pl-4 pr-2.5 shadow-lg">
        <RefreshCw size={16} className="shrink-0 text-primary" />
        <p className="text-sm text-ink">
          A new version is ready — reload to apply it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:bg-primary-hover transition-colors"
        >
          Reload
        </button>
        <button
          onClick={() => setHidden(true)}
          aria-label="Dismiss"
          className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
