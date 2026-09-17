import { AvatarDef, avatarById } from '@/lib/avatars';

const INK = '#2A2118';       // eyes / line work
const LIP = '#8C3B34';
const MOUTH_IN = '#5A2A28';

// Shared hairline dome. Ends at y≈41, clear of the eyes at y≈45, so a plain
// haircut never reads as a mask across the face.
const DOME =
  'M29 42c0-11.6 8.5-20 19-20s19 8.4 19 20c-2.4-1.5-3.4-5.6-5.2-7.4-3.8 2.5-8.3 3.5-13.8 3.5s-10-1-13.8-3.5C32.4 36.4 31.4 40.5 29 42Z';

/** Head sits at cx 48, cy 44, rx 19.5, ry 21 — every feature is placed against that. */
function Hair({ d }: { d: AvatarDef }) {
  const c = d.hairColor;
  switch (d.hair) {
    case 'buzz':
      return <path d={DOME} fill={c} />;
    case 'fade':
      return (
        <>
          <path d="M28.6 43c0-11.8 8.7-21.3 19.4-21.3S67.4 31.2 67.4 43c-1.8-2.2-2.4-6-4-7.6-4.2 2.2-9.4 3.1-15.4 3.1s-11.2-.9-15.4-3.1c-1.6 1.6-2.2 5.4-4 7.6Z" fill={c} />
          <path d="M30.4 39c1.3 3 1.7 6.8 1.5 10.2M65.6 39c-1.3 3-1.7 6.8-1.5 10.2" stroke={c} strokeWidth="3.4" strokeLinecap="round" fill="none" />
        </>
      );
    case 'headband':
      return (
        <>
          <path d={DOME} fill={c} />
          <path d="M29.6 33c4.6-3.4 11.2-5.4 18.4-5.4s13.8 2 18.4 5.4l-1.4 5.4c-4.6-3.2-10.5-5-17-5s-12.4 1.8-17 5Z" fill={d.badgeBg} />
          <path d="M66.2 36c3.4.4 5.6 2.4 6.6 5.4-2.6-1.4-4.8-2-6.9-2Z" fill={d.badgeBg} />
        </>
      );
    case 'cap':
      return (
        <>
          <path d="M28.4 38.4c0-10.9 8.8-19 19.6-19s19.6 8.1 19.6 19c-5.6-3.4-12.3-5-19.6-5s-14 1.6-19.6 5Z" fill={c} />
          <path d="M67.6 34.2c4.6.6 7.6 2.8 9 6.4-3.6-1.8-6.6-2.6-9-2.6Z" fill={c} />
          <circle cx="48" cy="20.4" r="2.6" fill={d.shirt} />
        </>
      );
    case 'chef':
      return (
        <>
          <path d="M29.6 27.2c-6-1.6-7.4-9.4-1.6-12.6 1-6.2 8.6-8.8 13-4.6 3.6-5 12-4.2 14.4 1.8 6.4-.8 10.6 5.6 7.8 11-.9 1.8-2.4 3.2-4.4 4Z" fill="#F8FAFC" />
          <path d="M30 26.6h36v6.6a2 2 0 0 1-2 2H32a2 2 0 0 1-2-2Z" fill="#E2E8F0" />
          <path d="M31 35.2c4.4-1.8 10-2.8 17-2.8s12.6 1 17 2.8v3.6c-4.6-2.6-10.4-4-17-4s-12.4 1.4-17 4Z" fill={c} />
        </>
      );
    case 'ponytail':
      return (
        <>
          <path d="M63.5 27c10 3.2 14.6 13.4 12.6 23.6-1 5.2-7.4 6.2-9.4 1.4-2.2-5.2 1-17.8-3.2-25Z" fill={c} />
          <path d={DOME} fill={c} />
        </>
      );
    case 'ponytailBand':
      return (
        <>
          <path d="M63.5 27c10 3.2 14.6 13.4 12.6 23.6-1 5.2-7.4 6.2-9.4 1.4-2.2-5.2 1-17.8-3.2-25Z" fill={c} />
          <path d={DOME} fill={c} />
          <path d="M29.6 33c4.6-3.4 11.2-5.4 18.4-5.4s13.8 2 18.4 5.4l-1.4 5.4c-4.6-3.2-10.5-5-17-5s-12.4 1.8-17 5Z" fill={d.badgeBg} />
        </>
      );
    case 'bun':
      return (
        <>
          <circle cx="48" cy="17.6" r="8.4" fill={c} />
          <path d={DOME} fill={c} />
        </>
      );
    case 'long':
      return (
        <>
          <path d="M26 46c0-13.6 9.8-23.4 22-23.4S70 32.4 70 46v22c0 4-5.2 5-5.6.6-.4-4.4.6-8.6.6-13V38.4c-4-3.4-10-5.2-17-5.2s-13 1.8-17 5.2v17.2c0 4.4 1 8.6.6 13-.4 4.4-5.6 3.4-5.6-.6Z" fill={c} />
        </>
      );
    case 'longWave':
      return (
        <>
          <path d="M26 46c0-13.6 9.8-23.4 22-23.4S70 32.4 70 46c1.6 6.4 1.2 14.4-1.6 21.4-1.6 4-6.4 2.4-5.8-1.8.8-5.6 1.4-10.4.8-14V38.4c-4-3.4-9.4-5.2-15.4-5.2s-11.4 1.8-15.4 5.2v13.2c-.6 3.6 0 8.4.8 14 .6 4.2-4.2 5.8-5.8 1.8-2.8-7-3.2-15-1.6-21.4Z" fill={c} />
        </>
      );
    default:
      return null;
  }
}

