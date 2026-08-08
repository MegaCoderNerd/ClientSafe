import Stripe from "stripe";

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey || secretKey === "sk_test_your_key") {
    throw new Error("STRIPE_SECRET_KEY is missing");
  }

  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
  });
}
