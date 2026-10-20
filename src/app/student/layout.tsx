import { requireRole, getCurrentUser } from "@/lib/dal";
import { sitePath, SITE_CONFIG } from "@/lib/site";
import { DashboardShell } from "@/components/dashboard-shell";
import { ConsentGate } from "@/components/consent-gate";
import { getConsentRequirement } from "@/lib/consent";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("STUDENT");
  const user = await getCurrentUser();
  if (user) {
    const requirement = await getConsentRequirement({
      userId: session.userId,
      site: session.site,
      role: "STUDENT",
      viewerTimezone: user.timezone,
    });
    if (requirement.needsAcceptance) {
      const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: user.timezone }).format(new Date());
      return <ConsentGate content={requirement.content} monthLabel={monthLabel} />;
    }
  }

  const p = (path: string) => sitePath(session.site, path);
  const navLinks = [
    { href: p("/student"), label: "Dashboard" },
    { href: p("/student/professors"), label: "Find a professor" },
    { href: p("/student/bookings"), label: "My bookings" },
    { href: p("/student/tests"), label: "Tests" },
    { href: p("/student/messages"), label: "Messages" },
  ];

  return (
    <DashboardShell
      navLinks={navLinks}
      roleLabel="Student"
      userName={session.name}
      homeHref={SITE_CONFIG[session.site].homeHref}
      settingsHref={p("/settings")}
      switchedInBy={session.impersonatorName}
    >
      {children}
    </DashboardShell>
  );
}
