"use client";

import { ResendConfirmationButton } from "@/components/resend-confirmation-button";
import { Button } from "@/components/ui/button";
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
  callbackUrl = "/dashboard",
}: {
  verified?: boolean;
  reset?: boolean;
  initialError?: string | null;
  callbackUrl?: string;
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
      router.push(callbackUrl || "/dashboard");
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
            className="field-input mt-1"
            required
          />
        </label>

        <label className="block text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input mt-1"
            required
          />
        </label>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign In"}
        </Button>

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
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => handleLogin("freelancer@clientsafe.dev", "demo123")}
            className="h-auto w-full py-3 hover:translate-y-0"
          >
            <span className="flex w-full flex-col items-start text-left">
              <span>Freelancer demo</span>
              <span className="text-xs font-normal text-slate-500">freelancer@clientsafe.dev</span>
            </span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => handleLogin("client@clientsafe.dev", "demo123")}
            className="h-auto w-full py-3 hover:translate-y-0"
          >
            <span className="flex w-full flex-col items-start text-left">
              <span>Client demo</span>
              <span className="text-xs font-normal text-slate-500">client@clientsafe.dev</span>
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
