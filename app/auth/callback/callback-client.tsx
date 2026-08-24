"use client";

import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthCallbackClient({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function finish(path: string) {
      const isVerifiedSignIn = path.includes("verified=1") || path.startsWith("/auth/signin");
      const { data } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!data.user) {
        if (isVerifiedSignIn) {
          setError("Email confirmation succeeded, but no signed-in user was found. Try signing in.");
          return;
        }
        router.replace(path);
        return;
      }

      const response = await fetch("/api/auth/sync-user", { method: "POST" });
      if (cancelled) return;
      if (!response.ok && isVerifiedSignIn) {
        setError(
          "Email confirmed, but we could not finish creating your account. Try signing in again, or use password reset if sign-in fails.",
        );
        return;
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
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-md flex-col items-center p-6 pt-8 sm:min-h-[calc(100dvh-4rem)] sm:pt-12">
      <Card className="w-full p-6">
        <h1 className="font-display text-xl font-semibold">Confirming your email</h1>
        <p className="mt-2 text-sm text-slate-600">{error ?? "Please wait..."}</p>
      </Card>
    </div>
  );
}
