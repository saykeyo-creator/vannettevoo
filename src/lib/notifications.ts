/**
 * Email notification utility.
 *
 * Uses Resend when RESEND_API_KEY is set. Falls back to console logging otherwise.
 * Set NOTIFICATION_EMAIL in .env to control the admin recipient address.
 * Set RESEND_FROM_EMAIL for the sender address (must be verified in Resend).
 */

import { Resend } from "resend";

const ADMIN_EMAIL = process.env.NOTIFICATION_EMAIL || "hello@vannettevu.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Vannette Vu <noreply@vannettevu.com>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (resend) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: payload.to,
        subject: payload.subject,
        text: payload.body,
      });
      return true;
    } catch (err) {
      console.error("[Notification] Failed to send email:", err);
      return false;
    }
  }

  console.log(`[Notification] (no RESEND_API_KEY) To: ${payload.to} | Subject: ${payload.subject}`);
  return false;
}

export async function notifyAdminNewBooking(patientName: string, date: string, time: string) {
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Booking: ${patientName} on ${date}`,
    body: `A new booking has been submitted.\n\nPatient: ${patientName}\nDate: ${date}\nTime: ${time}\n\nPlease review in your admin dashboard.`,
  });
}

export async function notifyAdminNewContact(name: string, email: string) {
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Contact Message from ${name}`,
    body: `You have a new contact message.\n\nFrom: ${name} (${email})\n\nPlease review in your admin dashboard.`,
  });
}

export async function notifyAdminNewSurvey(type: string, patientEmail: string) {
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `New ${type} Survey Submitted`,
    body: `A ${type} survey has been submitted by ${patientEmail}.\n\nPlease review in your admin dashboard.`,
  });
}

export async function notifyPatientBookingConfirmed(patientEmail: string, date: string, time: string) {
  return sendEmail({
    to: patientEmail,
    subject: "Your Appointment Has Been Confirmed",
    body: `Your appointment on ${date} at ${time} has been confirmed.\n\nIf you need to reschedule, please contact us.\n\nVannette Vu Functional Neurology`,
  });
}
