// Inline SVG wordmark for Cooachly Arts (Carnatic vocals), so the tab has
// its own visual identity without depending on an external image asset —
// matching how the main Cooachly <Logo> and its illustrations are inline
// SVG rather than a hosted image.
export function ArtsLogo({ withTagline = false, className = "" }: { withTagline?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="34" height="34" viewBox="0 0 40 40" role="img" aria-label="Cooachly Arts">
        <circle cx="20" cy="20" r="19" fill="#7f1d1d" />
        <path
          d="M11 27 C11 16, 14 11, 20 11 C26 11, 29 16, 29 27"
          fill="none"
          stroke="#fcd34d"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="11" cy="27" r="2.3" fill="#fcd34d" />
        <circle cx="29" cy="27" r="2.3" fill="#fcd34d" />
        <path d="M15 21 Q20 16 25 21" fill="none" stroke="#fef3c7" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M15 25 Q20 21 25 25" fill="none" stroke="#fef3c7" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="leading-tight">
        <span className="block text-lg font-bold tracking-tight text-brand-900 dark:text-accent-300">
          Cooachly <span className="text-brand-700 dark:text-brand-400">Arts</span>
        </span>
        {withTagline && (
          <span className="block text-[11px] font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            Carnatic vocals, taught live
          </span>
        )}
      </span>
    </div>
  );
}
