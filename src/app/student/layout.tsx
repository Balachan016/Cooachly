import { requireRole } from "@/lib/dal";
import { sitePath, SITE_CONFIG } from "@/lib/site";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("STUDENT");
  const p = (path: string) => sitePath(session.site, path);
  const navLinks = [
    { href: p("/student"), label: "Dashboard" },
    { href: p("/student/professors"), label: "Find a professor" },
    { href: p("/student/bookings"), label: "My bookings" },
    { href: p("/student/messages"), label: "Messages" },
  ];

  return (
    <DashboardShell
      navLinks={navLinks}
      roleLabel="Student"
      userName={session.name}
      homeHref={SITE_CONFIG[session.site].homeHref}
      settingsHref={p("/settings")}
    >
      {children}
    </DashboardShell>
  );
}
