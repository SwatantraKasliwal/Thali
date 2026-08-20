'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

const VERSION = 'SK-V3.0.0';
const AVITA = 'Website Developed & Maintained by Avita Technologies';

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
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [tab, user]);

  return (
    <footer
      className={`fixed bottom-2 right-3 z-30 pointer-events-none select-none text-right transition-opacity duration-300 ${
        atBottom ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="text-xs text-ink-muted leading-tight">
        {showAvita ? AVITA : `© ${year} | Thali`}
        <br />
        {VERSION}
      </p>
    </footer>
  );
}
