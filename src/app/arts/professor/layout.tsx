import { requireRole } from "@/lib/dal";
import { sitePath, SITE_CONFIG } from "@/lib/site";
import { DashboardShell } from "@/components/dashboard-shell";
import { ArtsLogo } from "@/components/arts/logo";

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("PROFESSOR");
  const p = (path: string) => sitePath(session.site, path);
  const navLinks = [
    { href: p("/professor"), label: "Dashboard" },
    { href: p("/professor/availability"), label: "Availability" },
    { href: p("/professor/bookings"), label: "Bookings" },
    { href: p("/professor/messages"), label: "Messages" },
    { href: p("/professor/profile"), label: "Profile" },
  ];

  return (
    <DashboardShell
      navLinks={navLinks}
      roleLabel="Guru"
      userName={session.name}
      homeHref={SITE_CONFIG[session.site].homeHref}
      settingsHref={p("/settings")}
      logo={<ArtsLogo />}
    >
      {children}
    </DashboardShell>
  );
}
