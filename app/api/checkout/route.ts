import { authOptions } from "@/lib/auth";
import { captureAndFulfillPayPalOrder } from "@/lib/fulfill-payment";
import {
  createPayPalOrder,
  findPayPalOrder,
  getPayPalApproveUrl,
  getReusablePayPalApproveUrl,
  isCompletedPayPalOrder,
} from "@/lib/paypal";
import { getAppOrigin } from "@/lib/supabase-env";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CheckoutPayload = {
  projectId?: string;
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

async function claimPayPalOrder(options: {
  projectId: string;
  orderId: string;
  replaceOrderId: string | null;
}) {
  const payload = { paypalOrderId: options.orderId };

  const claim = (filter: { column: "paypalOrderId"; value: string | null }) => {
    let query = supabase
      .from("DeliveryProject")
      .update(payload)
      .eq("id", options.projectId)
      .eq("paymentStatus", "PENDING");
    query = filter.value == null ? query.is(filter.column, null) : query.eq(filter.column, filter.value);
    return query.select("paypalOrderId").maybeSingle();
  };

  const { data: created } = await claim({ column: "paypalOrderId", value: null });
  if (created) return created;

  if (options.replaceOrderId) {
    const { data: replaced } = await claim({ column: "paypalOrderId", value: options.replaceOrderId });
    if (replaced) return replaced;
  }

  return null;
}

async function resumeStoredPayPalOrder(orderId: string, projectId: string) {
  const stored = await findPayPalOrder(orderId);
  if (!stored) return null;
  if (isCompletedPayPalOrder(stored)) {
    await captureAndFulfillPayPalOrder(stored.id, projectId);
    return alreadyPaid();
  }
  const approveUrl = getReusablePayPalApproveUrl(stored);
  if (approveUrl) {
    return NextResponse.json({ approveUrl });
  }
  return null;
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

  try {
    let replaceOrderId: string | null = null;

    if (vault.paypalOrderId) {
      try {
        const existing = await resumeStoredPayPalOrder(vault.paypalOrderId, vault.id);
        if (existing) return existing;
        replaceOrderId = vault.paypalOrderId;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to resume PayPal checkout.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    const origin = request.headers.get("origin")?.replace(/\/$/, "") || getAppOrigin();
    const order = await createPayPalOrder({
      projectId: vault.id,
      title: vault.title,
      currency: vault.currency,
      amountCents: vault.price,
      returnUrl: `${origin}/p/${vault.id}`,
      cancelUrl: `${origin}/p/${vault.id}?canceled=true`,
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

    if (!latest || latest.paymentStatus === "COMPLETED") {
      return alreadyPaid();
    }

    if (latest.paypalOrderId) {
      const resumed = await resumeStoredPayPalOrder(latest.paypalOrderId, vault.id);
      if (resumed) return resumed;
    }

    return NextResponse.json({ error: "Unable to start checkout for this vault." }, { status: 409 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
