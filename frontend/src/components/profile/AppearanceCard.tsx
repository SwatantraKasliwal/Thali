'use client';

import { Check, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { ACCENTS, hueSwatch } from '@/lib/accent';
import Card from '@/components/ui/Card';

/**
 * Accent + light/dark control. Every palette token in globals.css derives from
 * one hue, so a preset is a single number and "Custom" is just a slider over
 * the same formula — the whole app (charts included) re-tints live.
 */
export default function AppearanceCard() {
  const { theme, setTheme, accent, hue, setAccent } = useTheme();

  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-ink-muted mb-3">Appearance</div>

      {/* Light / dark */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-ink-muted">Mode</span>
        <div className="flex rounded-xl border border-line bg-surface-2 p-0.5">
          {([['light', Sun], ['dark', Moon]] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setTheme(mode)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                theme === mode ? 'bg-primary text-primary-fg' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon size={13} />
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Accent presets */}
      <div className="text-sm text-ink-muted mb-2">Theme colour</div>
      <div className="flex flex-wrap gap-2">
        {ACCENTS.map(a => {
          const active = accent === a.id;
          const color  = a.id === 'custom' ? hueSwatch(hue) : a.swatch;
          return (
            <button
              key={a.id}
              onClick={() => setAccent(a.id, a.id === 'custom' ? hue : (a.hue ?? hue))}
              title={a.label}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                active ? 'border-primary text-ink' : 'border-line text-ink-muted hover:text-ink'
              }`}
            >
              <span
                aria-hidden
                className="flex h-4 w-4 items-center justify-center rounded-full"
                style={{
                  background: a.id === 'custom'
                    ? 'conic-gradient(hsl(0 65% 55%), hsl(60 65% 55%), hsl(120 65% 55%), hsl(180 65% 55%), hsl(240 65% 55%), hsl(300 65% 55%), hsl(360 65% 55%))'
                    : color,
                }}
              >
                {active && <Check size={10} strokeWidth={4} className="text-white drop-shadow" />}
              </span>
              {a.label}
            </button>
          );
        })}
      </div>

      {/* Custom hue slider — only once "Custom" is the active accent */}
      {accent === 'custom' && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-ink-muted mb-1.5">
            <span>Hue</span>
            <span className="tabular-nums">{hue}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            aria-label="Accent hue"
            onChange={e => setAccent('custom', Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none"
            style={{
              background:
                'linear-gradient(to right, hsl(0 65% 50%), hsl(60 65% 50%), hsl(120 65% 50%), hsl(180 65% 50%), hsl(240 65% 50%), hsl(300 65% 50%), hsl(360 65% 50%))',
            }}
          />
        </div>
      )}
    </Card>
  );
}
