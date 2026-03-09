import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
