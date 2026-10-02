import { z } from "zod";

/**
 * Normalizes a raw phone number to E.164 (+<countrycode><digits>, 8-15 digits
 * total after the +), which Twilio's WhatsApp API requires exactly. Strips
 * spaces, dashes, parens, and dots; treats a leading "00" as "+". Returns
 * null if the result doesn't look like a valid E.164 number.
 */
export function normalizePhoneE164(raw: string): string | null {
  let value = raw.trim().replace(/[\s().-]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!value.startsWith("+")) value = `+${value}`;
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}

export const OptionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || normalizePhoneE164(value) !== null, {
    message: "Enter a valid phone number with country code, e.g. +14155551234",
  })
  .transform((value) => (value ? normalizePhoneE164(value) ?? undefined : value));
