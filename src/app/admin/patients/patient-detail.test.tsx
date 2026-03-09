import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "test-patient-id" }),
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

import PatientDetailPage from "@/app/admin/patients/[id]/page";

describe("Patient Detail Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makePatient = (overrides = {}) => ({
    id: "p1",
    firstName: "Test",
    lastName: "Patient",
    email: "t@t.com",
    phone: null,
    dob: null,
    status: "active",
    createdAt: "2025-01-01T00:00:00Z",
    notes: [],
    surveys: [],
    bookings: [],
    ...overrides,
  });

  const mockPatient = (data: ReturnType<typeof makePatient>) => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });
  };

  it("shows loading state", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<PatientDetailPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows not found when patient missing", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    render(<PatientDetailPage />);
    expect(await screen.findByText("Patient not found")).toBeInTheDocument();
  });

  it("renders patient details", async () => {
    mockPatient(makePatient({
      id: "test-patient-id",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@test.com",
      phone: "0400000000",
      dob: "1990-05-15",
    }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@test.com")).toBeInTheDocument();
    expect(screen.getByText(/0400000000/)).toBeInTheDocument();
  });

  it("renders bookings with status badges", async () => {
    mockPatient(makePatient({
      firstName: "John",
      lastName: "Smith",
      email: "john@test.com",
      bookings: [
        { id: "b1", date: "2025-02-10", time: "10:00 AM", status: "confirmed", notes: null, createdAt: "2025-01-20T00:00:00Z" },
        { id: "b2", date: "2025-02-12", time: "2:00 PM", status: "pending", notes: null, createdAt: "2025-01-21T00:00:00Z" },
      ],
    }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("confirmed")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders add note form", async () => {
    mockPatient(makePatient({}));
    render(<PatientDetailPage />);
    expect(await screen.findByPlaceholderText("Add a clinical note…")).toBeInTheDocument();
    expect(screen.getByText("Add Note")).toBeInTheDocument();
  });

  it("shows confirm and cancel buttons for pending bookings", async () => {
    mockPatient(makePatient({
      bookings: [
        { id: "b1", date: "2025-02-10", time: "10:00 AM", status: "pending", notes: null, createdAt: "2025-01-20T00:00:00Z" },
      ],
    }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("does not show confirm button for already confirmed bookings but shows complete and cancel", async () => {
    mockPatient(makePatient({
      bookings: [
        { id: "b1", date: "2025-02-10", time: "10:00 AM", status: "confirmed", notes: null, createdAt: "2025-01-20T00:00:00Z" },
      ],
    }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("confirmed")).toBeInTheDocument();
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    // Complete and Cancel buttons should show for confirmed bookings
    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("does not show any action buttons for cancelled bookings", async () => {
    mockPatient(makePatient({
      bookings: [
        { id: "b1", date: "2025-02-10", time: "10:00 AM", status: "cancelled", notes: null, createdAt: "2025-01-20T00:00:00Z" },
      ],
    }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("cancelled")).toBeInTheDocument();
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    expect(screen.queryByText("Complete")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  it("does not show any action buttons for completed bookings", async () => {
    mockPatient(makePatient({
      bookings: [
        { id: "b1", date: "2025-02-10", time: "10:00 AM", status: "completed", notes: null, createdAt: "2025-01-20T00:00:00Z" },
      ],
    }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("completed")).toBeInTheDocument();
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    expect(screen.queryByText("Complete")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  it("shows Edit, Archive, and Delete buttons", async () => {
    mockPatient(makePatient({ firstName: "Jane", lastName: "Doe" }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("shows active status badge", async () => {
    mockPatient(makePatient({ status: "active" }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("active")).toBeInTheDocument();
  });

  it("shows Reactivate button for archived patients", async () => {
    mockPatient(makePatient({ status: "archived" }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("Reactivate")).toBeInTheDocument();
    expect(screen.queryByText("Archive")).not.toBeInTheDocument();
  });

  it("shows edit button on notes (hover reveals actions)", async () => {
    mockPatient(makePatient({
      notes: [{ id: "n1", content: "Test note", createdAt: "2025-01-10T00:00:00Z" }],
    }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("Test note")).toBeInTheDocument();
    // Edit and delete buttons should be in the DOM
    expect(screen.getByTitle("Edit note")).toBeInTheDocument();
    expect(screen.getByTitle("Delete note")).toBeInTheDocument();
  });

  it("enters edit mode for a note when edit button clicked", async () => {
    mockPatient(makePatient({
      notes: [{ id: "n1", content: "Original note", createdAt: "2025-01-10T00:00:00Z" }],
    }));
    const user = userEvent.setup();
    render(<PatientDetailPage />);
    await screen.findByText("Original note");
    await user.click(screen.getByTitle("Edit note"));
    // Should show textarea with the note content & Save/Cancel buttons
    const textarea = screen.getByDisplayValue("Original note");
    expect(textarea).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getAllByText("Cancel").length).toBeGreaterThanOrEqual(1);
  });

  it("renders progress tracking chart when progress surveys exist", async () => {
    mockPatient(makePatient({
      surveys: [
        {
          id: "s1",
          type: "progress",
          data: JSON.stringify({ type: "progress", ratings: { "Headaches/Migraines": 7, "Fatigue": 5 } }),
          createdAt: "2025-01-15T00:00:00Z",
        },
        {
          id: "s2",
          type: "progress",
          data: JSON.stringify({ type: "progress", ratings: { "Headaches/Migraines": 4, "Fatigue": 3 } }),
          createdAt: "2025-02-15T00:00:00Z",
        },
      ],
    }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("Progress Tracking")).toBeInTheDocument();
    expect(screen.getByText("Headaches/Migraines")).toBeInTheDocument();
    expect(screen.getByText("Fatigue")).toBeInTheDocument();
  });

  it("does not show progress chart when no progress surveys exist", async () => {
    mockPatient(makePatient({
      surveys: [
        { id: "s1", type: "intake", data: "{}", createdAt: "2025-01-15T00:00:00Z" },
      ],
    }));
    render(<PatientDetailPage />);
    await screen.findByText("Survey Submissions");
    expect(screen.queryByText("Progress Tracking")).not.toBeInTheDocument();
  });

  it("saves note edit via PATCH and refreshes", async () => {
    // First fetch returns patient with note, subsequent fetches return updated patient
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(makePatient({
        notes: [{ id: "n1", content: "Original", createdAt: "2025-01-10T00:00:00Z" }],
      }))})
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }) // PATCH response
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(makePatient({
        notes: [{ id: "n1", content: "Updated", createdAt: "2025-01-10T00:00:00Z" }],
      }))});

    const user = userEvent.setup();
    render(<PatientDetailPage />);
    await screen.findByText("Original");
    await user.click(screen.getByTitle("Edit note"));

    const textarea = screen.getByDisplayValue("Original");
    await user.clear(textarea);
    await user.type(textarea, "Updated");
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(
        (c) => typeof c[1]?.method === "string" && c[1].method === "PATCH" && c[0].includes("/api/admin/notes/")
      );
      expect(patchCall).toBeTruthy();
    });
  });

  it("shows progress average comparison when 2+ progress surveys exist", async () => {
    mockPatient(makePatient({
      surveys: [
        {
          id: "s1",
          type: "progress",
          data: JSON.stringify({ type: "progress", ratings: { "Headaches/Migraines": 8, "Fatigue": 6 } }),
          createdAt: "2025-01-15T00:00:00Z",
        },
        {
          id: "s2",
          type: "progress",
          data: JSON.stringify({ type: "progress", ratings: { "Headaches/Migraines": 4, "Fatigue": 2 } }),
          createdAt: "2025-02-15T00:00:00Z",
        },
      ],
    }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("Progress Tracking")).toBeInTheDocument();
    // Should show average severity summary
    expect(screen.getByText(/Average severity/)).toBeInTheDocument();
  });

  it("handles malformed survey JSON gracefully when expanded", async () => {
    mockPatient(makePatient({
      surveys: [
        {
          id: "s1",
          type: "intake",
          data: "not-valid-json{!!",
          createdAt: "2025-01-15T00:00:00Z",
        },
      ],
    }));
    const user = userEvent.setup();
    render(<PatientDetailPage />);
    await screen.findByText("Intake Survey");
    // Expand the survey
    await user.click(screen.getByText("View"));
    // Should show error message instead of crashing
    expect(screen.getByText("Unable to display survey data")).toBeInTheDocument();
  });

  it("handles progress survey with all N/A ratings without crashing", async () => {
    mockPatient(makePatient({
      surveys: [
        {
          id: "s1",
          type: "progress",
          data: JSON.stringify({ type: "progress", ratings: { "Headaches/Migraines": null, "Fatigue": null } }),
          createdAt: "2025-01-15T00:00:00Z",
        },
        {
          id: "s2",
          type: "progress",
          data: JSON.stringify({ type: "progress", ratings: { "Headaches/Migraines": null, "Fatigue": null } }),
          createdAt: "2025-02-15T00:00:00Z",
        },
      ],
    }));
    render(<PatientDetailPage />);
    expect(await screen.findByText("Progress Tracking")).toBeInTheDocument();
    // All N/A — should show N/A labels and not crash with division by zero
    const naLabels = screen.getAllByText("N/A");
    expect(naLabels.length).toBeGreaterThanOrEqual(2);
  });

  it("handles progress survey without ratings key gracefully", async () => {
    mockPatient(makePatient({
      surveys: [
        {
          id: "s1",
          type: "progress",
          data: JSON.stringify({ type: "progress", identity: { "First Name": "Test" } }),
          createdAt: "2025-01-15T00:00:00Z",
        },
      ],
    }));
    render(<PatientDetailPage />);
    await screen.findByText("Survey Submissions");
    // No ratings → chart should not render (allAreas would be empty)
    expect(screen.queryByText("Progress Tracking")).not.toBeInTheDocument();
  });

  it("renders Copy Progress Survey Link button", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(makePatient()) });
    render(<PatientDetailPage />);
    expect(await screen.findByText("Copy Progress Survey Link")).toBeInTheDocument();
  });

  it("shows copied confirmation when copy survey link is clicked", async () => {
    // Provide clipboard API since jsdom doesn't have it
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      });
    }
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(makePatient()) });

    const user = userEvent.setup();
    render(<PatientDetailPage />);
    const btn = await screen.findByText("Copy Progress Survey Link");
    await user.click(btn);

    // Button text should change to show copied confirmation
    await waitFor(() => {
      expect(screen.getByText("✓ Copied!")).toBeInTheDocument();
    });
    // Original button text should no longer be visible
    expect(screen.queryByText("Copy Progress Survey Link")).not.toBeInTheDocument();
  });

  it("shows booking selector in note form when bookings exist", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(makePatient({
      bookings: [
        { id: "bk1", date: "2026-03-15", time: "10:00 AM", status: "confirmed", notes: null, createdAt: "2025-01-01T00:00:00Z" },
      ],
    })) });
    render(<PatientDetailPage />);
    expect(await screen.findByLabelText("Link to booking")).toBeInTheDocument();
  });

  it("does not show booking selector when no bookings", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(makePatient()) });
    render(<PatientDetailPage />);
    await screen.findByText("Add Note");
    expect(screen.queryByLabelText("Link to booking")).not.toBeInTheDocument();
  });

  it("shows booking badge on notes linked to a booking", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(makePatient({
      notes: [
        { id: "n1", content: "Session went well", createdAt: "2025-01-10T00:00:00Z", bookingId: "bk1", booking: { id: "bk1", date: "2026-03-15", time: "10:00 AM" } },
      ],
    })) });
    render(<PatientDetailPage />);
    expect(await screen.findByText("Session went well")).toBeInTheDocument();
    expect(screen.getByText(/2026-03-15/)).toBeInTheDocument();
  });

  it("shows Add Note button on non-completed bookings", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(makePatient({
      bookings: [
        { id: "bk1", date: "2026-03-15", time: "10:00 AM", status: "pending", notes: null, createdAt: "2025-01-01T00:00:00Z" },
      ],
    })) });
    render(<PatientDetailPage />);
    await screen.findByText("Bookings");
    // There should be "Add Note" buttons: one in the note form + one on the booking
    const addNoteBtns = screen.getAllByText("Add Note");
    expect(addNoteBtns.length).toBeGreaterThanOrEqual(2);
  });

  it("shows note category selector in note form", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(makePatient()) });
    render(<PatientDetailPage />);
    const selector = await screen.findByLabelText("Note category");
    expect(selector).toBeInTheDocument();
    // Should include the 5 categories + "No category"
    expect(selector.querySelectorAll("option")).toHaveLength(6);
  });

  it("shows category badge on notes that have a category", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(makePatient({
      notes: [
        { id: "n1", content: "Treatment assessment", category: "Assessment", createdAt: "2025-01-10T00:00:00Z", bookingId: null, booking: null },
      ],
    })) });
    render(<PatientDetailPage />);
    expect(await screen.findByText("Treatment assessment")).toBeInTheDocument();
    // Category badge should be rendered as an indigo-colored span
    const badges = screen.getAllByText("Assessment");
    const categoryBadge = badges.find(el => el.classList.contains("bg-indigo-50"));
    expect(categoryBadge).toBeTruthy();
  });

  it("does not show category badge on notes without a category", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(makePatient({
      notes: [
        { id: "n1", content: "No category note", category: null, createdAt: "2025-01-10T00:00:00Z", bookingId: null, booking: null },
      ],
    })) });
    render(<PatientDetailPage />);
    expect(await screen.findByText("No category note")).toBeInTheDocument();
    // No indigo badge should exist — the category names may appear in the selector dropdown
    // but NOT as a badge span with bg-indigo-50
    const noteCard = screen.getByText("No category note").closest(".group");
    const badge = noteCard?.querySelector(".bg-indigo-50");
    expect(badge).toBeNull();
  });

  it("sends category when adding a note with category selected", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(makePatient()) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: "n-new" }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(makePatient()) });

    const user = userEvent.setup();
    render(<PatientDetailPage />);
    await screen.findByPlaceholderText("Add a clinical note…");

    // Select a category
    await user.selectOptions(screen.getByLabelText("Note category"), "Treatment Plan");

    // Type a note
    await user.type(screen.getByPlaceholderText("Add a clinical note…"), "New treatment plan");

    // Click Add Note
    await user.click(screen.getByRole("button", { name: "Add Note" }));

    await waitFor(() => {
      const postCall = mockFetch.mock.calls.find(
        (c) => typeof c[1]?.method === "string" && c[1].method === "POST" && c[0].includes("/notes")
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(postCall![1].body);
      expect(body.category).toBe("Treatment Plan");
      expect(body.content).toBe("New treatment plan");
    });
  });
});
