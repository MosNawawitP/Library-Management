"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  LayoutDashboard,
  Tags,
  type LucideIcon,
} from "lucide-react";
import {
  LIBRARY_NAVIGATION_ITEMS,
  isLibraryNavigationItemActive,
  type LibraryNavigationIcon,
} from "./library-navigation";

const NAVIGATION_ICONS: Record<LibraryNavigationIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  books: BookOpenText,
  categories: Tags,
};

export function LibrarySidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-slate-200 bg-white px-3 py-4 md:fixed md:top-20 md:bottom-0 md:left-0 md:z-20 md:w-[17rem] md:overflow-y-auto md:border-r md:border-b-0 md:px-4 md:py-6">
      <nav aria-label="เมนูหลัก">
        <p className="mb-3 px-3 text-xs font-bold tracking-[0.16em] text-slate-400 uppercase">
          เมนูหลัก
        </p>
        <ul className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {LIBRARY_NAVIGATION_ITEMS.map((item) => {
            const Icon = NAVIGATION_ICONS[item.icon];
            const isActive = isLibraryNavigationItemActive(pathname, item.href);

            return (
              <li key={item.href} className="shrink-0 md:shrink">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex min-w-44 items-center gap-3 rounded-xl px-3 py-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:min-w-0 ${
                    isActive
                      ? "bg-[#0b316c] text-white shadow-[0_8px_20px_rgba(11,49,108,0.18)]"
                      : "text-slate-600 hover:bg-blue-50 hover:text-[#0b316c]"
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
                      isActive
                        ? "bg-white/15 text-cyan-100"
                        : "bg-blue-50 text-blue-700 group-hover:bg-white"
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{item.label}</span>
                    <span
                      className={`mt-0.5 block text-xs ${
                        isActive ? "text-blue-100/75" : "text-slate-400"
                      }`}
                    >
                      {item.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
