'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Eases a displayed number toward `target` (from 0 on first mount, from the
 * previous value afterwards). Snaps straight there when the user prefers
 * reduced motion.
 */
export function useCountUp(target: number, duration = 700): number {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = from.current;
    if (reduce || start === target) {
      from.current = target;
      setShown(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (target - start) * eased;
      from.current = v;
      setShown(Math.round(v));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return shown;
}

/** False on the first paint, true right after — lets bars/rings grow from zero. */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return m;
}
