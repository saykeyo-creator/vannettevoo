import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [activePatientCount, totalPatientCount, bookingCount, messageCount, todayBlocked] = await Promise.all([
    prisma.patient.count({ where: { status: "active" } }),
    prisma.patient.count(),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.blockedTime.count({
      where: {
        date: todayStr,
      },
    }),
  ]);

  const [todayBookings, recentBookings] = await Promise.all([
    prisma.booking.findMany({
      where: { date: todayStr },
      orderBy: { time: "asc" },
      include: { patient: true },
    }),
    prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { patient: true },
    }),
  ]);

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="text-sm text-slate-500 mt-1">Welcome back, Vannette</p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Patients" value={activePatientCount} subValue={`${totalPatientCount} total`} href="/admin/patients" />
        <StatCard label="Pending Bookings" value={bookingCount} href="/admin/calendar" />
        <StatCard label="Unread Messages" value={messageCount} href="/admin/messages" />
        <StatCard label="Today Blocked" value={todayBlocked} href="/admin/calendar" />
      </div>

      {/* Today's Schedule */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Today&apos;s Schedule</h2>
        {todayBookings.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 p-6 text-center">
            No appointments scheduled for today
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {todayBookings.map((b) => (
              <Link
                key={b.id}
                href={`/admin/patients/${b.patientId}`}
                className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-teal-700 w-20 shrink-0">{b.time}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {b.patient.firstName} {b.patient.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{b.patient.email}</p>
                  </div>
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
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent bookings */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Bookings</h2>
          <Link href="/admin/calendar" className="text-xs text-teal-600 hover:text-teal-700 font-medium">
            View all →
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 p-6 text-center">
            No bookings yet
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {recentBookings.map((b) => (
              <Link
                key={b.id}
                href={`/admin/patients/${b.patientId}`}
                className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {b.patient.firstName} {b.patient.lastName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {b.date} at {b.time}
                  </p>
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, subValue, href }: { label: string; value: number; subValue?: string; href: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-200 hover:shadow-sm transition-all"
    >
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      {subValue && <p className="text-[10px] text-slate-400">{subValue}</p>}
    </Link>
  );
}
