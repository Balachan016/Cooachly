import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { createDailyMeetingToken } from "@/lib/daily";

/**
 * Every "Join video call" link in the app now points here instead of the
 * raw meetingLink, so the join is tagged with the signed-in user's own id
 * (via a Daily meeting token) before sending them on to the actual room —
 * that's what lets /api/daily/webhook's participant.joined/participant.left
 * handling attribute each join/leave to a real student or professor instead
 * of an anonymous Daily participant. Falls straight through to the raw link
 * for a non-Daily booking (e.g. an admin-entered external meeting link) or
 * if token creation fails for any reason, rather than blocking the join.
 */
export async function GET(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { professor: { select: { site: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const isParty = user.id === booking.studentId || user.id === booking.professorId;
  const isSiteAdmin = (user.role === "ADMIN" || user.role === "SUPERADMIN") && user.site === booking.professor.site;
  if (!isParty && !isSiteAdmin) {
    return NextResponse.json({ error: "Not authorized to join this call" }, { status: 403 });
  }

  if (!booking.meetingLink) {
    return NextResponse.json({ error: "No meeting link set for this booking" }, { status: 404 });
  }
  if (!booking.dailyRoomName || !booking.dailyRoomUrl) {
    return NextResponse.redirect(booking.meetingLink);
  }

  const token = await createDailyMeetingToken({
    roomName: booking.dailyRoomName,
    userId: user.id,
    userName: user.name,
    isOwner: user.id === booking.professorId || isSiteAdmin,
  });
  if (!token) return NextResponse.redirect(booking.dailyRoomUrl);

  const joinUrl = new URL(booking.dailyRoomUrl);
  joinUrl.searchParams.set("t", token);
  return NextResponse.redirect(joinUrl.toString());
}
