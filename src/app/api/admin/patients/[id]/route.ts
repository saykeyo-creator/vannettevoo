import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
        include: { booking: { select: { id: true, date: true, time: true } } },
      },
      surveys: { orderBy: { createdAt: "desc" } },
      bookings: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(patient);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowedFields = ["firstName", "lastName", "email", "phone", "dob", "status"];
  const data: Record<string, string | null> = {};

  for (const field of allowedFields) {
    if (field in body) {
      const val = body[field];
      if (val === null || val === "") {
        data[field] = null;
      } else if (typeof val === "string") {
        data[field] = val.trim();
      }
    }
  }

  if (data.status && !["active", "archived"].includes(data.status)) {
    return NextResponse.json({ error: "Status must be 'active' or 'archived'" }, { status: 400 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const patient = await prisma.patient.update({ where: { id }, data });
  return NextResponse.json(patient);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.patient.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
