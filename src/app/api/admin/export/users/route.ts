import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { toCsv, csvResponseHeaders } from "@/lib/csv";

export async function GET() {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const users = await prisma.user.findMany({
    where: { site: session.site },
    orderBy: { createdAt: "desc" },
  });

  const rows = [
    ["Name", "Email", "Phone", "Role", "Active", "Timezone", "Joined (UTC)"],
    ...users.map((u) => [u.name, u.email, u.phone ?? "", u.role, u.isActive ? "Yes" : "No", u.timezone, u.createdAt.toISOString()]),
  ];

  return new NextResponse(toCsv(rows), { headers: csvResponseHeaders("users.csv") });
}
