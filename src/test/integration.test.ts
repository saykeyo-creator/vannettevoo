import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";

/**
 * Integration tests — real PostgreSQL database, real Prisma client, real API route handlers.
 * Verifies data flows end-to-end: form submission → API → DB → admin query.
 * Each test cleans up after itself (all tables truncated between tests).
 *
 * Requires DATABASE_URL pointing to a real PostgreSQL instance.
 * Skipped automatically when DATABASE_URL is not set or unreachable.
 */

const DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// Holder for test Prisma client (set in beforeAll, accessed via getter in mock)
let testPrisma: any;

// Mock @/lib/db so every route handler uses our test database
vi.mock("@/lib/db", () => ({
  get prisma() {
    return testPrisma;
  },
}));

// Mock auth so admin endpoints are accessible
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { email: "admin@test.com" } }),
}));

// Mock notifications (placeholder — no real email sending in tests)
vi.mock("@/lib/notifications", () => ({
  notifyAdminNewBooking: vi.fn().mockResolvedValue(true),
  notifyAdminNewContact: vi.fn().mockResolvedValue(true),
  notifyAdminNewSurvey: vi.fn().mockResolvedValue(true),
  notifyPatientBookingConfirmed: vi.fn().mockResolvedValue(true),
}));

// ---------- Request helpers ----------

function mockRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as any;
}

function mockGetRequest(urlPath: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost:3000${urlPath}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return { url: url.toString() } as any;
}

// ---------- Setup / Teardown ----------

const canRun = !!DATABASE_URL && !DATABASE_URL.startsWith("postgresql://user:password@localhost");

beforeAll(async () => {
  if (!canRun) return;

  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: DATABASE_URL! });
  testPrisma = new PrismaClient({ adapter });
});

afterEach(async () => {
  if (!testPrisma) return;
  // Clean all tables between tests (children before parents)
  await testPrisma.patientNote.deleteMany();
  await testPrisma.surveySubmission.deleteMany();
  await testPrisma.booking.deleteMany();
  await testPrisma.patient.deleteMany();
  await testPrisma.blockedTime.deleteMany();
  await testPrisma.contactMessage.deleteMany();
});

afterAll(async () => {
  if (testPrisma) await testPrisma.$disconnect();
});

// =====================================================================
// INTEGRATION TESTS
// Require a real PostgreSQL database (set DATABASE_URL).
// Skipped when no database is available.
// =====================================================================

const describeIf = canRun ? describe : describe.skip;

