import { redirect } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { roleHomePath } from "@/lib/roles";

export default async function DashboardRedirect() {
  const session = await requireSession();
  redirect(roleHomePath(session.role, session.site));
}
