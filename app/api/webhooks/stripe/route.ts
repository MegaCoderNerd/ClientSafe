import { getStripeClient } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 400 });
  }

  const stripe = getStripeClient();
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const projectId = session.metadata?.projectId;

    if (projectId) {
      // Mark project as paid and unlock asset
      await supabase.from("DeliveryProject").update({ paymentStatus: "COMPLETED" }).eq("id", projectId);
      await supabase.from("Asset").update({ isUnlocked: true }).eq("projectId", projectId);
      revalidatePath("/");
      revalidatePath(`/p/${projectId}`);
    }
  }

  return NextResponse.json({ received: true });
}
