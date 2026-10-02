import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { roleHomePath } from "@/lib/roles";
import { SITE_CONFIG, siteBasePath } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { MobileAppSettings } from "@/components/mobile-app-settings";
import { ChangePasswordForm } from "./change-password-form";
import { StudentProfileForm } from "./student-profile-form";

export default async function SettingsPage() {
  const session = await requireSession();
  const studentProfile =
    session.role === "STUDENT"
      ? await prisma.studentProfile.findUnique({ where: { userId: session.userId } })
      : null;

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <div className="flex items-center gap-4">
        <Link
          href={roleHomePath(session.role, session.site)}
          className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
        >
          ← Back to dashboard
        </Link>
        <Link href={siteBasePath(session.site) || "/"} className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
          Home
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-semibold">Account settings</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Signed in as {session.email}
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold">Change password</h2>
        <ChangePasswordForm />
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold">Mobile app & notifications</h2>
        <MobileAppSettings brandName={SITE_CONFIG[session.site].brandName} />
      </Card>

      {session.role === "STUDENT" && (
        <Card className="mt-6">
          <h2 className="font-semibold">Curriculum & syllabus</h2>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Shared with your professor before your first session.
          </p>
          <StudentProfileForm profile={studentProfile} />
        </Card>
      )}
    </div>
  );
}
