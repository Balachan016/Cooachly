import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/actions/auth";
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
}: {
  children: React.ReactNode;
  navLinks: NavLink[];
  roleLabel: string;
  userName: string;
  homeHref?: string;
  settingsHref?: string;
  logo?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-8">
            <Link href={homeHref}>{logo}</Link>
            <nav className="hidden gap-1 sm:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Name and the Home button don't fit next to the logo on a phone;
                the logo already links home. */}
            <div className="hidden text-right text-sm sm:block">
              <div className="font-medium">{userName}</div>
              <div className="text-xs text-black/50 dark:text-white/50">{roleLabel}</div>
            </div>
            <Link href={homeHref} className="hidden sm:block">
              <Button variant="secondary" type="button">
                Home
              </Button>
            </Link>
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
        <nav className="flex gap-1 overflow-x-auto px-4 pb-3 sm:hidden">
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
