import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

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

import Footer from "@/components/Footer";

describe("Footer", () => {
  it("renders the brand name", () => {
    render(<Footer />);
    expect(screen.getByText("Vannette Vu")).toBeInTheDocument();
  });

  it("renders the email link", () => {
    render(<Footer />);
    const emailLink = screen.getByText("hello@vannettevu.com");
    expect(emailLink).toBeInTheDocument();
    expect(emailLink.closest("a")).toHaveAttribute(
      "href",
      "mailto:hello@vannettevu.com"
    );
  });

  it("renders clinic hours", () => {
    render(<Footer />);
    expect(screen.getByText(/9:00 AM – 5:00 PM/)).toBeInTheDocument();
  });

  it("renders quick links", () => {
    render(<Footer />);
    expect(screen.getByText("Quick Links")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("renders copyright with current year", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it("email link has break-all to prevent overflow on mobile", () => {
    render(<Footer />);
    const emailLink = screen.getByText("hello@vannettevu.com").closest("a")!;
    expect(emailLink.className).toContain("break-all");
  });

  it("includes Progress Survey in quick links", () => {
    render(<Footer />);
    const link = screen.getByText("Progress Survey");
    expect(link.closest("a")).toHaveAttribute("href", "/survey/progress");
  });
});
