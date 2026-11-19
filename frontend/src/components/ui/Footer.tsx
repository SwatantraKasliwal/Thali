'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { APP_VERSION } from '@/lib/version';

const AVITA_URL = 'https://avitatechnologies.com/';

/**
 * Fixed bottom-right badge. The version tag is always shown; the line above it
 * is the Avita credit on the login page + Profile tab, and the Thali copyright
 * everywhere else. Visible in both themes.
 *
 * Only revealed once the user has scrolled to the very bottom of the page so it
 * never overlaps content mid-scroll.
 */
export default function Footer() {
  const year = new Date().getFullYear();
  const { user } = useAuth();
  const { tab } = useApp();
  const showAvita = !user || tab === 'profile';

  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const el = document.scrollingElement || document.documentElement;
    const check = () => {
      // Fully scrolled down when the viewport bottom reaches the content bottom.
      // A short pages that don't scroll also count as "at bottom".
      const reached = el.scrollHeight - el.scrollTop - el.clientHeight <= 2;
      setAtBottom(reached);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    // The page also grows without any scroll — the app mounting behind the
    // splash, a meal panel opening, results arriving — so watch its size too.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    ro?.observe(document.body);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      ro?.disconnect();
    };
  }, [tab, user]);

  return (
    <footer
      className={`fixed bottom-safe-2 right-safe-3 z-30 max-w-[70vw] pointer-events-none select-none text-right transition-opacity duration-300 ${
        atBottom ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="text-xs text-ink-muted leading-tight">
        {showAvita ? (
          <>
            Website Developed &amp; Maintained by{' '}
            {/* Only clickable while the footer is actually showing. */}
            <a
              href={AVITA_URL}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={atBottom ? 0 : -1}
              className={`link-underline whitespace-nowrap font-semibold text-primary hover:text-primary-hover ${
                atBottom ? 'pointer-events-auto' : ''
              }`}
            >
              Avita Technologies
            </a>
          </>
        ) : (
          `© ${year} | Thali`
        )}
        <br />
        <span key={APP_VERSION} className="tabular-nums">{APP_VERSION}</span>
      </p>
    </footer>
  );
}
