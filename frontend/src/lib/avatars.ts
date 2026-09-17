// Picked in Profile → Your avatar. Each one is drawn as inline SVG by
// <Avatar>, so there are no image files to ship, no external requests to make,
// and every face re-renders crisply at any size.

export type AvatarGroup = 'men' | 'women';

export type HairStyle =
  | 'buzz' | 'fade' | 'cap' | 'chef' | 'headband'
  | 'ponytail' | 'bun' | 'long' | 'longWave' | 'ponytailBand';

export type EyeStyle    = 'determined' | 'closed' | 'star' | 'shades' | 'wink' | 'wide';
export type MouthStyle  = 'shout' | 'serene' | 'teeth' | 'tongue' | 'smirk' | 'grin';
export type BadgeStyle  = 'dumbbell' | 'leaf' | 'bolt' | 'donut' | 'sparkle' | 'chilli' | 'cupcake' | 'trophy';

export interface AvatarDef {
  id: string;
  name: string;
  tagline: string;
  group: AvatarGroup;
  bg: [string, string];
  skin: string;
  skinShade: string;
  hair: HairStyle;
  hairColor: string;
  shirt: string;
  eyes: EyeStyle;
  mouth: MouthStyle;
  badge: BadgeStyle;
  badgeBg: string;
  facial?: 'beard' | 'stubble' | 'moustache';
  blush?: boolean;
}

export const DEFAULT_AVATAR = 'default';

export const AVATARS: AvatarDef[] = [
  // ── Men ──────────────────────────────────────────────────────────────────
  {
    id: 'm-beast', name: 'Beast Mode', tagline: 'One more rep.', group: 'men',
    bg: ['#F97316', '#DC2626'], skin: '#D9A06B', skinShade: '#BC8351',
    hair: 'headband', hairColor: '#2E2119', shirt: '#1F2937',
    eyes: 'determined', mouth: 'shout', badge: 'dumbbell', badgeBg: '#111827',
  },
  {
    id: 'm-zen', name: 'Zen Master', tagline: 'Slow food, calm mind.', group: 'men',
    bg: ['#2DD4BF', '#0F766E'], skin: '#C68642', skinShade: '#A96F35',
    hair: 'buzz', hairColor: '#1C1C1C', shirt: '#F5F5F4',
    eyes: 'closed', mouth: 'serene', badge: 'leaf', badgeBg: '#065F46',
    facial: 'beard',
  },
  {
    id: 'm-hype', name: 'Hype Man', tagline: 'LET’S GOOO!', group: 'men',
    bg: ['#A78BFA', '#6D28D9'], skin: '#8D5524', skinShade: '#74441C',
    hair: 'cap', hairColor: '#111827', shirt: '#FDE047',
    eyes: 'star', mouth: 'teeth', badge: 'bolt', badgeBg: '#4C1D95',
  },
  {
    id: 'm-chef', name: 'Cheat Chef', tagline: 'Macros? Later.', group: 'men',
    bg: ['#FBBF24', '#EA580C'], skin: '#F1C27D', skinShade: '#D4A463',
    hair: 'chef', hairColor: '#6B3F1D', shirt: '#F8FAFC',
    eyes: 'wink', mouth: 'tongue', badge: 'donut', badgeBg: '#9A3412',
    facial: 'moustache', blush: true,
  },
  {
    id: 'm-cool', name: 'Ice Cold', tagline: 'Discipline over mood.', group: 'men',
    bg: ['#60A5FA', '#1E3A8A'], skin: '#E0AC69', skinShade: '#C08F52',
    hair: 'fade', hairColor: '#232323', shirt: '#0F172A',
    eyes: 'shades', mouth: 'smirk', badge: 'sparkle', badgeBg: '#1E3A8A',
    facial: 'stubble',
  },

  // ── Women ────────────────────────────────────────────────────────────────
  {
    id: 'w-queen', name: 'Iron Queen', tagline: 'Lift heavy, eat well.', group: 'women',
    bg: ['#FB7185', '#BE123C'], skin: '#E0AC69', skinShade: '#C08F52',
    hair: 'ponytailBand', hairColor: '#3B2314', shirt: '#1F2937',
    eyes: 'determined', mouth: 'shout', badge: 'dumbbell', badgeBg: '#881337',
  },
  {
    id: 'w-yogi', name: 'Zen Yogi', tagline: 'Breathe. Then eat.', group: 'women',
    bg: ['#86EFAC', '#15803D'], skin: '#C68642', skinShade: '#A96F35',
    hair: 'bun', hairColor: '#1F1409', shirt: '#F5F5F4',
    eyes: 'closed', mouth: 'serene', badge: 'leaf', badgeBg: '#14532D',
  },
  {
    id: 'w-hype', name: 'Hype Girl', tagline: 'Streak? Untouchable.', group: 'women',
    bg: ['#F0ABFC', '#7E22CE'], skin: '#8D5524', skinShade: '#74441C',
    hair: 'longWave', hairColor: '#111827', shirt: '#FDE047',
    eyes: 'star', mouth: 'teeth', badge: 'bolt', badgeBg: '#581C87',
    blush: true,
  },
  {
    id: 'w-spice', name: 'Spice Boss', tagline: 'Adds chilli to everything.', group: 'women',
    bg: ['#FDBA74', '#C2410C'], skin: '#F1C27D', skinShade: '#D4A463',
    hair: 'long', hairColor: '#7C2D12', shirt: '#7F1D1D',
    eyes: 'wink', mouth: 'smirk', badge: 'chilli', badgeBg: '#7F1D1D',
  },
  {
    id: 'w-treat', name: 'Treat Yourself', tagline: 'Rest day is a food group.', group: 'women',
    bg: ['#F9A8D4', '#DB2777'], skin: '#D9A06B', skinShade: '#BC8351',
    hair: 'ponytail', hairColor: '#4B2E14', shirt: '#FBCFE8',
    eyes: 'wide', mouth: 'tongue', badge: 'cupcake', badgeBg: '#9D174D',
    blush: true,
  },
];

export const avatarById = (id: string): AvatarDef | undefined =>
  AVATARS.find(a => a.id === id);
