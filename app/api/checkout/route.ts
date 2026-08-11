import { getStripeClient } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type CheckoutPayload = {
  projectId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as CheckoutPayload;

  if (!body.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const { data: project, error: projErr } = await supabase
    .from("DeliveryProject")
    .select("*, asset:Asset(*)")
    .eq("id", body.projectId)
    .single();

  if (projErr || !project || !project.asset) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const origin = request.headers.get("origin") ?? "http://localhost:3000";
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: project.currency.toLowerCase(),
            product_data: {
              name: project.title,
              description: project.description,
            },
            unit_amount: project.price,
          },
        },
      ],
      metadata: {
        projectId: project.id,
      },
      success_url: `${origin}/p/${project.id}?paid=true`,
      cancel_url: `${origin}/p/${project.id}?canceled=true`,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
