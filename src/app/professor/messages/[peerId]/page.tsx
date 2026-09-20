import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { MessageThread } from "@/components/message-thread";

export default async function ProfessorMessageThreadPage(props: PageProps<"/professor/messages/[peerId]">) {
  const { peerId } = await props.params;
  const user = await getCurrentUser();
  if (!user) return null;

  const peer = await prisma.user.findUnique({ where: { id: peerId } });
  if (!peer || peer.site !== user.site) notFound();

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: user.id, receiverId: peerId },
        { senderId: peerId, receiverId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Messages</h1>
      <div className="mt-6 max-w-lg">
        <MessageThread messages={messages} currentUserId={user.id} peerId={peer.id} peerName={peer.name} />
      </div>
    </div>
  );
}
