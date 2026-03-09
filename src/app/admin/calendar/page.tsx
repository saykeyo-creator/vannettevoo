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
