import { captureAndFulfillPayPalOrder, fulfillPaidVault } from "@/lib/fulfill-payment";
import { paypalValueToCents, verifyPayPalWebhook } from "@/lib/paypal";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PayPalCaptureResource = {
  id?: string;
  status?: string;
  custom_id?: string;
  amount?: { value?: string; currency_code?: string };
  supplementary_data?: { related_ids?: { order_id?: string } };
  purchase_units?: Array<{ custom_id?: string }>;
};

type PayPalWebhookEvent = {
  event_type?: string;
  resource?: PayPalCaptureResource;
};

export async function POST(request: Request) {
  const event = (await request.json()) as PayPalWebhookEvent;

  try {
    const verified = await verifyPayPalWebhook({ headers: request.headers, event });
    if (!verified) {
      return NextResponse.json({ error: "Invalid PayPal webhook signature." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "PayPal webhook verification is not configured." }, { status: 500 });
  }

  try {
    if (event.event_type === "CHECKOUT.ORDER.APPROVED" && event.resource?.id) {
      await captureAndFulfillPayPalOrder(event.resource.id, event.resource.purchase_units?.[0]?.custom_id);
    }

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = event.resource;
      const captureId = resource?.id;
      const orderId = resource?.supplementary_data?.related_ids?.order_id;
      const amountCents = resource?.amount?.value ? paypalValueToCents(resource.amount.value) : null;
      let projectId = resource?.custom_id ?? resource?.purchase_units?.[0]?.custom_id;

      if (!projectId && orderId) {
        const { data: project } = await supabase
          .from("DeliveryProject")
          .select("id")
          .eq("paypalOrderId", orderId)
          .maybeSingle();
        projectId = project?.id;
      }

      if (projectId && captureId && orderId && amountCents != null && resource?.status === "COMPLETED") {
        await fulfillPaidVault({
          projectId,
          paypalOrderId: orderId,
          paypalCaptureId: captureId,
          capturedAmountCents: amountCents,
        });
      } else if (orderId) {
        await captureAndFulfillPayPalOrder(orderId, projectId);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process PayPal webhook.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
