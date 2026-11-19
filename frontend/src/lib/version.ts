// Bumped on every release. Footer shows it, and the release-notes popup fires
// once per device whenever the stored version no longer matches this one.
export const APP_VERSION = 'SK-V4.3.0';

export interface Release {
  version: string;
  title: string;
  notes: string[];
}

// Everything the 4.0 – 4.2 releases brought, repeated under every later 4.x
// entry so someone jumping several versions still hears about all of it.
const V4_SERIES: string[] = [
  'Liquid glass — charts, the consistency calendar and every meal section sit on translucent panels lit by a soft colour wash behind the app.',
  'Week picker — choose any week of the month; the graph, averages and date range all follow, and weeks that run across a month boundary keep the days either side.',
  'Weekly calorie totals are printed on top of each bar instead of hiding in a tooltip.',
  'Consistency calendar moved to circles, with over-target days marked in amber and the explanatory blurb dropped.',
  'The streak badge glows only on the flame, running amber → orange → red → blue as the streak climbs.',
  'Today rewinds seven days and no further.',
  'Ten avatars — five men, five women — plus a plain default; the one you pick rides along on the Profile tab.',
  'Theme colour is yours: seven presets or a custom hue, re-tinting the whole app including the charts.',
  'Picture and theme now live behind Edit in Profile, so the page stays calm until you want to change something.',
  'Redesigned dropdowns that float over the page, and a heads-up popup whenever a fresh version is ready.',
  'Rebuilt for real phones: the installed app now respects notches and gesture bars, scales its type to the screen, and nothing runs off the edge.',
  'Month tab: Last 3 months, Last 6 months, This year and Till now plot every logged day (weekly averages beyond six months) instead of a few monthly averages, with your target line always in view.',
  'Your avatar shows in full colour on the phone tab bar.',
  'Sharper daily targets: protein follows your activity level and goes up on a cut, a cut never drops below a safe calorie floor, and fibre scales with your calories.',
];

// Newest first — only the top entry is ever shown, so it carries the whole
// story of the version 4 series (newest changes first) rather than just the
// last patch.
export const RELEASES: Release[] = [
  {
    version: 'SK-V4.3.0',
    title: "What's new in version 4.3",
    notes: [
      'Much smarter food search — typos are fixed for you ("chiken" finds chicken), regional words work ("aloo", "dahi", "bhindi"), and the words you typed are highlighted in every result.',
      'Search answers in a blink: foods already saved show up almost instantly while the big nutrition databases are still being asked, and an old, slow answer can no longer replace what you just typed.',
      'Dishes you have logged before come first, tagged "Yours", and an empty search box offers your recent foods as one-tap chips.',
      'Each result now shows protein, carbs and fat per 100 g; pick with the arrow keys and Enter, or clear the box in one tap.',
      'Quick portion chips — 50, 100, 150, 200 and 250 g — next to the grams box.',
      'The app opens with an animated logo, and gentle motion runs throughout: cards ease in, the calorie ring and macro bars fill up, and the tab underline glides between tabs.',
      'Sharper home-screen icon and launch screen — no more black corners around the logo.',
      'The Avita Technologies credit in the footer now links to their website.',
      ...V4_SERIES,
    ],
  },
  {
    version: 'SK-V4.2.2',
    title: "What's new in version 4",
    notes: V4_SERIES,
  },
  {
    version: 'SK-V4.1.0',
    title: 'Pick your character',
    notes: [
      'Ten hand-drawn avatars — five men, five women — under Profile → Your avatar, each with its own vibe.',
      'Prefer plain? "Default" keeps the initials circle, and one tap resets to it.',
      'Dropdown menus now float over the page instead of pushing the charts down.',
    ],
  },
  {
    version: 'SK-V4.0.0',
    title: 'Liquid glass, week picker & your own theme colour',
    notes: [
      'Charts and the meal sections now sit on translucent liquid-glass panels.',
      'Pick any week of the month from the Week tab — the graph, averages and date range follow your choice.',
      'Calorie values are printed on top of every bar in the weekly graph.',
      'Consistency calendar switched to circles, with over-target days in amber.',
      'The streak badge glows only on the flame, and its colour climbs with your streak.',
      'Today can be rewound 7 days — no further.',
      'Profile → Appearance lets you set the app’s accent colour, presets or a custom hue.',
      'Redesigned dropdowns, and a heads-up popup whenever a new version is ready.',
    ],
  },
];
