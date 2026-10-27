/** Flat spider emblem (original design) for small UI accents. */
export function SpiderGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="currentColor">
        <ellipse cx="32" cy="37" rx="5.5" ry="10" />
        <ellipse cx="32" cy="23" rx="4.2" ry="5" />
        <circle cx="32" cy="15.5" r="2.6" />
      </g>
      <g stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M29 21 L19 14 L16 3" />
        <path d="M35 21 L45 14 L48 3" />
        <path d="M28.5 25 L15 22 L7 13" />
        <path d="M35.5 25 L49 22 L57 13" />
        <path d="M28 33 L15 36 L7 47" />
        <path d="M36 33 L49 36 L57 47" />
        <path d="M29 41 L20 50 L18 61" />
        <path d="M35 41 L44 50 L46 61" />
      </g>
    </svg>
  )
}
