import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock signOut
const mockSignOut = vi.fn();
vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Track pathname
let mockPathname = "/admin";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import AdminLayout from "@/app/admin/layout";

describe("Admin Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/admin";
  });

  it("renders sidebar with all navigation links", () => {
    render(<AdminLayout><div>Content</div></AdminLayout>);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Patients")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
  });

  it("renders the Vannette Vu branding", () => {
    render(<AdminLayout><div>Content</div></AdminLayout>);
    expect(screen.getByText("Vannette Vu")).toBeInTheDocument();
    expect(screen.getByText("Admin Portal")).toBeInTheDocument();
  });

  it("renders View Site link", () => {
    render(<AdminLayout><div>Content</div></AdminLayout>);
    const viewSite = screen.getByText("← View Site");
    expect(viewSite).toBeInTheDocument();
    expect(viewSite.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders Sign Out button", () => {
    render(<AdminLayout><div>Content</div></AdminLayout>);
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("calls signOut when Sign Out is clicked", async () => {
    const user = userEvent.setup();
    render(<AdminLayout><div>Content</div></AdminLayout>);
    await user.click(screen.getByText("Sign Out"));
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/admin/login" });
  });

  it("renders children in the main content area", () => {
    render(<AdminLayout><div data-testid="child">Child Content</div></AdminLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("renders just children when on login page (no sidebar)", () => {
    mockPathname = "/admin/login";
    render(<AdminLayout><div>Login Form</div></AdminLayout>);
    expect(screen.getByText("Login Form")).toBeInTheDocument();
    // Sidebar nav should NOT be present
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
  });

  it("has a mobile sidebar toggle button", () => {
    mockPathname = "/admin";
    render(<AdminLayout><div>Content</div></AdminLayout>);
    const toggleBtn = screen.getByLabelText("Open sidebar");
    expect(toggleBtn).toBeInTheDocument();
  });

  it("toggles mobile sidebar when hamburger is clicked", async () => {
    const user = userEvent.setup();
    render(<AdminLayout><div>Content</div></AdminLayout>);

    // Initially sidebar shows "Open sidebar"
    const openBtn = screen.getByLabelText("Open sidebar");
    await user.click(openBtn);

    // After click, should now show "Close sidebar"
    expect(screen.getByLabelText("Close sidebar")).toBeInTheDocument();
  });
});
