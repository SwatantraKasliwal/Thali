'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  hint?: string;     // secondary line — e.g. a week's date range
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  align?: 'left' | 'right';
  ariaLabel?: string;
  disabled?: boolean;
  /** Fill the container instead of hugging the label — for form grids. */
  fullWidth?: boolean;
}

/**
 * Themed dropdown — a real popup list rather than a native <select>, so the
 * options carry the app's surface, radius and accent (native option lists
 * can't be styled on most platforms) and can show a second line of context.
 */
export default function Dropdown({
  value, options, onChange, className = '', align = 'right', ariaLabel, disabled, fullWidth,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState<'down' | 'up'>('down');
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value) ?? options[0];

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Flip the list above the trigger when there isn't room below it.
  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const needed = Math.min(options.length * 44 + 12, 280);
    setDrop(rect.bottom + needed > window.innerHeight && rect.top > needed ? 'up' : 'down');
  }, [open, options.length]);

  // Keep the active row in view when the list opens.
  useEffect(() => {
    if (open) listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); };

  return (
    <div ref={wrapRef} className={`relative max-w-full ${fullWidth ? 'block' : 'inline-block'}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(o => !o)}
        className={`flex max-w-full items-center gap-2 rounded-xl border border-line bg-surface-2 pl-3 pr-2.5 py-1.5 text-sm font-medium text-ink outline-none transition-colors hover:border-primary focus-visible:border-primary disabled:opacity-50 ${
          fullWidth ? 'w-full justify-between' : ''
        } ${
          open ? 'border-primary' : ''
        } ${className}`}
      >
        <span className="min-w-0 truncate">{selected?.label ?? ''}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className={`glass animate-pop absolute z-40 min-w-full max-h-72 w-max max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl p-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${drop === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
        >
          {options.map(o => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                data-active={active}
                onClick={() => pick(o.value)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active ? 'bg-accent-soft text-primary font-semibold' : 'text-ink hover:bg-surface-2'
                }`}
              >
                <span className="min-w-0 flex-1">
                  {o.label}
                  {o.hint && (
                    <span className={`block text-[11px] font-normal ${active ? 'text-primary' : 'text-ink-muted'}`}>
                      {o.hint}
                    </span>
                  )}
                </span>
                {active && <Check size={14} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
