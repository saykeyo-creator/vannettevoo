import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before imports
vi.mock("@/lib/db", () => ({
  prisma: {
    patient: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "test-patient-id" }),
      update: vi.fn().mockResolvedValue({ id: "test-patient-id" }),
      delete: vi.fn().mockResolvedValue({ id: "test-patient-id" }),
    },
    booking: {
      create: vi.fn().mockResolvedValue({ id: "test-booking-id" }),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue({ id: "test-booking-id", status: "pending", patientId: "test-patient-id", date: "2026-01-01", time: "10:00 AM" }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: "test-booking-id", status: "confirmed" }),
    },
    blockedTime: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    surveySubmission: {
      create: vi.fn().mockResolvedValue({ id: "test-survey-id" }),
      delete: vi.fn().mockResolvedValue({ id: "test-survey-id" }),
    },
    contactMessage: {
      create: vi.fn().mockResolvedValue({ id: "test-message-id" }),
    },
    patientNote: {
      create: vi.fn().mockResolvedValue({ id: "test-note-id", content: "test" }),
      update: vi.fn().mockResolvedValue({ id: "test-note-id", content: "updated" }),
      delete: vi.fn().mockResolvedValue({ id: "test-note-id" }),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { email: "admin@test.com" } }),
}));

vi.mock("@/lib/notifications", () => ({
  notifyAdminNewBooking: vi.fn().mockResolvedValue(true),
  notifyAdminNewContact: vi.fn().mockResolvedValue(true),
  notifyAdminNewSurvey: vi.fn().mockResolvedValue(true),
  notifyPatientBookingConfirmed: vi.fn().mockResolvedValue(true),
}));

