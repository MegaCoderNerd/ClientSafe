import { captureAndFulfillPayPalOrder } from "@/lib/fulfill-payment";
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
    await captureAndFulfillPayPalOrder(orderId, body.projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to capture PayPal payment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
