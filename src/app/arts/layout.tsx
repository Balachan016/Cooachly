import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cooachly Arts — Carnatic vocals, taught live",
  description:
    "Cooachly Arts connects students with Carnatic vocal gurus for scheduled 1:1 music classes, messaging, and payments — across any timezone.",
};

export default function ArtsLayout({ children }: { children: React.ReactNode }) {
  // Scopes the --brand-*/--accent-* CSS variables (see globals.css) to the
  // Arts palette for everything under /arts, without a second <html> root —
  // the rest of the app keeps Cooachly's default green/lime unaffected.
  return (
    <div data-theme="arts" className="flex min-h-full flex-1 flex-col">
      {children}
    </div>
  );
}
