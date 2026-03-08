import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/survey/progress",
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

import ProgressSurveyPage from "@/app/survey/progress/page";

describe("Progress Survey Page", () => {
  it("renders the heading", () => {
    render(<ProgressSurveyPage />);
    expect(screen.getByText("Progress Check-In")).toBeInTheDocument();
  });

  it("renders identity fields", () => {
    render(<ProgressSurveyPage />);
    expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
    // Email label also exists as symptom label, so use getAllByLabelText
    expect(screen.getAllByLabelText(/Email/).length).toBeGreaterThan(0);
  });

  it("renders symptom rating areas", () => {
    render(<ProgressSurveyPage />);
    expect(screen.getAllByText("Current Symptom Levels").length).toBeGreaterThan(0);
    expect(screen.getByText("Dizziness/Vertigo")).toBeInTheDocument();
    expect(screen.getByText("Brain Fog")).toBeInTheDocument();
    expect(screen.getByText("Fatigue")).toBeInTheDocument();
  });

  it("renders N/A buttons for each symptom area", () => {
    render(<ProgressSurveyPage />);
    const naButtons = screen.getAllByText("N/A");
    expect(naButtons.length).toBe(14);
  });

  it("renders additional feedback section", () => {
    render(<ProgressSurveyPage />);
    expect(screen.getByText("Additional Feedback")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<ProgressSurveyPage />);
    expect(screen.getByText("Submit Progress Survey")).toBeInTheDocument();
  });

  it("renders scale labels on sliders", () => {
    render(<ProgressSurveyPage />);
    const noneLabels = screen.getAllByText("0 \u2014 None");
    const severeLabels = screen.getAllByText("10 \u2014 Severe");
    expect(noneLabels.length).toBeGreaterThan(0);
    expect(severeLabels.length).toBeGreaterThan(0);
  });

  it("N/A buttons have adequate touch target size", () => {
    render(<ProgressSurveyPage />);
    const naButtons = screen.getAllByText("N/A");
    naButtons.forEach((btn) => {
      expect(btn.className).toContain("min-h-[36px]");
      expect(btn.className).toContain("px-3");
    });
  });

  it("shows error when API returns non-ok response on submit", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    } as Response);
    render(<ProgressSurveyPage />);
    // Fill required fields
    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: "Doe" } });
    const emailInputs = screen.getAllByLabelText(/Email/);
    fireEvent.change(emailInputs[0], { target: { value: "jane@test.com" } });
    // Submit
    fireEvent.click(screen.getByText("Submit Progress Survey"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert").textContent).toContain("Something went wrong");
    });
    expect(screen.queryByText("Progress Survey Submitted")).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("associates slider labels with range inputs via htmlFor/id", () => {
    render(<ProgressSurveyPage />);
    const sliders = document.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBeGreaterThan(0);
    sliders.forEach((slider) => {
      expect(slider.id).toBeTruthy();
      const label = document.querySelector(`label[for="${slider.id}"]`);
      expect(label).toBeTruthy();
    });
  });
});
