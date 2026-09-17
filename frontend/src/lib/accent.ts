// Accent presets. Every palette in globals.css derives from a single hue, so a
// preset is just an id + that hue; `forest` is the untouched brand palette.
export interface AccentPreset {
  id: string;
  label: string;
  hue: number | null;    // null → fall through to the hand-tuned brand tokens
  swatch: string;        // dot shown in the picker
}

export const ACCENTS: AccentPreset[] = [
  { id: 'forest', label: 'Forest',  hue: null, swatch: '#85A947' },
  { id: 'ocean',  label: 'Ocean',   hue: 205,  swatch: '#2E86C8' },
  { id: 'indigo', label: 'Indigo',  hue: 248,  swatch: '#5B5BD6' },
  { id: 'violet', label: 'Violet',  hue: 282,  swatch: '#9333EA' },
  { id: 'rose',   label: 'Rose',    hue: 340,  swatch: '#D6336C' },
  { id: 'ember',  label: 'Ember',   hue: 22,   swatch: '#D2691E' },
  { id: 'teal',   label: 'Teal',    hue: 176,  swatch: '#0F9B8E' },
  { id: 'custom', label: 'Custom',  hue: 205,  swatch: '' },
];

export const DEFAULT_ACCENT = 'forest';
export const DEFAULT_HUE = 205;

/** Preview colour for a hue — matches the dark-mode --primary formula. */
export const hueSwatch = (hue: number): string => `hsl(${hue} 60% 55%)`;
