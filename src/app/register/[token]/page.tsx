import Link from "next/link";
import { Card } from "@/components/ui";
import { Logo } from "@/components/logo";
import { getInvitePreview } from "@/actions/invites";
import { RegisterInviteForm } from "./register-invite-form";

export default async function RegisterInvitePage(props: PageProps<"/register/[token]">) {
  const { token } = await props.params;
  const invite = await getInvitePreview(token);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
        ← Home
      </Link>
      <Link href="/" className="mb-8">
        <Logo withTagline />
      </Link>
      <Card className="w-full max-w-sm">
        {invite ? (
          <>
            <h1 className="text-xl font-semibold">Welcome, {invite.name}!</h1>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Create a password to activate your Cooachly account ({invite.email}).
            </p>
            <RegisterInviteForm token={token} />
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">This invite link is no longer valid</h1>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              It may have expired or already been used. Please contact us for a new one.
            </p>
            <Link href="/contact" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
              Contact us →
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
