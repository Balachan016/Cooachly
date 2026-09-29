import { requireRole } from "@/lib/dal";
import { DashboardShell } from "@/components/dashboard-shell";

const navLinks = [
  { href: "/superadmin", label: "Overview" },
  { href: "/superadmin/admins", label: "Admins" },
  { href: "/superadmin/audit-log", label: "Audit log" },
  { href: "/superadmin/reminders", label: "Reminders" },
  { href: "/superadmin/bookings", label: "Bookings" },
];

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("SUPERADMIN");

  return (
    <DashboardShell navLinks={navLinks} roleLabel="Superadmin" userName={session.name} homeHref="/superadmin">
      {children}
    </DashboardShell>
  );
}
