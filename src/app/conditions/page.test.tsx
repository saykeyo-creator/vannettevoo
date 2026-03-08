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

import ConditionsPage from "@/app/conditions/page";

describe("Conditions Page", () => {
  it("renders the heading", () => {
    render(<ConditionsPage />);
    expect(screen.getByText("Conditions We Treat")).toBeInTheDocument();
  });

  it("renders all 8 conditions", () => {
    render(<ConditionsPage />);
    expect(screen.getByText("Concussion & TBI")).toBeInTheDocument();
    expect(screen.getByText("Dizziness & Vertigo")).toBeInTheDocument();
    expect(screen.getByText("Migraines & Headaches")).toBeInTheDocument();
    expect(screen.getByText("Dysautonomia & POTS")).toBeInTheDocument();
    expect(screen.getByText("Balance Disorders")).toBeInTheDocument();
    expect(screen.getByText("ADHD & Focus Issues")).toBeInTheDocument();
    expect(screen.getByText("Chronic Fatigue")).toBeInTheDocument();
    expect(screen.getByText("Developmental Delays")).toBeInTheDocument();
  });

  it("renders links to condition detail pages", () => {
    render(<ConditionsPage />);
    const links = screen.getAllByText("Learn more →");
    expect(links).toHaveLength(8);
  });

  it("links to correct condition slugs", () => {
    render(<ConditionsPage />);
    const concussionLink = screen
      .getByText("Concussion & TBI")
      .closest("a");
    expect(concussionLink).toHaveAttribute(
      "href",
      "/conditions/concussion-tbi"
    );
  });
});
