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

import ServicesPage from "@/app/services/page";

describe("Services Page", () => {
  it("renders the heading", () => {
    render(<ServicesPage />);
    expect(screen.getByText("Therapies & Modalities")).toBeInTheDocument();
  });

  it("renders all therapies", () => {
    render(<ServicesPage />);
    expect(screen.getByText("Oculomotor Rehabilitation")).toBeInTheDocument();
    expect(screen.getByText("Vestibular Rehabilitation")).toBeInTheDocument();
    expect(screen.getByText("Cognitive Rehabilitation")).toBeInTheDocument();
    expect(screen.getByText("Autonomic Nervous System Training")).toBeInTheDocument();
    expect(screen.getByText("Breathing & Vagus Nerve Therapy")).toBeInTheDocument();
    expect(screen.getByText("Sensory-Motor Integration")).toBeInTheDocument();
    expect(screen.getByText("Primitive Reflex Integration")).toBeInTheDocument();
  });

  it("renders the first visit section", () => {
    render(<ServicesPage />);
    expect(
      screen.getByText("What to Expect at Your First Visit")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/comprehensive 60–90 minute consultation/)
    ).toBeInTheDocument();
  });

  it("renders the pricing section heading", () => {
    render(<ServicesPage />);
    expect(screen.getByText("Investment in Your Health")).toBeInTheDocument();
  });

  it("renders all pricing items with price and duration", () => {
    render(<ServicesPage />);
    expect(screen.getByText("Initial Consultation")).toBeInTheDocument();
    expect(screen.getByText("$250")).toBeInTheDocument();
    expect(screen.getByText("60–90 minutes")).toBeInTheDocument();

    expect(screen.getByText("Follow-up Session")).toBeInTheDocument();
    expect(screen.getByText("$150")).toBeInTheDocument();

    expect(screen.getByText("Extended Follow-up")).toBeInTheDocument();
    expect(screen.getByText("$200")).toBeInTheDocument();
  });

  it("renders the health fund rebates note", () => {
    render(<ServicesPage />);
    expect(screen.getByText(/Private health fund rebates/)).toBeInTheDocument();
  });
});
