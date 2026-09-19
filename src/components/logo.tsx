import Image from "next/image";

const LOGO_ASPECT_RATIO = 551 / 179;

export function Logo({ withTagline = false, className = "" }: { withTagline?: boolean; className?: string }) {
  const width = withTagline ? 176 : 132;
  return (
    <Image
      src="/logo.png"
      alt="Cooachly — Your friendly guide"
      width={width}
      height={Math.round(width / LOGO_ASPECT_RATIO)}
      priority
      className={`h-auto w-full ${className}`}
      style={{ maxWidth: width }}
    />
  );
}
