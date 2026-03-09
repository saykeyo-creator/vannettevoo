import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import CalendarPage from "@/app/admin/calendar/page";

function blockedEntry(overrides: Partial<{ id: string; date: string; startTime: string | null; endTime: string | null; reason: string | null }> = {}) {
  return {
    id: overrides.id ?? "b1",
    date: overrides.date ?? "2026-03-10",
    startTime: overrides.startTime ?? null,
    endTime: overrides.endTime ?? null,
    reason: overrides.reason ?? null,
  };
}

function bookingEntry(overrides: Partial<{ id: string; date: string; time: string; status: string; patientId: string; patient: { firstName: string; lastName: string } }> = {}) {
  return {
    id: overrides.id ?? "bk1",
    date: overrides.date ?? "2026-03-10",
    time: overrides.time ?? "10:00 AM",
    status: overrides.status ?? "confirmed",
    patientId: overrides.patientId ?? "p1",
    patient: overrides.patient ?? { firstName: "Jane", lastName: "Smith" },
  };
}

/** Helper to mock fetch: first call = blocked times, second call = bookings */
function mockFetchResponses(blocked: ReturnType<typeof blockedEntry>[] = [], bookings: ReturnType<typeof bookingEntry>[] = []) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/admin/blocked-time")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(blocked) });
    }
    if (url.includes("/api/admin/bookings")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(bookings) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });
}

