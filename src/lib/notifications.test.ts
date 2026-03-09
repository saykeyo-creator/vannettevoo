import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock resend before importing
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: "test-email-id" }) },
  })),
}));

// Spy on console.log to verify fallback logging
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

import {
  notifyAdminNewBooking,
  notifyAdminNewContact,
  notifyAdminNewSurvey,
  notifyPatientBookingConfirmed,
} from "@/lib/notifications";

describe("Notification Utility (no RESEND_API_KEY)", () => {
  beforeEach(() => {
    consoleSpy.mockClear();
  });

  it("notifyAdminNewBooking logs and returns false without API key", async () => {
    const result = await notifyAdminNewBooking("Jane Doe", "2026-04-01", "10:00 AM");
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("New Booking: Jane Doe on 2026-04-01")
    );
  });

  it("notifyAdminNewContact logs and returns false without API key", async () => {
    const result = await notifyAdminNewContact("John Smith", "john@test.com");
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("New Contact Message from John Smith")
    );
  });

  it("notifyAdminNewSurvey logs and returns false without API key", async () => {
    const result = await notifyAdminNewSurvey("intake", "patient@test.com");
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("New intake Survey Submitted")
    );
  });

  it("notifyPatientBookingConfirmed logs and returns false without API key", async () => {
    const result = await notifyPatientBookingConfirmed("patient@test.com", "2026-04-01", "2:00 PM");
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Your Appointment Has Been Confirmed")
    );
  });
});
