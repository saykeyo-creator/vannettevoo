"use client";

import { useState } from "react";
import Link from "next/link";
import { content } from "@/lib/content";
import Section from "@/components/Section";

type SurveyData = Record<string, string | string[] | number>;

export default function IntakeSurveyPage() {
  const survey = content.pages.surveyIntake;
  const totalSteps = survey.steps.length;

  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<SurveyData>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const step = survey.steps[currentStep];
  const isReviewStep = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const setValue = (key: string, value: string | string[] | number) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setValidationErrors((prev) => prev.filter((k) => k !== key));
  };

  const getRequiredFieldKeys = (): string[] => {
    const keys: string[] = [];
    step.fields?.forEach((f) => { if (f.required) keys.push(f.label); });
    step.nextOfKin?.fields.forEach((f) => { if (f.required) keys.push(`NOK: ${f.label}`); });
    step.questions?.forEach((q) => { if (q.required) keys.push(q.question); });
    return keys;
  };

  const validateStep = (): boolean => {
    const missing = getRequiredFieldKeys().filter((key) => {
      const val = data[key];
      if (val === undefined || val === "") return true;
      if (Array.isArray(val) && val.length === 0) return true;
      return false;
    });
    setValidationErrors(missing);
    return missing.length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep(currentStep + 1);
  };

  const toggleMulti = (key: string, option: string) => {
    const current = (data[key] as string[]) ?? [];
    if (option === "None of the above") {
      setValue(key, current.includes(option) ? [] : [option]);
      return;
    }
    const filtered = current.filter((o) => o !== "None of the above");
    if (filtered.includes(option)) {
      setValue(key, filtered.filter((o) => o !== option));
    } else {
      setValue(key, [...filtered, option]);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "intake", data }),
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
    const conf = survey.confirmationMessage;
    return (
      <Section>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{conf.heading}</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">{conf.text}</p>
          <p className="mt-2 text-xs text-slate-400">{conf.emailNote}</p>
          <div className="mt-6">
            <Link
              href={conf.nextAction.href}
              className="inline-block px-5 py-3 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              {conf.nextAction.label}
            </Link>
            <p className="mt-2 text-xs text-slate-400">{conf.nextAction.subtext}</p>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-400">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-xs text-slate-400">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step header */}
      <h2 className="text-xl font-bold text-slate-900">{step.title}</h2>
      <p className="mt-1 text-sm text-slate-500">{step.description}</p>

      {/* Fields / Questions */}
      <div className="mt-6 space-y-5">
        {isReviewStep ? (
          <ReviewStep data={data} steps={survey.steps} onGoTo={setCurrentStep} />
        ) : (
          <>
            {step.fields?.map((field) => (
              <FormField
                key={field.label}
                field={field}
                value={data[field.label]}
                onChange={(v) => setValue(field.label, v)}
                onToggleMulti={(opt) => toggleMulti(field.label, opt)}
                hasError={validationErrors.includes(field.label)}
              />
            ))}
            {step.nextOfKin && (
              <>
                <h3 className="font-semibold text-slate-800 text-sm pt-2">
                  {step.nextOfKin.heading}
                </h3>
                {step.nextOfKin.fields.map((field) => (
                  <FormField
                    key={`nok-${field.label}`}
                    field={field}
                    value={data[`NOK: ${field.label}`]}
                    onChange={(v) => setValue(`NOK: ${field.label}`, v)}
                    onToggleMulti={(opt) => toggleMulti(`NOK: ${field.label}`, opt)}
                    hasError={validationErrors.includes(`NOK: ${field.label}`)}
                  />
                ))}
              </>
            )}
            {step.questions?.map((q) => {
              const key = q.question;
              return (
                <FormField
                  key={key}
                  field={{ ...q, label: q.question }}
                  value={data[key]}
                  onChange={(v) => setValue(key, v)}
                  onToggleMulti={(opt) => toggleMulti(key, opt)}
                  hasError={validationErrors.includes(key)}
                />
              );
            })}
          </>
        )}
      </div>

      {/* Navigation */}
      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg p-3" role="alert">{error}</p>
      )}
      {validationErrors.length > 0 && (
        <p className="mt-4 text-sm text-red-600" role="alert">Please fill in all required fields before continuing.</p>
      )}
      <div className="mt-4 flex gap-2">
        {currentStep > 0 && (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="flex-1 py-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
          >
            Back
          </button>
        )}
        {isReviewStep ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? "Submitting…" : "Submit Survey"}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex-1 py-3 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            {currentStep === 0 ? "Get Started" : "Continue"}
          </button>
        )}
      </div>

      {step.note && (
        <p className="mt-4 text-xs text-slate-400 text-center">{step.note}</p>
      )}
    </Section>
  );
}

