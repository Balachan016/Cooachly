"use server";

import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/notifications/email";
import { DEFAULT_SITE, SITE_CONFIG } from "@/lib/site";
import type { Site } from "@prisma/client";

export type EnquiryFormState = { message?: string; success?: true } | undefined;

const EnquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().optional(),
  country: z.string().trim().optional(),
  message: z.string().trim().min(5, "Please enter a short message."),
});

export async function submitEnquiry(_state: EnquiryFormState, formData: FormData): Promise<EnquiryFormState> {
  const parsed = EnquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    country: formData.get("country") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const site: Site = formData.get("site") === "ARTS" ? "ARTS" : DEFAULT_SITE;
  const enquiry = await prisma.enquiry.create({ data: { ...parsed.data, site } });

  if (isEmailConfigured) {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true, site },
      select: { email: true },
    });
    if (admins.length > 0) {
      await Promise.all(
        admins.map((admin) =>
          sendEmail({
            to: admin.email,
            subject: `New ${SITE_CONFIG[site].brandName} enquiry`,
            html: `
              <p>New enquiry from <strong>${enquiry.name}</strong> (${enquiry.email}${enquiry.phone ? `, ${enquiry.phone}` : ""}${enquiry.country ? `, ${enquiry.country}` : ""}):</p>
              <p style="white-space:pre-wrap">${enquiry.message}</p>
            `,
          })
        )
      );
    }
  }

  return { message: "Thanks — we've received your message and will get back to you soon.", success: true };
}
