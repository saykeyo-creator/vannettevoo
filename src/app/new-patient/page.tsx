import type { Metadata } from "next";
import { content } from "@/lib/content";
import Section, { SectionHeading, SectionSubtext } from "@/components/Section";
import ButtonLink from "@/components/ButtonLink";

export const metadata: Metadata = { title: "New Patients" };

export default function NewPatientPage() {
  const { heading, subtext, steps, returningPatients } = content.pages.newPatient;

  return (
    <>
      <Section>
        <SectionHeading>{heading}</SectionHeading>
        <SectionSubtext>{subtext}</SectionSubtext>

        <div className="mt-8 space-y-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-slate-100 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                  {step.number}
                </span>
                <h3 className="font-semibold text-slate-900 text-sm">
                  {step.title}
                </h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                {step.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">{step.time}</span>
                {step.buttonLabel && step.buttonHref && (
                  <ButtonLink href={step.buttonHref} className="!text-xs !px-4 !py-2">
                    {step.buttonLabel}
                  </ButtonLink>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-slate-50">
        <SectionHeading>{returningPatients.heading}</SectionHeading>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
          {returningPatients.text}
        </p>
        <div className="mt-4">
          <ButtonLink href={returningPatients.buttonHref} variant="outline">
            {returningPatients.buttonLabel}
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
