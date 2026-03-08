import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import path from "path";
import fs from "fs";

/**
 * Integration tests — real SQLite database, real Prisma client, real API route handlers.
 * Verifies data flows end-to-end: form submission → API → DB → admin query.
 * Each test cleans up after itself (all tables truncated between tests).
 */

const TEST_DB_PATH = path.resolve(process.cwd(), "test-integration.db");

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

// ---------- Schema matching prisma/schema.prisma ----------

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email");

CREATE TABLE IF NOT EXISTS "BlockedTime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BlockedTime_date_idx" ON "BlockedTime"("date");

CREATE TABLE IF NOT EXISTS "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "dob" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_email_key" ON "Patient"("email");

CREATE TABLE IF NOT EXISTS "PatientNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT NOT NULL,
    CONSTRAINT "PatientNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PatientNote_patientId_idx" ON "PatientNote"("patientId");

CREATE TABLE IF NOT EXISTS "SurveySubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT NOT NULL,
    CONSTRAINT "SurveySubmission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SurveySubmission_patientId_idx" ON "SurveySubmission"("patientId");

CREATE TABLE IF NOT EXISTS "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT NOT NULL,
    CONSTRAINT "Booking_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Booking_patientId_idx" ON "Booking"("patientId");
CREATE INDEX IF NOT EXISTS "Booking_date_idx" ON "Booking"("date");

CREATE TABLE IF NOT EXISTS "ContactMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "read" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

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

beforeAll(async () => {
  // Remove stale test DB
  for (const f of [TEST_DB_PATH, TEST_DB_PATH + "-wal", TEST_DB_PATH + "-shm"]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  // Create fresh test database with schema
  const Database = (await import("better-sqlite3")).default;
  const db = new Database(TEST_DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  db.close();

  // Create Prisma client pointing to test DB
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({ url: `file:${TEST_DB_PATH}` });
  testPrisma = new PrismaClient({ adapter });
});

afterEach(async () => {
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
  // Remove test database files
  for (const f of [TEST_DB_PATH, TEST_DB_PATH + "-wal", TEST_DB_PATH + "-shm"]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});

// =====================================================================
// INTEGRATION TESTS
// =====================================================================

describe("Integration: Booking Flow", () => {
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

describe("Integration: Intake Survey Flow", () => {
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

describe("Integration: Full Patient Journey", () => {
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

describe("Integration: Contact Messages", () => {
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

describe("Integration: Calendar Blocking & Availability", () => {
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

describe("Integration: Data Integrity Guards", () => {
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
