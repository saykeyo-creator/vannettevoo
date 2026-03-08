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

import ButtonLink from "@/components/ButtonLink";

describe("ButtonLink", () => {
  it("renders children text", () => {
    render(<ButtonLink href="/test">Click Me</ButtonLink>);
    expect(screen.getByText("Click Me")).toBeInTheDocument();
  });

  it("renders as a link with correct href", () => {
    render(<ButtonLink href="/about">About</ButtonLink>);
    const link = screen.getByRole("link", { name: "About" });
    expect(link).toHaveAttribute("href", "/about");
  });

  it("applies primary variant styles by default", () => {
    render(<ButtonLink href="/test">Primary</ButtonLink>);
    const link = screen.getByRole("link", { name: "Primary" });
    expect(link.className).toContain("bg-teal-600");
  });

  it("applies outline variant styles", () => {
    render(
      <ButtonLink href="/test" variant="outline">
        Outline
      </ButtonLink>
    );
    const link = screen.getByRole("link", { name: "Outline" });
    expect(link.className).toContain("border-teal-600");
  });

  it("applies secondary variant styles", () => {
    render(
      <ButtonLink href="/test" variant="secondary">
        Secondary
      </ButtonLink>
    );
    const link = screen.getByRole("link", { name: "Secondary" });
    expect(link.className).toContain("bg-slate-100");
  });

  it("merges custom className", () => {
    render(
      <ButtonLink href="/test" className="my-custom">
        Custom
      </ButtonLink>
    );
    const link = screen.getByRole("link", { name: "Custom" });
    expect(link.className).toContain("my-custom");
  });
});
