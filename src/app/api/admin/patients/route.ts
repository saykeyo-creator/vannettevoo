import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const statusFilter = searchParams.get("status"); // "active" | "archived" | null (all)

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (statusFilter && ["active", "archived"].includes(statusFilter)) {
    where.status = statusFilter;
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { surveys: true, bookings: true, notes: true } },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  return NextResponse.json({
    patients,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
  const dob = typeof body.dob === "string" && body.dob.trim() ? body.dob.trim() : null;

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "First name, last name, and email are required" }, { status: 400 });
  }

  // Check for duplicate email
  const existing = await prisma.patient.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A patient with this email already exists" }, { status: 409 });
  }

  const patient = await prisma.patient.create({
    data: { firstName, lastName, email, phone, dob },
  });

  return NextResponse.json(patient, { status: 201 });
}