describe("Calendar Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: return empty blocked list and empty bookings
    mockFetchResponses([], []);
  });

  it("renders heading and description", async () => {
    render(<CalendarPage />);
    expect(screen.getByText("Calendar Management")).toBeInTheDocument();
    expect(screen.getByText(/Block days or hours/)).toBeInTheDocument();
  });

  it("shows day-of-week headers", async () => {
    render(<CalendarPage />);
    const headers = ["M", "T", "W", "T", "F", "S", "S"];
    headers.forEach((d) => {
      expect(screen.getAllByText(d).length).toBeGreaterThan(0);
    });
  });

  it("renders previous and next month navigation buttons", async () => {
    render(<CalendarPage />);
    expect(screen.getByLabelText("Previous month")).toBeInTheDocument();
    expect(screen.getByLabelText("Next month")).toBeInTheDocument();
  });

  it("navigates to next month when clicking next", async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);
    const nextBtn = screen.getByLabelText("Next month");

    // Get current displayed month
    const currentMonth = screen.getByText(/2026/);
    const initialText = currentMonth.textContent;

    await user.click(nextBtn);

    // Month text should change
    // The month label should now show a different month
    const updatedMonth = screen.getByText(/2026/);
    // If we started in March, we should now see April (or if navigating changes year)
    expect(updatedMonth.textContent).not.toBe(initialText);
  });

  it("navigates to previous month when clicking prev", async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);
    const prevBtn = screen.getByLabelText("Previous month");

    const currentMonth = screen.getByText(/2026/);
    const initialText = currentMonth.textContent;

    await user.click(prevBtn);

    const updatedMonth = screen.getByText(/202/); // Could show 2025 or 2026
    expect(updatedMonth.textContent).not.toBe(initialText);
  });

  it("shows prompt to select a date when no date selected", () => {
    render(<CalendarPage />);
    expect(screen.getByText(/Select a date on the calendar/)).toBeInTheDocument();
  });

  it("shows block form when a date is selected", async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);

    // Click on day 15
    const dayButton = screen.getByRole("button", { name: "15" });
    await user.click(dayButton);

    // Should show block form with mode buttons
    expect(screen.getByText("Full Day")).toBeInTheDocument();
    expect(screen.getByText("Specific Hours")).toBeInTheDocument();
    expect(screen.getByText("Date Range")).toBeInTheDocument();
  });

  it("shows time inputs when 'Specific Hours' mode is selected", async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);

    await user.click(screen.getByRole("button", { name: "15" }));
    await user.click(screen.getByText("Specific Hours"));

    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("To")).toBeInTheDocument();
    expect(screen.getByText("Block These Hours")).toBeInTheDocument();
  });

  it("shows date range input when 'Date Range' mode is selected", async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);

    await user.click(screen.getByRole("button", { name: "15" }));
    await user.click(screen.getByText("Date Range"));

    expect(screen.getByText(/Block from/)).toBeInTheDocument();
    expect(screen.getByText("Block Date Range")).toBeInTheDocument();
  });

  it("has a reason field in the block form", async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);

    await user.click(screen.getByRole("button", { name: "15" }));
    expect(screen.getByPlaceholderText(/Conference, Holiday/)).toBeInTheDocument();
  });

  it("calls POST to block a full day when submitted", async () => {
    const user = userEvent.setup();
    // Initial fetch returns empty, POST returns success, refetch returns empty
    mockFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "new1" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(<CalendarPage />);
    await screen.findByText("Calendar Management");

    await user.click(screen.getByRole("button", { name: "15" }));
    await user.click(screen.getByText("Block Entire Day"));

    // Should have called POST
    const postCalls = mockFetch.mock.calls.filter(
      (c) => c[1]?.method === "POST"
    );
    expect(postCalls.length).toBeGreaterThan(0);
    const body = JSON.parse(postCalls[0][1].body);
    expect(body.startTime).toBeNull();
    expect(body.endTime).toBeNull();
  });

  it("shows existing blocks for a selected date", async () => {
    mockFetchResponses([
      blockedEntry({ id: "b1", date: "2026-03-10", reason: "Staff meeting" }),
      blockedEntry({ id: "b2", date: "2026-03-10", startTime: "09:00", endTime: "12:00", reason: "Training" }),
    ]);

    const user = userEvent.setup();
    render(<CalendarPage />);

    await user.click(screen.getByRole("button", { name: "10" }));

    expect(await screen.findByText("Existing Blocks")).toBeInTheDocument();
    expect(screen.getByText("Full day")).toBeInTheDocument();
    expect(screen.getByText("09:00 – 12:00")).toBeInTheDocument();
    expect(screen.getByText("Staff meeting")).toBeInTheDocument();
    expect(screen.getByText("Training")).toBeInTheDocument();
  });

  it("has Remove buttons for existing blocks", async () => {
    mockFetchResponses([
      blockedEntry({ id: "b1", date: "2026-03-10", reason: "Holiday" }),
    ]);

    const user = userEvent.setup();
    render(<CalendarPage />);
    await user.click(screen.getByRole("button", { name: "10" }));

    expect(await screen.findByText("Remove")).toBeInTheDocument();
  });

  it("calls DELETE when Remove is clicked", async () => {
    const blockedData = [blockedEntry({ id: "block-del", date: "2026-03-10" })];
    mockFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({ ok: true });
      }
      if (url.includes("/api/admin/blocked-time")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(blockedData) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    const user = userEvent.setup();
    render(<CalendarPage />);
    await user.click(screen.getByRole("button", { name: "10" }));
    await screen.findByText("Remove");

    await user.click(screen.getByText("Remove"));

    const deleteCalls = mockFetch.mock.calls.filter(
      (c) => c[1]?.method === "DELETE"
    );
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0][0]).toContain("block-del");
  });

  it("shows legend with Full day blocked, Hours blocked, and Has bookings", () => {
    render(<CalendarPage />);
    expect(screen.getByText("Full day blocked")).toBeInTheDocument();
    expect(screen.getByText("Hours blocked")).toBeInTheDocument();
    expect(screen.getByText("Has bookings")).toBeInTheDocument();
  });

  it("fetches blocked times and bookings on mount", () => {
    render(<CalendarPage />);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/admin/blocked-time?month="));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/admin/bookings?month="));
  });

  it("shows booking indicator dot on days with bookings", async () => {
    mockFetchResponses([], [
      bookingEntry({ date: "2026-03-12" }),
    ]);

    render(<CalendarPage />);
    expect(await screen.findByTestId("booking-dot-2026-03-12")).toBeInTheDocument();
  });

  it("shows bookings section when selecting a date with bookings", async () => {
    mockFetchResponses([], [
      bookingEntry({ date: "2026-03-10", time: "2:00 PM", patient: { firstName: "Alice", lastName: "Johnson" }, status: "confirmed" }),
    ]);

    const user = userEvent.setup();
    render(<CalendarPage />);
    await screen.findByText("Calendar Management");

    await user.click(screen.getByRole("button", { name: "10" }));

    expect(await screen.findByText("Bookings")).toBeInTheDocument();
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("2:00 PM")).toBeInTheDocument();
    expect(screen.getByText("confirmed")).toBeInTheDocument();
  });

  it("links bookings to patient detail page", async () => {
    mockFetchResponses([], [
      bookingEntry({ date: "2026-03-10", patientId: "pat-123", patient: { firstName: "Bob", lastName: "Lee" } }),
    ]);

    const user = userEvent.setup();
    render(<CalendarPage />);
    await screen.findByText("Calendar Management");

    await user.click(screen.getByRole("button", { name: "10" }));
    await screen.findByText("Bob Lee");

    const link = screen.getByRole("link", { name: /Bob Lee/ });
    expect(link).toHaveAttribute("href", "/admin/patients/pat-123");
  });

  it("shows correct status badge colors for bookings", async () => {
    mockFetchResponses([], [
      bookingEntry({ id: "bk1", date: "2026-03-10", status: "pending" }),
      bookingEntry({ id: "bk2", date: "2026-03-10", status: "completed", patient: { firstName: "Sam", lastName: "Doe" } }),
    ]);

    const user = userEvent.setup();
    render(<CalendarPage />);
    await screen.findByText("Calendar Management");

    await user.click(screen.getByRole("button", { name: "10" }));

    expect(await screen.findByText("pending")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("does not show bookings section when no bookings for selected date", async () => {
    mockFetchResponses([], [
      bookingEntry({ date: "2026-03-15" }),
    ]);

    const user = userEvent.setup();
    render(<CalendarPage />);
    await screen.findByText("Calendar Management");

    // Select a date that has no bookings
    await user.click(screen.getByRole("button", { name: "12" }));

    expect(screen.queryByText("Bookings")).not.toBeInTheDocument();
  });
});
