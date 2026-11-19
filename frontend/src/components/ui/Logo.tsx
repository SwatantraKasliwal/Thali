/**
 * The Thali mark as inline SVG (same drawing as /public/logo.svg) so its parts
 * can move: the bowl settles in, the leaf sprouts, the tracking arc draws
 * itself and the two progress dots pop — see `.logo-*` in globals.css.
 *
 *  animate="intro" → plays once on mount (header, login)
 *  animate="splash" → intro, then the leaf keeps a gentle sway (app start)
 *  animate="none"  → static
 */
export default function Logo({
  size = 36,
  animate = 'intro',
  className = '',
}: {
  size?: number;
  animate?: 'intro' | 'splash' | 'none';
  className?: string;
}) {
  const motion = animate === 'none' ? '' : `logo-anim${animate === 'splash' ? ' logo-splash' : ''}`;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Thali"
      className={`logo shrink-0 ${motion} ${className}`}
    >
      <rect className="logo-bg" width="64" height="64" rx="16" fill="#EFE3C2" />

      {/* progress / tracking arc + arrowhead */}
      <path
        className="logo-arc"
        pathLength={1}
        d="M14 27 A20 20 0 0 1 50 27"
        fill="none" stroke="#123524" strokeWidth="3.2" strokeLinecap="round"
      />
      <path
        className="logo-arrow"
        d="M50 27 L45 24 M50 27 L44 29.5"
        fill="none" stroke="#123524" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* progress dots */}
      <circle className="logo-dot logo-dot-1" cx="39" cy="15.5" r="1.9" fill="#85A947" />
      <circle className="logo-dot logo-dot-2" cx="45.5" cy="18.5" r="1.9" fill="#85A947" />

      {/* leaf */}
      <g className="logo-leaf">
        <path d="M30 33 C23.5 26 27 15.5 35.5 13.5 C37.5 22 37 30 30 33 Z" fill="#85A947" />
        <path d="M33.5 18 C31.5 23 30.5 28 30.2 32" fill="none" stroke="#EFE3C2" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      {/* bowl */}
      <g className="logo-bowl">
        <path d="M16 36 a16 16 0 0 0 32 0 Z" fill="#3E7B27" />
        <ellipse cx="32" cy="36" rx="16" ry="3.2" fill="#123524" />
      </g>
    </svg>
  );
}