function Eyes({ d }: { d: AvatarDef }) {
  switch (d.eyes) {
    case 'determined':
      return (
        <>
          <path d="M34.6 37.4 43 40.2M61.4 37.4 53 40.2" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="40.6" cy="45.4" r="2.8" fill={INK} />
          <circle cx="55.4" cy="45.4" r="2.8" fill={INK} />
        </>
      );
    case 'closed':
      return (
        <>
          <path d="M36.4 45.6q4.2-4.4 8.4 0M51.2 45.6q4.2-4.4 8.4 0" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </>
      );
    case 'star':
      return (
        <>
          {[40.6, 55.4].map(cx => (
            <path
              key={cx}
              d={`M${cx} 40.4l1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z`}
              fill="#FFF7CC"
              stroke="#F59E0B"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          ))}
        </>
      );
    case 'shades':
      return (
        <>
          <path d="M30 40.6h36v2.6c0 5-3.9 8.4-8.6 8.4-4.4 0-7.6-2.8-8.2-6.8h-2.4c-.6 4-3.8 6.8-8.2 6.8-4.7 0-8.6-3.4-8.6-8.4Z" fill="#141B26" />
          <path d="M33.6 43.4c.6 2.6 2.4 4.4 4.8 5" stroke="#8FA3BF" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".8" />
          <path d="M52.6 43.4c.6 2.6 2.4 4.4 4.8 5" stroke="#8FA3BF" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".8" />
        </>
      );
    case 'wink':
      return (
        <>
          <path d="M36.4 45.6q4.2-4.4 8.4 0" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <circle cx="55.4" cy="45" r="3" fill={INK} />
          <circle cx="56.5" cy="43.9" r="1" fill="#fff" />
          <path d="M51.4 38.4q4-2.6 8 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </>
      );
    case 'wide':
      return (
        <>
          {[40.6, 55.4].map(cx => (
            <g key={cx}>
              <ellipse cx={cx} cy="45" rx="4.4" ry="4.8" fill="#fff" />
              <circle cx={cx} cy="45.4" r="2.4" fill={INK} />
              <circle cx={cx + 1.2} cy="44" r=".9" fill="#fff" />
            </g>
          ))}
          <path d="M36 37.6q4.6-2.8 9.2 0M50.8 37.6q4.6-2.8 9.2 0" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      );
    default:
      return null;
  }
}

