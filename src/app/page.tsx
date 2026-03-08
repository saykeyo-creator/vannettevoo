import { content } from "@/lib/content";
import Section, { SectionHeading, SectionSubtext } from "@/components/Section";
import ButtonLink from "@/components/ButtonLink";

export default function HomePage() {
  const { hero, conditionsPreview, howItWorks, cta } = content.pages.home;

  return (
    <>
      {/* Hero */}
      <section className="px-4 pt-12 pb-14 md:pt-20 md:pb-20 bg-gradient-to-b from-teal-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            {hero.heading}
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto">
            {hero.subtext}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {hero.buttons.map((btn) => (
              <ButtonLink
                key={btn.href}
                href={btn.href}
                variant={btn.href === "/new-patient" ? "primary" : "outline"}
                className="w-full sm:w-auto"
              >
                {btn.label}
              </ButtonLink>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {hero.trustSignals.map((signal) => (
              <span
                key={signal}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                {signal}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Conditions preview */}
      <Section>
        <SectionHeading>{conditionsPreview.heading}</SectionHeading>
        <SectionSubtext>{conditionsPreview.subtext}</SectionSubtext>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {conditionsPreview.conditions.map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-slate-100 p-4 hover:border-teal-200 hover:shadow-sm transition-all"
            >
              <h3 className="font-semibold text-slate-900 text-sm">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                {c.description}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <ButtonLink href={conditionsPreview.buttonHref} variant="outline">
            {conditionsPreview.buttonLabel}
          </ButtonLink>
        </div>
      </Section>

      {/* How it works */}
      <Section className="bg-slate-50">
        <SectionHeading>{howItWorks.heading}</SectionHeading>
        <div className="mt-8 space-y-6">
          {howItWorks.steps.map((step) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
                {step.number}
              </div>
              <div className="pt-1">
                <h3 className="font-semibold text-slate-900 text-sm">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="px-4 py-14 bg-teal-700 text-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold">{cta.heading}</h2>
          <p className="mt-3 text-sm text-teal-100 leading-relaxed">{cta.body}</p>
          <div className="mt-6">
            <ButtonLink
              href={cta.buttonHref}
              className="!bg-white !text-teal-700 hover:!bg-teal-50"
            >
              {cta.buttonLabel}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
