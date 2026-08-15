"use client";

import { ResendConfirmationButton } from "@/components/resend-confirmation-button";
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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setCanResend(false);
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
      };
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setCanResend(Boolean(data.canResend));
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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-start items-center p-8 pt-20">
      <section className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Create your account</h1>
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
              className="text-blue-600 hover:underline"
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
                className="mt-1 w-full rounded-md border p-2"
                required
              />
            </label>

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
                minLength={6}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>

            <div className="flex items-start justify-end">
              {canResend ? <ResendConfirmationButton email={email} /> : null}
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>
        )}
      </section>
    </main>
  );
}
