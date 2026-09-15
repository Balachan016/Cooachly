import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { roleHomePath } from "@/lib/roles";
import { Card } from "@/components/ui";
import { ChangePasswordForm } from "./change-password-form";

export default async function SettingsPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <div className="flex items-center gap-4">
        <Link
          href={roleHomePath(session.role)}
          className="text-sm font-medium text-green-700 hover:underline dark:text-green-400"
        >
          ← Back to dashboard
        </Link>
        <Link href="/" className="text-sm font-medium text-green-700 hover:underline dark:text-green-400">
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
    </div>
  );
}
