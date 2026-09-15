// Custom inline SVG illustrations matching the Cooachly brand (dark green / lime),
// so the marketing pages don't depend on any external image host.

export function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 400" className={className} role="img" aria-label="Student learning online with Cooachly">
      <defs>
        <linearGradient id="hero-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8f5e9" />
          <stop offset="100%" stopColor="#c8e6c9" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="480" height="400" rx="24" fill="url(#hero-bg)" />
      <path d="M0 40 A 200 200 0 0 1 200 0 L 0 0 Z" fill="#9CCC65" opacity="0.5" />

      {/* Desk */}
      <rect x="60" y="300" width="360" height="14" rx="4" fill="#1B5E20" />
      {/* Laptop */}
      <rect x="150" y="250" width="140" height="55" rx="6" fill="#ffffff" stroke="#1B5E20" strokeWidth="3" />
      <rect x="160" y="258" width="120" height="34" rx="2" fill="#1B5E20" />
      <text x="220" y="280" textAnchor="middle" fontSize="14" fontWeight="700" fill="#9CCC65" fontFamily="Arial, sans-serif">
        Cooachly
      </text>
      <path d="M145 305 L295 305 L305 314 L135 314 Z" fill="#e0e0e0" />

      {/* Notebook */}
      <rect x="300" y="288" width="70" height="18" rx="2" fill="#ffffff" stroke="#1B5E20" strokeWidth="2" />
      <line x1="308" y1="294" x2="360" y2="294" stroke="#9CCC65" strokeWidth="1.5" />
      <line x1="308" y1="299" x2="345" y2="299" stroke="#9CCC65" strokeWidth="1.5" />

      {/* Person (simplified, headphones) */}
      <circle cx="220" cy="185" r="38" fill="#2E7D32" />
      <circle cx="220" cy="175" r="30" fill="#ffe0b2" />
      <path d="M190 165 a30 30 0 0 1 60 0" fill="#3e2723" />
      <rect x="185" y="160" width="10" height="26" rx="5" fill="#1B5E20" />
      <rect x="245" y="160" width="10" height="26" rx="5" fill="#1B5E20" />
      <path d="M188 158 a32 32 0 0 1 64 0" fill="none" stroke="#1B5E20" strokeWidth="6" strokeLinecap="round" />
      <path d="M160 260 Q 175 200 220 205 Q 265 200 280 260 Z" fill="#2E7D32" />

      {/* Floating icons */}
      <circle cx="90" cy="90" r="26" fill="#1B5E20" />
      <text x="90" y="98" textAnchor="middle" fontSize="22" fill="#ffffff" fontFamily="Arial, sans-serif">π</text>
      <circle cx="410" cy="110" r="26" fill="#2E7D32" />
      <text x="410" y="118" textAnchor="middle" fontSize="20" fill="#ffffff" fontFamily="Arial, sans-serif">✓</text>
      <circle cx="420" cy="230" r="20" fill="#9CCC65" />
      <text x="420" y="237" textAnchor="middle" fontSize="16" fill="#1B5E20" fontFamily="Arial, sans-serif">★</text>
    </svg>
  );
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-800 bg-green-900 text-lime-300 dark:border-lime-500">
      {children}
    </div>
  );
}

export function MathIcon() {
  return (
    <IconBadge>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="5" y1="7" x2="9" y2="7" />
        <line x1="15" y1="7" x2="19" y2="7" />
        <line x1="17" y1="5" x2="17" y2="9" />
        <line x1="5" y1="12" x2="9" y2="12" />
        <line x1="5" y1="17" x2="9" y2="17" />
        <line x1="13" y1="17" x2="19" y2="17" />
        <line x1="15" y1="15" x2="19" y2="19" />
        <line x1="19" y1="15" x2="15" y2="19" />
      </svg>
    </IconBadge>
  );
}

export function ChemistryIcon() {
  return (
    <IconBadge>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6" />
        <path d="M10 3v6l-5 9a1.5 1.5 0 0 0 1.3 2.2h11.4A1.5 1.5 0 0 0 19 18l-5-9V3" />
        <path d="M8 15h8" />
      </svg>
    </IconBadge>
  );
}

export function PhysicsIcon() {
  return (
    <IconBadge>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <ellipse cx="12" cy="12" rx="9" ry="4" />
        <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" />
      </svg>
    </IconBadge>
  );
}

export function GlobeReachIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 140" className={className} role="img" aria-label="Educators from India teaching students in the USA">
      <circle cx="60" cy="70" r="46" fill="#ffffff" fillOpacity="0.15" />
      <circle cx="60" cy="70" r="46" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" />
      <path d="M20 70 h80 M60 30 v80 M32 44 q28 18 56 0 M32 96 q28 -18 56 0" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.5" fill="none" />
      <path d="M75 60 Q 200 -10 330 55" stroke="#9CCC65" strokeWidth="2" strokeDasharray="6 6" fill="none" />
      <g transform="translate(310,40) rotate(20)">
        <path d="M0 8 L22 0 L14 8 L22 16 Z" fill="#9CCC65" />
      </g>
      {/* simple skyline */}
      <g fill="#ffffff" fillOpacity="0.85">
        <rect x="330" y="60" width="10" height="50" />
        <rect x="344" y="40" width="12" height="70" />
        <rect x="360" y="70" width="10" height="40" />
        <polygon points="349,40 350,20 351,40" fill="#ffffff" />
        <rect x="376" y="55" width="10" height="55" />
      </g>
    </svg>
  );
}
