"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { content } from "@/lib/content";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { site, navigation } = content;
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex flex-col leading-tight" onClick={() => setMenuOpen(false)}>
          <span className="text-sm font-semibold text-teal-700 tracking-tight">
            Vannette Vu
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest">
            {isAdmin ? "Admin Portal" : "Functional Neurology"}
          </span>
        </Link>

        {!isAdmin && (
          <>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
                      ? "text-teal-700 bg-teal-50 font-medium"
                      : "text-slate-600 hover:text-teal-700 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 -mr-2 text-slate-600"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1 max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-base transition-colors ${
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
                  ? "text-teal-700 bg-teal-50 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
