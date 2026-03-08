import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month param required (YYYY-MM)" }, { status: 400 });
  }

  const blocked = await prisma.blockedTime.findMany({
    where: {
      date: { startsWith: month },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(blocked);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, startTime, endTime, reason } = body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Valid date (YYYY-MM-DD) required" }, { status: 400 });
  }

  // If startTime/endTime are both null, it blocks the entire day
  if (startTime && !endTime) {
    return NextResponse.json({ error: "endTime required when startTime is set" }, { status: 400 });
  }

  const blocked = await prisma.blockedTime.create({
    data: {
      date,
      startTime: startTime ?? null,
      endTime: endTime ?? null,
      reason: reason ?? null,
    },
  });

  return NextResponse.json(blocked, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  }

  await prisma.blockedTime.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
