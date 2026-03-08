"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count: { surveys: number; bookings: number; notes: number };
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/patients?q=${encodeURIComponent(search)}`);
      if (res.ok) setPatients(await res.json());
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
      <p className="text-sm text-slate-500 mt-1">View and manage patient records</p>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <div className="mt-4 bg-white rounded-xl border border-slate-200">
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
        ) : patients.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            {search ? "No patients match your search" : "No patients yet"}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {patients.map((p) => (
              <Link
                key={p.id}
                href={`/admin/patients/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{p.email}</p>
                </div>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span>{p._count.bookings} bookings</span>
                  <span>{p._count.surveys} surveys</span>
                  <span>{p._count.notes} notes</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
