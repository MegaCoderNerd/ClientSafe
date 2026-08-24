"use client";

import { ResendConfirmationButton } from "@/components/resend-confirmation-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [canResetPassword, setCanResetPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setCanResend(false);
    setCanResetPassword(false);
    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });

      const data = (await res.json()) as {
        error?: string;
        message?: string;
        needsVerification?: boolean;
        canResend?: boolean;
        canResetPassword?: boolean;
      };
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setCanResend(Boolean(data.canResend));
        setCanResetPassword(Boolean(data.canResetPassword));
        return;
      }

      setCanResend(false);
      setSuccess(data.message || "Check your inbox to verify your email before signing in.");
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError("Signup failed");
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-4xl flex-col items-center justify-start p-6 pt-8 sm:min-h-[calc(100dvh-4rem)] sm:p-8 sm:pt-12">
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-2 font-display text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-slate-600 mb-4">
          Sign up with any email. We will send a verification link before you can sign in.
        </p>

        {success ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <p className="min-w-0 flex-1 rounded-md border border-green-200 bg-green-50 p-3 text-green-800">{success}</p>
              <div className="shrink-0 pt-1">
                <ResendConfirmationButton email={email} />
              </div>
            </div>
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => router.push("/auth/signin")}
            >
              Go to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-2 space-y-4">
            <label className="block text-sm">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field-input mt-1"
                required
              />
            </label>

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
                minLength={6}
              />
            </label>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating account..." : "Sign Up"}
            </Button>

            <div className="flex items-start justify-between gap-4">
              {canResetPassword ? (
                <Link href="/auth/forgot-password" className="text-sm text-accent hover:underline">
                  Reset password
                </Link>
              ) : (
                <span />
              )}
              {canResend ? <ResendConfirmationButton email={email} /> : null}
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>
        )}
      </Card>
    </div>
  );
}
