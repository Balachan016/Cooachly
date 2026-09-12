import { requireRole } from "@/lib/dal";
import { DashboardShell } from "@/components/dashboard-shell";

const navLinks = [
  { href: "/student", label: "Dashboard" },
  { href: "/student/professors", label: "Find a professor" },
  { href: "/student/bookings", label: "My bookings" },
  { href: "/student/messages", label: "Messages" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("STUDENT");

  return (
    <DashboardShell navLinks={navLinks} roleLabel="Student" userName={session.name}>
      {children}
    </DashboardShell>
  );
}
