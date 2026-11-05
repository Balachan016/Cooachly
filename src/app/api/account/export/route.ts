import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";

/**
 * Self-service "what data do you hold on me" export — every logged-in
 * account can download this for themselves from Settings. Covers the main
 * categories of personal data this app stores: profile, bookings on either
 * side, reviews given/received, messages sent/received, and consent
 * acceptances. Not every column of every table (e.g. internal Stripe/Daily
 * ids are left out as operational, not personal, data).
 */
export async function GET() {
  const session = await requireSession();

  const [
    user,
    studentProfile,
    bookingsAsStudent,
    bookingsAsProfessor,
    reviewsGiven,
    reviewsReceived,
    messagesSent,
    messagesReceived,
    consentAcceptances,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.studentProfile.findUnique({ where: { userId: session.userId } }),
    prisma.booking.findMany({
      where: { studentId: session.userId },
      include: { professor: { select: { name: true } } },
      orderBy: { startAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { professorId: session.userId },
      include: { student: { select: { name: true } } },
      orderBy: { startAt: "desc" },
    }),
    prisma.review.findMany({
      where: { raterId: session.userId },
      include: { ratee: { select: { name: true } } },
    }),
    prisma.review.findMany({
      where: { rateeId: session.userId },
      include: { rater: { select: { name: true } } },
    }),
    prisma.message.findMany({
      where: { senderId: session.userId },
      include: { receiver: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.findMany({
      where: { receiverId: session.userId },
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.consentAcceptance.findMany({ where: { userId: session.userId }, orderBy: { acceptedAt: "desc" } }),
  ]);

  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const data = {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      code: user.code,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      timezone: user.timezone,
      site: user.site,
      createdAt: user.createdAt,
    },
    studentProfile: studentProfile
      ? {
          country: studentProfile.country,
          curriculumLevel: studentProfile.curriculumLevel,
          curriculum: studentProfile.curriculum,
          grade: studentProfile.grade,
        }
      : undefined,
    bookingsAsStudent: bookingsAsStudent.map((b) => ({
      id: b.id,
      professor: b.professor.name,
      startAt: b.startAt,
      endAt: b.endAt,
      status: b.status,
      notes: b.notes,
    })),
    bookingsAsProfessor: bookingsAsProfessor.map((b) => ({
      id: b.id,
      student: b.student.name,
      startAt: b.startAt,
      endAt: b.endAt,
      status: b.status,
      notes: b.notes,
    })),
    reviewsGiven: reviewsGiven.map((r) => ({ about: r.ratee.name, rating: r.rating, comment: r.comment, createdAt: r.createdAt })),
    reviewsReceived: reviewsReceived.map((r) => ({ from: r.rater.name, rating: r.rating, comment: r.comment, createdAt: r.createdAt })),
    messagesSent: messagesSent.map((m) => ({ to: m.receiver.name, body: m.body, createdAt: m.createdAt })),
    messagesReceived: messagesReceived.map((m) => ({ from: m.sender.name, body: m.body, createdAt: m.createdAt })),
    consentAcceptances: consentAcceptances.map((c) => ({
      periodYear: c.periodYear,
      periodMonth: c.periodMonth,
      role: c.role,
      acceptedAt: c.acceptedAt,
    })),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-account-data.json"`,
    },
  });
}
