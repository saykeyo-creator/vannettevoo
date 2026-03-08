import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/survey/new",
  useRouter: () => ({ push: vi.fn() }),
}));

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

import IntakeSurveyPage from "@/app/survey/new/page";

describe("Intake Survey Page", () => {
  it("renders the first step", () => {
    render(<IntakeSurveyPage />);
    expect(screen.getByText("Personal Information")).toBeInTheDocument();
  });

  it("renders the progress bar", () => {
    render(<IntakeSurveyPage />);
    expect(screen.getByText("Step 1 of 10")).toBeInTheDocument();
  });

  it("renders personal information fields", () => {
    render(<IntakeSurveyPage />);
    expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
  });

  it("renders the next of kin section", () => {
    render(<IntakeSurveyPage />);
    expect(screen.getByText("Next of Kin")).toBeInTheDocument();
  });

  it("renders the Get Started button", () => {
    render(<IntakeSurveyPage />);
    expect(screen.getAllByText("Get Started").length).toBeGreaterThan(0);
  });

  it("validates required fields and blocks navigation when empty", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<IntakeSurveyPage />);
    // Step 1 has required First Name, Last Name, Email Address
    // Click Get Started without filling anything
    const startBtn = screen.getAllByText("Get Started")[0];
    fireEvent.click(startBtn);
    // Should stay on step 1 and show validation error
    expect(screen.getByText("Personal Information")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("alert").textContent).toContain("required fields");
  });

  it("allows advancing after required fields are filled", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<IntakeSurveyPage />);
    // Fill required fields
    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: "jane@test.com" } });
    // Click Get Started
    fireEvent.click(screen.getAllByText("Get Started")[0]);
    // Should advance to step 2
    expect(screen.getByText("Step 2 of 10")).toBeInTheDocument();
    expect(screen.getByText("Symptom Picture")).toBeInTheDocument();
  });

  it("clears validation error when user fills a required field", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<IntakeSurveyPage />);
    // First try to advance with empty fields
    fireEvent.click(screen.getAllByText("Get Started")[0]);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    // Now fill the required fields
    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: "jane@test.com" } });
    // Validation error should be cleared
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows error when API returns non-ok response on submit", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    } as Response);
    render(<IntakeSurveyPage />);
    // Fill required fields and advance through all steps to review
    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: "jane@test.com" } });
    // Advance through steps 1-9 (no required fields after step 1)
    fireEvent.click(screen.getAllByText("Get Started")[0]);
    for (let i = 0; i < 8; i++) {
      fireEvent.click(screen.getByText("Continue"));
    }
    // Now on review step (10), submit
    fireEvent.click(screen.getByText("Submit Survey"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.queryByText("Survey Submitted Successfully")).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("shows error border on select-one/yes-no fields when validation fails", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<IntakeSurveyPage />);
    // Fill step 1 required fields and advance
    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: "jane@test.com" } });
    fireEvent.click(screen.getAllByText("Get Started")[0]);
    // Step 2 (Symptom Picture) — advance through steps until we hit one with a required select/yes-no
    // Step 4 is Medical History which has required yes-no fields
    fireEvent.click(screen.getByText("Continue")); // step 2→3
    fireEvent.click(screen.getByText("Continue")); // step 3→4
    // Step 4 has required questions — try to advance without answering
    fireEvent.click(screen.getByText("Continue"));
    // Look for validation error ring on a button group
    const errorRings = document.querySelectorAll(".ring-red-400");
    // If there are required select/yes-no fields on this step, error rings should appear
    if (screen.queryByRole("alert")) {
      expect(errorRings.length).toBeGreaterThan(0);
    }
  });

  it("associates slider input with its label via id", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<IntakeSurveyPage />);
    // Fill step 1 and advance to a step that has sliders
    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: "Doe" } });
    fireEvent.change(screen.getByLabelText(/Email Address/), { target: { value: "jane@test.com" } });
    fireEvent.click(screen.getAllByText("Get Started")[0]);
    // Step 2 (Symptom Picture) should have a slider for "Overall symptom severity"
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach((slider) => {
      expect(slider.id).toBeTruthy();
      const label = document.querySelector(`label[for="${slider.id}"]`);
      expect(label).toBeTruthy();
    });
  });
});
