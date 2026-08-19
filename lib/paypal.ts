const SANDBOX_API = "https://api-m.sandbox.paypal.com";
const LIVE_API = "https://api-m.paypal.com";

type PayPalMode = "sandbox" | "live";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

export function getPayPalMode(): PayPalMode {
  return process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
}

export function getPayPalApiBase() {
  return getPayPalMode() === "live" ? LIVE_API : SANDBOX_API;
}

export function getPlatformFeePercent() {
  const parsed = Number(process.env.PLATFORM_FEE_PERCENT ?? "10");
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return 10;
  return parsed;
}

export function splitVaultPrice(priceCents: number, percent = getPlatformFeePercent()) {
  const platformFeeAmount = Math.round((priceCents * percent) / 100);
  return {
    platformFeePercent: percent,
    platformFeeAmount,
    freelancerPayoutAmount: priceCents - platformFeeAmount,
  };
}

export function feesForStoredVault(project: {
  price: number;
  platformFeePercent?: number | null;
  platformFeeAmount?: number | null;
  freelancerPayoutAmount?: number | null;
}) {
  if (
    project.platformFeePercent != null &&
    project.platformFeeAmount != null &&
    project.freelancerPayoutAmount != null
  ) {
    return {
      platformFeePercent: project.platformFeePercent,
      platformFeeAmount: project.platformFeeAmount,
      freelancerPayoutAmount: project.freelancerPayoutAmount,
    };
  }
  return splitVaultPrice(project.price, project.platformFeePercent ?? getPlatformFeePercent());
}

export function centsToPayPalValue(cents: number) {
  return (cents / 100).toFixed(2);
}

export function paypalValueToCents(value: string) {
  return Math.round(Number(value) * 100);
}

function getCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required");
  }
  return { clientId, clientSecret };
}

