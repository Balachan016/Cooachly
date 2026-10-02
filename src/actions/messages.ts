"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { sendPushToUser } from "@/lib/notifications/push";

const SendMessageSchema = z.object({
  receiverId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

export async function sendMessage(_state: unknown, formData: FormData) {
  const session = await requireSession();

  const parsed = SendMessageSchema.safeParse({
    receiverId: formData.get("receiverId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { message: "Message cannot be empty." };

  const { receiverId, body } = parsed.data;

  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver || receiver.site !== session.site) return { message: "Recipient not found." };

  await prisma.message.create({
    data: { senderId: session.userId, receiverId, body },
  });

  revalidatePath(sitePath(session.site, "/professor/messages"));
  revalidatePath(sitePath(session.site, "/student/messages"));

  const sender = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
  const threadPath =
    receiver.role === "PROFESSOR"
      ? `/professor/messages/${session.userId}`
      : receiver.role === "STUDENT"
        ? `/student/messages/${session.userId}`
        : "/dashboard";
  await sendPushToUser(receiverId, {
    title: `New message from ${sender?.name ?? "someone"}`,
    body: body.length > 140 ? `${body.slice(0, 137)}…` : body,
    url: sitePath(session.site, threadPath),
    tag: `messages-${session.userId}`,
  });

  return { message: null };
}
