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

  it("renders stat cards with active patient count and total", async () => {
    // First call = active count, second call = total count
    mockPrisma.patient.count
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(12);
    mockPrisma.booking.count.mockResolvedValue(3);
    mockPrisma.contactMessage.count.mockResolvedValue(5);
    mockPrisma.blockedTime.count.mockResolvedValue(2);

    const el = await AdminDashboard();
    render(el);

    expect(screen.getByText("Active Patients")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("12 total")).toBeInTheDocument();

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

    const patientsLink = screen.getByText("Active Patients").closest("a");
    expect(patientsLink).toHaveAttribute("href", "/admin/patients");

    const messagesLink = screen.getByText("Unread Messages").closest("a");
    expect(messagesLink).toHaveAttribute("href", "/admin/messages");
  });

  it("shows empty states when no bookings exist", async () => {
    const el = await AdminDashboard();
    render(el);
    expect(screen.getByText("No appointments scheduled for today")).toBeInTheDocument();
    expect(screen.getByText("No bookings yet")).toBeInTheDocument();
  });

  it("renders today's schedule with patient name, time, and status", async () => {
    const todayBooking = {
      id: "tb1",
      date: "2026-03-09",
      time: "9:00 AM",
      status: "confirmed",
      patientId: "p1",
      patient: { firstName: "Carol", lastName: "White" , email: "carol@test.com" },
    };
    // First findMany call = todayBookings, second = recentBookings
    mockPrisma.booking.findMany
      .mockResolvedValueOnce([todayBooking])
      .mockResolvedValueOnce([]);

    const el = await AdminDashboard();
    render(el);

    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    expect(screen.getByText("Carol White")).toBeInTheDocument();
    expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    expect(screen.getByText("carol@test.com")).toBeInTheDocument();
  });

  it("today's schedule entries link to patient detail page", async () => {
    const todayBooking = {
      id: "tb1",
      date: "2026-03-09",
      time: "10:00 AM",
      status: "pending",
      patientId: "p42",
      patient: { firstName: "Dan", lastName: "Blue", email: "dan@test.com" },
    };
    mockPrisma.booking.findMany
      .mockResolvedValueOnce([todayBooking])
      .mockResolvedValueOnce([]);

    const el = await AdminDashboard();
    render(el);

    const link = screen.getByText("Dan Blue").closest("a");
    expect(link).toHaveAttribute("href", "/admin/patients/p42");
  });

  it("renders recent bookings with patient name, date and status", async () => {
    mockPrisma.booking.findMany
      .mockResolvedValueOnce([]) // today
      .mockResolvedValueOnce([
        {
          id: "b1",
          date: "2026-03-10",
          time: "10:00 AM",
          status: "pending",
          patientId: "p1",
          patient: { firstName: "Alice", lastName: "Brown" },
        },
        {
          id: "b2",
          date: "2026-03-11",
          time: "2:00 PM",
          status: "confirmed",
          patientId: "p2",
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

  it("recent bookings link to patient detail pages", async () => {
    mockPrisma.booking.findMany
      .mockResolvedValueOnce([]) // today
      .mockResolvedValueOnce([
        {
          id: "b1",
          date: "2026-03-10",
          time: "10:00 AM",
          status: "pending",
          patientId: "p99",
          patient: { firstName: "Eve", lastName: "Red" },
        },
      ]);

    const el = await AdminDashboard();
    render(el);

    const link = screen.getByText("Eve Red").closest("a");
    expect(link).toHaveAttribute("href", "/admin/patients/p99");
  });

  it("has a 'View all' link to calendar", async () => {
    const el = await AdminDashboard();
    render(el);
    const viewAllLink = screen.getByText("View all →");
    expect(viewAllLink.closest("a")).toHaveAttribute("href", "/admin/calendar");
  });

  it("renders section headings", async () => {
    const el = await AdminDashboard();
    render(el);
    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    expect(screen.getByText("Recent Bookings")).toBeInTheDocument();
  });

  it("queries only pending bookings for the stat card count", async () => {
    const el = await AdminDashboard();
    render(el);
    expect(mockPrisma.booking.count).toHaveBeenCalledWith({
      where: { status: "pending" },
    });
  });

  it("queries active patients separately from total", async () => {
    const el = await AdminDashboard();
    render(el);
    expect(mockPrisma.patient.count).toHaveBeenCalledWith({
      where: { status: "active" },
    });
    // Also called without filter for total
    expect(mockPrisma.patient.count).toHaveBeenCalledWith();
  });

  it("queries only unread messages for the stat card count", async () => {
    const el = await AdminDashboard();
    render(el);
    expect(mockPrisma.contactMessage.count).toHaveBeenCalledWith({
      where: { read: false },
    });
  });
});
