import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyAdminNewBooking } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month parameter required (YYYY-MM)" }, { status: 400 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      date: { startsWith: month },
    },
    orderBy: { date: "asc" },
    include: {
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { patientId, date, time, notes } = body;

  if (!patientId || !date || !time) {
    return NextResponse.json({ error: "patientId, date, and time are required" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD format" }, { status: 400 });
  }

  // Verify patient exists
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Check for double-booking
  const existing = await prisma.booking.findFirst({
    where: { date, time, status: { in: ["pending", "confirmed"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "This time slot is already booked" }, { status: 409 });
  }

  const booking = await prisma.booking.create({
    data: {
      patientId,
      date,
      time,
      notes: notes || null,
      status: "confirmed",
    },
  });

  const name = [patient.firstName, patient.lastName].filter(Boolean).join(" ");
  notifyAdminNewBooking(name, date, time).catch(() => {});

  return NextResponse.json(booking, { status: 201 });
}
