import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Card } from "@/components/ui";
import { ScheduleImportForm } from "./import-form";

// Ms Sindhu's October 2026 Chemistry schedule, pre-filled so this specific
// import just needs a click — the IST Date/Time columns from her PDF
// schedule double as the Timezone-tagged rows this importer expects, since
// she (the professor) is the one already in Asia/Kolkata.
const DEFAULT_CSV = `Student,Professor,Subject,Date,Time,Timezone
Hannah,Ms Sindhu,Chemistry,03-10-2026,04:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,03-10-2026,05:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,04-10-2026,04:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,04-10-2026,05:00,Asia/Kolkata
Ananya,Ms Sindhu,Chemistry,04-10-2026,18:00,Asia/Kolkata
Ananya,Ms Sindhu,Chemistry,04-10-2026,20:00,Asia/Kolkata
Madhura,Ms Sindhu,Chemistry,04-10-2026,19:00,Asia/Kolkata
Havilah,Ms Sindhu,Chemistry,07-10-2026,04:30,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,08-10-2026,04:30,Asia/Kolkata
Havilah,Ms Sindhu,Chemistry,09-10-2026,04:30,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,10-10-2026,04:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,10-10-2026,05:00,Asia/Kolkata
Madhura,Ms Sindhu,Chemistry,10-10-2026,06:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,11-10-2026,04:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,11-10-2026,05:00,Asia/Kolkata
Madhura,Ms Sindhu,Chemistry,11-10-2026,06:00,Asia/Kolkata
Ananya,Ms Sindhu,Chemistry,11-10-2026,18:00,Asia/Kolkata
Ananya,Ms Sindhu,Chemistry,11-10-2026,20:00,Asia/Kolkata
Madhura,Ms Sindhu,Chemistry,11-10-2026,19:00,Asia/Kolkata
Havilah,Ms Sindhu,Chemistry,14-10-2026,04:30,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,15-10-2026,04:30,Asia/Kolkata
Havilah,Ms Sindhu,Chemistry,16-10-2026,04:30,Asia/Kolkata
Ananya,Ms Sindhu,Chemistry,17-10-2026,04:00,Asia/Kolkata
Ananya,Ms Sindhu,Chemistry,17-10-2026,05:00,Asia/Kolkata
Madhura,Ms Sindhu,Chemistry,17-10-2026,06:00,Asia/Kolkata
Havilah,Ms Sindhu,Chemistry,21-10-2026,04:30,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,22-10-2026,04:30,Asia/Kolkata
Havilah,Ms Sindhu,Chemistry,23-10-2026,04:30,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,24-10-2026,04:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,24-10-2026,05:00,Asia/Kolkata
Madhura,Ms Sindhu,Chemistry,24-10-2026,06:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,25-10-2026,04:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,25-10-2026,05:00,Asia/Kolkata
Ananya,Ms Sindhu,Chemistry,25-10-2026,06:00,Asia/Kolkata
Ananya,Ms Sindhu,Chemistry,25-10-2026,20:00,Asia/Kolkata
Madhura,Ms Sindhu,Chemistry,25-10-2026,19:00,Asia/Kolkata
Havilah,Ms Sindhu,Chemistry,28-10-2026,04:30,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,29-10-2026,04:30,Asia/Kolkata
Havilah,Ms Sindhu,Chemistry,30-10-2026,04:30,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,31-10-2026,04:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,31-10-2026,05:00,Asia/Kolkata
Madhura,Ms Sindhu,Chemistry,31-10-2026,06:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,01-11-2026,04:00,Asia/Kolkata
Hannah,Ms Sindhu,Chemistry,01-11-2026,05:00,Asia/Kolkata
Madhura,Ms Sindhu,Chemistry,01-11-2026,06:00,Asia/Kolkata`;

export default async function ScheduleImportPage() {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Import schedule</h1>
      <p className="mt-1 max-w-3xl text-sm text-black/60 dark:text-white/60">
        Paste rows of <code>Student,Professor,Subject,Date,Time,Timezone</code> (Date as DD-MM-YYYY, Time as 24-hour
        HH:mm, Timezone as an IANA name like <code>Asia/Kolkata</code> or <code>America/New_York</code>) to bulk-create
        confirmed sessions. Student and professor are matched by name within your site — a name that&apos;s missing,
        ambiguous, or would double-book someone is skipped and listed below instead of guessed at. Everyone created
        gets the normal booking confirmation email/WhatsApp, CC&apos;d to admins, plus a video room if Daily is configured.
      </p>
      <p className="mt-1 max-w-3xl text-sm text-black/60 dark:text-white/60">
        The box below is pre-filled with Ms Sindhu&apos;s October 2026 Chemistry schedule — review it, then click Import.
      </p>

      <Card className="mt-6">
        <ScheduleImportForm defaultCsv={DEFAULT_CSV} />
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
