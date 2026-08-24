"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error || "Could not send reset email");
        return;
      }
      setMessage(data.message || "If that email is registered, we sent a reset link.");
    } catch {
      setError("Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-md flex-col items-center p-6 pt-8 sm:min-h-[calc(100dvh-4rem)] sm:pt-12">
      <Card className="w-full p-6">
        <h1 className="font-display text-2xl font-semibold">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your email and we will send a reset link. This works with Gmail, Outlook, and any other inbox.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field-input mt-1"
              required
            />
          </label>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send reset link"}
          </Button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
        </form>

        <p className="mt-4 text-sm">
          <Link href="/auth/signin" className="text-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
