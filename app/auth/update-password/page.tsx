"use client";

import { createClient } from "@/utils/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function prepare() {
      const query = new URLSearchParams(window.location.search);
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const type = query.get("type") as EmailOtpType | null;
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          setReady(true);
          return;
        }
      } else if (tokenHash && type) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          type,
          token_hash: tokenHash,
        });
        if (otpError) {
          setError(otpError.message);
          setReady(true);
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setError(sessionError.message);
          setReady(true);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("This reset link is invalid or expired. Request a new one.");
      }
      setReady(true);
    }

    prepare().catch(() => {
      setError("This reset link is invalid or expired. Request a new one.");
      setReady(true);
    });
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/auth/signin?reset=1");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center p-6 pt-20">
      <section className="w-full rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-600">Choose a new password for your ClientVault account.</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border p-2"
              required
              minLength={6}
              disabled={!ready}
            />
          </label>
          <label className="block text-sm">
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="mt-1 w-full rounded-md border p-2"
              required
              minLength={6}
              disabled={!ready}
            />
          </label>
          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
          >
            {loading ? "Saving..." : "Update password"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