async function paypalFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${getPayPalApiBase()}${path}`, {
    ...init,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(8_000),
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return response;
}

export async function getPayPalAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret } = getCredentials();
  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const payload = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || "Unable to authenticate with PayPal");
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 300) * 1000,
  };
  return payload.access_token;
}

export type PayPalLink = { href: string; rel: string; method?: string };

const REUSABLE_ORDER_STATUSES = new Set(["CREATED", "SAVED", "APPROVED", "PAYER_ACTION_REQUIRED"]);
const RESUMABLE_APPROVE_STATUSES = new Set(["CREATED", "PAYER_ACTION_REQUIRED"]);
const ABANDON_CAPTURE_ISSUES = new Set([
  "INSTRUMENT_DECLINED",
  "PAYER_CANNOT_PAY",
  "TRANSACTION_REFUSED",
  "PAYMENT_DENIED",
  "CARD_CLOSED",
  "CARD_EXPIRED",
  "PAYER_ACCOUNT_LOCKED_OR_CLOSED",
]);
export const PAYPAL_ORDER_TTL_MS = 3 * 60 * 60 * 1000 - 60_000;

export class PayPalApiError extends Error {
  issue: string | null;
  debugId: string | null;
  httpStatus: number;

  constructor(
    message: string,
    options?: { issue?: string | null; debugId?: string | null; httpStatus?: number },
  ) {
    super(message);
    this.name = "PayPalApiError";
    this.issue = options?.issue ?? null;
    this.debugId = options?.debugId ?? null;
    this.httpStatus = options?.httpStatus ?? 400;
  }
}

export function shouldAbandonPayPalOrder(issue?: string | null) {
  return Boolean(issue && ABANDON_CAPTURE_ISSUES.has(issue));
}

export function paypalCaptureUserMessage(issue?: string | null, fallback?: string | null) {
  if (issue === "INSTRUMENT_DECLINED") {
    return getPayPalMode() === "sandbox"
      ? "PayPal declined this card. Random or Stripe-style numbers (like 4242…) do not work here. Use PayPal’s test Visa 4111111111111111, expiry 12/2028, CVV 123, or the sandbox test payment button."
      : "That card or funding source was declined. Choose a different card or PayPal balance, then pay again.";
  }
  if (issue === "PAYER_CANNOT_PAY") {
    return "This PayPal account cannot complete this payment. Try a different buyer account or card.";
  }
  if (issue === "TRANSACTION_REFUSED" || issue === "PAYMENT_DENIED") {
    return "PayPal refused this payment. Start checkout again and choose a different payment method.";
  }
  return fallback || "PayPal could not complete this payment. Start checkout again.";
}

export type PayPalOrder = {
  id: string;
  status?: string;
  create_time?: string;
  links?: PayPalLink[];
  purchase_units?: Array<{
    custom_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: {
      captures?: Array<{ id?: string; status?: string; amount?: { value?: string; currency_code?: string } }>;
    };
  }>;
};

export async function createPayPalOrder(options: {
  projectId: string;
  title: string;
  currency: string;
  amountCents: number;
  returnUrl: string;
  cancelUrl: string;
}) {
  const accessToken = await getPayPalAccessToken();
  const response = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: options.projectId,
          description: options.title.slice(0, 127),
          amount: {
            currency_code: options.currency.toUpperCase(),
            value: centsToPayPalValue(options.amountCents),
          },
        },
      ],
      application_context: {
        brand_name: "ClientVault",
        landing_page: "BILLING",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: options.returnUrl,
        cancel_url: options.cancelUrl,
      },
    }),
  });

  const order = (await response.json()) as PayPalOrder & {
    message?: string;
    debug_id?: string;
    details?: Array<{ issue?: string; description?: string }>;
  };
  if (!response.ok || !order.id) {
    throw new PayPalApiError(order.details?.[0]?.description || order.message || "Unable to create PayPal order", {
      issue: order.details?.[0]?.issue ?? null,
      debugId: order.debug_id ?? null,
      httpStatus: response.status,
    });
  }
  return order;
}

export async function createAndCaptureSandboxTestCard(options: {
  projectId: string;
  title: string;
  currency: string;
  amountCents: number;
}) {
  if (getPayPalMode() !== "sandbox") {
    throw new PayPalApiError("Sandbox test cards are only available when PAYPAL_MODE=sandbox");
  }

  const accessToken = await getPayPalAccessToken();
  const response = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: "return=representation",
      "PayPal-Request-Id": `sandbox-card-${options.projectId}-${Date.now()}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: options.projectId,
          description: options.title.slice(0, 127),
          amount: {
            currency_code: options.currency.toUpperCase(),
            value: centsToPayPalValue(options.amountCents),
          },
        },
      ],
      payment_source: {
        card: {
          name: "Sandbox Buyer",
          number: "4111111111111111",
          expiry: "2028-12",
          security_code: "123",
          billing_address: {
            address_line_1: "123 Townsend St",
            admin_area_2: "San Jose",
            admin_area_1: "CA",
            postal_code: "95131",
            country_code: "US",
          },
        },
      },
    }),
  });

  const order = (await response.json()) as PayPalOrder & {
    message?: string;
    debug_id?: string;
    details?: Array<{ issue?: string; description?: string }>;
  };
  if (!response.ok || !order.id) {
    throw new PayPalApiError(order.details?.[0]?.description || order.message || "Sandbox test card was declined", {
      issue: order.details?.[0]?.issue ?? null,
      debugId: order.debug_id ?? null,
      httpStatus: response.status,
    });
  }
  return order;
}

export function getPayPalApproveUrl(order: PayPalOrder) {
  const link = order.links?.find((item) => item.rel === "approve" || item.rel === "payer-action");
  return link?.href ?? null;
}

export function isCompletedPayPalOrder(order: PayPalOrder) {
  const capture = getCaptureFromOrder(order);
  return order.status === "COMPLETED" || capture.status === "COMPLETED";
}

export function getReusablePayPalApproveUrl(order: PayPalOrder) {
  const status = order.status ?? "";
  if (!RESUMABLE_APPROVE_STATUSES.has(status) || isCompletedPayPalOrder(order)) return null;
  if (!isActivePayPalCheckout(order)) return null;
  return getPayPalApproveUrl(order);
}

