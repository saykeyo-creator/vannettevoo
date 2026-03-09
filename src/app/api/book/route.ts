import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyAdminNewBooking } from "@/lib/notifications";

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

/** Convert "HH:MM" (24h) to minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Convert "10:00 AM" / "2:30 PM" style to minutes since midnight */
function to24hMinutes(time12: string): number {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return timeToMinutes(time12); // fallback: already 24h
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return h * 60 + m;
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body || typeof body !== "object" || !body.date || !body.time) {
    return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 });
  }

  // Reject bookings on blocked dates/times
  const blockedEntries = await prisma.blockedTime.findMany({
    where: { date: body.date },
  });
  for (const block of blockedEntries) {
    if (!block.startTime) {
      // Entire day is blocked
      return NextResponse.json({ error: "This date is fully blocked and unavailable for booking" }, { status: 409 });
    }
    // Check if the requested time falls within a blocked time range
    // Convert "10:00 AM" style to 24h for comparison
    const requestedMinutes = to24hMinutes(body.time);
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime!);
    if (requestedMinutes >= blockStart && requestedMinutes < blockEnd) {
      return NextResponse.json({ error: "This time slot is blocked and unavailable for booking" }, { status: 409 });
    }
  }

  // Reject double-bookings — same date+time with an active booking
  const existingBooking = await prisma.booking.findFirst({
    where: {
      date: body.date,
      time: body.time,
      status: { in: ["pending", "confirmed"] },
    },
  });
  if (existingBooking) {
    return NextResponse.json({ error: "This time slot is already booked" }, { status: 409 });
  }

  const email = (body.Email || body.email || "").trim().toLowerCase();
  const phone = (body.Phone || body.phone || "").trim() || null;
  const bookingNotes = (body.Notes || body.notes || "").trim() || null;

  // Support both "Full Name" (booking form) and "First Name"/"Last Name" (other forms)
  let firstName = (body["First Name"] || body.firstName || "").trim();
  let lastName = (body["Last Name"] || body.lastName || "").trim();
  if (!firstName && body["Full Name"]) {
    const split = splitFullName(body["Full Name"]);
    firstName = split.firstName;
    lastName = split.lastName;
  }

  let patientId: string | undefined;

  if (email) {
    const existing = await prisma.patient.findUnique({ where: { email } });
    if (existing) {
      patientId = existing.id;
    } else {
      const patient = await prisma.patient.create({
        data: { email, firstName, lastName, phone },
      });
      patientId = patient.id;
    }
  }

  if (patientId) {
    await prisma.booking.create({
      data: {
        date: body.date,
        time: body.time,
        notes: bookingNotes,
        patientId,
      },
    });

    const name = [firstName, lastName].filter(Boolean).join(" ") || email;
    notifyAdminNewBooking(name, body.date, body.time).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
