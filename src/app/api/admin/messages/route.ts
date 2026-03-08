import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(messages);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, read } = await request.json();
  if (!id || typeof read !== "boolean") {
    return NextResponse.json({ error: "Missing id or read flag" }, { status: 400 });
  }

  await prisma.contactMessage.update({
    where: { id },
    data: { read },
  });

  return NextResponse.json({ success: true });
}