describeIf("Integration: Booking Flow", () => {
  it("creates patient and booking from form, visible to admin via patient list and detail", async () => {
    const { POST: bookPost } = await import("@/app/api/book/route");
    const { GET: patientsGet } = await import("@/app/api/admin/patients/route");
    const { GET: patientGet } = await import("@/app/api/admin/patients/[id]/route");

    // 1. Submit booking (simulating the booking form)
    const res = await bookPost(
      mockRequest({
        date: "2026-03-15",
        time: "10:00 AM",
        "Full Name": "Sarah Jane Connor",
        Email: "sarah@example.com",
        Phone: "0412345678",
        Notes: "First visit, neck pain",
      })
    );
    expect((await res.json()).success).toBe(true);

    // 2. Verify patient in DB with correct name split
    const patient = await testPrisma.patient.findUnique({
      where: { email: "sarah@example.com" },
    });
    expect(patient).not.toBeNull();
    expect(patient.firstName).toBe("Sarah Jane");
    expect(patient.lastName).toBe("Connor");
    expect(patient.phone).toBe("0412345678");

    // 3. Verify booking linked with correct fields
    const bookings = await testPrisma.booking.findMany({
      where: { patientId: patient.id },
    });
    expect(bookings).toHaveLength(1);
    expect(bookings[0].date).toBe("2026-03-15");
    expect(bookings[0].time).toBe("10:00 AM");
    expect(bookings[0].status).toBe("pending");
    expect(bookings[0].notes).toBe("First visit, neck pain");

    // 4. Admin patient list shows the patient with booking count
    const listRes = await patientsGet(mockGetRequest("/api/admin/patients"));
    const patients = await listRes.json();
    expect(patients).toHaveLength(1);
    expect(patients[0].email).toBe("sarah@example.com");
    expect(patients[0]._count.bookings).toBe(1);

    // 5. Admin patient detail shows booking data
    const detailRes = await patientGet(
      mockGetRequest(`/api/admin/patients/${patient.id}`),
      { params: Promise.resolve({ id: patient.id }) }
    );
    const detail = await detailRes.json();
    expect(detail.bookings).toHaveLength(1);
    expect(detail.bookings[0].notes).toBe("First visit, neck pain");
  });

  it("creates a second booking for a returning patient without duplicating the patient", async () => {
    const { POST: bookPost } = await import("@/app/api/book/route");

    await bookPost(
      mockRequest({
        date: "2026-03-15",
        time: "10:00 AM",
        "Full Name": "Return Patient",
        Email: "return@example.com",
      })
    );
    await bookPost(
      mockRequest({
        date: "2026-04-15",
        time: "2:00 PM",
        "Full Name": "Return Patient",
        Email: "return@example.com",
      })
    );

    // Only 1 patient record
    const patients = await testPrisma.patient.findMany({
      where: { email: "return@example.com" },
    });
    expect(patients).toHaveLength(1);

    // But 2 bookings
    const bookings = await testPrisma.booking.findMany({
      where: { patientId: patients[0].id },
    });
    expect(bookings).toHaveLength(2);
  });
});

describeIf("Integration: Intake Survey Flow", () => {
  it("creates patient from nested intake data, saves full survey payload", async () => {
    const { POST: surveyPost } = await import("@/app/api/survey/route");

    const intakeData = {
      "First Name": "Emma",
      "Last Name": "Watson",
      "Email Address": "emma@example.com",
      "Phone Number": "0498765432",
      "Date of Birth": "1990-04-15",
      "Primary Concern": "Chronic migraines",
      Duration: "6 months",
    };

    const res = await surveyPost(
      mockRequest({ type: "intake", data: intakeData })
    );
    expect((await res.json()).success).toBe(true);

    // Patient created with correct fields from nested data
    const patient = await testPrisma.patient.findUnique({
      where: { email: "emma@example.com" },
    });
    expect(patient).not.toBeNull();
    expect(patient.firstName).toBe("Emma");
    expect(patient.lastName).toBe("Watson");

    // Survey saved with correct type and full payload
    const surveys = await testPrisma.surveySubmission.findMany({
      where: { patientId: patient.id },
    });
    expect(surveys).toHaveLength(1);
    expect(surveys[0].type).toBe("intake");

    const savedData = JSON.parse(surveys[0].data);
    expect(savedData.data["Primary Concern"]).toBe("Chronic migraines");
    expect(savedData.type).toBe("intake");
  });
});

