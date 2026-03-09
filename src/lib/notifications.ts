/**
 * Email notification utility.
 *
 * Currently logs notifications to console. When an email provider is configured
 * (e.g. Resend, SendGrid, or nodemailer), update sendEmail() to actually send.
 *
 * Set NOTIFICATION_EMAIL in .env to control the admin recipient address.
 */

const ADMIN_EMAIL = process.env.NOTIFICATION_EMAIL || "hello@vannettevu.com";

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  // TODO: Replace with actual email provider (Resend, SendGrid, etc.)
  console.log(`[Notification] To: ${payload.to} | Subject: ${payload.subject}`);
  return true;
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