function Mouth({ d }: { d: AvatarDef }) {
  switch (d.mouth) {
    case 'shout':
      return (
        <>
          <ellipse cx="48" cy="56.4" rx="6" ry="7.4" fill={MOUTH_IN} />
          <ellipse cx="48" cy="60.4" rx="3.6" ry="2.8" fill="#E2646A" />
          <path d="M42.4 52.4h11.2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </>
      );
    case 'serene':
      return <path d="M42.8 54.6q5.2 3.8 10.4 0" stroke={LIP} strokeWidth="2.4" strokeLinecap="round" fill="none" />;
    case 'teeth':
      return (
        <>
          <path d="M38.8 52.2h18.4a9.2 9.2 0 0 1-18.4 0Z" fill={MOUTH_IN} />
          <path d="M40.4 52.9h15.2a7.6 7.6 0 0 1-.9 3H41.3a7.6 7.6 0 0 1-.9-3Z" fill="#fff" />
        </>
      );
    case 'tongue':
      return (
        <>
          <path d="M39.6 52.4h16.8a8.4 8.4 0 0 1-16.8 0Z" fill={MOUTH_IN} />
          <path d="M43.6 57.6h8.8v2.6a4.4 4.4 0 0 1-8.8 0Z" fill="#EF7A85" />
        </>
      );
    case 'smirk':
      return <path d="M42 55.4q5.4 3 10-2.4" stroke={LIP} strokeWidth="2.6" strokeLinecap="round" fill="none" />;
    case 'grin':
      return <path d="M41.4 53.4q6.6 6 13.2 0" stroke={LIP} strokeWidth="2.6" strokeLinecap="round" fill="none" />;
    default:
      return null;
  }
}

function Facial({ d }: { d: AvatarDef }) {
  // Lower half of the face in hair colour, with the cheeks and mouth painted
  // back in skin on top — what is left is a beard following the jaw.
  const jaw = (rx: number, ry: number, cy: number, opacity: number) => (
    <g opacity={opacity}>
      <path d="M28.5 44 A19.5 21 0 0 0 67.5 44 Z" fill={d.hairColor} />
      <ellipse cx="48" cy={cy} rx={rx} ry={ry} fill={d.skin} />
    </g>
  );

  if (d.facial === 'beard') {
    return (
      <>
        {jaw(15.5, 16.5, 41, 1)}
        <path d="M48 48.6c1.9-2.5 6.1-3.2 8.2-.9 1.4 1.5 1 3.8-1.3 4.4-2.5.6-5-1-6.9-3.5-1.9 2.5-4.4 4.1-6.9 3.5-2.3-.6-2.7-2.9-1.3-4.4 2.1-2.3 6.3-1.6 8.2.9Z" fill={d.hairColor} />
      </>
    );
  }
  if (d.facial === 'stubble') return jaw(17, 18, 41.5, 0.35);
  if (d.facial === 'moustache') {
    return (
      <path
        d="M48 48c1.9-2.6 6.3-3.4 8.5-1 1.4 1.6 1 4-1.4 4.6-2.6.6-5.2-1-7.1-3.6-1.9 2.6-4.5 4.2-7.1 3.6-2.4-.6-2.8-3-1.4-4.6 2.2-2.4 6.6-1.6 8.5 1Z"
        fill={d.hairColor}
      />
    );
  }
  return null;
}

function Badge({ d }: { d: AvatarDef }) {
  const glyph = () => {
    switch (d.badge) {
      case 'dumbbell':
        return <path d="M74.6 80h10.8M73 76.6v6.8M87 76.6v6.8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />;
      case 'leaf':
        return <path d="M74.6 85.4c-1.6-6.4 2.6-11.8 10.8-11.4.8 7.8-4 12.2-10.8 11.4Zm0 0 8-8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
      case 'bolt':
        return <path d="M81.4 72.8 75.6 81h5l-1.6 6.4 6.4-8.6h-5.2Z" fill="#fff" />;
      case 'donut':
        return (
          <>
            <circle cx="80" cy="80" r="6.4" fill="none" stroke="#fff" strokeWidth="2.6" />
            <circle cx="80" cy="80" r="1.8" fill="#fff" />
          </>
        );
      case 'sparkle':
        return <path d="M80 72.6c.9 4.7 2.7 6.5 7.4 7.4-4.7.9-6.5 2.7-7.4 7.4-.9-4.7-2.7-6.5-7.4-7.4 4.7-.9 6.5-2.7 7.4-7.4Z" fill="#fff" />;
      case 'chilli':
        return <path d="M84.8 74.6c-.6 7.6-5 11.6-10.6 11.6 1.4-5.6 4.4-9.8 10.6-11.6Zm0 0c1-1.8 2.2-2.4 3.4-2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
      case 'cupcake':
        return (
          <>
            <path d="M74.4 79.6h11.2l-1.8 7.2h-7.6Z" fill="#fff" />
            <path d="M75.6 78c.6-3.6 3-5.4 5.6-5.2 2.6.2 4.4 2.2 4.4 5.2Z" fill="#fff" opacity=".75" />
          </>
        );
      case 'trophy':
        return <path d="M76 73.4h8v4.4a4 4 0 0 1-8 0Zm4 8.4v3.4m-3 0h6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />;
      default:
        return null;
    }
  };
  return (
    <g>
      <circle cx="80" cy="80" r="15" fill={d.badgeBg} />
      <circle cx="80" cy="80" r="15" fill="none" stroke="#fff" strokeWidth="2.4" opacity=".92" />
      {glyph()}
    </g>
  );
}

