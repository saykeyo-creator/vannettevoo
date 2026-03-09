"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface BlockedEntry {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

interface CalendarBooking {
  id: string;
  date: string;
  time: string;
  status: string;
  patientId: string;
  patient: { firstName: string; lastName: string };
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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CalendarPage() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [blocked, setBlocked] = useState<BlockedEntry[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Block form
  const [blockMode, setBlockMode] = useState<"day" | "hours" | "range">("day");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [rangeEnd, setRangeEnd] = useState("");
  const [reason, setReason] = useState("");

  // Admin booking form
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookPatientSearch, setBookPatientSearch] = useState("");
  const [bookPatients, setBookPatients] = useState<{ id: string; firstName: string; lastName: string; email: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientLabel, setSelectedPatientLabel] = useState("");
  const [bookTime, setBookTime] = useState("");
  const [bookNotes, setBookNotes] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const monthStr = `${viewYear}-${pad(viewMonth + 1)}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [blockedRes, bookingsRes] = await Promise.all([
        fetch(`/api/admin/blocked-time?month=${monthStr}`),
        fetch(`/api/admin/bookings?month=${monthStr}`),
      ]);
      if (blockedRes.ok) setBlocked(await blockedRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Patient search for admin booking
  useEffect(() => {
    if (bookPatientSearch.length < 2) { setBookPatients([]); return; }
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/admin/patients?q=${encodeURIComponent(bookPatientSearch)}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setBookPatients(data.patients ?? []);
        }
      } catch { /* aborted or network error */ }
    })();
    return () => controller.abort();
  }, [bookPatientSearch]);

  const handleAdminBooking = async () => {
    if (!selectedPatientId || !selectedDate || !bookTime) return;
    setBookingSubmitting(true);
    setBookingError("");
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          date: selectedDate,
          time: bookTime,
          notes: bookNotes || null,
        }),
      });
      if (res.ok) {
        setShowBookingForm(false);
        setSelectedPatientId(null);
        setSelectedPatientLabel("");
        setBookPatientSearch("");
        setBookTime("");
        setBookNotes("");
        fetchData();
      } else {
        const data = await res.json();
        setBookingError(data.error || "Failed to create booking");
      }
    } catch {
      setBookingError("Network error");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = (days[0].getDay() + 6) % 7;

  const blockedDates = new Set(
    blocked.filter((b) => !b.startTime).map((b) => b.date)
  );
  const partialBlockedDates = new Set(
    blocked.filter((b) => b.startTime).map((b) => b.date)
  );

  const bookingsByDate = new Map<string, CalendarBooking[]>();
  for (const b of bookings) {
    const existing = bookingsByDate.get(b.date) || [];
    existing.push(b);
    bookingsByDate.set(b.date, existing);
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const handleBlock = async () => {
    if (!selectedDate) return;

    if (blockMode === "range") {
      if (!rangeEnd) return;
      const res = await fetch("/api/admin/blocked-time/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: selectedDate, endDate: rangeEnd, reason: reason || null }),
      });
      if (res.ok) {
        setSelectedDate(null);
        setReason("");
        setRangeEnd("");
        fetchData();
      }
      return;
    }

    const res = await fetch("/api/admin/blocked-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedDate,
        startTime: blockMode === "hours" ? startTime : null,
        endTime: blockMode === "hours" ? endTime : null,
        reason: reason || null,
      }),
    });

    if (res.ok) {
      setSelectedDate(null);
      setReason("");
      fetchData();
    }
  };

  const handleUnblock = async (id: string) => {
    const res = await fetch(`/api/admin/blocked-time?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) fetchData();
  };

  const selectedBlocks = blocked.filter((b) => b.date === selectedDate);
  const selectedBookings = bookingsByDate.get(selectedDate ?? "") ?? [];

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Calendar Management</h1>
      <p className="text-sm text-slate-500 mt-1">Block days or hours when you&apos;re unavailable</p>

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 text-slate-500 hover:text-slate-700" aria-label="Previous month">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-900">
              {new Date(viewYear, viewMonth).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
            </span>
            <button onClick={nextMonth} className="p-2 text-slate-500 hover:text-slate-700" aria-label="Next month">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
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
              const dateStr = toDateStr(day);
              const isFullBlocked = blockedDates.has(dateStr);
              const isPartialBlocked = partialBlockedDates.has(dateStr);
              const hasBookings = bookingsByDate.has(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === toDateStr(today);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`py-2.5 min-h-[44px] text-sm rounded-lg transition-colors relative ${
                    isSelected
                      ? "ring-2 ring-teal-500 bg-teal-50 text-teal-700 font-medium"
                      : isFullBlocked
                      ? "bg-red-100 text-red-700 font-medium"
                      : isPartialBlocked
                      ? "bg-amber-50 text-amber-700"
                      : isToday
                      ? "bg-slate-100 text-slate-900 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {day.getDate()}
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {isPartialBlocked && !isFullBlocked && (
                      <span className="w-1 h-1 bg-amber-500 rounded-full" />
                    )}
                    {hasBookings && (
                      <span className="w-1 h-1 bg-teal-500 rounded-full" data-testid={`booking-dot-${dateStr}`} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {loading && <p className="text-xs text-slate-400 mt-2 text-center">Loading…</p>}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Full day blocked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" /> Hours blocked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500" /> Has bookings
            </span>
          </div>
        </div>

        {/* Right panel — block form + existing blocks */}
        <div className="space-y-4">
          {selectedDate ? (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900 text-sm">
                  Block Time — {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-AU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h3>

                <div className="mt-4 flex gap-2">
                  {(["day", "hours", "range"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setBlockMode(m)}
                      className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                        blockMode === m
                          ? "border-teal-600 bg-teal-50 text-teal-700 font-medium"
                          : "border-slate-200 text-slate-600 hover:border-teal-300"
                      }`}
                    >
                      {m === "day" ? "Full Day" : m === "hours" ? "Specific Hours" : "Date Range"}
                    </button>
                  ))}
                </div>

                {blockMode === "hours" && (
                  <div className="mt-3 flex gap-2 items-center">
                    <div>
                      <label className="text-xs text-slate-500">From</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <span className="text-slate-400 mt-4">→</span>
                    <div>
                      <label className="text-xs text-slate-500">To</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}

                {blockMode === "range" && (
                  <div className="mt-3">
                    <label className="text-xs text-slate-500">Block from {selectedDate} to:</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      min={selectedDate}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
                    />
                  </div>
                )}

                <div className="mt-3">
                  <label className="text-xs text-slate-500">Reason (optional)</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Conference, Holiday"
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
                  />
                </div>

                <button
                  onClick={handleBlock}
                  className="mt-4 w-full py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  {blockMode === "range" ? "Block Date Range" : blockMode === "hours" ? "Block These Hours" : "Block Entire Day"}
                </button>
              </div>

              {/* Existing blocks for this date */}
              {selectedBlocks.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wide mb-3">
                    Existing Blocks
                  </h4>
                  <div className="space-y-2">
                    {selectedBlocks.map((b) => (
                      <div key={b.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm text-slate-700">
                            {b.startTime ? `${b.startTime} – ${b.endTime}` : "Full day"}
                          </p>
                          {b.reason && (
                            <p className="text-xs text-slate-400">{b.reason}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnblock(b.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bookings for this date */}
              {selectedBookings.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wide mb-3">
                    Bookings
                  </h4>
                  <div className="space-y-2">
                    {selectedBookings.map((b) => (
                      <Link
                        key={b.id}
                        href={`/admin/patients/${b.patientId}`}
                        className="flex items-center justify-between bg-teal-50 rounded-lg px-3 py-2 hover:bg-teal-100 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {b.patient.firstName} {b.patient.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{b.time}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          b.status === "confirmed" ? "bg-green-100 text-green-700"
                          : b.status === "completed" ? "bg-blue-100 text-blue-700"
                          : b.status === "cancelled" ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                        }`}>
                          {b.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin booking form */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                {!showBookingForm ? (
                  <button
                    onClick={() => setShowBookingForm(true)}
                    className="w-full py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
                  >
                    + Book Appointment
                  </button>
                ) : (
                  <>
                    <h3 className="font-bold text-slate-900 text-sm mb-3">
                      Book Appointment — {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-AU", {
                        weekday: "short", day: "numeric", month: "short",
                      })}
                    </h3>

                    {/* Patient search */}
                    <div className="relative">
                      <label className="text-xs text-slate-500">Patient</label>
                      {selectedPatientId ? (
                        <div className="flex items-center justify-between bg-teal-50 rounded-lg px-3 py-2 mt-1">
                          <span className="text-sm text-slate-700">{selectedPatientLabel}</span>
                          <button
                            onClick={() => {
                              setSelectedPatientId(null);
                              setSelectedPatientLabel("");
                              setBookPatientSearch("");
                            }}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={bookPatientSearch}
                            onChange={(e) => setBookPatientSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
                          />
                          {bookPatients.length > 0 && (
                            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                              {bookPatients.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    setSelectedPatientId(p.id);
                                    setSelectedPatientLabel(`${p.firstName} ${p.lastName}`);
                                    setBookPatientSearch("");
                                    setBookPatients([]);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                                >
                                  <span className="font-medium">{p.firstName} {p.lastName}</span>
                                  <span className="text-slate-400 ml-2">{p.email}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Time */}
                    <div className="mt-3">
                      <label className="text-xs text-slate-500">Time</label>
                      <select
                        value={bookTime}
                        onChange={(e) => setBookTime(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
                      >
                        <option value="">Select time...</option>
                        {Array.from({ length: 17 }, (_, i) => {
                          const h = 9 + Math.floor(i / 2);
                          const m = i % 2 === 0 ? "00" : "30";
                          const time = `${h}:${m} ${h < 12 ? "AM" : "PM"}`;
                          const h12 = h > 12 ? h - 12 : h;
                          return (
                            <option key={time} value={time}>
                              {h12}:{m} {h < 12 ? "AM" : "PM"}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="mt-3">
                      <label className="text-xs text-slate-500">Notes (optional)</label>
                      <input
                        type="text"
                        value={bookNotes}
                        onChange={(e) => setBookNotes(e.target.value)}
                        placeholder="e.g. Initial consultation"
                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
                      />
                    </div>

                    {bookingError && (
                      <p className="mt-2 text-xs text-red-600">{bookingError}</p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={handleAdminBooking}
                        disabled={!selectedPatientId || !bookTime || bookingSubmitting}
                        className="flex-1 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bookingSubmitting ? "Booking..." : "Confirm Booking"}
                      </button>
                      <button
                        onClick={() => {
                          setShowBookingForm(false);
                          setBookingError("");
                        }}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-400">Select a date on the calendar to block or unblock time</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
