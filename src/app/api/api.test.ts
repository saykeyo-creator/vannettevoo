import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before imports
vi.mock("@/lib/db", () => ({
  prisma: {
    patient: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "test-patient-id" }),
    },
    booking: {
      create: vi.fn().mockResolvedValue({ id: "test-booking-id" }),
      findUnique: vi.fn().mockResolvedValue({ id: "test-booking-id", status: "pending" }),
      update: vi.fn().mockResolvedValue({ id: "test-booking-id", status: "confirmed" }),
    },
    blockedTime: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    surveySubmission: {
      create: vi.fn().mockResolvedValue({ id: "test-survey-id" }),
    },
    contactMessage: {
      create: vi.fn().mockResolvedValue({ id: "test-message-id" }),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { email: "admin@test.com" } }),
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

    it("rejects invalid status values", async () => {
      const { PATCH } = await import("@/app/api/admin/bookings/[id]/route");
      const req = createMockRequest({ status: "invalid" });
      const res = await PATCH(req as never, { params: Promise.resolve({ id: "b1" }) });
      expect(res.status).toBe(400);
    });
  });
});
