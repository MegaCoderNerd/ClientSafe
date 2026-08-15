"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function SiteHeader() {
  const { data: session } = useSession();

  return (
    <header className="w-full border-b bg-white sticky top-0 z-50 h-16">
      <div className="absolute left-0 top-0 flex items-center h-16 pl-4">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.png?v=5" alt="ClientVault logo" className="w-10 h-10 object-contain" />
          <span className="text-lg font-bold">ClientVault</span>
        </Link>
      </div>

      <div className="absolute right-0 top-0 flex items-center h-16 pr-4">
        <nav className="flex gap-3">
          {session?.user ? (
            <>
              <Link href="/guide" className="rounded-md border px-3 py-1 text-sm hover:bg-slate-100">
                Guide
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md bg-red-600 px-3 py-1 text-white text-sm hover:bg-red-700 transition"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="rounded-md border px-3 py-1 hover:bg-slate-100">
                Sign In
              </Link>
              <Link href="/auth/signup" className="rounded-md bg-slate-900 px-3 py-1 text-white hover:bg-slate-800">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="mx-auto max-w-5xl h-16" />
    </header>
  );
}