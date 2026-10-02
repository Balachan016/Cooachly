import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Card } from "@/components/ui";
import { ScheduleImportForm } from "./import-form";

export default async function ScheduleImportPage() {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Import schedule</h1>
      <p className="mt-1 max-w-3xl text-sm text-black/60 dark:text-white/60">
        Paste rows of <code>Student,Professor,Subject,Date,Time,Timezone</code> (Date as DD-MM-YYYY, Time as 24-hour
        HH:mm, Timezone as an IANA name like <code>Asia/Kolkata</code> or <code>America/New_York</code>) to bulk-create
        confirmed classes. Student and guru are matched by name within your site — a name that&apos;s missing,
        ambiguous, or would double-book someone is skipped and listed below instead of guessed at. Everyone created
        gets the normal booking confirmation email/WhatsApp, CC&apos;d to admins, plus a video room if Daily is configured.
      </p>

      <Card className="mt-6">
        <ScheduleImportForm />
      </Card>

      <a
        href={sitePath(session.site, "/admin/bookings")}
        className="mt-4 inline-block text-sm font-medium text-black/50 hover:underline dark:text-white/50"
      >
        ← Back to bookings
      </a>
    </div>
  );
}
