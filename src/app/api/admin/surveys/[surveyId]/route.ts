import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ surveyId: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { surveyId } = await params;

  await prisma.surveySubmission.delete({ where: { id: surveyId } });
  return NextResponse.json({ success: true });
}
