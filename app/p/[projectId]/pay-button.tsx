"use client";

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
        window.location.assign(`/p/${projectId}`);
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
        ClientVault keeps a {platformFeePercent}% platform fee ({money(platformFeeAmount, currency)}).
      </p>
      {sandboxMode ? (
        <p className="text-xs text-amber-800">
          Sandbox hosted checkout declines random/fake cards. Use Visa <span className="font-mono">4111111111111111</span>, expiry 12/2028, CVV 123, or complete a sandbox test payment below.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void startCheckout(false)}
        disabled={isLoading}
        className="rounded-md bg-emerald-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading && !sandboxPaying ? "Redirecting to PayPal..." : "Pay to Unlock"}
      </button>
      {sandboxMode ? (
        <button
          type="button"
          onClick={() => void startCheckout(true)}
          disabled={isLoading}
          className="rounded-md border border-amber-700 px-4 py-2 text-sm text-amber-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {sandboxPaying ? "Completing sandbox payment…" : "Complete sandbox test payment"}
        </button>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
