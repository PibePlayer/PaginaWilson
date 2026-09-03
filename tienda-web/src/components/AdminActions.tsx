"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminActions() {
  const pathname = usePathname();

  const isAdminPanel =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (isAdminPanel) {
    return (
      <form
        action="/api/admin/logout"
        method="POST"
      >
        <button
          type="submit"
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 font-proxima text-sm font-bold text-zinc-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
        >
          Log Off
        </button>
      </form>
    );
  }

  return (
    <Link
      href="/admin"
      className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 font-proxima text-sm font-bold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-950"
    >
      Admin
    </Link>
  );
}