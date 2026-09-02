"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [appToken, setAppToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function prepare() {
      const query = new URLSearchParams(window.location.search);
      const token = query.get("token");
      if (token) {
        setAppToken(token);
        setReady(true);
        return;
      }

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

    if (appToken) {
      try {
        const response = await fetch("/api/auth/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: appToken, password }),
        });
        const data = (await response.json()) as { error?: string };
        setLoading(false);
        if (!response.ok) {
          setError(data.error || "Could not update password");
          return;
        }
        router.push("/auth/signin?reset=1");
      } catch {
        setLoading(false);
        setError("Could not update password");
      }
      return;
    }

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
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-md flex-col items-center p-6 pt-8 sm:min-h-[calc(100dvh-4rem)] sm:pt-12">
      <Card className="w-full p-6">
        <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-600">Choose a new password for your ClientSafe account.</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-input mt-1"
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
              className="field-input mt-1"
              required
              minLength={6}
              disabled={!ready}
            />
          </label>
          <Button type="submit" disabled={loading || !ready} className="w-full">
            {loading ? "Saving..." : "Update password"}
          </Button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </Card>
    </div>
  );
}
