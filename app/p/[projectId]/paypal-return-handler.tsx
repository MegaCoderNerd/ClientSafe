"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  projectId: string;
  token: string;
};

export function PayPalReturnHandler({ projectId, token }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function capture() {
      try {
        const response = await fetch("/api/paypal/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, projectId }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "PayPal could not confirm this payment.");
        }
        if (!cancelled) {
          router.replace(`/p/${projectId}`);
          router.refresh();
        }
      } catch (captureError) {
        if (!cancelled) {
          setError(captureError instanceof Error ? captureError.message : "Payment confirmation failed.");
        }
      }
    }

    void capture();
    return () => {
      cancelled = true;
    };
  }, [projectId, router, token]);

  if (error) {
    return <p className="mt-3 text-sm text-red-600">{error}</p>;
  }

  return <p className="mt-3 text-sm text-slate-600">Confirming your PayPal payment…</p>;
}
