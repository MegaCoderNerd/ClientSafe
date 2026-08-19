import { captureAndFulfillPayPalOrder } from "@/lib/fulfill-payment";
import { PayPalApiError } from "@/lib/paypal";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CapturePayload = {
  token?: string;
  projectId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as CapturePayload;
  const orderId = body.token?.trim();

  if (!orderId) {
    return NextResponse.json({ error: "PayPal order token is required." }, { status: 400 });
  }

  try {
    const result = await captureAndFulfillPayPalOrder(orderId, body.projectId);
    if (result.missing) {
      return NextResponse.json({ error: "This vault is no longer available." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to capture PayPal payment.";
    const issue = error instanceof PayPalApiError ? error.issue : null;
    return NextResponse.json({ error: message, issue }, { status: 400 });
  }
}
