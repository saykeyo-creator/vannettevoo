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

import AboutPage from "@/app/about/page";

describe("About Page", () => {
  it("renders the heading", () => {
    render(<AboutPage />);
    expect(screen.getByText("Meet Dr Vannette Voo")).toBeInTheDocument();
  });

  it("renders bio paragraphs", () => {
    render(<AboutPage />);
    expect(
      screen.getByText(/functional neurologist based on the Sunshine Coast/)
    ).toBeInTheDocument();
  });

  it("renders guiding principles", () => {
    render(<AboutPage />);
    expect(screen.getByText("Guiding Principles")).toBeInTheDocument();
    expect(screen.getByText("Brain-Based Approach")).toBeInTheDocument();
    expect(screen.getByText("Compassionate Care")).toBeInTheDocument();
    expect(screen.getByText("Drug-Free Solutions")).toBeInTheDocument();
  });

  it("renders qualifications", () => {
    render(<AboutPage />);
    expect(screen.getByText("Qualifications & Training")).toBeInTheDocument();
    expect(screen.getByText("Doctor of Chiropractic")).toBeInTheDocument();
    expect(
      screen.getByText("Vestibular Rehabilitation")
    ).toBeInTheDocument();
  });
});
