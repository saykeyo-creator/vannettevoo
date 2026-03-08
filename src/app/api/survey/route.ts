import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function extractSurveyFields(body: Record<string, unknown>) {
  const surveyType = body.type === "progress" ? "progress" : "intake";
  let email = "";
  let firstName = "";
  let lastName = "";

  if (surveyType === "intake") {
    // Intake sends { type: "intake", data: { "First Name": ..., "Email Address": ... } }
    const data = (body.data ?? body) as Record<string, unknown>;
    firstName = String(data["First Name"] || "").trim();
    lastName = String(data["Last Name"] || "").trim();
    email = String(data["Email Address"] || data["Email"] || data["email"] || "").trim().toLowerCase();
  } else {
    // Progress sends { type: "progress", identity: { "First Name": ..., "Email": ... }, ratings, feedback }
    const identity = (body.identity ?? body) as Record<string, unknown>;
    firstName = String(identity["First Name"] || "").trim();
    lastName = String(identity["Last Name"] || "").trim();
    email = String(identity["Email"] || identity["email"] || "").trim().toLowerCase();
  }

  return { surveyType, email, firstName, lastName };
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { surveyType, email, firstName, lastName } = extractSurveyFields(body as Record<string, unknown>);

  let patientId: string | undefined;

  if (email) {
    const existing = await prisma.patient.findUnique({ where: { email } });
    if (existing) {
      patientId = existing.id;
    } else {
      const patient = await prisma.patient.create({
        data: { email, firstName, lastName },
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
  }

  return NextResponse.json({ success: true });
}