function AvatarArt({ d, size, showBadge }: { d: AvatarDef; size: number; showBadge: boolean }) {
  const bgId   = `av-bg-${d.id}`;
  const clipId = `av-clip-${d.id}`;
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      role="img"
      aria-label={d.name}
      className="shrink-0"
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={d.bg[0]} />
          <stop offset="100%" stopColor={d.bg[1]} />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx="48" cy="48" r="48" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <circle cx="48" cy="48" r="48" fill={`url(#${bgId})`} />
        <circle cx="26" cy="20" r="28" fill="#fff" opacity=".13" />

        {/* behind the head: ponytails and long hair */}
        {(d.hair === 'ponytail' || d.hair === 'ponytailBand' || d.hair === 'long' || d.hair === 'longWave') && <Hair d={d} />}

        {/* neck → shoulders → head */}
        <path d="M41.4 55h13.2v15a6.6 6.6 0 0 1-13.2 0Z" fill={d.skinShade} />
        <path d="M10 96c0-17.6 17-27.6 38-27.6S86 78.4 86 96Z" fill={d.shirt} />
        <ellipse cx="48" cy="44" rx="19.5" ry="21" fill={d.skin} />
        <circle cx="28.8" cy="46.4" r="4.4" fill={d.skin} />
        <circle cx="67.2" cy="46.4" r="4.4" fill={d.skin} />

        <Facial d={d} />
        {/* in front of the head: caps, fringes, hats */}
        {!(d.hair === 'ponytail' || d.hair === 'ponytailBand' || d.hair === 'long' || d.hair === 'longWave') && <Hair d={d} />}
        {(d.hair === 'ponytail' || d.hair === 'ponytailBand' || d.hair === 'long' || d.hair === 'longWave') && (
          <FrontFringe d={d} />
        )}

        {d.blush && (
          <>
            <ellipse cx="35.4" cy="51.6" rx="4" ry="2.6" fill="#EF6F7B" opacity=".4" />
            <ellipse cx="60.6" cy="51.6" rx="4" ry="2.6" fill="#EF6F7B" opacity=".4" />
          </>
        )}

        <Eyes d={d} />
        <Mouth d={d} />
      </g>

      {showBadge && <Badge d={d} />}
    </svg>
  );
}

/** The hairline that has to sit in front of the face for the long styles. */
function FrontFringe({ d }: { d: AvatarDef }) {
  if (d.hair === 'long' || d.hair === 'longWave') {
    return (
      <path d="M29 42c0-11.6 8.5-20 19-20s19 8.4 19 20c-2.4-1.5-3.4-5.6-5.2-7.4-4 2.9-9.1 4.2-14.6 4.2-4.5 0-8.5-1-11.8-2.7-2.2 1.6-4.2 4-6.4 5.9Z" fill={d.hairColor} />
    );
  }
  return (
    <>
      <path d={DOME} fill={d.hairColor} />
      {d.hair === 'ponytailBand' && (
        <path d="M29.6 33c4.6-3.4 11.2-5.4 18.4-5.4s13.8 2 18.4 5.4l-1.4 5.4c-4.6-3.2-10.5-5-17-5s-12.4 1.8-17 5Z" fill={d.badgeBg} />
      )}
    </>
  );
}

interface AvatarProps {
  /** Avatar id, or 'default' / anything unknown for the initials circle. */
  id: string;
  /** Rendered pixel size. */
  size?: number;
  /** Name used by the initials fallback. */
  name?: string;
  className?: string;
}

export default function Avatar({ id, size = 44, name = '', className = '' }: AvatarProps) {
  const def = avatarById(id);

  if (!def) {
    return (
      <div
        className={`rounded-full bg-accent-soft flex items-center justify-center text-primary font-semibold shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
        aria-label={name || 'Profile'}
      >
        {(name.trim().charAt(0) || '?').toUpperCase()}
      </div>
    );
  }

  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <AvatarArt d={def} size={size} showBadge={size >= 40} />
    </span>
  );
}
