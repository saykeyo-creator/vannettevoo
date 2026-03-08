import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [patientCount, bookingCount, messageCount, todayBlocked] = await Promise.all([
    prisma.patient.count(),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.blockedTime.count({
      where: {
        date: todayStr,
      },
    }),
  ]);

  const recentBookings = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { patient: true },
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="text-sm text-slate-500 mt-1">Welcome back, Dr Voo</p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Patients" value={patientCount} href="/admin/patients" />
        <StatCard label="Pending Bookings" value={bookingCount} href="/admin/calendar" />
        <StatCard label="Unread Messages" value={messageCount} href="/admin/messages" />
        <StatCard label="Today Blocked" value={todayBlocked} href="/admin/calendar" />
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
              <div key={b.id} className="px-4 py-3 flex items-center justify-between">
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
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-200 hover:shadow-sm transition-all"
    >
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </Link>
  );
}
