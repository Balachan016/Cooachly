import "server-only";
import type { Site } from "@prisma/client";
import { SITE_CONFIG } from "@/lib/site";

const apiKey = process.env.OPENAI_API_KEY;

export const isSupportBotConfigured = Boolean(apiKey);

export type SupportBotMessage = { role: "user" | "assistant"; content: string };

/**
 * Rule #1 for this bot: it never gets database access. The system prompt
 * below is the ONLY source of truth it's given — a static FAQ built from
 * SITE_CONFIG (a hardcoded config object, not a query) — and this file
 * imports nothing from @/lib/prisma, @/actions, or any other data layer.
 * It can only ever talk in generalities about how the site works; it can't
 * look up a real booking, account, or payment, because it has no way to.
 */
function buildSystemPrompt(site: Site): string {
  const config = SITE_CONFIG[site];
  return [
    `You are a customer-support assistant for ${config.brandName}, a platform for ${config.description}`,
    `This is an internal admin tool for testing how you answer enquiries — you are NOT connected to any database, booking system, or user account, and you must never claim otherwise.`,
    `How ${config.brandName} works, in general terms:`,
    `- Students book scheduled 1:1 sessions with professors/gurus across timezones.`,
    `- Sessions happen over video call; completed sessions get an AI-generated summary.`,
    `- Payments and billing are handled per site policy; you don't have visibility into any specific student's or professor's account, balance, or booking.`,
    `- A free demo session is available for prospective students before they commit.`,
    `Ground rules:`,
    `- Answer only general questions about how the platform works, policies, and how to get help.`,
    `- If asked about a specific booking, payment, account, or anything that would require looking something up, say you can't access that and point them to a human: ${config.supportEmail} or ${config.supportPhone}.`,
    `- Never invent specific facts (prices, dates, names) you weren't given here.`,
    `- Keep answers short and friendly.`,
  ].join("\n");
}

export async function getSupportBotReply(site: Site, history: SupportBotMessage[]): Promise<string | null> {
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: buildSystemPrompt(site) }, ...history],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      console.error("Failed to get support bot reply", await res.text());
      return null;
    }

    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error("Failed to reach OpenAI for support bot reply", err);
    return null;
  }
}