function FormField({
  field,
  value,
  onChange,
  onToggleMulti,
  hasError = false,
}: {
  field: {
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
    min?: number;
    max?: number;
    labels?: string[];
    hint?: string;
    allowOther?: boolean;
  };
  value: string | string[] | number | undefined;
  onChange: (v: string | string[] | number) => void;
  onToggleMulti: (opt: string) => void;
  hasError?: boolean;
}) {
  const id = field.label.replace(/\s+/g, "-").toLowerCase();
  const errorBorder = hasError ? " border-red-400 ring-1 ring-red-200" : "";

  if (field.type === "slider") {
    const numVal = typeof value === "number" ? value : field.min ?? 0;
    return (
      <div>
        <label htmlFor={id} className="block text-sm text-slate-700 mb-2">{field.label}</label>
        <input
          id={id}
          type="range"
          min={field.min}
          max={field.max}
          value={numVal}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-teal-600"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>{field.labels?.[0] ?? field.min}</span>
          <span className="font-medium text-teal-700 text-sm">{numVal}</span>
          <span>{field.labels?.[1] ?? field.max}</span>
        </div>
      </div>
    );
  }

  if (field.type === "select-one") {
    return (
      <div>
        <label className="block text-sm text-slate-700 mb-2">{field.label}</label>
        <div className={`flex flex-wrap gap-2${hasError ? " rounded-lg p-2 ring-1 ring-red-400 bg-red-50/30" : ""}`}>
          {field.options?.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                value === opt
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

  if (field.type === "select-many") {
    const selected = (Array.isArray(value) ? value : []) as string[];
    return (
      <div>
        <label className="block text-sm text-slate-700 mb-2">{field.label}</label>
        <div className={`flex flex-wrap gap-2${hasError ? " rounded-lg p-2 ring-1 ring-red-400 bg-red-50/30" : ""}`}>
          {field.options?.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onToggleMulti(opt)}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                selected.includes(opt)
                  ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
                  : "border-slate-200 text-slate-600 hover:border-teal-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {field.hint && (
          <p className="mt-1 text-xs text-slate-400">{field.hint}</p>
        )}
      </div>
    );
  }

  if (field.type === "yes-no") {
    return (
      <div>
        <label className="block text-sm text-slate-700 mb-2">{field.label}</label>
        <div className={`flex gap-2${hasError ? " rounded-lg p-2 ring-1 ring-red-400 bg-red-50/30" : ""}`}>
          {["Yes", "No"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-4 py-2 text-xs rounded-lg border transition-colors ${
                value === opt
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

  if (field.type === "textarea") {
    return (
      <div>
        <label htmlFor={id} className="block text-sm text-slate-700 mb-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {field.hint && <p className="text-xs text-slate-400 mb-1">{field.hint}</p>}
        <textarea
          id={id}
          required={field.required}
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none${errorBorder}`}
        />
      </div>
    );
  }

  // text, email, tel, date
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-slate-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {field.hint && <p className="text-xs text-slate-400 mb-1">{field.hint}</p>}
      <input
        id={id}
        type={field.type}
        required={field.required}
        placeholder={field.placeholder}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent${errorBorder}`}
      />
    </div>
  );
}

function ReviewStep({
  data,
  steps,
  onGoTo,
}: {
  data: SurveyData;
  steps: { stepNumber: number; title: string }[];
  onGoTo: (step: number) => void;
}) {
  const entries = Object.entries(data).filter(
    ([, v]) =>
      v !== "" && v !== undefined && !(Array.isArray(v) && v.length === 0)
  );

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">No answers recorded yet.</p>
      ) : (
        entries.map(([key, val]) => (
          <div key={key} className="border-b border-slate-100 pb-3">
            <p className="text-xs text-slate-400">{key}</p>
            <p className="text-sm text-slate-700 mt-0.5">
              {Array.isArray(val) ? val.join(", ") : String(val)}
            </p>
          </div>
        ))
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        {steps.slice(0, -1).map((s, i) => (
          <button
            key={s.stepNumber}
            onClick={() => onGoTo(i)}
            className="text-xs text-teal-600 hover:underline"
          >
            Edit {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}
