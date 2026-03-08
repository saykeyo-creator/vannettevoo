import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month param required (YYYY-MM)" }, { status: 400 });
  }

  const blocked = await prisma.blockedTime.findMany({
    where: { date: { startsWith: month } },
    select: { date: true, startTime: true, endTime: true },
  });

  return NextResponse.json(blocked);
}
