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
}: {
  children: React.ReactNode;
  navLinks: NavLink[];
  roleLabel: string;
  userName: string;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/">
              <Logo />
            </Link>
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
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <div className="font-medium">{userName}</div>
              <div className="text-xs text-black/50 dark:text-white/50">{roleLabel}</div>
            </div>
            <Link href="/settings">
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
        <nav className="flex gap-1 overflow-x-auto px-6 pb-3 sm:hidden">
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
