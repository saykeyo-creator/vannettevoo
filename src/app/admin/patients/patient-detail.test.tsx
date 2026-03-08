import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "test-patient-id" }),
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
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "test-patient-id",
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@test.com",
          phone: "0400000000",
          dob: "1990-05-15",
          createdAt: "2025-01-01T00:00:00Z",
          notes: [],
          surveys: [],
          bookings: [],
        }),
    });
    render(<PatientDetailPage />);
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@test.com")).toBeInTheDocument();
    expect(screen.getByText("0400000000")).toBeInTheDocument();
  });

  it("renders bookings with status badges", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "p1",
          firstName: "John",
          lastName: "Smith",
          email: "john@test.com",
          phone: null,
          dob: null,
          createdAt: "2025-01-01T00:00:00Z",
          notes: [],
          surveys: [],
          bookings: [
            { id: "b1", date: "2025-02-10", time: "10:00 AM", status: "confirmed", notes: null, createdAt: "2025-01-20T00:00:00Z" },
            { id: "b2", date: "2025-02-12", time: "2:00 PM", status: "pending", notes: null, createdAt: "2025-01-21T00:00:00Z" },
          ],
        }),
    });
    render(<PatientDetailPage />);
    expect(await screen.findByText("confirmed")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders add note form", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "p1",
          firstName: "Test",
          lastName: "Patient",
          email: "t@t.com",
          phone: null,
          dob: null,
          createdAt: "2025-01-01T00:00:00Z",
          notes: [],
          surveys: [],
          bookings: [],
        }),
    });
    render(<PatientDetailPage />);
    expect(await screen.findByPlaceholderText("Add a clinical note…")).toBeInTheDocument();
    expect(screen.getByText("Add Note")).toBeInTheDocument();
  });

  it("shows confirm and cancel buttons for pending bookings", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "p1",
          firstName: "Test",
          lastName: "Patient",
          email: "t@t.com",
          phone: null,
          dob: null,
          createdAt: "2025-01-01T00:00:00Z",
          notes: [],
          surveys: [],
          bookings: [
            { id: "b1", date: "2025-02-10", time: "10:00 AM", status: "pending", notes: null, createdAt: "2025-01-20T00:00:00Z" },
          ],
        }),
    });
    render(<PatientDetailPage />);
    expect(await screen.findByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("does not show confirm button for already confirmed bookings", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "p1",
          firstName: "Test",
          lastName: "Patient",
          email: "t@t.com",
          phone: null,
          dob: null,
          createdAt: "2025-01-01T00:00:00Z",
          notes: [],
          surveys: [],
          bookings: [
            { id: "b1", date: "2025-02-10", time: "10:00 AM", status: "confirmed", notes: null, createdAt: "2025-01-20T00:00:00Z" },
          ],
        }),
    });
    render(<PatientDetailPage />);
    expect(await screen.findByText("confirmed")).toBeInTheDocument();
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    // Cancel button should still show for confirmed bookings
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("does not show any action buttons for cancelled bookings", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "p1",
          firstName: "Test",
          lastName: "Patient",
          email: "t@t.com",
          phone: null,
          dob: null,
          createdAt: "2025-01-01T00:00:00Z",
          notes: [],
          surveys: [],
          bookings: [
            { id: "b1", date: "2025-02-10", time: "10:00 AM", status: "cancelled", notes: null, createdAt: "2025-01-20T00:00:00Z" },
          ],
        }),
    });
    render(<PatientDetailPage />);
    expect(await screen.findByText("cancelled")).toBeInTheDocument();
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });
});
