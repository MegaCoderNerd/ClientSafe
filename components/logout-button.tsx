"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-md bg-red-600 px-3 py-1 text-white text-sm hover:bg-red-700 transition"
    >
      Log Out
    </button>
  );
}
