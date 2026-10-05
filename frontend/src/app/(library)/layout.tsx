import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { auth } from "@/auth";
import { LibrarySidebar } from "@/components/layout/library-sidebar";
import { LogoutButton } from "@/features/auth/logout-button";
import { SessionGuard } from "@/features/auth/session-guard";

export default async function LibraryLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();

  if (!session?.accessToken) {
    redirect("/login");
  }

  const userName = session.user?.name?.trim() || "ผู้ใช้งาน";

  return (
    <SessionGuard accessToken={session.accessToken}>
      <div className="min-h-screen bg-[#f4f7fb]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6">
            <Link
              href="/dashboard"
              aria-label="ไปหน้าแดชบอร์ด"
              className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 shadow-[0_6px_18px_rgba(8,74,156,0.12)]">
                <Image
                  src="/images/library-logo.png"
                  alt=""
                  width={42}
                  height={42}
                  className="h-10 w-10 object-contain"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold tracking-[0.18em] text-cyan-600 uppercase">
                  Library
                </span>
                <span className="block truncate text-base font-bold tracking-tight text-[#0b316c] sm:text-lg">
                  Management System
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="max-w-48 truncate text-sm font-bold text-slate-800">
                  {userName}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">ผู้ใช้งานระบบ</p>
              </div>
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-100 bg-blue-50 text-[#0b316c]"
                aria-hidden="true"
              >
                <UserRound className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <LogoutButton />
            </div>
          </div>
        </header>
        <div>
          <LibrarySidebar />
          <div className="min-w-0 md:ml-[17rem]">{children}</div>
        </div>
      </div>
    </SessionGuard>
  );
}
