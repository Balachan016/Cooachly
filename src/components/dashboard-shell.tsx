import type { ReactNode } from "react";
import Link from "next/link";
import { logout, returnFromSwitch } from "@/actions/auth";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";

export type NavLink = { href: string; label: string };

export function DashboardShell({
  children,
  navLinks,
  roleLabel,
  userName,
  homeHref = "/",
  settingsHref = "/settings",
  logo = <Logo />,
  switchedInBy,
}: {
  children: React.ReactNode;
  navLinks: NavLink[];
  roleLabel: string;
  userName: string;
  homeHref?: string;
  settingsHref?: string;
  logo?: ReactNode;
  /** The admin's name, when this session is an admin "switched in" as this user. */
  switchedInBy?: string;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      {switchedInBy && (
        <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          <span>
            <strong>{switchedInBy}</strong> is switched in as {userName} ({roleLabel}).
          </span>
          <form action={returnFromSwitch}>
            <button type="submit" className="font-medium underline underline-offset-2">
              Return to admin
            </button>
          </form>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
      {/* Desktop: a sticky left sidebar instead of a top bar, so a long nav
          list (e.g. admin's 9 links) grows down the page instead of
          squeezing or overflowing a horizontal row. */}
      <aside className="hidden shrink-0 flex-col border-r border-black/10 dark:border-white/10 sm:sticky sm:top-0 sm:flex sm:max-h-screen sm:w-60 sm:overflow-y-auto">
        <Link href={homeHref} className="block border-b border-black/10 p-4 dark:border-white/10">
          {logo}
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-3 border-t border-black/10 p-4 dark:border-white/10">
          <div className="text-sm">
            <div className="font-medium">{userName}</div>
            <div className="text-xs text-black/50 dark:text-white/50">{roleLabel}</div>
          </div>
          <div className="flex flex-col gap-2">
            <Link href={homeHref}>
              <Button variant="secondary" type="button" className="w-full">
                Home
              </Button>
            </Link>
            <Link href={settingsHref}>
              <Button variant="secondary" type="button" className="w-full">
                Settings
              </Button>
            </Link>
            <form action={logout}>
              <Button variant="secondary" type="submit" className="w-full">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile: the old top bar + horizontally-scrollable nav. */}
      <header className="border-b border-black/10 dark:border-white/10 sm:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <Link href={homeHref} className="shrink-0">
            {logo}
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={settingsHref}>
              <Button variant="secondary" type="button">
                Settings
              </Button>
            </Link>
            <form action={logout}>
              <Button variant="secondary" type="submit">
                Log out
              </Button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
      </div>
    </div>
  );
}
