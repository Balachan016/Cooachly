import { getCurrentUser } from "@/lib/dal";
import { getConversationPeers } from "@/lib/conversations";
import { sitePath } from "@/lib/site";
import { Card } from "@/components/ui";
import { ConversationList } from "@/components/conversation-list";

export default async function ProfessorMessagesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const conversations = await getConversationPeers(user.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Messages</h1>
      <Card className="mt-6 p-0">
        <ConversationList basePath={sitePath(user.site, "/professor/messages")} conversations={conversations} />
      </Card>
    </div>
  );
}
