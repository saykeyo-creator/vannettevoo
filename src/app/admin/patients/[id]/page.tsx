"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface PatientNote {
  id: string;
  content: string;
  createdAt: string;
}

interface Survey {
  id: string;
  type: string;
  data: string;
  createdAt: string;
}

interface BookingEntry {
  id: string;
  date: string;
  time: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface PatientDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dob: string | null;
  createdAt: string;
  notes: PatientNote[];
  surveys: Survey[];
  bookings: BookingEntry[];
}

const HIDDEN_KEYS = new Set(["type"]);

function formatLabel(key: string): string {
  // "First Name" stays as-is, "firstName" → "First Name", "ratings" → "Ratings"
  if (/[A-Z]/.test(key[0]) && key.includes(" ")) return key;
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SurveyDataDisplay({ data }: { data: Record<string, unknown> }) {
  // Separate simple fields from nested sections
  const simple: [string, string][] = [];
  const sections: [string, Record<string, unknown>][] = [];

  for (const [key, val] of Object.entries(data)) {
    if (HIDDEN_KEYS.has(key)) continue;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      sections.push([key, val as Record<string, unknown>]);
    } else if (Array.isArray(val)) {
      simple.push([key, val.join(", ")]);
    } else {
      simple.push([key, String(val ?? "—")]);
    }
  }

  return (
    <div className="space-y-4">
      {/* Simple key-value pairs */}
      {simple.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {simple.map(([key, val]) => (
            <div key={key}>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{formatLabel(key)}</p>
              <p className="text-sm text-slate-700">{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Nested sections (data, identity, ratings, feedback, etc.) */}
      {sections.map(([sectionKey, sectionData]) => (
        <div key={sectionKey}>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 mt-1">
            {formatLabel(sectionKey)}
          </h4>
          <div className="bg-slate-50 rounded-lg p-3">
            {isRatingsSection(sectionData) ? (
              <div className="space-y-2">
                {Object.entries(sectionData).map(([label, score]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-32 shrink-0">{formatLabel(label)}</span>
                    <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-teal-500 h-full rounded-full transition-all"
                        style={{ width: `${(Number(score) / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 w-8 text-right">{String(score)}/10</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {Object.entries(sectionData).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{formatLabel(k)}</p>
                    <p className="text-sm text-slate-700">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Check if a section looks like ratings (all values are numbers 0-10) */
function isRatingsSection(data: Record<string, unknown>): boolean {
  const entries = Object.entries(data);
  if (entries.length === 0) return false;
  return entries.every(([, v]) => typeof v === "number" && v >= 0 && v <= 10);
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);

  const fetchPatient = useCallback(async () => {
    const res = await fetch(`/api/admin/patients/${id}`);
    if (res.ok) setPatient(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const res = await fetch(`/api/admin/patients/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote }),
    });
    if (res.ok) {
      setNewNote("");
      fetchPatient();
    }
    setSavingNote(false);
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    setUpdatingBooking(bookingId);
    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchPatient();
    setUpdatingBooking(null);
  };

  if (loading) {
    return <p className="text-sm text-slate-400 text-center py-12">Loading…</p>;
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-400">Patient not found</p>
        <Link href="/admin/patients" className="text-sm text-teal-600 mt-2 inline-block">
          ← Back to patients
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link href="/admin/patients" className="text-xs text-teal-600 hover:text-teal-700 font-medium">
        ← All Patients
      </Link>

      {/* Header */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5">
        <h1 className="text-xl font-bold text-slate-900">
          {patient.firstName} {patient.lastName}
        </h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span>{patient.email}</span>
          {patient.phone && <span>{patient.phone}</span>}
          {patient.dob && <span>DOB: {patient.dob}</span>}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Patient since {new Date(patient.createdAt).toLocaleDateString("en-AU")}
        </p>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        {/* Notes */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Clinical Notes</h2>

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a clinical note…"
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <button
              onClick={handleAddNote}
              disabled={savingNote || !newNote.trim()}
              className="mt-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors"
            >
              {savingNote ? "Saving…" : "Add Note"}
            </button>
          </div>

          {patient.notes.length === 0 ? (
            <p className="text-sm text-slate-400 bg-slate-50 rounded-lg p-4 text-center">No notes yet</p>
          ) : (
            <div className="space-y-2">
              {patient.notes.map((note) => (
                <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(note.createdAt).toLocaleString("en-AU")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column — Bookings + Surveys */}
        <div className="space-y-6">
          {/* Bookings */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">Bookings</h2>
            {patient.bookings.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-lg p-4 text-center">No bookings</p>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {patient.bookings.map((b) => (
                  <div key={b.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-700">{b.date} at {b.time}</p>
                        {b.notes && <p className="text-xs text-slate-400">{b.notes}</p>}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          b.status === "confirmed"
                            ? "bg-green-50 text-green-700"
                            : b.status === "cancelled"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    {b.status !== "cancelled" && (
                      <div className="mt-2 flex gap-2">
                        {b.status === "pending" && (
                          <button
                            onClick={() => handleUpdateBookingStatus(b.id, "confirmed")}
                            disabled={updatingBooking === b.id}
                            className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40 transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, "cancelled")}
                          disabled={updatingBooking === b.id}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Surveys */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">Survey Submissions</h2>
            {patient.surveys.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-lg p-4 text-center">No surveys</p>
            ) : (
              <div className="space-y-2">
                {patient.surveys.map((s) => (
                  <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.type === "intake" ? "bg-teal-50 text-teal-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {s.type === "intake" ? "Intake Survey" : "Progress Survey"}
                        </span>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(s.createdAt).toLocaleString("en-AU")}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedSurvey(expandedSurvey === s.id ? null : s.id)}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        {expandedSurvey === s.id ? "Collapse" : "View"}
                      </button>
                    </div>
                    {expandedSurvey === s.id && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <SurveyDataDisplay data={JSON.parse(s.data)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
