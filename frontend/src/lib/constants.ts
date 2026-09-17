// Data-viz palette — chosen to stay legible on BOTH the cream (light) and
// forest (dark) surfaces, harmonized with the brand greens.
export const COLORS = {
  cal: 'var(--chart-cal)', // follows the accent theme (rings, bars, trend)
  protein: '#6366f1',      // indigo
  carbs: '#E0A11B',        // amber
  fat: '#EC4F63',          // rose
  fibre: '#14B8A6',        // teal
  over: '#E0533F',         // warm red — a missed day
  overCal: '#F0A22E',      // amber — a day logged past the calorie target
  overCalInk: '#2A1B02',   // text that stays legible on the amber tile
} as const;

// Axis ticks / gridlines — themed, so charts stay legible on either surface.
export const AXIS_TICK = { fontSize: 11, fill: 'var(--muted)' } as const;

export const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 12,
  boxShadow: '0 10px 30px -12px rgba(0,0,0,0.4)',
} as const;

export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
export type Meal = typeof MEALS[number];
