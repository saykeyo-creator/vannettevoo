import { describe, it, expect, vi, beforeEach } from "vitest";

// Spy on console.log to verify notification logging
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

import {
  notifyAdminNewBooking,
  notifyAdminNewContact,
  notifyAdminNewSurvey,
  notifyPatientBookingConfirmed,
} from "@/lib/notifications";

describe("Notification Utility", () => {
  beforeEach(() => {
    consoleSpy.mockClear();
  });

  it("notifyAdminNewBooking logs booking notification", async () => {
    const result = await notifyAdminNewBooking("Jane Doe", "2026-04-01", "10:00 AM");
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("New Booking: Jane Doe on 2026-04-01")
    );
  });

  it("notifyAdminNewContact logs contact notification", async () => {
    const result = await notifyAdminNewContact("John Smith", "john@test.com");
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("New Contact Message from John Smith")
    );
  });

  it("notifyAdminNewSurvey logs survey notification", async () => {
    const result = await notifyAdminNewSurvey("intake", "patient@test.com");
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("New intake Survey Submitted")
    );
  });

  it("notifyPatientBookingConfirmed logs confirmation notification", async () => {
    const result = await notifyPatientBookingConfirmed("patient@test.com", "2026-04-01", "2:00 PM");
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Your Appointment Has Been Confirmed")
    );
  });
});
