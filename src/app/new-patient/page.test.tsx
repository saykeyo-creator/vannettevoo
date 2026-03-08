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

import NewPatientPage from "@/app/new-patient/page";

describe("New Patient Page", () => {
  it("renders the heading", () => {
    render(<NewPatientPage />);
    expect(screen.getByText("Getting Started Is Simple")).toBeInTheDocument();
  });

  it("renders all 3 steps", () => {
    render(<NewPatientPage />);
    expect(screen.getByText("Complete the Intake Survey")).toBeInTheDocument();
    expect(screen.getByText("Book Your Appointment")).toBeInTheDocument();
    expect(screen.getByText("Your First Visit")).toBeInTheDocument();
  });

  it("renders the survey button", () => {
    render(<NewPatientPage />);
    expect(screen.getByText("Start Survey")).toBeInTheDocument();
  });

  it("renders returning patients section", () => {
    render(<NewPatientPage />);
    expect(screen.getByText("Already a Patient?")).toBeInTheDocument();
    expect(screen.getByText("Progress Check-In")).toBeInTheDocument();
  });

  it("has correct link for check-in", () => {
    render(<NewPatientPage />);
    const checkIn = screen.getByText("Progress Check-In").closest("a");
    expect(checkIn).toHaveAttribute("href", "/survey/progress");
  });
});
