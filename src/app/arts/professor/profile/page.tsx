import { getCurrentUser } from "@/lib/dal";
import { Card } from "@/components/ui";
import { ContactInfoForm } from "@/components/contact-info-form";
import { ProfileForm } from "./profile-form";

export default async function ProfessorProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Your profile</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        This is what students see when browsing professors.
      </p>

      <Card className="mt-6 max-w-xl">
        <ProfileForm profile={user.professorProfile} />
      </Card>

      <h2 className="mt-8 text-lg font-semibold">Contact info</h2>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Used for scheduling and session reminders.
      </p>
      <Card className="mt-4 max-w-xl">
        <ContactInfoForm timezone={user.timezone} phone={user.phone} />
      </Card>
    </div>
  );
}
