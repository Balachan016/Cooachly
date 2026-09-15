import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { EditUserForm } from "./edit-user-form";
import { ResetPasswordForm } from "./reset-password-form";

export default async function AdminEditUserPage(props: PageProps<"/admin/users/[id]">) {
  const { id } = await props.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { professorProfile: true },
  });
  if (!user) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Edit {user.name}</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        {user.role === "STUDENT"
          ? "Update this student's contact details, including their parent/guardian's info."
          : user.role === "PROFESSOR"
            ? "Update this professor's contact details and public profile."
            : "Update this admin's contact details."}
      </p>

      <Card className="mt-6 max-w-xl">
        <EditUserForm user={user} />
      </Card>

      <Card className="mt-6 max-w-xl">
        <h2 className="font-semibold">Reset password</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Set a new password for this account directly — useful when the person can&apos;t use the
          self-service &quot;Forgot password&quot; email link.
        </p>
        <ResetPasswordForm userId={user.id} />
      </Card>
    </div>
  );
}
