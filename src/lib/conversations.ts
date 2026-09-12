import "server-only";
import { prisma } from "@/lib/prisma";

export async function getConversationPeers(userId: string) {
  const [bookingsAsProfessor, bookingsAsStudent, messages] = await Promise.all([
    prisma.booking.findMany({ where: { professorId: userId }, select: { studentId: true }, distinct: ["studentId"] }),
    prisma.booking.findMany({ where: { studentId: userId }, select: { professorId: true }, distinct: ["professorId"] }),
    prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      select: { senderId: true, receiverId: true },
    }),
  ]);

  const peerIds = new Set<string>();
  bookingsAsProfessor.forEach((b) => peerIds.add(b.studentId));
  bookingsAsStudent.forEach((b) => peerIds.add(b.professorId));
  messages.forEach((m) => peerIds.add(m.senderId === userId ? m.receiverId : m.senderId));
  peerIds.delete(userId);

  if (peerIds.size === 0) return [];

  const peers = await prisma.user.findMany({ where: { id: { in: Array.from(peerIds) } } });

  const lastMessages = await prisma.message.findMany({
    where: {
      OR: Array.from(peerIds).map((peerId) => ({
        OR: [
          { senderId: userId, receiverId: peerId },
          { senderId: peerId, receiverId: userId },
        ],
      })),
    },
    orderBy: { createdAt: "desc" },
  });

  const lastMessageByPeer = new Map<string, (typeof lastMessages)[number]>();
  for (const m of lastMessages) {
    const peerId = m.senderId === userId ? m.receiverId : m.senderId;
    if (!lastMessageByPeer.has(peerId)) lastMessageByPeer.set(peerId, m);
  }

  return peers
    .map((peer) => ({ peer, lastMessage: lastMessageByPeer.get(peer.id) ?? null }))
    .sort((a, b) => {
      const at = a.lastMessage?.createdAt.getTime() ?? 0;
      const bt = b.lastMessage?.createdAt.getTime() ?? 0;
      return bt - at;
    });
}
