import { authOptions } from "@/lib/auth";
import { isMissingColumnError } from "@/lib/delivery-project";
import { captureAndFulfillPayPalOrder, fulfillPaidVault } from "@/lib/fulfill-payment";
import {
  createAndCaptureSandboxTestCard,
  createPayPalOrder,
  findPayPalOrder,
  getCaptureFromOrder,
  getPayPalApproveUrl,
  getPayPalMode,
  isCompletedPayPalOrder,
  PayPalApiError,
} from "@/lib/paypal";
import { getAppUrl } from "@/lib/supabase-env";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CheckoutPayload = {
  projectId?: string;
  sandboxTest?: boolean;
};

type ProjectRow = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  paymentStatus: string;
  clientId: string;
  freelancerId: string;
  paypalOrderId: string | null;
};

function alreadyPaid() {
  return NextResponse.json({ paid: true });
}

async function markCheckoutStarted(projectId: string) {
  const stamped = await supabase
    .from("DeliveryProject")
    .update({ checkoutStartedAt: new Date().toISOString() })
    .eq("id", projectId)
    .eq("paymentStatus", "PENDING")
    .select("id")
    .maybeSingle();
  if (!stamped.error) return stamped;
  if (!isMissingColumnError(stamped.error)) return stamped;
  return supabase.from("DeliveryProject").select("id").eq("id", projectId).eq("paymentStatus", "PENDING").maybeSingle();
}

async function claimPayPalOrder(options: {
  projectId: string;
  orderId: string;
  replaceOrderId: string | null;
}) {
  const payloads = [
    { paypalOrderId: options.orderId, checkoutStartedAt: new Date().toISOString() },
    { paypalOrderId: options.orderId },
  ];

  for (const payload of payloads) {
    const claim = (filter: { column: "paypalOrderId"; value: string | null }) => {
      let query = supabase
        .from("DeliveryProject")
        .update(payload)
        .eq("id", options.projectId)
        .eq("paymentStatus", "PENDING");
      query = filter.value == null ? query.is(filter.column, null) : query.eq(filter.column, filter.value);
      return query.select("paypalOrderId").maybeSingle();
    };

    const created = await claim({ column: "paypalOrderId", value: null });
    if (created.data) return created.data;
    if (created.error && !isMissingColumnError(created.error) && payload.checkoutStartedAt) {
      return null;
    }
    if (created.error && isMissingColumnError(created.error)) continue;

    if (options.replaceOrderId) {
      const replaced = await claim({ column: "paypalOrderId", value: options.replaceOrderId });
      if (replaced.data) return replaced.data;
      if (replaced.error && isMissingColumnError(replaced.error)) continue;
    }
    if (!created.error) return null;
  }

  return null;
}

async function sandboxTestPay(vault: ProjectRow) {
  try {
    const order = await createAndCaptureSandboxTestCard({
      projectId: vault.id,
      title: vault.title,
      currency: vault.currency,
      amountCents: vault.price,
    });
    const capture = getCaptureFromOrder(order);
    if (!order.id || !capture.captureId || capture.amountCents == null || capture.status !== "COMPLETED") {
      throw new PayPalApiError("Sandbox test card capture is incomplete", { issue: capture.status });
    }
    const result = await fulfillPaidVault({
      projectId: vault.id,
      paypalOrderId: order.id,
      paypalCaptureId: capture.captureId,
      capturedAmountCents: capture.amountCents,
    });
    if (result.missing) {
      return NextResponse.json({ error: "This vault is no longer available." }, { status: 404 });
    }
    return alreadyPaid();
  } catch {
    const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const result = await fulfillPaidVault({
      projectId: vault.id,
      paypalOrderId: `SANDBOX-ORDER-${stamp}`,
      paypalCaptureId: `SANDBOX-CAPTURE-${stamp}`,
      capturedAmountCents: vault.price,
    });
    if (result.missing) {
      return NextResponse.json({ error: "This vault is no longer available." }, { status: 404 });
    }
    return alreadyPaid();
  }
}

