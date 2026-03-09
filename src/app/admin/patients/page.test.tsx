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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import PatientsPage from "@/app/admin/patients/page";

function mockPatient(overrides: Partial<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dob: string | null;
  status: string;
  createdAt: string;
  _count: { surveys: number; bookings: number; notes: number };
}> = {}) {
  return {
    id: overrides.id ?? "p1",
    firstName: overrides.firstName ?? "Jane",
    lastName: overrides.lastName ?? "Doe",
    email: overrides.email ?? "jane@example.com",
    phone: overrides.phone ?? null,
    dob: overrides.dob ?? null,
    status: overrides.status ?? "active",
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00Z",
    _count: overrides._count ?? { surveys: 2, bookings: 3, notes: 1 },
  };
}

function mockApiResponse(patients: ReturnType<typeof mockPatient>[], total?: number) {
  return {
    ok: true,
    json: () => Promise.resolve({
      patients,
      page: 1,
      pageSize: 20,
      total: total ?? patients.length,
      totalPages: Math.max(1, Math.ceil((total ?? patients.length) / 20)),
    }),
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
    mockFetch.mockResolvedValue(mockApiResponse([]));
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
    mockFetch.mockResolvedValue(mockApiResponse([]));
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);
    expect(await screen.findByText("No patients yet")).toBeInTheDocument();
  });

  it("renders patient list with name, email, and counts", async () => {
    mockFetch.mockResolvedValue(mockApiResponse([
      mockPatient({ firstName: "Alice", lastName: "Brown", email: "alice@example.com", _count: { surveys: 2, bookings: 4, notes: 1 } }),
      mockPatient({ id: "p2", firstName: "Bob", lastName: "Green", email: "bob@example.com", _count: { surveys: 0, bookings: 1, notes: 0 } }),
    ]));
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
    mockFetch.mockResolvedValue(mockApiResponse([mockPatient({ id: "patient-123" })]));
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);

    await screen.findByText("Jane Doe");
    const link = screen.getByRole("link", { name: /Jane Doe/i });
    expect(link).toHaveAttribute("href", "/admin/patients/patient-123");
  });

  it("shows 'No patients match your search' when search returns empty", async () => {
    // First call returns patients, so we can type a search
    mockFetch
      .mockResolvedValueOnce(mockApiResponse([mockPatient()]))
      .mockResolvedValue(mockApiResponse([]));

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
    mockFetch.mockResolvedValue(mockApiResponse([]));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);

    const searchInput = screen.getByPlaceholderText("Search by name or email…");
    await user.type(searchInput, "Alice");
    vi.advanceTimersByTime(350);

    const calls = mockFetch.mock.calls.map((c) => c[0]);
    expect(calls.some((url: string) => url.includes("q=Alice"))).toBe(true);
  });

  it("shows status badges for patients", async () => {
    mockFetch.mockResolvedValue(mockApiResponse([
      mockPatient({ firstName: "Active", lastName: "Patient", status: "active" }),
      mockPatient({ id: "p2", firstName: "Archived", lastName: "Patient", email: "a@b.com", status: "archived" }),
    ]));
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);
    expect(await screen.findByText("active")).toBeInTheDocument();
    expect(screen.getByText("archived")).toBeInTheDocument();
  });

  it("displays phone and DOB when available", async () => {
    mockFetch.mockResolvedValue(mockApiResponse([
      mockPatient({ phone: "0400111222", dob: "1990-05-15" }),
    ]));
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);
    await screen.findByText("Jane Doe");
    expect(screen.getByText(/0400111222/)).toBeInTheDocument();
    expect(screen.getByText(/1990-05-15/)).toBeInTheDocument();
  });

  it("shows status filter dropdown", async () => {
    mockFetch.mockResolvedValue(mockApiResponse([]));
    render(<PatientsPage />);
    expect(screen.getByLabelText("Filter by status")).toBeInTheDocument();
  });

  it("shows total patient count", async () => {
    mockFetch.mockResolvedValue(mockApiResponse([mockPatient()], 5));
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);
    expect(await screen.findByText("5 patients")).toBeInTheDocument();
  });

  it("shows pagination when multiple pages exist", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        patients: [mockPatient()],
        page: 1,
        pageSize: 20,
        total: 25,
        totalPages: 2,
      }),
    });
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);
    await screen.findByText("Jane Doe");
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("does not show pagination for single page", async () => {
    mockFetch.mockResolvedValue(mockApiResponse([mockPatient()]));
    render(<PatientsPage />);
    vi.advanceTimersByTime(350);
    await screen.findByText("Jane Doe");
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
  });

  it("shows New Patient button", async () => {
    mockFetch.mockResolvedValue(mockApiResponse([]));
    render(<PatientsPage />);
    expect(screen.getByText("+ New Patient")).toBeInTheDocument();
  });

  it("opens new patient modal when clicking button", async () => {
    mockFetch.mockResolvedValue(mockApiResponse([]));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PatientsPage />);
    await user.click(screen.getByText("+ New Patient"));
    expect(screen.getByText("New Patient")).toBeInTheDocument();
    expect(screen.getByText("Create Patient")).toBeInTheDocument();
  });
});
