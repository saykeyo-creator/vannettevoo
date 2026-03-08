import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/link
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

// Mock next/navigation
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import Header from "@/components/Header";
import { cleanup } from "@testing-library/react";

import { afterEach } from "vitest";

afterEach(() => {
  mockPathname = "/";
  cleanup();
});

describe("Header", () => {
  it("renders the site name", () => {
    render(<Header />);
    expect(screen.getByText("Vannette Vu")).toBeInTheDocument();
    expect(screen.getByText("Functional Neurology")).toBeInTheDocument();
  });

  it("renders all navigation links on desktop", () => {
    render(<Header />);
    const navLinks = screen.getAllByRole("link");
    // Logo link + 7 nav links (desktop) + 7 nav links (mobile hidden initially)
    // Actually mobile nav is conditionally rendered, so just desktop links
    const desktopNav = navLinks.filter(
      (link) => !link.closest("nav.md\\:hidden")
    );
    expect(desktopNav.length).toBeGreaterThanOrEqual(7);
  });

  it("renders the menu toggle button", () => {
    render(<Header />);
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });

  it("highlights the active navigation link", () => {
    render(<Header />);
    const homeLinks = screen.getAllByText("Home");
    const activeLink = homeLinks.find((link) =>
      link.className.includes("text-teal-700")
    );
    expect(activeLink).toBeTruthy();
  });

  it("locks body scroll when mobile menu is open", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<Header />);
    const menuButton = screen.getByLabelText("Open menu");
    fireEvent.click(menuButton);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body scroll when mobile menu is closed", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<Header />);
    const menuButton = screen.getByLabelText("Open menu");
    fireEvent.click(menuButton);
    expect(document.body.style.overflow).toBe("hidden");
    const closeButton = screen.getByLabelText("Close menu");
    fireEvent.click(closeButton);
    expect(document.body.style.overflow).toBe("");
  });

  it("mobile menu has max-height and overflow-y-auto", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<Header />);
    const menuButton = screen.getByLabelText("Open menu");
    fireEvent.click(menuButton);
    const mobileNav = screen.getByLabelText("Close menu")
      .closest("header")!
      .querySelector("nav:last-child");
    expect(mobileNav).toBeTruthy();
    expect(mobileNav!.className).toContain("overflow-y-auto");
    expect(mobileNav!.className).toContain("max-h-");
  });

  it("closes mobile menu when pathname changes (browser back/forward)", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const { rerender } = render(<Header />);
    // Open the menu
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
    // Simulate route change via browser navigation
    mockPathname = "/about";
    rerender(<Header />);
    // Menu should be closed — hamburger button should show "Open menu" again
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });

  it("highlights parent nav item for sub-routes", () => {
    mockPathname = "/conditions/concussion";
    render(<Header />);
    const conditionsLinks = screen.getAllByText("Conditions");
    const activeLink = conditionsLinks.find((link) =>
      link.className.includes("text-teal-700")
    );
    expect(activeLink).toBeTruthy();
  });
});