async function fulfillIfPayPalAlreadyPaid(orderId: string, projectId: string) {
  const stored = await findPayPalOrder(orderId);
  if (!stored || !isCompletedPayPalOrder(stored)) return null;
  const result = await captureAndFulfillPayPalOrder(stored.id, projectId);
  if (result.missing) {
    return NextResponse.json({ error: "This vault is no longer available." }, { status: 404 });
  }
  return alreadyPaid();
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Sign in to pay for this vault." }, { status: 401 });
  }

  const body = (await request.json()) as CheckoutPayload;
  if (!body.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const { data: project, error: projErr } = await supabase
    .from("DeliveryProject")
    .select("id, title, description, price, currency, paymentStatus, clientId, freelancerId, paypalOrderId")
    .eq("id", body.projectId)
    .maybeSingle();

  if (projErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const vault = project as ProjectRow;

  if (vault.freelancerId === userId) {
    return NextResponse.json({ error: "Vault owners cannot pay for their own vault." }, { status: 403 });
  }

  if (vault.clientId !== userId) {
    return NextResponse.json({ error: "Only the invited client can pay for this vault." }, { status: 403 });
  }

  if (vault.paymentStatus === "COMPLETED") {
    return alreadyPaid();
  }

  if (body.sandboxTest) {
    if (getPayPalMode() !== "sandbox") {
      return NextResponse.json({ error: "Sandbox test payments are disabled in live mode." }, { status: 403 });
    }
    return sandboxTestPay(vault);
  }

  try {
    const marked = await markCheckoutStarted(vault.id);

    if (!marked.data) {
      const { data: latest } = await supabase
        .from("DeliveryProject")
        .select("paymentStatus")
        .eq("id", vault.id)
        .maybeSingle();
      if (!latest) {
        return NextResponse.json({ error: "This vault is no longer available." }, { status: 404 });
      }
      if (latest.paymentStatus === "COMPLETED") {
        return alreadyPaid();
      }
      return NextResponse.json({ error: "Unable to start checkout for this vault." }, { status: 409 });
    }

    let replaceOrderId: string | null = null;

    if (vault.paypalOrderId) {
      try {
        const paid = await fulfillIfPayPalAlreadyPaid(vault.paypalOrderId, vault.id);
        if (paid) return paid;
        replaceOrderId = vault.paypalOrderId;
      } catch {
        replaceOrderId = vault.paypalOrderId;
      }
    }

    const order = await createPayPalOrder({
      projectId: vault.id,
      title: vault.title,
      currency: vault.currency,
      amountCents: vault.price,
      returnUrl: getAppUrl(`/p/${vault.id}`, request),
      cancelUrl: getAppUrl(`/p/${vault.id}?canceled=true`, request),
    });

    const approveUrl = getPayPalApproveUrl(order);
    if (!approveUrl) {
      return NextResponse.json({ error: "PayPal did not return an approval URL." }, { status: 502 });
    }

    const claimed = await claimPayPalOrder({
      projectId: vault.id,
      orderId: order.id,
      replaceOrderId,
    });

    if (claimed?.paypalOrderId === order.id) {
      return NextResponse.json({ approveUrl });
    }

    const { data: latest } = await supabase
      .from("DeliveryProject")
      .select("paymentStatus, paypalOrderId")
      .eq("id", vault.id)
      .maybeSingle();

    if (!latest) {
      return NextResponse.json({ error: "This vault is no longer available." }, { status: 404 });
    }

    if (latest.paymentStatus === "COMPLETED") {
      return alreadyPaid();
    }

    if (latest.paypalOrderId) {
      const paid = await fulfillIfPayPalAlreadyPaid(latest.paypalOrderId, vault.id);
      if (paid) return paid;
    }

    return NextResponse.json({ error: "Unable to start checkout for this vault." }, { status: 409 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
