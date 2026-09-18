function LeafMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="leaf-gradient" x1="4" y1="34" x2="34" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1B5E20" />
          <stop offset="100%" stopColor="#9CCC65" />
        </linearGradient>
      </defs>
      {/* Leaf body */}
      <path
        d="M10 30 C 8 20, 14 10, 26 8 C 27 18, 22 26, 12 30 C 11.3 30.2, 10.3 30.4, 10 30 Z"
        fill="url(#leaf-gradient)"
      />
      <path d="M10 30 C 15 24, 19 18, 25 9" stroke="#F1F8E9" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      {/* Upward growth arrow */}
      <path
        d="M25 9 L34 2 M34 2 L34 9 M34 2 L27 2"
        stroke="#9CCC65"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ withTagline = false, className = "" }: { withTagline?: boolean; className?: string }) {
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className="relative inline-block pt-2">
        <span className="text-xl font-extrabold tracking-tight">
          <span className="text-green-800 dark:text-green-400">Cooach</span>
          <span className="text-lime-500">ly</span>
        </span>
        <LeafMark className="absolute -top-2 -right-2 h-6 w-6" />
      </span>
      {withTagline && (
        <span className="text-[11px] font-medium italic text-lime-600 dark:text-lime-400">
          <span className="mr-1.5 not-italic">&bull;</span>
          Your friendly guide
          <span className="ml-1.5 not-italic">&bull;</span>
        </span>
      )}
    </span>
  );
}
