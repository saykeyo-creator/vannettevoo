"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dob: string | null;
  status: string;
  createdAt: string;
  _count: { surveys: number; bookings: number; notes: number };
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ firstName: "", lastName: "", email: "", phone: "", dob: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      try {
        const res = await fetch(`/api/admin/patients?${params}`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data.patients);
          setTotalPages(data.totalPages);
          setTotal(data.total);
        }
      } catch {
        // Network error — keep current state
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, statusFilter, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPatient),
      });
      if (res.ok) {
        const created = await res.json();
        setShowNewForm(false);
        setNewPatient({ firstName: "", lastName: "", email: "", phone: "", dob: "" });
        router.push(`/admin/patients/${created.id}`);
      } else {
        const data = await res.json().catch(() => ({ error: "Failed to create patient" }));
        setCreateError(data.error || "Failed to create patient");
      }
    } catch {
      setCreateError("Network error. Please check your connection and try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* New Patient Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <h3 className="text-lg font-bold text-slate-900">New Patient</h3>
            <form onSubmit={handleCreatePatient} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">First Name *</label>
                  <input
                    required
                    value={newPatient.firstName}
                    onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Last Name *</label>
                  <input
                    required
                    value={newPatient.lastName}
                    onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Email *</label>
                <input
                  type="email"
                  required
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Phone</label>
                  <input
                    type="tel"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Date of Birth</label>
                  <input
                    type="date"
                    value={newPatient.dob}
                    onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              {createError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{createError}</p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowNewForm(false); setCreateError(""); }}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-40"
                >
                  {creating ? "Creating…" : "Create Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500 mt-1">View and manage patient records</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          + New Patient
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        {!loading && (
          <span className="text-xs text-slate-400">{total} patient{total !== 1 ? "s" : ""}</span>
        )}
      </div>

      <div className="mt-4 bg-white rounded-xl border border-slate-200">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
        ) : patients.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            {search || statusFilter ? "No patients match your search" : "No patients yet"}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {patients.map((p) => (
              <Link
                key={p.id}
                href={`/admin/patients/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {p.firstName} {p.lastName}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                        p.status === "active"
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <p className="text-xs text-slate-400 truncate">{p.email}</p>
                    {p.phone && <p className="text-xs text-slate-400">📞 {p.phone}</p>}
                    {p.dob && <p className="text-xs text-slate-400">🎂 {p.dob}</p>}
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-slate-400 shrink-0 ml-4">
                  <span>{p._count.bookings} bookings</span>
                  <span>{p._count.surveys} surveys</span>
                  <span>{p._count.notes} notes</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
