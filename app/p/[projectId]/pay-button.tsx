"use client";

import { useState } from "react";

type Props = {
  projectId: string;
  priceCents: number;
  currency: string;
  platformFeePercent: number;
  platformFeeAmount: number;
  freelancerPayoutAmount: number;
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
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = (await response.json()) as { approveUrl?: string; paid?: boolean; error?: string };
      if (data.paid) {
        window.location.assign(`/p/${projectId}`);
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "Unable to start PayPal checkout.");
      }
      if (!data.approveUrl) {
        throw new Error("Missing PayPal approval URL.");
      }

      window.location.href = data.approveUrl;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed.");
      setIsLoading(false);
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
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        className="rounded-md bg-emerald-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Redirecting to PayPal..." : "Pay to Unlock"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
