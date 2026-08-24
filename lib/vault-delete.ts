// Matches PayPal order reuse window in lib/paypal.ts (PAYPAL_ORDER_TTL_MS).
export const CHECKOUT_DELETE_GRACE_MS = 3 * 60 * 60 * 1000 - 60_000;

export function checkoutGraceEndsAt(checkoutStartedAt?: string | null) {
  if (!checkoutStartedAt) return null;
  const started = Date.parse(checkoutStartedAt);
  if (!Number.isFinite(started)) return Date.now() + CHECKOUT_DELETE_GRACE_MS;
  return started + CHECKOUT_DELETE_GRACE_MS;
}

export function isCheckoutGraceActive(options: {
  paymentStatus: string;
  checkoutStartedAt?: string | null;
  now?: number;
}) {
  if (options.paymentStatus !== "PENDING") return false;
  const until = checkoutGraceEndsAt(options.checkoutStartedAt);
  if (until == null) return false;
  return (options.now ?? Date.now()) < until;
}

export function unpaidVaultDeleteState(options: {
  paymentStatus: string;
  checkoutStartedAt?: string | null;
  now?: number;
}) {
  if (options.paymentStatus === "COMPLETED") {
    return { canDelete: false as const, reason: "paid" as const, blockedUntil: null };
  }
  if (options.paymentStatus !== "PENDING") {
    return { canDelete: false as const, reason: "paid" as const, blockedUntil: null };
  }
  if (isCheckoutGraceActive(options)) {
    return {
      canDelete: false as const,
      reason: "checkout" as const,
      blockedUntil: checkoutGraceEndsAt(options.checkoutStartedAt),
    };
  }
  return { canDelete: true as const, reason: null, blockedUntil: null };
}

export function checkoutDeleteCutoffIso(now = Date.now()) {
  return new Date(now - CHECKOUT_DELETE_GRACE_MS).toISOString();
}
