import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { startDate, endDate, reason } = body;

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: "Dates must be YYYY-MM-DD" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    return NextResponse.json({ error: "endDate must not be before startDate" }, { status: 400 });
  }

  // Generate entries for each date in the range (full day blocks)
  const entries: { date: string; reason: string | null }[] = [];
  const current = new Date(start);
  while (current <= end) {
    entries.push({
      date: current.toISOString().slice(0, 10),
      reason: reason ?? null,
    });
    current.setDate(current.getDate() + 1);
  }

  // Cap at 366 days to prevent abuse
  if (entries.length > 366) {
    return NextResponse.json({ error: "Cannot block more than 366 days at once" }, { status: 400 });
  }

  const created = await prisma.blockedTime.createMany({ data: entries });

  return NextResponse.json({ count: created.count }, { status: 201 });
}