const DEAD_ORDER_STATUSES = new Set(["VOIDED", "EXPIRED", "DECLINED"]);

const DELETE_BLOCK_STATUSES = new Set(["APPROVED", "PAYER_ACTION_REQUIRED"]);

export function isLiveReusablePayPalCheckout(order: PayPalOrder) {
  if (isCompletedPayPalOrder(order)) return false;
  const status = order.status ?? "";
  if (!DELETE_BLOCK_STATUSES.has(status)) return false;
  if (!order.create_time) return false;
  const createdAt = Date.parse(order.create_time);
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt < PAYPAL_ORDER_TTL_MS;
}

export function isActivePayPalCheckout(order: PayPalOrder) {
  if (isCompletedPayPalOrder(order)) return true;
  const status = order.status ?? "";
  if (DEAD_ORDER_STATUSES.has(status)) return false;
  if (REUSABLE_ORDER_STATUSES.has(status)) {
    if (order.create_time) {
      const createdAt = Date.parse(order.create_time);
      if (Number.isFinite(createdAt) && Date.now() - createdAt >= PAYPAL_ORDER_TTL_MS) {
        return false;
      }
    }
    return true;
  }
  return true;
}

export async function capturePayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  const response = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Request-Id": orderId,
    },
    body: "{}",
  });

  const order = (await response.json()) as PayPalOrder & {
    name?: string;
    message?: string;
    debug_id?: string;
    details?: Array<{ issue?: string; description?: string }>;
  };
  if (response.status === 422 && order.details?.some((detail) => detail.issue === "ORDER_ALREADY_CAPTURED")) {
    return getPayPalOrder(orderId);
  }
  if (!response.ok) {
    const issue = order.details?.[0]?.issue ?? null;
    throw new PayPalApiError(paypalCaptureUserMessage(issue, order.details?.[0]?.description || order.message), {
      issue,
      debugId: order.debug_id ?? null,
      httpStatus: response.status,
    });
  }
  return order;
}

export async function getPayPalOrder(orderId: string) {
  const order = await findPayPalOrder(orderId);
  if (!order) {
    throw new Error("Unable to load PayPal order");
  }
  return order;
}

export async function findPayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  const response = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) return null;
  const order = (await response.json()) as PayPalOrder & { message?: string };
  if (!response.ok) {
    throw new Error(order.message || "Unable to load PayPal order");
  }
  return order;
}

function isPayPalCertUrl(certUrl: string) {
  try {
    const url = new URL(certUrl);
    return url.protocol === "https:" && (url.hostname === "api.paypal.com" || url.hostname.endsWith(".paypal.com"));
  } catch {
    return false;
  }
}

export async function verifyPayPalWebhook(options: {
  headers: Headers;
  event: unknown;
}) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId || /^https?:\/\//i.test(webhookId)) {
    throw new Error("PAYPAL_WEBHOOK_ID must be the webhook id from the PayPal dashboard, not a URL");
  }

  const authAlgo = options.headers.get("paypal-auth-algo");
  const certUrl = options.headers.get("paypal-cert-url");
  const transmissionId = options.headers.get("paypal-transmission-id");
  const transmissionSig = options.headers.get("paypal-transmission-sig");
  const transmissionTime = options.headers.get("paypal-transmission-time");

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return false;
  }
  if (!isPayPalCertUrl(certUrl)) {
    return false;
  }

  const accessToken = await getPayPalAccessToken();
  const response = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: options.event,
    }),
  });

  const payload = (await response.json()) as { verification_status?: string };
  return payload.verification_status === "SUCCESS";
}

export function getCaptureFromOrder(order: PayPalOrder) {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    projectId: unit?.custom_id ?? null,
    captureId: capture?.id ?? null,
    status: capture?.status ?? order.status ?? null,
    amountCents: capture?.amount?.value ? paypalValueToCents(capture.amount.value) : null,
    currency: capture?.amount?.currency_code ?? unit?.amount?.currency_code ?? null,
  };
}
