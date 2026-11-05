import { requireRole } from "@/lib/dal";
import { Card } from "@/components/ui";
import { ChatPanel } from "./chat-panel";

export default async function SupportBotPage() {
  await requireRole("ADMIN", "SUPERADMIN");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Support bot</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        A test chatbot for handling general enquiries. It has no access to our database or any account/booking
        data — it can only answer from a static FAQ, and will say so for anything it can&apos;t answer.
      </p>

      <Card className="mt-6">
        <ChatPanel />
      </Card>
    </div>
  );
}
