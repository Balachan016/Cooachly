import Link from "next/link";
import { Card } from "@/components/ui";
import { Logo } from "@/components/logo";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage(props: PageProps<"/reset-password/[token]">) {
  const { token } = await props.params;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
        ← Home
      </Link>
      <Link href="/" className="mb-8">
        <Logo withTagline />
      </Link>
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Enter a new password for your Cooachly account.
        </p>

        <ResetPasswordForm token={token} />
      </Card>
    </div>
  );
}
