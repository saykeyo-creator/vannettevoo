import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { content } from "@/lib/content";
import Section, { SectionHeading } from "@/components/Section";
import ButtonLink from "@/components/ButtonLink";

const conditions = content.pages.conditions.conditionsList;

export function generateStaticParams() {
  return conditions.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const condition = conditions.find((c) => c.slug === slug);
    return { title: condition?.title ?? "Condition" };
  });
}

export default async function ConditionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const condition = conditions.find((c) => c.slug === slug);
  if (!condition) notFound();

  return (
    <>
      <Section>
        <ButtonLink href="/conditions" variant="secondary" className="!text-xs !px-3 !py-1.5 mb-6">
          ← All Conditions
        </ButtonLink>
        <SectionHeading>{condition.title}</SectionHeading>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          {condition.fullDescription}
        </p>
      </Section>

      <Section className="bg-slate-50">
        <h3 className="font-bold text-slate-900 text-lg">Common Symptoms</h3>
        <ul className="mt-4 space-y-2">
          {condition.symptoms.map((s) => (
            <li key={s} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <h3 className="font-bold text-slate-900 text-lg">How We Help</h3>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          {condition.howWeHelp}
        </p>
        <div className="mt-8">
          <ButtonLink href="/new-patient">Start Your Journey</ButtonLink>
        </div>
      </Section>
    </>
  );
}
