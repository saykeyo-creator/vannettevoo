import type { Metadata } from "next";
import Link from "next/link";
import { content } from "@/lib/content";
import Section, { SectionHeading, SectionSubtext } from "@/components/Section";

export const metadata: Metadata = { title: "Conditions We Treat" };

export default function ConditionsPage() {
  const { heading, subtext, conditionsList } = content.pages.conditions;

  return (
    <Section>
      <SectionHeading>{heading}</SectionHeading>
      <SectionSubtext>{subtext}</SectionSubtext>
      <div className="mt-8 space-y-4">
        {conditionsList.map((c) => (
          <Link
            key={c.slug}
            href={`/conditions/${c.slug}`}
            className="block rounded-xl border border-slate-100 p-4 hover:border-teal-200 hover:shadow-sm transition-all active:bg-slate-50"
          >
            <h3 className="font-semibold text-slate-900 text-sm">{c.title}</h3>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">
              {c.shortDescription}
            </p>
            <span className="mt-2 inline-block text-xs text-teal-600 font-medium">
              Learn more →
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
