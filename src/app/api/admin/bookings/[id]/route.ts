import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyPatientBookingConfirmed } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!status || !["pending", "confirmed", "cancelled", "completed"].includes(status)) {
    return NextResponse.json({ error: "Status must be pending, confirmed, cancelled, or completed" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const updated = await prisma.booking.update({
    where: { id },
    data: { status },
  });

  if (status === "confirmed") {
    const patient = await prisma.patient.findUnique({ where: { id: booking.patientId } });
    if (patient?.email) {
      notifyPatientBookingConfirmed(patient.email, booking.date, booking.time).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}
