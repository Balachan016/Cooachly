import { requireRole } from "@/lib/dal";
import { DashboardShell } from "@/components/dashboard-shell";

const navLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/class-logs", label: "Class logs" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/coach-applications", label: "Coach applications" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");

  return (
    <DashboardShell navLinks={navLinks} roleLabel="Admin" userName={session.name}>
      {children}
    </DashboardShell>
  );
}