describeIf("Integration: Full Patient Journey", () => {
  it("tracks patient from booking → intake → progress → admin confirm → note → cancel", async () => {
    const { POST: bookPost } = await import("@/app/api/book/route");
    const { POST: surveyPost } = await import("@/app/api/survey/route");
    const { GET: patientGet } = await import(
      "@/app/api/admin/patients/[id]/route"
    );
    const { PATCH: bookingPatch } = await import(
      "@/app/api/admin/bookings/[id]/route"
    );
    const { POST: notePost } = await import(
      "@/app/api/admin/patients/[id]/notes/route"
    );

    // ── Step 1: Patient books appointment ──
    await bookPost(
      mockRequest({
        date: "2026-04-01",
        time: "2:00 PM",
        "Full Name": "James Wilson",
        Email: "james@example.com",
        Phone: "0400111222",
        Notes: "Referred by GP",
      })
    );

    // ── Step 2: Same patient submits intake survey ──
    await surveyPost(
      mockRequest({
        type: "intake",
        data: {
          "First Name": "James",
          "Last Name": "Wilson",
          "Email Address": "james@example.com",
          "Phone Number": "0400111222",
          "Date of Birth": "1985-07-20",
          "Primary Concern": "Balance issues",
        },
      })
    );

    // Verify: still only ONE patient (upsert, not duplicate)
    const allPatients = await testPrisma.patient.findMany({
      where: { email: "james@example.com" },
    });
    expect(allPatients).toHaveLength(1);
    const patient = allPatients[0];

    // ── Step 3: Patient submits progress survey after first visit ──
    await surveyPost(
      mockRequest({
        type: "progress",
        identity: {
          "First Name": "James",
          "Last Name": "Wilson",
          Email: "james@example.com",
        },
        ratings: { Balance: 7, Dizziness: 3, Headaches: 2 },
        feedback: "Feeling much better after first session",
      })
    );

    // Still only ONE patient
    const patientCount = await testPrisma.patient.count({
      where: { email: "james@example.com" },
    });
    expect(patientCount).toBe(1);

    // ── Step 4: Admin views patient detail ──
    const detailRes = await patientGet(
      mockGetRequest(`/api/admin/patients/${patient.id}`),
      { params: Promise.resolve({ id: patient.id }) }
    );
    const detail = await detailRes.json();
    expect(detail.bookings).toHaveLength(1);
    expect(detail.surveys).toHaveLength(2);
    expect(detail.surveys.map((s: any) => s.type).sort()).toEqual([
      "intake",
      "progress",
    ]);

    // ── Step 5: Admin confirms the booking ──
    const bookingId = detail.bookings[0].id;
    const confirmRes = await bookingPatch(mockRequest({ status: "confirmed" }), {
      params: Promise.resolve({ id: bookingId }),
    });
    expect((await confirmRes.json()).status).toBe("confirmed");

    // Verify confirm persisted in DB
    const confirmed = await testPrisma.booking.findUnique({
      where: { id: bookingId },
    });
    expect(confirmed.status).toBe("confirmed");

    // ── Step 6: Admin adds clinical note ──
    const noteRes = await notePost(
      mockRequest({
        content: "Patient responding well to vestibular rehabilitation",
      }),
      { params: Promise.resolve({ id: patient.id }) }
    );
    expect(noteRes.status).toBe(201);

    // ── Step 7: Admin cancels the booking ──
    await bookingPatch(mockRequest({ status: "cancelled" }), {
      params: Promise.resolve({ id: bookingId }),
    });

    // ── Final: verify everything accumulated correctly ──
    const finalRes = await patientGet(
      mockGetRequest(`/api/admin/patients/${patient.id}`),
      { params: Promise.resolve({ id: patient.id }) }
    );
    const finalDetail = await finalRes.json();
    expect(finalDetail.bookings).toHaveLength(1);
    expect(finalDetail.bookings[0].status).toBe("cancelled");
    expect(finalDetail.surveys).toHaveLength(2);
    expect(finalDetail.notes).toHaveLength(1);
    expect(finalDetail.notes[0].content).toBe(
      "Patient responding well to vestibular rehabilitation"
    );

    // Verify progress survey data preserved with ratings
    const progressSurvey = finalDetail.surveys.find(
      (s: any) => s.type === "progress"
    );
    const progressData = JSON.parse(progressSurvey.data);
    expect(progressData.ratings.Balance).toBe(7);
    expect(progressData.feedback).toBe(
      "Feeling much better after first session"
    );
  });

  it("updates patient name when survey uses same email but more complete name", async () => {
    const { POST: bookPost } = await import("@/app/api/book/route");
    const { POST: surveyPost } = await import("@/app/api/survey/route");

    // Book with short name
    await bookPost(
      mockRequest({
        date: "2026-03-15",
        time: "10:00 AM",
        "Full Name": "Jim Smith",
        Email: "jim@example.com",
      })
    );

    // Intake with full name (same email)
    await surveyPost(
      mockRequest({
        type: "intake",
        data: {
          "First Name": "James",
          "Last Name": "Smith",
          "Email Address": "jim@example.com",
        },
      })
    );

    const patient = await testPrisma.patient.findUnique({
      where: { email: "jim@example.com" },
    });
    expect(patient.firstName).toBe("James"); // Updated from "Jim"
    expect(patient.lastName).toBe("Smith");
  });
});

