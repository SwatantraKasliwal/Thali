export const toISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const parseISO = (iso: string): Date => new Date(iso + 'T00:00:00');

export const formatDay = (iso: string): string => {
  const today = toISO(new Date());
  if (iso === today) return 'Today';
  const d = parseISO(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};
