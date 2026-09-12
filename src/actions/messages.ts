"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";

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
  if (!receiver) return { message: "Recipient not found." };

  await prisma.message.create({
    data: { senderId: session.userId, receiverId, body },
  });

  revalidatePath("/professor/messages");
  revalidatePath("/student/messages");

  return { message: null };
}