describeIf("Integration: Contact Messages", () => {
  it("saves messages, admin fetches and marks read — all fields round-trip", async () => {
    const { POST: contactPost } = await import("@/app/api/contact/route");
    const { GET: messagesGet, PATCH: messagesPatch } = await import(
      "@/app/api/admin/messages/route"
    );

    // 1. Submit two contact messages
    await contactPost(
      mockRequest({
        Name: "Alice Brown",
        Email: "alice@example.com",
        Phone: "0411222333",
        Subject: "New patient inquiry",
        Message: "I'd like to book an appointment for my son",
      })
    );
    await contactPost(
      mockRequest({
        Name: "Bob Green",
        Email: "bob@example.com",
        Message: "Do you treat vertigo?",
      })
    );

    // 2. Admin fetches messages
    const listRes = await messagesGet();
    const messages = await listRes.json();
    expect(messages).toHaveLength(2);

    // All fields preserved for Alice
    const aliceMsg = messages.find((m: any) => m.email === "alice@example.com");
    expect(aliceMsg.name).toBe("Alice Brown");
    expect(aliceMsg.phone).toBe("0411222333");
    expect(aliceMsg.subject).toBe("New patient inquiry");
    expect(aliceMsg.message).toBe(
      "I'd like to book an appointment for my son"
    );
    expect(aliceMsg.read).toBe(false);

    // Bob's optional fields are null
    const bobMsg = messages.find((m: any) => m.email === "bob@example.com");
    expect(bobMsg.phone).toBeNull();
    expect(bobMsg.subject).toBeNull();

    // 3. Admin marks Alice's message as read
    await messagesPatch(mockRequest({ id: aliceMsg.id, read: true }));

    // 4. Verify read status persisted in DB
    const updated = await testPrisma.contactMessage.findUnique({
      where: { id: aliceMsg.id },
    });
    expect(updated.read).toBe(true);

    // Bob's message still unread
    const bobUpdated = await testPrisma.contactMessage.findUnique({
      where: { id: bobMsg.id },
    });
    expect(bobUpdated.read).toBe(false);
  });
});

