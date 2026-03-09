import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/book",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Default fetch mock: availability API returns empty, everything else passes through
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    if (url.includes("/api/availability")) {
      return { ok: true, json: async () => [] } as Response;
    }
    // For booking submissions in tests
    return { ok: true, json: async () => ({ success: true }) } as Response;
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

import BookPage from "@/app/book/page";

describe("Book Page", () => {
  it("renders the heading", () => {
    render(<BookPage />);
    expect(screen.getByText("Book an Appointment")).toBeInTheDocument();
  });

  it("renders the step indicators", () => {
    render(<BookPage />);
    expect(screen.getByText("Select Date")).toBeInTheDocument();
    expect(screen.getByText("Select Time")).toBeInTheDocument();
    expect(screen.getByText("Your Details")).toBeInTheDocument();
  });

  it("renders the calendar with day headers", () => {
    render(<BookPage />);
    // Monday-start calendar headers
    const headers = ["M", "T", "W", "T", "F", "S", "S"];
    headers.forEach((h) => {
      expect(screen.getAllByText(h).length).toBeGreaterThan(0);
    });
  });

  it("renders availability info", () => {
    render(<BookPage />);
    expect(screen.getByText(/Monday to Friday/)).toBeInTheDocument();
  });

  it("shows month navigation buttons", () => {
    render(<BookPage />);
    expect(screen.getByLabelText("Previous month")).toBeInTheDocument();
    expect(screen.getByLabelText("Next month")).toBeInTheDocument();
  });

  it("calendar day buttons have adequate touch targets", () => {
    render(<BookPage />);
    const dayButtons = screen.getAllByRole("button").filter(
      (btn) => /^\d+$/.test(btn.textContent ?? "")
    );
    expect(dayButtons.length).toBeGreaterThan(0);
    dayButtons.forEach((btn) => {
      expect(btn.className).toContain("min-h-[44px]");
    });
  });

  it("booking form fields have accessible labels with htmlFor", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<BookPage />);
    // Select a future weekday
    const dayButtons = screen.getAllByRole("button").filter(
      (btn) => !btn.hasAttribute("disabled") && /^\d+$/.test(btn.textContent ?? "")
    );
    if (dayButtons.length > 0) {
      fireEvent.click(dayButtons[0]);
      fireEvent.click(screen.getByText(/Continue —/));
      // Pick whatever time slot is first available (not hardcoded — slots vary by time of day)
      const timeSlots = screen.getAllByRole("button").filter(
        (btn) => /^\d{1,2}:\d{2}\s?(AM|PM)$/.test(btn.textContent?.trim() ?? "")
      );
      fireEvent.click(timeSlots[0]);
      fireEvent.click(screen.getByText("Continue"));
      // Form fields should now be visible with htmlFor
      const fullNameLabel = screen.getByText("Full Name", { selector: "label" });
      expect(fullNameLabel.getAttribute("for")).toBeTruthy();
    }
  });

  it("clears selected time when a new date is picked", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<BookPage />);
    const getSelectableDays = () =>
      screen.getAllByRole("button").filter(
        (btn) => !btn.hasAttribute("disabled") && /^\d+$/.test(btn.textContent ?? "")
      );
    const days = getSelectableDays();
    if (days.length >= 2) {
      const secondDayText = days[1].textContent;
      // Select first date, go to time step, select the first available time
      fireEvent.click(days[0]);
      fireEvent.click(screen.getByText(/Continue —/));
      const timeSlots = screen.getAllByRole("button").filter(
        (btn) => /^\d{1,2}:\d{2}\s?(AM|PM)$/.test(btn.textContent?.trim() ?? "")
      );
      const selectedTimeText = timeSlots[0].textContent!.trim();
      fireEvent.click(timeSlots[0]);
      expect(screen.getByText(selectedTimeText).className).toContain("bg-teal-50");
      // Go back and pick a different date (re-query since DOM re-rendered)
      fireEvent.click(screen.getByText("Back"));
      const freshDays = getSelectableDays();
      const secondDay = freshDays.find((b) => b.textContent === secondDayText);
      fireEvent.click(secondDay!);
      // Go to time step again — time should be cleared
      fireEvent.click(screen.getByText(/Continue —/));
      const freshTimeSlots = screen.getAllByRole("button").filter(
        (btn) => /^\d{1,2}:\d{2}\s?(AM|PM)$/.test(btn.textContent?.trim() ?? "")
      );
      // No time slot should have the selected highlight
      for (const slot of freshTimeSlots) {
        expect(slot.className).not.toContain("bg-teal-50");
      }
    }
  });

  it("prevents navigating to months before the current month", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<BookPage />);
    const currentMonthText = screen.getByText(
      new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" })
    );
    expect(currentMonthText).toBeInTheDocument();
    // Click previous month — should stay on same month
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(currentMonthText).toBeInTheDocument();
  });

  it("shows error message when API returns error on submit", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    // Override fetch to return error for booking but not availability
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes("/api/availability")) {
        return { ok: true, json: async () => [] } as Response;
      }
      return { ok: false, status: 500, json: async () => ({ error: "Server error" }) } as Response;
    }) as typeof fetch;
    render(<BookPage />);
    const dayButtons = screen.getAllByRole("button").filter(
      (btn) => !btn.hasAttribute("disabled") && /^\d+$/.test(btn.textContent ?? "")
    );
    if (dayButtons.length > 0) {
      fireEvent.click(dayButtons[0]);
      fireEvent.click(screen.getByText(/Continue —/));
      const timeSlots = screen.getAllByRole("button").filter(
        (btn) => /^\d{1,2}:\d{2}\s?(AM|PM)$/.test(btn.textContent?.trim() ?? "")
      );
      fireEvent.click(timeSlots[0]);
      fireEvent.click(screen.getByText("Continue"));
      // Fill form
      fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: "Test" } });
      fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "t@t.com" } });
      fireEvent.submit(screen.getByText("Request Booking").closest("form")!);
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      // Should NOT show confirmation
      expect(screen.queryByText("Booking Request Sent")).not.toBeInTheDocument();
    }
  });

  it("submits date as local YYYY-MM-DD string, not ISO/UTC", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    const bookCalls: { url: string; init?: RequestInit }[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes("/api/availability")) {
        return { ok: true, json: async () => [] } as Response;
      }
      bookCalls.push({ url, init });
      return { ok: true, json: async () => ({ success: true }) } as Response;
    }) as typeof fetch;
    render(<BookPage />);
    const dayButtons = screen.getAllByRole("button").filter(
      (btn) => !btn.hasAttribute("disabled") && /^\d+$/.test(btn.textContent ?? "")
    );
    if (dayButtons.length > 0) {
      fireEvent.click(dayButtons[0]);
      fireEvent.click(screen.getByText(/Continue —/));
      const timeSlots = screen.getAllByRole("button").filter(
        (btn) => /^\d{1,2}:\d{2}\s?(AM|PM)$/.test(btn.textContent?.trim() ?? "")
      );
      const selectedTimeText = timeSlots[0].textContent!.trim();
      fireEvent.click(timeSlots[0]);
      fireEvent.click(screen.getByText("Continue"));
      fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: "Test" } });
      fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "t@t.com" } });
      fireEvent.submit(screen.getByText("Request Booking").closest("form")!);
      await waitFor(() => {
        expect(bookCalls.length).toBeGreaterThan(0);
      });
      const body = JSON.parse(bookCalls[0].init!.body as string);
      // Date should be YYYY-MM-DD format, not ISO string with T/Z
      expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(body.date).not.toContain("T");
      expect(body.time).toBe(selectedTimeText);
    }
  });

  it("filters out past time slots when today is selected", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<BookPage />);
    // Find today's date button (day number matching today)
    const todayDate = new Date().getDate();
    const dayButtons = screen.getAllByRole("button").filter(
      (btn) => !btn.hasAttribute("disabled") && btn.textContent === String(todayDate)
    );
    if (dayButtons.length > 0) {
      fireEvent.click(dayButtons[0]);
      fireEvent.click(screen.getByText(/Continue —/));
      // Count visible time slots — should be fewer than 16 (unless very early morning)
      const allSlotButtons = screen.getAllByRole("button").filter(
        (btn) => /^\d+:\d+\s[AP]M$/.test(btn.textContent ?? "")
      );
      // At any time after 9 AM, at least one slot should be filtered out
      const now = new Date();
      if (now.getHours() >= 9) {
        expect(allSlotButtons.length).toBeLessThan(16);
      }
    }
  });
});
