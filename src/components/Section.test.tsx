import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Section, { SectionHeading, SectionSubtext } from "@/components/Section";

describe("Section", () => {
  it("renders children", () => {
    render(<Section>Test Content</Section>);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <Section className="bg-slate-50">Content</Section>
    );
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-slate-50");
  });

  it("passes id prop", () => {
    const { container } = render(<Section id="test-section">Content</Section>);
    expect(container.querySelector("#test-section")).toBeInTheDocument();
  });
});

describe("SectionHeading", () => {
  it("renders as h2 with text", () => {
    render(<SectionHeading>My Heading</SectionHeading>);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("My Heading");
  });
});

describe("SectionSubtext", () => {
  it("renders text", () => {
    render(<SectionSubtext>Some subtext content</SectionSubtext>);
    expect(screen.getByText("Some subtext content")).toBeInTheDocument();
  });
});