describeIf("Integration: Calendar Blocking & Availability", () => {
  it("blocks times, reflects in public availability, supports deletion", async () => {
    const { POST: blockPost, DELETE: blockDelete } = await import(
      "@/app/api/admin/blocked-time/route"
    );
    const { POST: bulkBlockPost } = await import(
      "@/app/api/admin/blocked-time/bulk/route"
    );
    const { GET: availabilityGet } = await import(
      "@/app/api/availability/route"
    );

    // 1. Admin blocks a single time slot
    const singleRes = await blockPost(
      mockRequest({
        date: "2026-03-20",
        startTime: "09:00",
        endTime: "12:00",
        reason: "Staff meeting",
      })
    );
    expect(singleRes.status).toBe(201);
    const singleBlock = await singleRes.json();

    // 2. Admin blocks an entire day
    await blockPost(
      mockRequest({
        date: "2026-03-25",
        reason: "Public holiday",
      })
    );

    // 3. Admin blocks a date range (3 days)
    const bulkRes = await bulkBlockPost(
      mockRequest({
        startDate: "2026-03-28",
        endDate: "2026-03-30",
        reason: "Conference",
      })
    );
    expect(bulkRes.status).toBe(201);
    expect((await bulkRes.json()).count).toBe(3);

    // 4. Public availability API shows all blocks for March
    const availRes = await availabilityGet(
      mockGetRequest("/api/availability", { month: "2026-03" })
    );
    const blocked = await availRes.json();
    expect(blocked.length).toBeGreaterThanOrEqual(5);

    const blockedDates = blocked.map((b: any) => b.date);
    expect(blockedDates).toContain("2026-03-20");
    expect(blockedDates).toContain("2026-03-25");
    expect(blockedDates).toContain("2026-03-28");
    expect(blockedDates).toContain("2026-03-29");
    expect(blockedDates).toContain("2026-03-30");

    // 5. Verify time slot details (availability only selects date/startTime/endTime)
    const timeBlock = blocked.find((b: any) => b.date === "2026-03-20");
    expect(timeBlock.startTime).toBe("09:00");
    expect(timeBlock.endTime).toBe("12:00");

    // 6. Admin deletes the single time-slot block
    await blockDelete(
      mockGetRequest("/api/admin/blocked-time", { id: singleBlock.id })
    );

    // 7. Verify removed from availability
    const afterRes = await availabilityGet(
      mockGetRequest("/api/availability", { month: "2026-03" })
    );
    const afterDelete = await afterRes.json();
    const remaining = afterDelete.map((b: any) => b.date);
    expect(remaining).not.toContain("2026-03-20"); // Deleted
    expect(remaining).toContain("2026-03-25"); // Still there
  });

  it("rejects booking on a fully blocked day", async () => {
    const { POST: blockPost } = await import("@/app/api/admin/blocked-time/route");
    const { POST: bookPost } = await import("@/app/api/book/route");

    // Admin blocks March 22 entirely
    await blockPost(mockRequest({ date: "2026-03-22", reason: "Holiday" }));

    // Attempt to book on the blocked day
    const res = await bookPost(
      mockRequest({
        date: "2026-03-22",
        time: "10:00 AM",
        "Full Name": "Blocked User",
        Email: "blocked@example.com",
      })
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("blocked");

    // No booking or patient should have been created
    expect(await testPrisma.booking.count()).toBe(0);
    expect(await testPrisma.patient.count()).toBe(0);
  });

  it("rejects booking during a blocked time slot", async () => {
    const { POST: blockPost } = await import("@/app/api/admin/blocked-time/route");
    const { POST: bookPost } = await import("@/app/api/book/route");

    // Admin blocks 9:00–12:00 on March 23
    await blockPost(
      mockRequest({ date: "2026-03-23", startTime: "09:00", endTime: "12:00" })
    );

    // Attempt to book at 10:00 AM (inside blocked range) → rejected
    const blockedRes = await bookPost(
      mockRequest({
        date: "2026-03-23",
        time: "10:00 AM",
        "Full Name": "Morning User",
        Email: "morning@example.com",
      })
    );
    expect(blockedRes.status).toBe(409);

    // Attempt to book at 2:00 PM (outside blocked range) → accepted
    const okRes = await bookPost(
      mockRequest({
        date: "2026-03-23",
        time: "2:00 PM",
        "Full Name": "Afternoon User",
        Email: "afternoon@example.com",
      })
    );
    expect(okRes.status).toBe(200);
    expect((await okRes.json()).success).toBe(true);

    // Only the afternoon booking should exist
    expect(await testPrisma.booking.count()).toBe(1);
    const booking = await testPrisma.booking.findFirst();
    expect(booking.time).toBe("2:00 PM");
  });

  it("allows booking after admin removes a block", async () => {
    const { POST: blockPost, DELETE: blockDelete } = await import(
      "@/app/api/admin/blocked-time/route"
    );
    const { POST: bookPost } = await import("@/app/api/book/route");

    // Block, then unblock
    const blockRes = await blockPost(
      mockRequest({ date: "2026-03-24", reason: "Temp block" })
    );
    const block = await blockRes.json();

    // Booking rejected while blocked
    const rejRes = await bookPost(
      mockRequest({
        date: "2026-03-24",
        time: "10:00 AM",
        "Full Name": "Test User",
        Email: "test@example.com",
      })
    );
    expect(rejRes.status).toBe(409);

    // Admin removes the block
    await blockDelete(mockGetRequest("/api/admin/blocked-time", { id: block.id }));

    // Now booking succeeds
    const okRes = await bookPost(
      mockRequest({
        date: "2026-03-24",
        time: "10:00 AM",
        "Full Name": "Test User",
        Email: "test@example.com",
      })
    );
    expect(okRes.status).toBe(200);
    expect((await okRes.json()).success).toBe(true);
  });
});

describeIf("Integration: Data Integrity Guards", () => {
  it("does not create patient or booking when email is missing", async () => {
    const { POST: bookPost } = await import("@/app/api/book/route");

    await bookPost(
      mockRequest({
        date: "2026-03-15",
        time: "10:00 AM",
        "Full Name": "No Email Person",
      })
    );

    expect(await testPrisma.patient.count()).toBe(0);
    expect(await testPrisma.booking.count()).toBe(0);
  });

  it("does not create patient or survey when email is missing from intake", async () => {
    const { POST: surveyPost } = await import("@/app/api/survey/route");

    await surveyPost(
      mockRequest({
        type: "intake",
        data: { "First Name": "Ghost", "Last Name": "Patient" },
      })
    );

    expect(await testPrisma.patient.count()).toBe(0);
    expect(await testPrisma.surveySubmission.count()).toBe(0);
  });

  it("patient search filters correctly across firstName, lastName, and email", async () => {
    const { POST: bookPost } = await import("@/app/api/book/route");
    const { GET: patientsGet } = await import(
      "@/app/api/admin/patients/route"
    );

    // Create two patients
    await bookPost(
      mockRequest({
        date: "2026-03-15",
        time: "10:00 AM",
        "Full Name": "Alpha Bravo",
        Email: "alpha@example.com",
      })
    );
    await bookPost(
      mockRequest({
        date: "2026-03-16",
        time: "11:00 AM",
        "Full Name": "Charlie Delta",
        Email: "charlie@example.com",
      })
    );

    // Search by first name
    const res1 = await patientsGet(
      mockGetRequest("/api/admin/patients", { q: "Alpha" })
    );
    const found1 = await res1.json();
    expect(found1).toHaveLength(1);
    expect(found1[0].firstName).toBe("Alpha");

    // Search by email
    const res2 = await patientsGet(
      mockGetRequest("/api/admin/patients", { q: "charlie@example" })
    );
    const found2 = await res2.json();
    expect(found2).toHaveLength(1);
    expect(found2[0].email).toBe("charlie@example.com");

    // Search that matches nobody
    const res3 = await patientsGet(
      mockGetRequest("/api/admin/patients", { q: "zzzznotfound" })
    );
    expect(await res3.json()).toHaveLength(0);
  });

  it("rejects booking status update with invalid value", async () => {
    const { PATCH: bookingPatch } = await import(
      "@/app/api/admin/bookings/[id]/route"
    );

    const res = await bookingPatch(mockRequest({ status: "completed" }), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent patient detail", async () => {
    const { GET: patientGet } = await import(
      "@/app/api/admin/patients/[id]/route"
    );

    const res = await patientGet(
      mockGetRequest("/api/admin/patients/nonexistent"),
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when trying to update status of non-existent booking", async () => {
    const { PATCH: bookingPatch } = await import(
      "@/app/api/admin/bookings/[id]/route"
    );

    const res = await bookingPatch(mockRequest({ status: "confirmed" }), {
      params: Promise.resolve({ id: "nonexistent-booking-id" }),
    });
    expect(res.status).toBe(404);
  });

  it("rejects contact form when required fields are missing", async () => {
    const { POST: contactPost } = await import("@/app/api/contact/route");

    const res = await contactPost(
      mockRequest({ Name: "Test" }) // Missing Email and Message
    );
    expect(res.status).toBe(400);
    expect(await testPrisma.contactMessage.count()).toBe(0);
  });
});

// =====================================================================
// NEW INTEGRATION TESTS — Phase 23 Improvements
// =====================================================================

describeIf("Integration: Completed Booking Status (#2)", () => {
  it("allows booking to move through full lifecycle: pending → confirmed → completed", async () => {
    const { POST: bookPost } = await import("@/app/api/book/route");
    const { PATCH: bookingPatch } = await import("@/app/api/admin/bookings/[id]/route");

    await bookPost(
      mockRequest({
        date: "2026-05-01",
        time: "9:00 AM",
        "Full Name": "Lifecycle Test",
        Email: "lifecycle@test.com",
      })
    );

    const patient = await testPrisma.patient.findUnique({ where: { email: "lifecycle@test.com" } });
    const booking = await testPrisma.booking.findFirst({ where: { patientId: patient.id } });
    expect(booking.status).toBe("pending");

    // Confirm
    await bookingPatch(mockRequest({ status: "confirmed" }), {
      params: Promise.resolve({ id: booking.id }),
    });
    const confirmed = await testPrisma.booking.findUnique({ where: { id: booking.id } });
    expect(confirmed.status).toBe("confirmed");

    // Complete
    await bookingPatch(mockRequest({ status: "completed" }), {
      params: Promise.resolve({ id: booking.id }),
    });
    const completed = await testPrisma.booking.findUnique({ where: { id: booking.id } });
    expect(completed.status).toBe("completed");
  });
});

describeIf("Integration: Calendar Bookings Endpoint (#3)", () => {
  it("returns bookings filtered by month via GET /api/admin/bookings", async () => {
    const { POST: bookPost } = await import("@/app/api/book/route");
    const { GET: bookingsGet } = await import("@/app/api/admin/bookings/route");

    // Create bookings in two different months
    await bookPost(
      mockRequest({
        date: "2026-06-15",
        time: "10:00 AM",
        "Full Name": "June Patient",
        Email: "june@test.com",
      })
    );
    await bookPost(
      mockRequest({
        date: "2026-07-20",
        time: "2:00 PM",
        "Full Name": "July Patient",
        Email: "july@test.com",
      })
    );

    // Fetch June bookings
    const juneRes = await bookingsGet({ nextUrl: new URL("http://localhost:3000/api/admin/bookings?month=2026-06") } as any);
    const juneData = await juneRes.json();
    expect(juneData).toHaveLength(1);
    expect(juneData[0].date).toBe("2026-06-15");

    // Fetch July bookings
    const julyRes = await bookingsGet({ nextUrl: new URL("http://localhost:3000/api/admin/bookings?month=2026-07") } as any);
    const julyData = await julyRes.json();
    expect(julyData).toHaveLength(1);
    expect(julyData[0].date).toBe("2026-07-20");
  });
});

describeIf("Integration: Booking-linked Notes (#7)", () => {
  it("creates a note linked to a booking and returns booking details on patient fetch", async () => {
    const { POST: bookPost } = await import("@/app/api/book/route");
    const { POST: notePost } = await import("@/app/api/admin/patients/[id]/notes/route");
    const { GET: patientGet } = await import("@/app/api/admin/patients/[id]/route");

    await bookPost(
      mockRequest({
        date: "2026-08-10",
        time: "11:00 AM",
        "Full Name": "Note Link Test",
        Email: "notelink@test.com",
      })
    );

    const patient = await testPrisma.patient.findUnique({ where: { email: "notelink@test.com" } });
    const booking = await testPrisma.booking.findFirst({ where: { patientId: patient.id } });

    // Create note linked to the booking
    const noteRes = await notePost(
      mockRequest({ content: "Linked session note", bookingId: booking.id }),
      { params: Promise.resolve({ id: patient.id }) }
    );
    expect(noteRes.status).toBe(201);

    // Fetch patient detail and verify note has booking info
    const detailRes = await patientGet(
      mockGetRequest(`/api/admin/patients/${patient.id}`),
      { params: Promise.resolve({ id: patient.id }) }
    );
    const detail = await detailRes.json();
    expect(detail.notes).toHaveLength(1);
    expect(detail.notes[0].content).toBe("Linked session note");
    expect(detail.notes[0].booking).not.toBeNull();
    expect(detail.notes[0].booking.date).toBe("2026-08-10");
    expect(detail.notes[0].booking.time).toBe("11:00 AM");
  });
});

describeIf("Integration: Note Categories (#10)", () => {
  it("creates a note with category and rejects invalid categories", async () => {
    const { POST: bookPost } = await import("@/app/api/book/route");
    const { POST: notePost } = await import("@/app/api/admin/patients/[id]/notes/route");

    await bookPost(
      mockRequest({
        date: "2026-09-01",
        time: "9:00 AM",
        "Full Name": "Category Test",
        Email: "category@test.com",
      })
    );

    const patient = await testPrisma.patient.findUnique({ where: { email: "category@test.com" } });

    // Valid category
    const res1 = await notePost(
      mockRequest({ content: "Treatment plan update", category: "Treatment Plan" }),
      { params: Promise.resolve({ id: patient.id }) }
    );
    expect(res1.status).toBe(201);

    // Verify category saved in DB
    const note = await testPrisma.patientNote.findFirst({ where: { patientId: patient.id } });
    expect(note.category).toBe("Treatment Plan");

    // Invalid category
    const res2 = await notePost(
      mockRequest({ content: "Bad category", category: "InvalidCategory" }),
      { params: Promise.resolve({ id: patient.id }) }
    );
    expect(res2.status).toBe(400);
  });
});

describeIf("Integration: Email Notifications (#11)", () => {
  it("triggers notification when booking is created and confirmed", async () => {
    const { notifyAdminNewBooking, notifyPatientBookingConfirmed } = await import("@/lib/notifications");
    const { POST: bookPost } = await import("@/app/api/book/route");
    const { PATCH: bookingPatch } = await import("@/app/api/admin/bookings/[id]/route");

    vi.mocked(notifyAdminNewBooking).mockClear();
    vi.mocked(notifyPatientBookingConfirmed).mockClear();

    await bookPost(
      mockRequest({
        date: "2026-10-01",
        time: "3:00 PM",
        "Full Name": "Notify Test",
        Email: "notify@test.com",
      })
    );

    // Booking creation should trigger admin notification
    expect(notifyAdminNewBooking).toHaveBeenCalled();

    const patient = await testPrisma.patient.findUnique({ where: { email: "notify@test.com" } });
    const booking = await testPrisma.booking.findFirst({ where: { patientId: patient.id } });

    // Confirming should trigger patient notification
    await bookingPatch(mockRequest({ status: "confirmed" }), {
      params: Promise.resolve({ id: booking.id }),
    });
    expect(notifyPatientBookingConfirmed).toHaveBeenCalledWith(
      "notify@test.com",
      expect.any(String),
      expect.any(String)
    );
  });

  it("triggers notification when contact message is submitted", async () => {
    const { notifyAdminNewContact } = await import("@/lib/notifications");
    const { POST: contactPost } = await import("@/app/api/contact/route");

    vi.mocked(notifyAdminNewContact).mockClear();

    await contactPost(
      mockRequest({
        Name: "Contact Test",
        Email: "contact@test.com",
        Message: "Hello there",
      })
    );

    expect(notifyAdminNewContact).toHaveBeenCalledWith("Contact Test", "contact@test.com");
  });

  it("triggers notification when survey is submitted", async () => {
    const { notifyAdminNewSurvey } = await import("@/lib/notifications");
    const { POST: surveyPost } = await import("@/app/api/survey/route");

    vi.mocked(notifyAdminNewSurvey).mockClear();

    await surveyPost(
      mockRequest({
        type: "intake",
        data: {
          "First Name": "Survey",
          "Last Name": "Test",
          "Email Address": "surveynotify@test.com",
        },
      })
    );

    expect(notifyAdminNewSurvey).toHaveBeenCalledWith("intake", "surveynotify@test.com");
  });
});
