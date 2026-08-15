"use client";

import { useEffect, useState } from "react";

export function ResendConfirmationButton({ email }: { email: string }) {
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function onClick() {
    if (cooldown > 0 || busy) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter your email first.");
      return;
    }

    setBusy(true);
    setCooldown(5);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error || "Could not resend");
        return;
      }
      setMessage(data.message || "Verification email sent.");
    } catch {
      setError("Could not resend");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <button
        type="button"
        onClick={onClick}
        disabled={cooldown > 0 || busy}
        className="text-sm text-slate-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
      >
        Resend
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {message ? <p className="text-xs text-green-700">{message}</p> : null}
    </div>
  );
}
