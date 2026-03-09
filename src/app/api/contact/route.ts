import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyAdminNewContact } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body || typeof body !== "object" || !body.Name || !body.Email || !body.Message) {
    return NextResponse.json({ error: "Missing required contact fields" }, { status: 400 });
  }

  await prisma.contactMessage.create({
    data: {
      name: body.Name,
      email: body.Email,
      phone: body.Phone || null,
      subject: body.Subject || null,
      message: body.Message,
    },
  });

  notifyAdminNewContact(body.Name, body.Email).catch(() => {});

  return NextResponse.json({ success: true });
}
