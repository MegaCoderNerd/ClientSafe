"use client";

import { ResendConfirmationButton } from "@/components/resend-confirmation-button";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function isUnverifiedError(raw: string) {
  const message = raw.toLowerCase();
  return (
    raw === "EMAIL_NOT_CONFIRMED" ||
    message.includes("verify") ||
    message.includes("not confirmed")
  );
}

export function SignInForm({
  verified = false,
  reset = false,
  initialError = null,
}: {
  verified?: boolean;
  reset?: boolean;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(
    verified
      ? "Email verified. You can sign in now."
      : reset
        ? "Password updated. Sign in with your new password."
        : null,
  );

  async function handleLogin(targetEmail: string, targetPass: string) {
    setLoading(true);
    setError(null);
    setNeedsVerification(false);

    const res = await signIn("credentials", {
      email: targetEmail,
      password: targetPass,
      redirect: false,
    });

    if (!res?.error) {
      setLoading(false);
      router.push("/");
      router.refresh();
      return;
    }

    const unverified = isUnverifiedError(res.error ?? "");

    setNeedsVerification(unverified);
    setError(unverified ? "Please verify your email before signing in." : "Invalid email or password. Please try again.");
    setLoading(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await handleLogin(email, password);
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border p-2"
            required
          />
        </label>

        <label className="block text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border p-2"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-60 hover:bg-slate-800"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="flex items-start justify-between gap-4">
          <Link href="/auth/forgot-password" className="text-sm text-slate-600 hover:underline">
            Forgot password?
          </Link>
          {needsVerification ? <ResendConfirmationButton email={email} /> : null}
        </div>

        {info ? <p className="text-sm text-green-700">{info}</p> : null}
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </form>

      <div className="border-t pt-4 space-y-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Demo Accounts</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleLogin("freelancer@clientvault.dev", "demo123")}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Freelancer Demo
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleLogin("client@clientvault.dev", "demo123")}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Client Demo
          </button>
        </div>
      </div>
    </div>
  );
}
