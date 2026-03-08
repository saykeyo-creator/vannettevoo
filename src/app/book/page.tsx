"use client";

import { useState, useEffect, useCallback } from "react";
import { content } from "@/lib/content";
import Section, { SectionHeading, SectionSubtext } from "@/components/Section";

type BookingStep = 0 | 1 | 2;

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h < 17; h++) {
    slots.push(`${h === 12 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`);
    slots.push(`${h === 12 ? 12 : h % 12}:30 ${h < 12 ? "AM" : "PM"}`);
  }
  return slots;
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BookPage() {
  const { heading, subtext, steps, availability, formFields, confirmationMessage } =
    content.pages.book;

  const [step, setStep] = useState<BookingStep>(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const [blockedTimes, setBlockedTimes] = useState<{ date: string; startTime: string | null; endTime: string | null }[]>([]);

  const fetchBlockedTimes = useCallback(async (year: number, month: number) => {
    const m = `${year}-${String(month + 1).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/availability?month=${m}`);
      if (res.ok) setBlockedTimes(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchBlockedTimes(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchBlockedTimes]);

  const isFullDayBlocked = (dateStr: string) =>
    blockedTimes.some((b) => b.date === dateStr && !b.startTime);

  const getBlockedSlotsForDate = (dateStr: string) =>
    blockedTimes.filter((b) => b.date === dateStr && b.startTime && b.endTime);

  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = (days[0].getDay() + 6) % 7; // Monday = 0
  const timeSlots = generateTimeSlots();

  const isSelectedDateToday = selectedDate?.toDateString() === today.toDateString();

  const slotToMinutes = (slot: string): number => {
    const match = slot.match(/^(\d+):(\d+)\s*(AM|PM)$/);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3];
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const timeToMinutes = (t: string): number => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const selectedDateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
    : "";

  const blockedSlots = selectedDateStr ? getBlockedSlotsForDate(selectedDateStr) : [];

  const filteredTimeSlots = timeSlots.filter((slot) => {
    const slotMins = slotToMinutes(slot);

    // Filter past times for today
    if (isSelectedDateToday) {
      if (slotMins <= today.getHours() * 60 + today.getMinutes()) return false;
    }

    // Filter blocked time ranges
    for (const b of blockedSlots) {
      if (b.startTime && b.endTime) {
        const blockStart = timeToMinutes(b.startTime);
        const blockEnd = timeToMinutes(b.endTime);
        if (slotMins >= blockStart && slotMins < blockEnd) return false;
      }
    }

    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
            : undefined,
          time: selectedTime,
          ...formData,
        }),
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

  const prevMonth = () => {
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
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
    <Section>
      <SectionHeading>{heading}</SectionHeading>
      <SectionSubtext>{subtext}</SectionSubtext>

      {/* Step indicators */}
      <div className="mt-6 flex gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex-1 text-center text-xs py-2 rounded-lg font-medium transition-colors ${
              i === step
                ? "bg-teal-600 text-white"
                : i < step
                ? "bg-teal-100 text-teal-700"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Step 0: Select Date */}
      {step === 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 text-slate-500 hover:text-slate-700" aria-label="Previous month">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-semibold text-slate-900">
              {new Date(viewYear, viewMonth).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
            </span>
            <button onClick={nextMonth} className="p-2 text-slate-500 hover:text-slate-700" aria-label="Next month">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="text-xs text-slate-400 py-1">{d}</div>
            ))}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const isPast = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const weekday = isWeekday(day);
              const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
              const blocked = isFullDayBlocked(dateStr);
              const selectable = !isPast && weekday && !blocked;
              const isSelected =
                selectedDate?.toDateString() === day.toDateString();

              return (
                <button
                  key={day.toISOString()}
                  disabled={!selectable}
                  onClick={() => {
                    setSelectedDate(day);
                    if (selectedTime) setSelectedTime("");
                  }}
                  className={`py-2.5 min-h-[44px] text-sm rounded-lg transition-colors ${
                    isSelected
                      ? "bg-teal-600 text-white font-medium"
                      : selectable
                      ? "text-slate-700 hover:bg-teal-50 active:bg-teal-100"
                      : "text-slate-200 cursor-not-allowed"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-400">{availability.days} · {availability.hours} · {availability.timezone}</p>
          {selectedDate && (
            <button
              onClick={() => setStep(1)}
              className="mt-4 w-full py-3 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              Continue — {formatDate(selectedDate)}
            </button>
          )}
        </div>
      )}

      {/* Step 1: Select Time */}
      {step === 1 && (
        <div className="mt-6">
          <p className="text-sm text-slate-500 mb-4">
            {selectedDate && formatDate(selectedDate)}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {filteredTimeSlots.length === 0 ? (
              <p className="col-span-3 text-sm text-slate-500 text-center py-4">
                No available time slots for today. Please select another date.
              </p>
            ) : (
              filteredTimeSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedTime(slot)}
                className={`py-3 min-h-[44px] text-sm rounded-lg border transition-colors ${
                  selectedTime === slot
                    ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
                    : "border-slate-200 text-slate-600 hover:border-teal-300 active:bg-slate-50"
                }`}
              >
                {slot}
              </button>
            ))
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Back</button>
            <button
              onClick={() => setStep(2)}
              disabled={!selectedTime}
              className="flex-1 py-3 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="rounded-lg bg-teal-50 p-3 text-xs text-teal-800">
            {selectedDate && formatDate(selectedDate)} at {selectedTime}
          </div>
          {formFields.map((field) => {
            const fieldId = `book-${field.label.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <div key={field.label}>
                <label htmlFor={fieldId} className="block text-xs font-medium text-slate-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={fieldId}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={formData[field.label] ?? ""}
                    onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                ) : (
                  <input
                    id={fieldId}
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={formData[field.label] ?? ""}
                    onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                )}
              </div>
            );
          })}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3" role="alert">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Sending…" : "Request Booking"}
            </button>
          </div>
        </form>
      )}
    </Section>
  );
}
