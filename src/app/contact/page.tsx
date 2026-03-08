"use client";

import { useState } from "react";
import { content } from "@/lib/content";
import Section, { SectionHeading, SectionSubtext } from "@/components/Section";

export default function ContactPage() {
  const { heading, subtext, contactInfo, formFields, confirmationMessage } =
    content.pages.contact;

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Unable to connect. Please check your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Section>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{confirmationMessage.heading}</h2>
          <p className="mt-2 text-sm text-slate-500">{confirmationMessage.text}</p>
        </div>
      </Section>
    );
  }

  return (
    <>
      <Section>
        <SectionHeading>{heading}</SectionHeading>
        <SectionSubtext>{subtext}</SectionSubtext>

        {/* Contact info cards */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <InfoCard icon="📍" label="Location" value={contactInfo.location} />
          <InfoCard icon="📧" label="Email" value={contactInfo.email} href={`mailto:${contactInfo.email}`} />
          <InfoCard icon="📞" label="Phone" value={contactInfo.phone} href={`tel:${contactInfo.phone.replace(/\s/g, "")}`} />
          <InfoCard
            icon="🕐"
            label="Hours"
            value={`Mon–Fri: ${contactInfo.hours.mondayToFriday}`}
          />
        </div>
      </Section>

      <Section className="bg-slate-50">
        <h3 className="font-bold text-slate-900 text-lg">Send a Message</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {formFields.map((field) => {
            const id = `contact-${field.label.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <div key={field.label}>
                <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={id}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={formData[field.label] ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.label]: e.target.value })
                    }
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                ) : (
                  <input
                    id={id}
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={formData[field.label] ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.label]: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                )}
              </div>
            );
          })}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3" role="alert">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? "Sending…" : "Send Message"}
          </button>
        </form>
      </Section>
    </>
  );
}

function InfoCard({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-slate-100 p-4 bg-white">
      <div className="flex items-start gap-3">
        <span className="text-lg" role="img" aria-label={label}>{icon}</span>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-sm text-slate-700 mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block hover:opacity-80 transition-opacity">
        {inner}
      </a>
    );
  }
  return inner;
}