// We test the API route handlers by calling them directly
function createMockRequest(body: unknown) {
  return {
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("API Routes", () => {
  describe("POST /api/survey", () => {
    it("returns success for valid intake body", async () => {
      const { POST } = await import("@/app/api/survey/route");
      const req = createMockRequest({ type: "intake", data: { "First Name": "Test", "Last Name": "User", "Email Address": "test@test.com" } });
      const res = await POST(req as never);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("returns 400 for null body", async () => {
      const { POST } = await import("@/app/api/survey/route");
      const req = createMockRequest(null);
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("extracts patient from nested intake data with 'Email Address' field", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/survey/route");
      const req = createMockRequest({
        type: "intake",
        data: { "First Name": "Jane", "Last Name": "Doe", "Email Address": "jane@test.com", "Phone Number": "0400000000" },
      });
      await POST(req as never);
      expect(prisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ firstName: "Jane", lastName: "Doe" }),
        })
      );
      expect(prisma.surveySubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "intake" }) })
      );
    });

    it("extracts patient from nested progress identity data", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/survey/route");
      const req = createMockRequest({
        type: "progress",
        identity: { "First Name": "Bob", "Last Name": "Smith", "Email": "bob@test.com" },
        ratings: { "Dizziness": 5 },
        feedback: {},
      });
      await POST(req as never);
      expect(prisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ firstName: "Bob", lastName: "Smith" }),
        })
      );
      expect(prisma.surveySubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: "progress" }) })
      );
    });

    it("does not create patient when no email in survey data", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/survey/route");
      const req = createMockRequest({ type: "intake", data: { "First Name": "No Email" } });
      await POST(req as never);
      expect(prisma.patient.findUnique).not.toHaveBeenCalled();
      expect(prisma.surveySubmission.create).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/book", () => {
    it("returns success for valid booking", async () => {
      const { POST } = await import("@/app/api/book/route");
      const req = createMockRequest({
        date: "2026-03-10",
        time: "10:00 AM",
        Email: "test@test.com",
        "First Name": "Test",
        "Last Name": "User",
      });
      const res = await POST(req as never);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("returns 400 when date is missing", async () => {
      const { POST } = await import("@/app/api/book/route");
      const req = createMockRequest({ time: "10:00 AM" });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("splits 'Full Name' into firstName/lastName for patient creation", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/book/route");
      const req = createMockRequest({
        date: "2026-03-10",
        time: "10:00 AM",
        "Full Name": "Sarah Jane Connor",
        Email: "sarah@test.com",
        Phone: "0400111222",
      });
      await POST(req as never);
      expect(prisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ firstName: "Sarah Jane", lastName: "Connor" }),
        })
      );
    });

    it("reads 'Notes' (capital N) from booking form correctly", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/book/route");
      const req = createMockRequest({
        date: "2026-03-10",
        time: "2:00 PM",
        "Full Name": "Test User",
        Email: "test@test.com",
        Notes: "I have neck pain",
      });
      await POST(req as never);
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ notes: "I have neck pain" }),
        })
      );
    });

    it("creates patient and booking for valid submission with email", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/book/route");
      const req = createMockRequest({
        date: "2026-03-10",
        time: "10:00 AM",
        Email: "book@test.com",
        "First Name": "John",
        "Last Name": "Doe",
      });
      await POST(req as never);
      expect(prisma.patient.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "book@test.com" } })
      );
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ date: "2026-03-10", time: "10:00 AM" }) })
      );
    });

    it("does not overwrite existing patient when booking with same email", async () => {
      const { prisma } = await import("@/lib/db");
      // Simulate existing patient found
      (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "existing-patient-id", firstName: "Original", lastName: "Name" });
      const { POST } = await import("@/app/api/book/route");
      const req = createMockRequest({
        date: "2026-03-10",
        time: "10:00 AM",
        Email: "existing@test.com",
        "First Name": "Different",
        "Last Name": "Person",
      });
      await POST(req as never);
      // Should NOT create a new patient — reuse existing
      expect(prisma.patient.create).not.toHaveBeenCalled();
      // Booking should use the existing patient's id
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patientId: "existing-patient-id" }) })
      );
    });
  });

  describe("POST /api/survey — existing patient protection", () => {
    it("does not overwrite existing patient when survey submitted with same email", async () => {
      const { prisma } = await import("@/lib/db");
      (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "existing-patient-id", firstName: "Original", lastName: "Name" });
      const { POST } = await import("@/app/api/survey/route");
      const req = createMockRequest({
        type: "intake",
        data: { "First Name": "Hacker", "Last Name": "Jones", "Email Address": "existing@test.com" },
      });
      await POST(req as never);
      // Should NOT create a new patient — reuse existing
      expect(prisma.patient.create).not.toHaveBeenCalled();
      // Survey should use the existing patient's id
      expect(prisma.surveySubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patientId: "existing-patient-id" }) })
      );
    });
  });

  describe("POST /api/contact", () => {
    it("returns success for valid message", async () => {
      const { POST } = await import("@/app/api/contact/route");
      const req = createMockRequest({
        Name: "Test",
        Email: "test@test.com",
        Message: "Hello",
      });
      const res = await POST(req as never);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("returns 400 when required fields missing", async () => {
      const { POST } = await import("@/app/api/contact/route");
      const req = createMockRequest({ Name: "Test" });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("persists contact message to database", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/contact/route");
      const req = createMockRequest({
        Name: "Alice",
        Email: "alice@test.com",
        Phone: "0400000000",
        Subject: "Inquiry",
        Message: "I have a question",
      });
      await POST(req as never);
      expect(prisma.contactMessage.create).toHaveBeenCalledWith({
        data: {
          name: "Alice",
          email: "alice@test.com",
          phone: "0400000000",
          subject: "Inquiry",
          message: "I have a question",
        },
      });
    });
  });

  describe("PATCH /api/admin/bookings/[id]", () => {
    it("updates booking status to confirmed", async () => {
      const { prisma } = await import("@/lib/db");
      const { PATCH } = await import("@/app/api/admin/bookings/[id]/route");
      const req = createMockRequest({ status: "confirmed" });
      const res = await PATCH(req as never, { params: Promise.resolve({ id: "b1" }) });
      expect(res.status).toBe(200);
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "b1" }, data: { status: "confirmed" } })
      );
    });

    it("updates booking status to completed", async () => {
      const { prisma } = await import("@/lib/db");
      const { PATCH } = await import("@/app/api/admin/bookings/[id]/route");
      const req = createMockRequest({ status: "completed" });
      const res = await PATCH(req as never, { params: Promise.resolve({ id: "b1" }) });
      expect(res.status).toBe(200);
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "b1" }, data: { status: "completed" } })
      );
    });

    it("rejects invalid status values", async () => {
      const { PATCH } = await import("@/app/api/admin/bookings/[id]/route");
      const req = createMockRequest({ status: "invalid" });
      const res = await PATCH(req as never, { params: Promise.resolve({ id: "b1" }) });
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/admin/patients/[id]", () => {
    it("updates patient fields", async () => {
      const { prisma } = await import("@/lib/db");
      const { PATCH } = await import("@/app/api/admin/patients/[id]/route");
      const req = createMockRequest({ firstName: "Updated", phone: "0411222333" });
      const res = await PATCH(req as never, { params: Promise.resolve({ id: "p1" }) });
      expect(res.status).toBe(200);
      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1" },
          data: expect.objectContaining({ firstName: "Updated", phone: "0411222333" }),
        })
      );
    });

    it("rejects invalid status value", async () => {
      const { PATCH } = await import("@/app/api/admin/patients/[id]/route");
      const req = createMockRequest({ status: "deleted" });
      const res = await PATCH(req as never, { params: Promise.resolve({ id: "p1" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 when no valid fields provided", async () => {
      const { PATCH } = await import("@/app/api/admin/patients/[id]/route");
      const req = createMockRequest({ hackerField: "nope" });
      const res = await PATCH(req as never, { params: Promise.resolve({ id: "p1" }) });
      expect(res.status).toBe(400);
    });

    it("allows setting optional fields to null", async () => {
      const { prisma } = await import("@/lib/db");
      const { PATCH } = await import("@/app/api/admin/patients/[id]/route");
      const req = createMockRequest({ phone: null, dob: "" });
      const res = await PATCH(req as never, { params: Promise.resolve({ id: "p1" }) });
      expect(res.status).toBe(200);
      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phone: null, dob: null }),
        })
      );
    });

    it("trims string values", async () => {
      const { prisma } = await import("@/lib/db");
      const { PATCH } = await import("@/app/api/admin/patients/[id]/route");
      const req = createMockRequest({ firstName: "  Jane  " });
      await PATCH(req as never, { params: Promise.resolve({ id: "p1" }) });
      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ firstName: "Jane" }),
        })
      );
    });
  });

  describe("DELETE /api/admin/patients/[id]", () => {
    it("deletes patient", async () => {
      const { prisma } = await import("@/lib/db");
      const { DELETE } = await import("@/app/api/admin/patients/[id]/route");
      const req = createMockRequest({});
      const res = await DELETE(req as never, { params: Promise.resolve({ id: "p1" }) });
      expect(res.status).toBe(200);
      expect(prisma.patient.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
    });
  });

  describe("DELETE /api/admin/notes/[noteId]", () => {
    it("deletes a patient note", async () => {
      const { prisma } = await import("@/lib/db");
      const { DELETE } = await import("@/app/api/admin/notes/[noteId]/route");
      const req = createMockRequest({});
      const res = await DELETE(req as never, { params: Promise.resolve({ noteId: "n1" }) });
      expect(res.status).toBe(200);
      expect(prisma.patientNote.delete).toHaveBeenCalledWith({ where: { id: "n1" } });
    });
  });

  describe("DELETE /api/admin/surveys/[surveyId]", () => {
    it("deletes a survey submission", async () => {
      const { prisma } = await import("@/lib/db");
      const { DELETE } = await import("@/app/api/admin/surveys/[surveyId]/route");
      const req = createMockRequest({});
      const res = await DELETE(req as never, { params: Promise.resolve({ surveyId: "s1" }) });
      expect(res.status).toBe(200);
      expect(prisma.surveySubmission.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
    });
  });

  describe("POST /api/survey — phone/dob extraction", () => {
    it("saves phone and dob from intake survey when creating new patient", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/survey/route");
      const req = createMockRequest({
        type: "intake",
        data: {
          "First Name": "Test",
          "Last Name": "User",
          "Email Address": "new@test.com",
          "Phone Number": "0412345678",
          "Date of Birth": "1985-03-15",
        },
      });
      await POST(req as never);
      expect(prisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phone: "0412345678", dob: "1985-03-15" }),
        })
      );
    });

    it("fills in missing phone/dob for existing patient from intake", async () => {
      const { prisma } = await import("@/lib/db");
      (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "existing-id", firstName: "Test", lastName: "User", phone: null, dob: null,
      });
      const { POST } = await import("@/app/api/survey/route");
      const req = createMockRequest({
        type: "intake",
        data: {
          "First Name": "Test",
          "Last Name": "User",
          "Email Address": "existing@test.com",
          "Phone Number": "0400111222",
          "Date of Birth": "1990-01-01",
        },
      });
      await POST(req as never);
      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "existing-id" },
          data: expect.objectContaining({ phone: "0400111222", dob: "1990-01-01" }),
        })
      );
    });
  });

  describe("PATCH /api/admin/notes/[noteId]", () => {
    it("updates note content", async () => {
      const { prisma } = await import("@/lib/db");
      const { PATCH } = await import("@/app/api/admin/notes/[noteId]/route");
      const req = createMockRequest({ content: "Updated note content" });
      const res = await PATCH(req as never, { params: Promise.resolve({ noteId: "n1" }) });
      expect(res.status).toBe(200);
      expect(prisma.patientNote.update).toHaveBeenCalledWith({
        where: { id: "n1" },
        data: { content: "Updated note content" },
      });
    });

    it("returns 400 for empty content", async () => {
      const { PATCH } = await import("@/app/api/admin/notes/[noteId]/route");
      const req = createMockRequest({ content: "  " });
      const res = await PATCH(req as never, { params: Promise.resolve({ noteId: "n1" }) });
      expect(res.status).toBe(400);
    });

    it("trims whitespace from content", async () => {
      const { prisma } = await import("@/lib/db");
      const { PATCH } = await import("@/app/api/admin/notes/[noteId]/route");
      const req = createMockRequest({ content: "  trimmed  " });
      await PATCH(req as never, { params: Promise.resolve({ noteId: "n1" }) });
      expect(prisma.patientNote.update).toHaveBeenCalledWith({
        where: { id: "n1" },
        data: { content: "trimmed" },
      });
    });
  });

  describe("POST /api/admin/patients/[id]/notes", () => {
    it("creates a note with optional bookingId", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/admin/patients/[id]/notes/route");
      const req = createMockRequest({ content: "Session notes", bookingId: "bk1" });
      const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
      expect(res.status).toBe(201);
      expect(prisma.patientNote.create).toHaveBeenCalledWith({
        data: { patientId: "p1", content: "Session notes", bookingId: "bk1" },
      });
    });

    it("creates a note without bookingId", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/admin/patients/[id]/notes/route");
      const req = createMockRequest({ content: "General note" });
      const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
      expect(res.status).toBe(201);
      expect(prisma.patientNote.create).toHaveBeenCalledWith({
        data: { patientId: "p1", content: "General note" },
      });
    });

    it("creates a note with a valid category", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/admin/patients/[id]/notes/route");
      const req = createMockRequest({ content: "Treatment plan details", category: "Treatment Plan" });
      const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
      expect(res.status).toBe(201);
      expect(prisma.patientNote.create).toHaveBeenCalledWith({
        data: { patientId: "p1", content: "Treatment plan details", category: "Treatment Plan" },
      });
    });

    it("returns 400 for invalid category", async () => {
      const { POST } = await import("@/app/api/admin/patients/[id]/notes/route");
      const req = createMockRequest({ content: "Some note", category: "InvalidCategory" });
      const res = await POST(req as never, { params: Promise.resolve({ id: "p1" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid category");
    });
  });

  describe("POST /api/admin/patients", () => {
    it("creates a new patient with required fields", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/admin/patients/route");
      const req = { json: () => Promise.resolve({ firstName: "Jane", lastName: "Doe", email: "jane@test.com" }), url: "http://localhost/api/admin/patients" } as never;
      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(prisma.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ firstName: "Jane", lastName: "Doe", email: "jane@test.com" }),
      });
    });

    it("returns 400 when required fields missing", async () => {
      const { POST } = await import("@/app/api/admin/patients/route");
      const req = { json: () => Promise.resolve({ firstName: "Jane" }), url: "http://localhost/api/admin/patients" } as never;
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 409 for duplicate email", async () => {
      const { prisma } = await import("@/lib/db");
      (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "existing" });
      const { POST } = await import("@/app/api/admin/patients/route");
      const req = { json: () => Promise.resolve({ firstName: "Jane", lastName: "Doe", email: "dupe@test.com" }), url: "http://localhost/api/admin/patients" } as never;
      const res = await POST(req);
      expect(res.status).toBe(409);
    });

    it("lowercases and trims email", async () => {
      const { prisma } = await import("@/lib/db");
      const { POST } = await import("@/app/api/admin/patients/route");
      const req = { json: () => Promise.resolve({ firstName: "Jane", lastName: "Doe", email: "  Jane@Test.COM  " }), url: "http://localhost/api/admin/patients" } as never;
      await POST(req);
      expect(prisma.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: "jane@test.com" }),
      });
    });
  });

  describe("GET /api/admin/bookings", () => {
    function createGetRequest(month?: string) {
      const url = month
        ? `http://localhost/api/admin/bookings?month=${month}`
        : "http://localhost/api/admin/bookings";
      const parsedUrl = new URL(url);
      return {
        nextUrl: parsedUrl,
      };
    }

    it("returns bookings for a valid month", async () => {
      const { prisma } = await import("@/lib/db");
      const { GET } = await import("@/app/api/admin/bookings/route");
      const mockBookings = [
        { id: "bk1", date: "2026-03-10", time: "10:00 AM", status: "confirmed", patientId: "p1", patient: { firstName: "Jane", lastName: "Doe" } },
      ];
      (prisma.booking.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockBookings);

      const res = await GET(createGetRequest("2026-03") as never);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(mockBookings);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { date: { startsWith: "2026-03" } },
        })
      );
    });

    it("returns 400 when month param is missing", async () => {
      const { GET } = await import("@/app/api/admin/bookings/route");
      const res = await GET(createGetRequest() as never);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid month format", async () => {
      const { GET } = await import("@/app/api/admin/bookings/route");
      const res = await GET(createGetRequest("03-2026") as never);
      expect(res.status).toBe(400);
    });

    it("returns 401 when not authenticated", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { GET } = await import("@/app/api/admin/bookings/route");
      const res = await GET(createGetRequest("2026-03") as never);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/book — conflict detection", () => {
    it("returns 409 when time slot already booked", async () => {
      const { prisma } = await import("@/lib/db");
      (prisma.booking.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "existing-id",
        date: "2026-03-10",
        time: "10:00 AM",
        status: "confirmed",
      });
      const { POST } = await import("@/app/api/book/route");
      const req = createMockRequest({
        date: "2026-03-10",
        time: "10:00 AM",
        Email: "test@test.com",
        "First Name": "Test",
        "Last Name": "User",
      });
      const res = await POST(req as never);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("already booked");
    });

    it("allows booking when no conflict exists", async () => {
      const { prisma } = await import("@/lib/db");
      (prisma.booking.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { POST } = await import("@/app/api/book/route");
      const req = createMockRequest({
        date: "2026-03-10",
        time: "11:00 AM",
        Email: "test@test.com",
        "First Name": "Test",
        "Last Name": "User",
      });
      const res = await POST(req as never);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("POST /api/admin/bookings — admin booking creation", () => {
    it("creates booking for valid input", async () => {
      const { prisma } = await import("@/lib/db");
      (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "p1", firstName: "Jane", lastName: "Doe",
      });
      (prisma.booking.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { POST } = await import("@/app/api/admin/bookings/route");
      const req = {
        json: () => Promise.resolve({ patientId: "p1", date: "2026-05-01", time: "9:00 AM", notes: "Initial" }),
      } as never;
      const res = await POST(req as never);
      expect(res.status).toBe(201);
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ patientId: "p1", date: "2026-05-01", time: "9:00 AM", status: "confirmed" }),
        })
      );
    });

    it("returns 400 when required fields missing", async () => {
      const { POST } = await import("@/app/api/admin/bookings/route");
      const req = { json: () => Promise.resolve({ date: "2026-05-01" }) } as never;
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid date format", async () => {
      const { POST } = await import("@/app/api/admin/bookings/route");
      const req = { json: () => Promise.resolve({ patientId: "p1", date: "05/01/2026", time: "9:00 AM" }) } as never;
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("returns 404 when patient not found", async () => {
      const { prisma } = await import("@/lib/db");
      (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { POST } = await import("@/app/api/admin/bookings/route");
      const req = { json: () => Promise.resolve({ patientId: "missing", date: "2026-05-01", time: "9:00 AM" }) } as never;
      const res = await POST(req as never);
      expect(res.status).toBe(404);
    });

    it("returns 409 for double-booking", async () => {
      const { prisma } = await import("@/lib/db");
      (prisma.patient.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "p1", firstName: "Jane", lastName: "Doe",
      });
      (prisma.booking.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "existing", date: "2026-05-01", time: "9:00 AM", status: "confirmed",
      });
      const { POST } = await import("@/app/api/admin/bookings/route");
      const req = { json: () => Promise.resolve({ patientId: "p1", date: "2026-05-01", time: "9:00 AM" }) } as never;
      const res = await POST(req as never);
      expect(res.status).toBe(409);
    });

    it("returns 401 when not authenticated", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { POST } = await import("@/app/api/admin/bookings/route");
      const req = { json: () => Promise.resolve({ patientId: "p1", date: "2026-05-01", time: "9:00 AM" }) } as never;
      const res = await POST(req as never);
      expect(res.status).toBe(401);
    });
  });
});
