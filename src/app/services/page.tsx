import type { Metadata } from "next";
import { content } from "@/lib/content";
import Section, { SectionHeading, SectionSubtext } from "@/components/Section";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  const { heading, introText, therapies, firstVisit, pricing } = content.pages.services;

  return (
    <>
      <Section>
        <SectionHeading>{heading}</SectionHeading>
        <SectionSubtext>{introText}</SectionSubtext>
        <div className="mt-8 space-y-5">
          {therapies.map((t) => (
            <div
              key={t.title}
              className="rounded-xl border border-slate-100 p-4"
            >
              <h3 className="font-semibold text-slate-900 text-sm">{t.title}</h3>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                {t.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-slate-50">
        <SectionHeading>{firstVisit.heading}</SectionHeading>
        <div className="mt-6 space-y-4">
          {firstVisit.paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-slate-600 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading>{pricing.heading}</SectionHeading>
        <SectionSubtext>{pricing.introText}</SectionSubtext>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pricing.items.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border border-slate-200 p-5 flex flex-col"
            >
              <h3 className="font-semibold text-slate-900 text-sm">{item.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{item.duration}</p>
              <p className="text-2xl font-bold text-teal-600 mt-3">{item.price}</p>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed flex-1">
                {item.description}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-400 text-center">{pricing.note}</p>
      </Section>
    </>
  );
}
