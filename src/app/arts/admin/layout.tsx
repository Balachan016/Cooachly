import { requireRole } from "@/lib/dal";
import { sitePath, SITE_CONFIG } from "@/lib/site";
import { DashboardShell } from "@/components/dashboard-shell";
import { ArtsLogo } from "@/components/arts/logo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  const p = (path: string) => sitePath(session.site, path);
  const navLinks = [
    { href: p("/admin"), label: "Overview" },
    { href: p("/admin/users"), label: "Users" },
    { href: p("/admin/bookings"), label: "Bookings" },
    { href: p("/admin/class-logs"), label: "Class logs" },
    { href: p("/admin/enquiries"), label: "Enquiries" },
    { href: p("/admin/coach-applications"), label: "Coach applications" },
  ];

  return (
    <DashboardShell
      navLinks={navLinks}
      roleLabel="Admin"
      userName={session.name}
      homeHref={SITE_CONFIG[session.site].homeHref}
      settingsHref={p("/settings")}
      logo={<ArtsLogo />}
    >
      {children}
    </DashboardShell>
  );
}
