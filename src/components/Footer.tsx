import Link from "next/link";
import { content } from "@/lib/content";

export default function Footer() {
  const { site, navigation } = content;

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Brand */}
          <div>
            <p className="font-semibold text-white text-base">Dr Vannette Voo</p>
            <p className="text-sm text-slate-400 mt-1">Functional Neurology</p>
            <p className="text-sm mt-3">{site.location}</p>
            <a
              href={`mailto:${site.email}`}
              className="text-sm text-teal-400 hover:text-teal-300 mt-1 inline-block break-all"
            >
              {site.email}
            </a>
          </div>

          {/* Quick links */}
          <div>
            <p className="font-medium text-white text-sm mb-3">Quick Links</p>
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Hours */}
        <div className="mt-8 pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            Mon–Fri: {site.clinicHours.mondayToFriday} &bull; Sat–Sun: {site.clinicHours.saturdaySunday}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            &copy; {new Date().getFullYear()} {site.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
