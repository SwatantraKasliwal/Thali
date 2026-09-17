// Bumped on every release. Footer shows it, and the release-notes popup fires
// once per device whenever the stored version no longer matches this one.
export const APP_VERSION = 'SK-V4.2.0';

export interface Release {
  version: string;
  title: string;
  notes: string[];
}

// Newest first — only the top entry is ever shown, so it carries the whole
// story of the version 4 series rather than just the last patch.
export const RELEASES: Release[] = [
  {
    version: 'SK-V4.2.0',
    title: "What's new in version 4",
    notes: [
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
    ],
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
