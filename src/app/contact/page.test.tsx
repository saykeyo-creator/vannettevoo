import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/contact",
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

import ContactPage from "@/app/contact/page";

describe("Contact Page", () => {
  it("renders the heading", () => {
    render(<ContactPage />);
    expect(screen.getByText("Contact Us")).toBeInTheDocument();
  });

  it("renders contact info cards", () => {
    render(<ContactPage />);
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getAllByText("Email").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Phone").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Hours")).toBeInTheDocument();
  });

  it("renders the email address as a link", () => {
    render(<ContactPage />);
    const emailLink = screen.getByText("hello@vannettevu.com");
    expect(emailLink.closest("a")).toHaveAttribute(
      "href",
      "mailto:hello@vannettevu.com"
    );
  });

  it("renders the contact form", () => {
    render(<ContactPage />);
    expect(screen.getByText("Send a Message")).toBeInTheDocument();
    expect(screen.getByText("Send Message")).toBeInTheDocument();
  });

  it("renders all form fields", () => {
    render(<ContactPage />);
    // Multiple elements have Name/Email text (info cards + form labels)
    expect(screen.getAllByLabelText(/Name/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText(/Email/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the phone number as a tappable tel: link", () => {
    render(<ContactPage />);
    const phoneText = screen.getByText("Contact us for details");
    const phoneLink = phoneText.closest("a");
    expect(phoneLink).toBeTruthy();
    expect(phoneLink!.getAttribute("href")).toMatch(/^tel:/);
  });

  it("shows error when API returns non-ok response", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad request" }),
    } as Response);
    render(<ContactPage />);
    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Test" } });
    const emailInputs = screen.getAllByLabelText(/Email/);
    const formEmail = emailInputs.find((el) => el.tagName === "INPUT" && el.closest("form"));
    fireEvent.change(formEmail!, { target: { value: "t@t.com" } });
    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: "Hello" } });
    fireEvent.submit(formEmail!.closest("form")!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert").textContent).toContain("Something went wrong");
    });
    // Should NOT show success confirmation
    expect(screen.queryByText("Message Sent!")).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
