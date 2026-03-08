import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import MessagesPage from "@/app/admin/messages/page";

describe("Messages Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<MessagesPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("handles fetch error gracefully without crashing", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    });
    render(<MessagesPage />);
    // Should show empty state rather than crash
    expect(await screen.findByText("No messages yet")).toBeInTheDocument();
  });

  it("renders empty state when no messages", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<MessagesPage />);
    expect(await screen.findByText("No messages yet")).toBeInTheDocument();
  });

  it("renders messages list", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "1",
            name: "Alice",
            email: "alice@test.com",
            phone: null,
            subject: "Question",
            message: "Hello doctor",
            read: false,
            createdAt: "2025-01-15T10:00:00Z",
          },
        ]),
    });
    render(<MessagesPage />);
    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("1 total · 1 unread")).toBeInTheDocument();
  });

  it("shows unread count correctly", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: "1", name: "A", email: "a@t.com", phone: null, subject: null, message: "M1", read: true, createdAt: "2025-01-15T10:00:00Z" },
          { id: "2", name: "B", email: "b@t.com", phone: null, subject: null, message: "M2", read: false, createdAt: "2025-01-16T10:00:00Z" },
        ]),
    });
    render(<MessagesPage />);
    expect(await screen.findByText("2 total · 1 unread")).toBeInTheDocument();
  });

  it("expands a message to show full details when clicked", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "1",
            name: "Alice",
            email: "alice@test.com",
            phone: "0400111222",
            subject: "Inquiry",
            message: "I would like to book an appointment",
            read: false,
            createdAt: "2025-06-15T10:30:00Z",
          },
        ]),
    });
    render(<MessagesPage />);
    await screen.findByText("Alice");

    // Click on the message to expand
    await user.click(screen.getByText("Alice"));

    // Should now show full details
    expect(screen.getByText("Email: alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("Phone: 0400111222")).toBeInTheDocument();
    // Message appears in both preview and expanded view
    expect(screen.getAllByText("I would like to book an appointment")).toHaveLength(2);
    expect(screen.getByText("Mark as read")).toBeInTheDocument();
  });

  it("toggles read/unread when mark button is clicked", async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "msg1",
              name: "Bob",
              email: "bob@test.com",
              phone: null,
              subject: null,
              message: "Test message",
              read: false,
              createdAt: "2025-06-15T10:30:00Z",
            },
          ]),
      })
      .mockResolvedValue({ ok: true }); // PATCH response

    render(<MessagesPage />);
    await screen.findByText("Bob");

    // Expand the message
    await user.click(screen.getByText("Bob"));
    // Click mark as read
    await user.click(screen.getByText("Mark as read"));

    // Verify PATCH was called correctly
    const patchCalls = mockFetch.mock.calls.filter(
      (c) => c[1]?.method === "PATCH"
    );
    expect(patchCalls.length).toBe(1);
    const body = JSON.parse(patchCalls[0][1].body);
    expect(body.id).toBe("msg1");
    expect(body.read).toBe(true);
  });

  it("shows subject line in the message preview", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "1",
            name: "Carol",
            email: "carol@test.com",
            phone: null,
            subject: "Vertigo question",
            message: "Do you treat vertigo?",
            read: true,
            createdAt: "2025-01-15T10:00:00Z",
          },
        ]),
    });
    render(<MessagesPage />);
    expect(await screen.findByText("Vertigo question")).toBeInTheDocument();
  });
});
