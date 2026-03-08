import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import PatientsPage from "@/app/admin/patients/page";

function mockPatient(overrides: Partial<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count: { surveys: number; bookings: number; notes: number };
}> = {}) {
  return {
    id: overrides.id ?? "p1",
    firstName: overrides.firstName ?? "Jane",
    lastName: overrides.lastName ?? "Doe",
    email: overrides.email ?? "jane@example.com",
    phone: overrides.phone ?? null,
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00Z",
    _count: overrides._count ?? { surveys: 2, bookings: 3, notes: 1 },
  };
}

describe("Patients List Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders heading and search input", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<PatientsPage />);
    expect(screen.getByText("Patients")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search by name or email…")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<PatientsPage />);
    // The 300ms debounce means loading shows after timeout fires
    vi.advanceTimersByTime(350);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no patients returned", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);
    expect(await screen.findByText("No patients yet")).toBeInTheDocument();
  });

  it("renders patient list with name, email, and counts", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          mockPatient({ firstName: "Alice", lastName: "Brown", email: "alice@example.com", _count: { surveys: 2, bookings: 4, notes: 1 } }),
          mockPatient({ id: "p2", firstName: "Bob", lastName: "Green", email: "bob@example.com", _count: { surveys: 0, bookings: 1, notes: 0 } }),
        ]),
    });
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);

    expect(await screen.findByText("Alice Brown")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("4 bookings")).toBeInTheDocument();
    expect(screen.getByText("2 surveys")).toBeInTheDocument();

    expect(screen.getByText("Bob Green")).toBeInTheDocument();
    expect(screen.getByText("1 bookings")).toBeInTheDocument();
  });

  it("links each patient to their detail page", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([mockPatient({ id: "patient-123" })]),
    });
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);

    await screen.findByText("Jane Doe");
    const link = screen.getByRole("link", { name: /Jane Doe/i });
    expect(link).toHaveAttribute("href", "/admin/patients/patient-123");
  });

  it("shows 'No patients match your search' when search returns empty", async () => {
    // First call returns patients, so we can type a search
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockPatient()]) })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);
    await screen.findByText("Jane Doe");

    const searchInput = screen.getByPlaceholderText("Search by name or email…");
    await user.type(searchInput, "zzz");
    vi.advanceTimersByTime(350);

    expect(await screen.findByText("No patients match your search")).toBeInTheDocument();
  });

  it("passes search query to the API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);

    const searchInput = screen.getByPlaceholderText("Search by name or email…");
    await user.type(searchInput, "Alice");
    vi.advanceTimersByTime(350);

    const calls = mockFetch.mock.calls.map((c) => c[0]);
    expect(calls.some((url: string) => url.includes("q=Alice"))).toBe(true);
  });
});
