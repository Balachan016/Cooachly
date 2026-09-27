// Inline SVG illustrations for the Cooachly Arts (Carnatic vocals) tab —
// deep maroon and temple-gold, echoing classical South Indian motifs
// (tanpura, diya, temple gopuram) so the marketing pages don't depend on
// any external image host, matching the approach in ../illustrations.tsx.

export function CarnaticHeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 400" className={className} role="img" aria-label="A Carnatic vocalist singing with a tanpura">
      <defs>
        <linearGradient id="arts-hero-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef2f2" />
          <stop offset="100%" stopColor="#fde4e4" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="480" height="400" rx="24" fill="url(#arts-hero-bg)" />
      <path d="M0 40 A 200 200 0 0 1 200 0 L 0 0 Z" fill="#fcd34d" opacity="0.45" />

      {/* Floor */}
      <rect x="60" y="320" width="360" height="12" rx="4" fill="#7f1d1d" />

      {/* Tanpura body */}
      <ellipse cx="330" cy="300" rx="34" ry="22" fill="#991b1b" stroke="#450a0a" strokeWidth="3" />
      <rect x="322" y="170" width="16" height="132" rx="6" fill="#991b1b" stroke="#450a0a" strokeWidth="3" />
      <ellipse cx="330" cy="168" rx="12" ry="8" fill="#7f1d1d" stroke="#450a0a" strokeWidth="2" />
      <line x1="316" y1="200" x2="316" y2="290" stroke="#fcd34d" strokeWidth="1.5" />
      <line x1="344" y1="200" x2="344" y2="290" stroke="#fcd34d" strokeWidth="1.5" />

      {/* Singer (simplified, seated, hand raised in gesture) */}
      <circle cx="190" cy="175" r="30" fill="#ffe0b2" />
      <path d="M160 168 a30 30 0 0 1 60 0 q2 -22 -30 -24 q-32 2 -30 24 Z" fill="#2b0f0f" />
      <path
        d="M140 320 Q150 230 190 220 Q230 230 240 320 Z"
        fill="#b91c1c"
      />
      <path d="M150 250 L120 210" stroke="#ffe0b2" strokeWidth="10" strokeLinecap="round" />
      <circle cx="118" cy="206" r="7" fill="#ffe0b2" />
      <path d="M225 245 L245 275" stroke="#ffe0b2" strokeWidth="10" strokeLinecap="round" />

      {/* Jasmine/bindi accents */}
      <circle cx="190" cy="150" r="2.5" fill="#7f1d1d" />
      <circle cx="176" cy="156" r="3" fill="#fef3c7" />
      <circle cx="204" cy="156" r="3" fill="#fef3c7" />

      {/* Floating swara notes */}
      <circle cx="90" cy="90" r="24" fill="#7f1d1d" />
      <text x="90" y="98" textAnchor="middle" fontSize="18" fontWeight="700" fill="#fcd34d" fontFamily="Arial, sans-serif">
        Sa
      </text>
      <circle cx="400" cy="100" r="24" fill="#991b1b" />
      <text x="400" y="108" textAnchor="middle" fontSize="18" fontWeight="700" fill="#fef3c7" fontFamily="Arial, sans-serif">
        Ri
      </text>
      <circle cx="410" cy="220" r="18" fill="#fcd34d" />
      <text x="410" y="227" textAnchor="middle" fontSize="15" fill="#7f1d1d" fontFamily="Arial, sans-serif">
        ♪
      </text>
    </svg>
  );
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-brand-800 bg-brand-900 text-accent-300 dark:border-accent-500">
      {children}
    </div>
  );
}

export function RagaIcon() {
  return (
    <IconBadge>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 14 Q7 6 11 14 T19 14" />
        <circle cx="19" cy="14" r="2" fill="currentColor" stroke="none" />
      </svg>
    </IconBadge>
  );
}

export function LayaIcon() {
  return (
    <IconBadge>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 6v12" />
        <path d="M9 3v18" />
        <path d="M15 3v18" />
        <path d="M20 6v12" />
      </svg>
    </IconBadge>
  );
}

export function SahityaIcon() {
  return (
    <IconBadge>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5V6a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v13" />
        <path d="M6.5 4H18a1 1 0 0 1 1 1v13H6.5a2.5 2.5 0 0 1 0-5H19" />
      </svg>
    </IconBadge>
  );
}

export function TempleBannerIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 140" className={className} role="img" aria-label="Temple gopuram silhouette with oil lamps">
      <circle cx="60" cy="70" r="46" fill="#ffffff" fillOpacity="0.12" />
      <circle cx="60" cy="70" r="46" fill="none" stroke="#fef3c7" strokeOpacity="0.6" strokeWidth="2" />
      {/* simplified gopuram (temple tower) tiers */}
      <g fill="#fef3c7" fillOpacity="0.9">
        <polygon points="45,70 75,70 68,58 52,58" />
        <polygon points="49,58 71,58 65,48 55,48" />
        <polygon points="53,48 67,48 60,38 60,38" />
        <rect x="40" y="70" width="40" height="8" />
      </g>
      <path d="M75 60 Q 200 -10 330 55" stroke="#fcd34d" strokeWidth="2" strokeDasharray="6 6" fill="none" />
      {/* rows of oil lamps */}
      <g fill="#fcd34d" fillOpacity="0.9">
        <circle cx="330" cy="60" r="4" />
        <circle cx="345" cy="66" r="4" />
        <circle cx="360" cy="60" r="4" />
        <circle cx="375" cy="66" r="4" />
      </g>
      <g fill="#ffffff" fillOpacity="0.85">
        <rect x="326" y="70" width="8" height="40" />
        <rect x="341" y="76" width="8" height="34" />
        <rect x="356" y="70" width="8" height="40" />
        <rect x="371" y="76" width="8" height="34" />
      </g>
    </svg>
  );
}
