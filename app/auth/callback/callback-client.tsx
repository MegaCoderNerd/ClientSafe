"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthCallbackClient({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function finish(path: string) {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await fetch("/api/auth/sync-user", { method: "POST" });
      }
      router.replace(path);
    }

    async function fromHash() {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        await finish(type === "recovery" || next?.startsWith("/auth/update-password") ? "/auth/update-password" : "/auth/signin?verified=1");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await finish(next?.startsWith("/auth/update-password") ? "/auth/update-password" : "/auth/signin?verified=1");
        return;
      }

      setError("Invalid or expired confirmation link.");
    }

    fromHash().catch((caught) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "Confirmation failed");
    });

    return () => {
      cancelled = true;
    };
  }, [next, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center p-6 pt-20">
      <div className="w-full rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Confirming your email</h1>
        <p className="mt-2 text-sm text-slate-600">{error ?? "Please wait..."}</p>
      </div>
    </main>
  );
}
