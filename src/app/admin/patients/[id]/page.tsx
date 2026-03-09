"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface PatientNote {
  id: string;
  content: string;
  category: string | null;
  createdAt: string;
  bookingId: string | null;
  booking: { id: string; date: string; time: string } | null;
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
  status: string;
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
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [noteBookingId, setNoteBookingId] = useState<string | null>(null);
  const [noteCategory, setNoteCategory] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [savingNoteEdit, setSavingNoteEdit] = useState(false);
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phone: "", dob: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchPatient = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/patients/${id}`);
      if (res.ok) setPatient(await res.json());
    } catch {
      // Network error — keep current state
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  const startEditing = () => {
    if (!patient) return;
    setEditForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone || "",
      dob: patient.dob || "",
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditing(false);
        fetchPatient();
      }
    } catch {
      // Network error
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!patient) return;
    const newStatus = patient.status === "active" ? "archived" : "active";
    try {
      const res = await fetch(`/api/admin/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchPatient();
    } catch {
      // Network error
    }
  };

  const handleDelete = async (type: string, targetId: string) => {
    setDeleting(true);
    let url = "";
    if (type === "patient") url = `/api/admin/patients/${targetId}`;
    else if (type === "note") url = `/api/admin/notes/${targetId}`;
    else if (type === "survey") url = `/api/admin/surveys/${targetId}`;

    try {
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        if (type === "patient") {
          router.push("/admin/patients");
        } else {
          fetchPatient();
        }
      }
    } catch {
      // Network error
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/patients/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote, ...(noteBookingId ? { bookingId: noteBookingId } : {}), ...(noteCategory ? { category: noteCategory } : {}) }),
      });
      if (res.ok) {
        setNewNote("");
        setNoteBookingId(null);
        setNoteCategory("");
        fetchPatient();
      }
    } catch {
      // Network error
    } finally {
      setSavingNote(false);
    }
  };

  const startEditingNote = (note: PatientNote) => {
    setEditingNote(note.id);
    setEditNoteContent(note.content);
  };

  const handleSaveNoteEdit = async (noteId: string) => {
    if (!editNoteContent.trim()) return;
    setSavingNoteEdit(true);
    try {
      const res = await fetch(`/api/admin/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editNoteContent }),
      });
      if (res.ok) {
        setEditingNote(null);
        fetchPatient();
      }
    } catch {
      // Network error
    } finally {
      setSavingNoteEdit(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    setUpdatingBooking(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchPatient();
    } catch {
      // Network error
    } finally {
      setUpdatingBooking(null);
    }
  };

  // Extract key clinical info from the most recent intake survey
  const getIntakeSummary = () => {
    if (!patient) return null;
    const intake = patient.surveys.find((s) => s.type === "intake");
    if (!intake) return null;
    try {
      const raw = JSON.parse(intake.data);
      const data = (raw.data ?? raw) as Record<string, unknown>;
      const fields: { label: string; value: string }[] = [];

      const pick = (keys: string[], label: string) => {
        for (const k of keys) {
          const v = data[k];
          if (v && String(v).trim()) {
            fields.push({ label, value: String(v).trim() });
            return;
          }
        }
      };

      pick(["Chief Complaint", "Primary Concern", "Main Concern", "Reason for Visit"], "Chief Complaint");
      pick(["How were you referred", "Referral Source", "How Did You Hear About Us"], "Referral");
      pick(["Current Medications", "Medications"], "Medications");
      pick(["Medical History", "Past Medical History"], "Medical History");
      pick(["Allergies"], "Allergies");
      pick(["Occupation"], "Occupation");

      return fields.length > 0 ? fields : null;
    } catch {
      return null;
    }
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

  const intakeSummary = getIntakeSummary();

  return (
    <>
      {/* Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-bold text-slate-900">Confirm Delete</h3>
            <p className="text-sm text-slate-600 mt-2">
              Are you sure you want to delete this {confirmDelete.type}?
              {confirmDelete.type === "patient" && " This will permanently remove all their notes, surveys, and bookings."}
            </p>
            <p className="text-xs text-slate-400 mt-1 truncate">{confirmDelete.label}</p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.type, confirmDelete.id)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Link href="/admin/patients" className="text-xs text-teal-600 hover:text-teal-700 font-medium">
        ← All Patients
      </Link>

      {/* Header */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3 max-w-md">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500">First Name</label>
                    <input
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Last Name</label>
                    <input
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500">Phone</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Date of Birth</label>
                    <input
                      type="date"
                      value={editForm.dob}
                      onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-40"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">
                    {patient.firstName} {patient.lastName}
                  </h1>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      patient.status === "active"
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {patient.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>{patient.email}</span>
                  {patient.phone && <span>📞 {patient.phone}</span>}
                  {patient.dob && <span>🎂 {patient.dob}</span>}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Patient since {new Date(patient.createdAt).toLocaleDateString("en-AU")}
                </p>
              </>
            )}
          </div>
          {!editing && (
            <div className="flex gap-2 shrink-0 ml-4">
              <button
                onClick={startEditing}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                onClick={handleToggleStatus}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {patient.status === "active" ? "Archive" : "Reactivate"}
              </button>
              <button
                onClick={() => setConfirmDelete({ type: "patient", id: patient.id, label: `${patient.firstName} ${patient.lastName}` })}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Intake summary */}
        {intakeSummary && !editing && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Intake Summary</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
              {intakeSummary.map((f) => (
                <div key={f.label}>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{f.label}</p>
                  <p className="text-sm text-slate-700 line-clamp-2">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress Tracking Chart */}
      {(() => {
        const progressSurveys = patient.surveys
          .filter((s) => s.type === "progress")
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (progressSurveys.length < 1) return null;

        // Extract ratings from each progress survey
        const parsed = progressSurveys.map((s) => {
          try {
            const d = JSON.parse(s.data);
            return { date: s.createdAt, ratings: (d.ratings ?? {}) as Record<string, number | null> };
          } catch {
            return { date: s.createdAt, ratings: {} as Record<string, number | null> };
          }
        });

        // Get all symptom areas that appear in any survey
        const allAreas = Array.from(
          new Set(parsed.flatMap((p) => Object.keys(p.ratings)))
        );

        if (allAreas.length === 0) return null;

        // Colors for each survey session (up to 6)
        const colors = ["#0d9488", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

        return (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Progress Tracking</h2>
            <p className="text-xs text-slate-400 mb-4">
              Symptom severity across {parsed.length} progress survey{parsed.length !== 1 ? "s" : ""}
            </p>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4">
              {parsed.map((p, i) => (
                <div key={p.date} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[i % colors.length] }}
                  />
                  <span className="text-xs text-slate-500">
                    {new Date(p.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div className="space-y-3">
              {allAreas.map((area) => (
                <div key={area}>
                  <p className="text-xs font-medium text-slate-600 mb-1">{area}</p>
                  <div className="space-y-1">
                    {parsed.map((p, i) => {
                      const val = p.ratings[area];
                      const isNA = val === null || val === undefined;
                      return (
                        <div key={p.date} className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            {!isNA && (
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${(Number(val) / 10) * 100}%`,
                                  backgroundColor: colors[i % colors.length],
                                }}
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 w-8 text-right">
                            {isNA ? "N/A" : `${val}/10`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary: average scores per session */}
            {parsed.length >= 2 && (() => {
              const averages = parsed.map((p) => {
                const nums = Object.values(p.ratings).filter((v): v is number => typeof v === "number");
                return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
              });
              const first = averages[0];
              const last = averages[averages.length - 1];
              if (first === null || last === null) return null;
              const diff = last - first;
              return (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Average severity:{" "}
                    <span className="font-medium">{first.toFixed(1)}</span> → <span className="font-medium">{last.toFixed(1)}</span>
                    {" "}
                    <span className={diff < 0 ? "text-green-600" : diff > 0 ? "text-red-600" : "text-slate-400"}>
                      ({diff > 0 ? "+" : ""}{diff.toFixed(1)})
                    </span>
                  </p>
                </div>
              );
            })()}
          </div>
        );
      })()}

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        {/* Notes */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Clinical Notes</h2>

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
            <textarea
              id="note-textarea"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a clinical note…"
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button
                onClick={handleAddNote}
                disabled={savingNote || !newNote.trim()}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors"
              >
                {savingNote ? "Saving…" : "Add Note"}
              </button>
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-2 text-slate-600"
                aria-label="Note category"
              >
                <option value="">No category</option>
                <option value="Session Notes">Session Notes</option>
                <option value="Assessment">Assessment</option>
                <option value="Treatment Plan">Treatment Plan</option>
                <option value="Follow-up">Follow-up</option>
                <option value="General">General</option>
              </select>
              {patient.bookings.length > 0 && (
                <select
                  value={noteBookingId || ""}
                  onChange={(e) => setNoteBookingId(e.target.value || null)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-2 text-slate-600"
                  aria-label="Link to booking"
                >
                  <option value="">No booking linked</option>
                  {patient.bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.date} {b.time} ({b.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {patient.notes.length === 0 ? (
            <p className="text-sm text-slate-400 bg-slate-50 rounded-lg p-4 text-center">No notes yet</p>
          ) : (
            <div className="space-y-2">
              {patient.notes.map((note) => (
                <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-4 group">
                  {editingNote === note.id ? (
                    <div>
                      <textarea
                        value={editNoteContent}
                        onChange={(e) => setEditNoteContent(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleSaveNoteEdit(note.id)}
                          disabled={savingNoteEdit || !editNoteContent.trim()}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 disabled:opacity-40"
                        >
                          {savingNoteEdit ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingNote(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap flex-1">{note.content}</p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                          <button
                            onClick={() => startEditingNote(note)}
                            className="text-xs text-teal-500 hover:text-teal-700"
                            title="Edit note"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ type: "note", id: note.id, label: note.content.slice(0, 60) })}
                            className="text-xs text-red-400 hover:text-red-600"
                            title="Delete note"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <p className="text-xs text-slate-400">
                          {new Date(note.createdAt).toLocaleString("en-AU")}
                        </p>
                        {note.category && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                            {note.category}
                          </span>
                        )}
                      </div>
                      {note.booking && (
                        <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
                          📅 {note.booking.date} {note.booking.time}
                        </span>
                      )}
                    </>
                  )}
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
                          b.status === "completed"
                            ? "bg-blue-50 text-blue-700"
                            : b.status === "confirmed"
                            ? "bg-green-50 text-green-700"
                            : b.status === "cancelled"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    {b.status !== "cancelled" && b.status !== "completed" && (
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
                        {b.status === "confirmed" && (
                          <button
                            onClick={() => handleUpdateBookingStatus(b.id, "completed")}
                            disabled={updatingBooking === b.id}
                            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, "cancelled")}
                          disabled={updatingBooking === b.id}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setNoteBookingId(b.id);
                            document.getElementById("note-textarea")?.focus();
                          }}
                          className="text-xs px-2 py-1 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                        >
                          Add Note
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900">Survey Submissions</h2>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/survey/progress`;
                  navigator.clipboard.writeText(url);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors font-medium"
              >
                {linkCopied ? "✓ Copied!" : "Copy Progress Survey Link"}
              </button>
            </div>
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedSurvey(expandedSurvey === s.id ? null : s.id)}
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                          {expandedSurvey === s.id ? "Collapse" : "View"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ type: "survey", id: s.id, label: `${s.type} survey from ${new Date(s.createdAt).toLocaleDateString("en-AU")}` })}
                          className="text-xs text-red-400 hover:text-red-600"
                          title="Delete survey"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {expandedSurvey === s.id && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        {(() => {
                          try {
                            return <SurveyDataDisplay data={JSON.parse(s.data)} />;
                          } catch {
                            return <p className="text-sm text-red-500">Unable to display survey data</p>;
                          }
                        })()}
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
