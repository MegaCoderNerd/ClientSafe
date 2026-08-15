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
const PAYPAL_ORDER_TTL_MS = 3 * 60 * 60 * 1000 - 60_000;

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
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: options.returnUrl,
        cancel_url: options.cancelUrl,
      },
    }),
  });

  const order = (await response.json()) as PayPalOrder & { message?: string };
  if (!response.ok || !order.id) {
    throw new Error(order.message || "Unable to create PayPal order");
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
  if (!REUSABLE_ORDER_STATUSES.has(order.status ?? "")) return null;
  if (order.create_time) {
    const createdAt = Date.parse(order.create_time);
    if (Number.isFinite(createdAt) && Date.now() - createdAt >= PAYPAL_ORDER_TTL_MS) {
      return null;
    }
  }
  return getPayPalApproveUrl(order);
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

  const order = (await response.json()) as PayPalOrder & { message?: string; details?: Array<{ issue?: string }> };
  if (response.status === 422 && order.details?.some((detail) => detail.issue === "ORDER_ALREADY_CAPTURED")) {
    return getPayPalOrder(orderId);
  }
  if (!response.ok) {
    throw new Error(order.message || "Unable to capture PayPal order");
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
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID is missing");
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
