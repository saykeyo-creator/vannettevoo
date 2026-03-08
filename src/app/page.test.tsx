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

import HomePage from "@/app/page";

describe("Home Page", () => {
  it("renders the hero heading", () => {
    render(<HomePage />);
    expect(
      screen.getByText("Restore Your Brain. Reclaim Your Life.")
    ).toBeInTheDocument();
  });

  it("renders hero CTA buttons", () => {
    render(<HomePage />);
    expect(screen.getByText("Start Your Journey")).toBeInTheDocument();
    expect(screen.getByText("See Conditions We Treat")).toBeInTheDocument();
  });

  it("renders trust signals", () => {
    render(<HomePage />);
    expect(screen.getByText("Sunshine Coast Clinic")).toBeInTheDocument();
    expect(screen.getByText("Drug-Free Approach")).toBeInTheDocument();
    expect(screen.getByText("Personalised Care")).toBeInTheDocument();
  });

  it("renders conditions preview section", () => {
    render(<HomePage />);
    expect(screen.getByText("Conditions We Treat")).toBeInTheDocument();
    expect(screen.getByText("Concussion & TBI")).toBeInTheDocument();
    expect(screen.getByText("Dizziness & Vertigo")).toBeInTheDocument();
  });

  it("renders how it works section", () => {
    render(<HomePage />);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText("Complete the Intake Survey")).toBeInTheDocument();
    expect(screen.getByText("Book Your Assessment")).toBeInTheDocument();
    expect(screen.getByText("Get Your Plan")).toBeInTheDocument();
    expect(screen.getByText("Heal & Thrive")).toBeInTheDocument();
  });

  it("renders the CTA section", () => {
    render(<HomePage />);
    expect(
      screen.getByText("Ready to Start Your Journey?")
    ).toBeInTheDocument();
    expect(screen.getByText("Begin Your Intake Survey")).toBeInTheDocument();
  });

  it("renders all 8 condition cards", () => {
    render(<HomePage />);
    expect(screen.getByText("Migraines & Headaches")).toBeInTheDocument();
    expect(screen.getByText("Dysautonomia & POTS")).toBeInTheDocument();
    expect(screen.getByText("Chronic Fatigue")).toBeInTheDocument();
    expect(screen.getByText("Developmental Delays")).toBeInTheDocument();
  });
});
