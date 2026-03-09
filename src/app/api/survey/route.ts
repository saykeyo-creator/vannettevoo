import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyAdminNewSurvey } from "@/lib/notifications";

function extractSurveyFields(body: Record<string, unknown>) {
  const surveyType = body.type === "progress" ? "progress" : "intake";
  let email = "";
  let firstName = "";
  let lastName = "";
  let phone = "";
  let dob = "";

  if (surveyType === "intake") {
    // Intake sends { type: "intake", data: { "First Name": ..., "Email Address": ... } }
    const data = (body.data ?? body) as Record<string, unknown>;
    firstName = String(data["First Name"] || "").trim();
    lastName = String(data["Last Name"] || "").trim();
    email = String(data["Email Address"] || data["Email"] || data["email"] || "").trim().toLowerCase();
    phone = String(data["Phone Number"] || data["Phone"] || data["phone"] || "").trim();
    dob = String(data["Date of Birth"] || data["DOB"] || data["dob"] || "").trim();
  } else {
    // Progress sends { type: "progress", identity: { "First Name": ..., "Email": ... }, ratings, feedback }
    const identity = (body.identity ?? body) as Record<string, unknown>;
    firstName = String(identity["First Name"] || "").trim();
    lastName = String(identity["Last Name"] || "").trim();
    email = String(identity["Email"] || identity["email"] || "").trim().toLowerCase();
  }

  return { surveyType, email, firstName, lastName, phone, dob };
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { surveyType, email, firstName, lastName, phone, dob } = extractSurveyFields(body as Record<string, unknown>);

  let patientId: string | undefined;

  if (email) {
    const existing = await prisma.patient.findUnique({ where: { email } });
    if (existing) {
      patientId = existing.id;
      // Fill in phone/dob from intake if not already set
      if (surveyType === "intake") {
        const updates: Record<string, string> = {};
        if (phone && !existing.phone) updates.phone = phone;
        if (dob && !existing.dob) updates.dob = dob;
        if (Object.keys(updates).length > 0) {
          await prisma.patient.update({ where: { id: existing.id }, data: updates });
        }
      }
    } else {
      const patient = await prisma.patient.create({
        data: {
          email,
          firstName,
          lastName,
          ...(phone ? { phone } : {}),
          ...(dob ? { dob } : {}),
        },
      });
      patientId = patient.id;
    }
  }

  if (patientId) {
    await prisma.surveySubmission.create({
      data: {
        type: surveyType,
        data: JSON.stringify(body),
        patientId,
      },
    });

    notifyAdminNewSurvey(surveyType, email).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
