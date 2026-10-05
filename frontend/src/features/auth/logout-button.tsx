"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTransition } from "react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await signOut({ redirectTo: "/login" });
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      aria-busy={isPending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut aria-hidden="true" className="h-4 w-4" />
      )}
      {isPending ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </button>
  );
}
