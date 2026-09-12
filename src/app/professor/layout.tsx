import { requireRole } from "@/lib/dal";
import { DashboardShell } from "@/components/dashboard-shell";

const navLinks = [
  { href: "/professor", label: "Dashboard" },
  { href: "/professor/availability", label: "Availability" },
  { href: "/professor/bookings", label: "Bookings" },
  { href: "/professor/messages", label: "Messages" },
  { href: "/professor/profile", label: "Profile" },
];

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("PROFESSOR");

  return (
    <DashboardShell navLinks={navLinks} roleLabel="Professor" userName={session.name}>
      {children}
    </DashboardShell>
  );
}
