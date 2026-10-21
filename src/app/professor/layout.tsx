import { requireRole, getCurrentUser } from "@/lib/dal";
import { sitePath, SITE_CONFIG } from "@/lib/site";
import { DashboardShell } from "@/components/dashboard-shell";
import { ConsentGate } from "@/components/consent-gate";
import { getConsentRequirement } from "@/lib/consent";

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("PROFESSOR");
  const user = await getCurrentUser();
  if (user) {
    const requirement = await getConsentRequirement({
      userId: session.userId,
      site: session.site,
      role: "PROFESSOR",
      viewerTimezone: user.timezone,
    });
    if (requirement.needsAcceptance) {
      const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: user.timezone }).format(new Date());
      return <ConsentGate content={requirement.content} monthLabel={monthLabel} />;
    }
  }

  const p = (path: string) => sitePath(session.site, path);
  const navLinks = [
    { href: p("/professor"), label: "Dashboard" },
    { href: p("/professor/availability"), label: "Availability" },
    { href: p("/professor/bookings"), label: "Bookings" },
    { href: p("/professor/tests"), label: "Tests" },
    { href: p("/professor/messages"), label: "Messages" },
    { href: p("/professor/profile"), label: "Profile" },
  ];

  return (
    <DashboardShell
      navLinks={navLinks}
      roleLabel="Professor"
      userName={session.name}
      homeHref={SITE_CONFIG[session.site].homeHref}
      settingsHref={p("/settings")}
      switchedInBy={session.impersonatorName}
    >
      {children}
    </DashboardShell>
  );
}
