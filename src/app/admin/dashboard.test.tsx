import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/db", () => ({
  prisma: {
    patient: { count: vi.fn().mockResolvedValue(0) },
    booking: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    contactMessage: { count: vi.fn().mockResolvedValue(0) },
    blockedTime: { count: vi.fn().mockResolvedValue(0) },
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import AdminDashboard from "@/app/admin/page";
import { prisma } from "@/lib/db";

const mockPrisma = vi.mocked(prisma);

describe("Admin Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.patient.count.mockResolvedValue(0);
    mockPrisma.booking.count.mockResolvedValue(0);
    mockPrisma.contactMessage.count.mockResolvedValue(0);
    mockPrisma.blockedTime.count.mockResolvedValue(0);
    mockPrisma.booking.findMany.mockResolvedValue([]);
  });

  it("renders dashboard heading and welcome message", async () => {
    const el = await AdminDashboard();
    render(el);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Welcome back, Vannette")).toBeInTheDocument();
  });

  it("renders all four stat cards with correct labels", async () => {
    mockPrisma.patient.count.mockResolvedValue(12);
    mockPrisma.booking.count.mockResolvedValue(3);
    mockPrisma.contactMessage.count.mockResolvedValue(5);
    mockPrisma.blockedTime.count.mockResolvedValue(2);

    const el = await AdminDashboard();
    render(el);

    expect(screen.getByText("Patients")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();

    expect(screen.getByText("Pending Bookings")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    expect(screen.getByText("Unread Messages")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(screen.getByText("Today Blocked")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("stat cards link to correct pages", async () => {
    const el = await AdminDashboard();
    render(el);

    const patientsLink = screen.getByText("Patients").closest("a");
    expect(patientsLink).toHaveAttribute("href", "/admin/patients");

    const messagesLink = screen.getByText("Unread Messages").closest("a");
    expect(messagesLink).toHaveAttribute("href", "/admin/messages");
  });

  it("shows 'No bookings yet' when there are no bookings", async () => {
    const el = await AdminDashboard();
    render(el);
    expect(screen.getByText("No bookings yet")).toBeInTheDocument();
  });

  it("renders recent bookings with patient name, date and status", async () => {
    mockPrisma.booking.findMany.mockResolvedValue([
      {
        id: "b1",
        date: "2026-03-10",
        time: "10:00 AM",
        status: "pending",
        patient: { firstName: "Alice", lastName: "Brown" },
      },
      {
        id: "b2",
        date: "2026-03-11",
        time: "2:00 PM",
        status: "confirmed",
        patient: { firstName: "Bob", lastName: "Green" },
      },
    ]);

    const el = await AdminDashboard();
    render(el);

    expect(screen.getByText("Alice Brown")).toBeInTheDocument();
    expect(screen.getByText("2026-03-10 at 10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();

    expect(screen.getByText("Bob Green")).toBeInTheDocument();
    expect(screen.getByText("confirmed")).toBeInTheDocument();
  });

  it("has a 'View all' link to calendar", async () => {
    const el = await AdminDashboard();
    render(el);
    const viewAllLink = screen.getByText("View all →");
    expect(viewAllLink.closest("a")).toHaveAttribute("href", "/admin/calendar");
  });

  it("renders Recent Bookings section heading", async () => {
    const el = await AdminDashboard();
    render(el);
    expect(screen.getByText("Recent Bookings")).toBeInTheDocument();
  });

  it("queries only pending bookings for the stat card count", async () => {
    const el = await AdminDashboard();
    render(el);
    expect(mockPrisma.booking.count).toHaveBeenCalledWith({
      where: { status: "pending" },
    });
  });

  it("queries only unread messages for the stat card count", async () => {
    const el = await AdminDashboard();
    render(el);
    expect(mockPrisma.contactMessage.count).toHaveBeenCalledWith({
      where: { read: false },
    });
  });
});
