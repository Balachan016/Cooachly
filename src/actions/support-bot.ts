"use server";

import { requireRole } from "@/lib/dal";
import { getSupportBotReply, isSupportBotConfigured, type SupportBotMessage } from "@/lib/support-bot";

/**
 * requireRole below is the same session check every admin page uses — it's
 * not what "no database access" is about. The rule is about the bot
 * itself: it gets nothing but the static FAQ system prompt in
 * @/lib/support-bot, no tool-calling, and this file (like that one) never
 * imports @/lib/prisma. It can't look anything real up, by construction.
 */
export async function sendSupportBotMessage(history: SupportBotMessage[]): Promise<{ reply: string | null; error?: string }> {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  if (!isSupportBotConfigured) {
    return { reply: null, error: "OpenAI isn't configured, so the support bot can't reply yet." };
  }
  if (history.length === 0) return { reply: null, error: "Nothing to send." };

  const reply = await getSupportBotReply(session.site, history);
  if (!reply) return { reply: null, error: "The bot couldn't generate a reply — try again." };
  return { reply };
}
