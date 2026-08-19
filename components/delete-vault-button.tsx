"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "@/app/actions";
import { unpaidVaultDeleteState } from "@/lib/vault-delete";

type Props = {
  projectId: string;
  paymentStatus: string;
  checkoutStartedAt?: string | null;
  className?: string;
};

function remainingLabel(blockedUntil: number | null, now: number) {
  if (blockedUntil == null) return null;
  const remaining = blockedUntil - now;
  if (remaining <= 0) return "soon";
  const totalMinutes = Math.max(1, Math.ceil(remaining / 60_000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function DeleteVaultButton({ projectId, paymentStatus, checkoutStartedAt, className }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = useMemo(
    () => unpaidVaultDeleteState({ paymentStatus, checkoutStartedAt, now }),
    [paymentStatus, checkoutStartedAt, now],
  );

  useEffect(() => {
    if (state.reason !== "checkout" || state.blockedUntil == null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [state.reason, state.blockedUntil]);

  if (state.reason === "paid") return null;

  const waitLabel = remainingLabel(state.blockedUntil, now);
  const disabled = busy || !state.canDelete;

  async function handleDelete() {
    if (disabled) return;
    const confirmed = window.confirm(
      "Delete this unpaid vault? The client will lose all access immediately. This cannot be undone.",
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("projectId", projectId);
      const result = await deleteProject(body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not delete vault");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-xs flex-col items-end">
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={disabled}
        title={
          state.canDelete
            ? "Delete this unpaid vault"
            : waitLabel
              ? `Checkout in progress. Deletion unlocks in ${waitLabel}.`
              : "Checkout in progress. Deletion is disabled."
        }
        className={`whitespace-nowrap rounded-md border border-red-200 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? "px-3 py-1.5"}`}
      >
        {busy ? "Deleting…" : "Delete vault"}
      </button>
      {!state.canDelete ? (
        <p className="mt-1 text-xs text-amber-700">
          {waitLabel
            ? `Client checkout is in progress. Deletion is locked for ${waitLabel}.`
            : "Client checkout is in progress. Deletion is locked until that payment window ends."}
        </p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
