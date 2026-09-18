function LeafMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 50" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="leaf-gradient" x1="20" y1="42" x2="36" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1B5E20" />
          <stop offset="60%" stopColor="#4C9A2A" />
          <stop offset="100%" stopColor="#9CCC65" />
        </linearGradient>
      </defs>
      {/* Leaf */}
      <path
        d="M20 42 C 9 35, 7 19, 18 9 C 25 4, 31 7, 33 14 C 32 25, 27 35, 20 42 Z"
        fill="url(#leaf-gradient)"
      />
      <path d="M20 42 C 19 30, 21 17, 27 10" stroke="#F1F8E9" strokeWidth="1.3" strokeLinecap="round" opacity="0.75" />
      {/* Growth arrow */}
      <path d="M27 10 C 30 6, 33 4, 36 2" stroke="#8BC34A" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M36 2 L29 3 M36 2 L35 9" stroke="#8BC34A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ withTagline = false, className = "" }: { withTagline?: boolean; className?: string }) {
  return (
    <span className={`inline-flex flex-col font-[family-name:var(--font-poppins)] ${className}`}>
      <span className="inline-flex items-baseline text-2xl font-black tracking-tight">
        <span className="text-green-800 dark:text-green-400">COOACH</span>
        <span className="relative inline-block text-green-800 dark:text-green-400">
          <LeafMark className="absolute -top-5 left-1/2 h-7 w-6 -translate-x-1/2" />L
        </span>
        <span className="text-lime-500">Y</span>
      </span>
      {withTagline && (
        <span className="-mt-0.5 text-[11px] font-medium italic text-lime-600 dark:text-lime-400">
          <span className="mr-1.5 not-italic">&bull;</span>
          Your friendly guide
          <span className="ml-1.5 not-italic">&bull;</span>
        </span>
      )}
    </span>
  );
}
