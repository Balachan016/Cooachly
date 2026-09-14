export function Logo({ withTagline = false, className = "" }: { withTagline?: boolean; className?: string }) {
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className="text-xl font-extrabold tracking-tight">
        <span className="text-green-800 dark:text-green-400">Cooach</span>
        <span className="text-lime-500">ly</span>
      </span>
      {withTagline && (
        <span className="text-[11px] font-medium italic text-lime-600 dark:text-lime-400">
          Your friendly guide
        </span>
      )}
    </span>
  );
}
