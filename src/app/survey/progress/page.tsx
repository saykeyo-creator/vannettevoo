"use client";

import { useState } from "react";
import { content } from "@/lib/content";
import Section, { SectionHeading, SectionSubtext } from "@/components/Section";

export default function ProgressSurveyPage() {
  const survey = content.pages.surveyProgress;

  const [identity, setIdentity] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number | null>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "progress", identity, ratings, feedback }),
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
          <h2 className="text-xl font-bold text-slate-900">{survey.confirmationMessage.heading}</h2>
          <p className="mt-2 text-sm text-slate-500">{survey.confirmationMessage.text}</p>
        </div>
      </Section>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Section>
        <SectionHeading>{survey.heading}</SectionHeading>
        <SectionSubtext>{survey.subtext}</SectionSubtext>

        {/* Identity fields */}
        <div className="mt-6 space-y-4">
          {survey.identityFields.map((field) => {
            const id = field.label.replace(/\s+/g, "-").toLowerCase();
            return (
              <div key={field.label}>
                <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  id={id}
                  type={field.type}
                  required={field.required}
                  value={identity[field.label] ?? ""}
                  onChange={(e) =>
                    setIdentity({ ...identity, [field.label]: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            );
          })}
        </div>
      </Section>

      <Section className="bg-slate-50">
        <h3 className="font-bold text-slate-900 text-lg">
          {survey.symptomRating.heading}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {survey.symptomRating.instructions}
        </p>
        <div className="mt-6 space-y-5">
          {survey.symptomRating.areas.map((area) => {
            const val = ratings[area];
            const isNA = val === null;
            const areaId = area.replace(/[\s/]+/g, "-").toLowerCase();
            return (
              <div key={area}>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor={areaId} className="text-sm text-slate-700">{area}</label>
                  <div className="flex items-center gap-2">
                    {!isNA && val !== undefined && (
                      <span className="text-sm font-medium text-teal-700">{val}</span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setRatings({ ...ratings, [area]: isNA ? 0 : null })
                      }
                      className={`text-xs px-3 py-1.5 min-h-[36px] rounded border ${
                        isNA
                          ? "bg-slate-200 text-slate-600 border-slate-300"
                          : "text-slate-400 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      N/A
                    </button>
                  </div>
                </div>
                {!isNA && (
                  <>
                    <input
                      id={areaId}
                      type="range"
                      min={0}
                      max={10}
                      value={typeof val === "number" ? val : 0}
                      onChange={(e) =>
                        setRatings({ ...ratings, [area]: Number(e.target.value) })
                      }
                      className="w-full accent-teal-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>0 — None</span>
                      <span>10 — Severe</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section>
        <h3 className="font-bold text-slate-900 text-lg">
          {survey.additionalFeedback.heading}
        </h3>
        <div className="mt-4 space-y-4">
          {survey.additionalFeedback.questions.map((q) => {
            if (q.type === "select-one") {
              return (
                <div key={q.question}>
                  <label className="block text-sm text-slate-700 mb-2">
                    {q.question}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {q.options?.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setFeedback({ ...feedback, [q.question]: opt })
                        }
                        className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                          feedback[q.question] === opt
                            ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
                            : "border-slate-200 text-slate-600 hover:border-teal-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={q.question}>
                <label className="block text-sm text-slate-700 mb-1">
                  {q.question}
                </label>
                <textarea
                  value={feedback[q.question] ?? ""}
                  onChange={(e) =>
                    setFeedback({ ...feedback, [q.question]: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg p-3" role="alert">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full py-3 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors"
        >
          {submitting ? "Submitting…" : "Submit Progress Survey"}
        </button>
      </Section>
    </form>
  );
}
