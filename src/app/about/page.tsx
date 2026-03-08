import type { Metadata } from "next";
import { content } from "@/lib/content";
import Section, { SectionHeading, SectionSubtext } from "@/components/Section";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  const { heading, bio, guidingPrinciples, qualifications } = content.pages.about;

  return (
    <>
      <Section>
        <SectionHeading>{heading}</SectionHeading>
        <div className="mt-6 space-y-4">
          {bio.map((paragraph, i) => (
            <p key={i} className="text-sm text-slate-600 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </Section>

      <Section className="bg-slate-50">
        <SectionHeading>Guiding Principles</SectionHeading>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {guidingPrinciples.map((p) => (
            <div key={p.title}>
              <h3 className="font-semibold text-slate-900 text-sm">{p.title}</h3>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading>Qualifications & Training</SectionHeading>
        <ul className="mt-6 space-y-2">
          {qualifications.map((q) => (
            <li key={q} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
              {q}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
