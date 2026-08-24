"use client";

import { Button } from "@/components/ui/button";
import { playUiSound } from "@/lib/ui-sound";
import { useState } from "react";

type Props = {
  projectId: string;
  priceCents: number;
  currency: string;
  platformFeePercent: number;
  platformFeeAmount: number;
  freelancerPayoutAmount: number;
  sandboxMode?: boolean;
};

function money(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

export function PayButton({
  projectId,
  priceCents,
  currency,
  platformFeePercent,
  platformFeeAmount,
  freelancerPayoutAmount,
  sandboxMode = false,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [sandboxPaying, setSandboxPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(sandboxTest = false) {
    setIsLoading(true);
    setSandboxPaying(sandboxTest);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, sandboxTest }),
      });

      const data = (await response.json()) as { approveUrl?: string; paid?: boolean; error?: string };
      if (data.paid) {
        playUiSound("success");
        window.setTimeout(() => {
          window.location.assign(`/p/${projectId}`);
        }, 180);
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "Unable to start PayPal checkout.");
      }
      if (sandboxTest) {
        throw new Error("Sandbox test payment did not complete.");
      }
      if (!data.approveUrl) {
        throw new Error("Missing PayPal approval URL.");
      }

      window.location.href = data.approveUrl;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed.");
      setIsLoading(false);
      setSandboxPaying(false);
    }
  }

  const freelancerPercent = 100 - platformFeePercent;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        You pay <span className="font-medium text-slate-800">{money(priceCents, currency)}</span> on PayPal.
        The freelancer receives {freelancerPercent}% ({money(freelancerPayoutAmount, currency)}).
        ClientSafe keeps a {platformFeePercent}% platform fee ({money(platformFeeAmount, currency)}).
      </p>
      {sandboxMode ? (
        <p className="text-xs text-amber-800">
          Sandbox hosted checkout declines random/fake cards. Use Visa <span className="font-mono">4111111111111111</span>, expiry 12/2028, CVV 123, or complete a sandbox test payment below.
        </p>
      ) : null}
      <Button
        type="button"
        onClick={() => void startCheckout(false)}
        disabled={isLoading}
      >
        {isLoading && !sandboxPaying ? "Redirecting to PayPal..." : "Pay to Unlock"}
      </Button>
      {sandboxMode ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => void startCheckout(true)}
          disabled={isLoading}
        >
          {sandboxPaying ? "Completing sandbox payment…" : "Complete sandbox test payment"}
        </Button>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
