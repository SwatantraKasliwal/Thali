'use client';

import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { APP_VERSION, RELEASES } from '@/lib/version';

const SEEN_KEY = 'thali_seen_version';

/**
 * What's-new popup — opens once per device whenever the running build is newer
 * than the version last acknowledged here, i.e. right after the reload the
 * UpdatePrompt asked for.
 */
export default function ReleaseNotes() {
  const [open, setOpen] = useState(false);
  const release = RELEASES[0];

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SEEN_KEY) !== APP_VERSION) setOpen(true);
    } catch {
      // private mode / storage blocked — just skip the popup
    }
  }, []);

  const close = () => {
    setOpen(false);
    try { window.localStorage.setItem(SEEN_KEY, APP_VERSION); } catch { /* ignore */ }
  };

  if (!open || !release) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{
        paddingTop:    'max(1rem, var(--sa-top))',
        paddingBottom: 'max(1rem, var(--sa-bottom))',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-notes-title"
    >
      <button
        aria-label="Close"
        onClick={close}
        className="animate-fade absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <div className="glass animate-rise relative flex max-h-full w-full max-w-md flex-col rounded-2xl p-5 shadow-2xl">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 text-primary">
          <Sparkles size={16} />
          <span className="text-xs font-semibold tracking-wide">{release.version}</span>
        </div>
        <h2 id="release-notes-title" className="mt-2 pr-6 text-base font-semibold text-ink">
          {release.title}
        </h2>

        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {release.notes.map(note => (
            <li key={note} className="flex gap-2 text-sm text-ink-muted">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={close}
          className="mt-5 w-full shrink-0 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
