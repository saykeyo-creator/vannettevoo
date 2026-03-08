"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const adminNav = [
  { label: "Dashboard", href: "/admin" },
  { label: "Calendar", href: "/admin/calendar" },
  { label: "Patients", href: "/admin/patients" },
  { label: "Messages", href: "/admin/messages" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg border border-slate-200 shadow-sm"
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static z-40 h-screen w-56 bg-slate-900 text-white flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="px-4 py-5 border-b border-slate-700">
          <p className="text-sm font-semibold text-teal-400">Vannette Vu</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Admin Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {adminNav.map((item) => {
            const active = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-teal-600 text-white font-medium"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700">
          <Link
            href="/"
            className="block px-3 py-2 text-xs text-slate-400 hover:text-teal-400 transition-colors mb-2"
          >
            ← View Site
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen md:ml-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 pt-14 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
