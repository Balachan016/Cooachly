// Decorative pieces that recreate the look of the KKCA revision-book cover:
// blue/yellow corner swooshes, colour ribbons, round icon badges and a stack
// of books.

export function CornerSwoosh({ position }: { position: "top-left" | "bottom-right" }) {
  const placement =
    position === "top-left" ? "left-0 top-0" : "bottom-0 right-0 rotate-180";
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className={`pointer-events-none absolute h-32 w-32 sm:h-44 sm:w-44 ${placement}`}
    >
      <path d="M0 0H200C120 20 40 70 0 160Z" fill="#1d4ed8" />
      <path d="M0 160C40 70 120 20 200 0H170C110 25 45 70 0 130Z" fill="#facc15" />
      <path d="M0 0H90C55 12 22 35 0 62Z" fill="#6d28d9" />
    </svg>
  );
}

const RIBBON_COLORS = {
  red: "bg-[#dc2626] text-white",
  yellow: "bg-[#facc15] text-[#1e3a8a]",
  green: "bg-[#16a34a] text-white",
  blue: "bg-[#1d4ed8] text-white",
} as const;

export function Ribbon({
  color,
  children,
  className = "",
}: {
  color: keyof typeof RIBBON_COLORS;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`inline-block px-6 py-2 text-center text-sm font-extrabold uppercase tracking-wide shadow-md sm:text-base ${RIBBON_COLORS[color]} ${className}`}
      style={{ clipPath: "polygon(0 0, 100% 0, 97% 50%, 100% 100%, 0 100%, 3% 50%)" }}
    >
      {children}
    </div>
  );
}

export function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl text-white shadow-md ring-4 ring-white"
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  );
}

export function BookStack({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 160 120" className={className}>
      <rect x="18" y="86" width="124" height="22" rx="3" fill="#1d4ed8" />
      <rect x="18" y="86" width="10" height="22" fill="#1e3a8a" />
      <rect x="30" y="94" width="80" height="4" rx="2" fill="#facc15" />
      <rect x="26" y="62" width="112" height="22" rx="3" fill="#dc2626" />
      <rect x="26" y="62" width="10" height="22" fill="#991b1b" />
      <rect x="40" y="70" width="70" height="4" rx="2" fill="#fff" />
      <rect x="14" y="38" width="118" height="22" rx="3" fill="#16a34a" />
      <rect x="14" y="38" width="10" height="22" fill="#166534" />
      <rect x="30" y="46" width="76" height="4" rx="2" fill="#facc15" />
      <rect x="34" y="16" width="100" height="20" rx="3" fill="#6d28d9" />
      <rect x="34" y="16" width="10" height="20" fill="#4c1d95" />
      <rect x="50" y="23" width="60" height="4" rx="2" fill="#fff" />
      <path d="M140 10l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#facc15" />
    </svg>
  );
}
