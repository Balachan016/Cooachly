"use server";

import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/notifications/email";
import { sendWhatsAppDemoConfirmation } from "@/lib/notifications/sms";
import { DEFAULT_SITE, SITE_CONFIG } from "@/lib/site";
import { OptionalPhoneSchema } from "@/lib/phone";
import type { Site } from "@prisma/client";

export type DemoRequestFormState = { message?: string; success?: true } | undefined;

const DemoRequestSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email."),
  phone: OptionalPhoneSchema,
  timezone: z.string().min(1),
  subject: z.string().trim().min(2, "Please tell us what you'd like a demo for."),
  grade: z.string().trim().optional(),
  referredBy: z.string().trim().optional(),
});

export async function submitDemoRequest(
  _state: DemoRequestFormState,
  formData: FormData
): Promise<DemoRequestFormState> {
  const parsed = DemoRequestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    timezone: formData.get("timezone"),
    subject: formData.get("subject"),
    grade: formData.get("grade") || undefined,
    referredBy: formData.get("referredBy") || undefined,
  });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const { name, email, phone, timezone, subject, grade, referredBy } = parsed.data;
  const site: Site = formData.get("site") === "ARTS" ? "ARTS" : DEFAULT_SITE;
  const brandName = SITE_CONFIG[site].brandName;

  const demoRequest = await prisma.demoRequest.create({
    data: { site, name, email, phone: phone || null, timezone, subject, grade: grade || null, referredBy: referredBy || null },
  });

  if (isEmailConfigured) {
    await sendEmail({
      to: email,
      site,
      subject: `We've got your ${brandName} demo request`,
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for requesting a free demo for <strong>${subject}</strong>! Our team will review your
        request and reach out shortly to schedule a call and set up a time that works for you.</p>
        <p>— ${brandName}</p>
      `,
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true, site },
      select: { email: true },
    });
    await Promise.all(
      admins.map((admin) =>
        sendEmail({
          to: admin.email,
          site,
          subject: `New ${brandName} demo request`,
          html: `
            <p>New demo request from <strong>${demoRequest.name}</strong> (${demoRequest.email}${demoRequest.phone ? `, ${demoRequest.phone}` : ""}).</p>
            <p>Subject: ${demoRequest.subject}${demoRequest.grade ? ` · Grade: ${demoRequest.grade}` : ""}</p>
            ${demoRequest.referredBy ? `<p>Referred by: ${demoRequest.referredBy}</p>` : ""}
            <p>Please schedule a call with them and the right professor from the admin dashboard.</p>
          `,
        })
      )
    );
  }

  if (phone) {
    await sendWhatsAppDemoConfirmation({
      to: phone,
      body: `Thanks for requesting a free ${brandName} demo for ${subject}! We'll reach out shortly to schedule a time.`,
      variables: { name, brandName, subject },
    });
  }

  return {
    message: "Thanks! We've received your demo request and will reach out shortly to schedule a time.",
    success: true,
  };
}
