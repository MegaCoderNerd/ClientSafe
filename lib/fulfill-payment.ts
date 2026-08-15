import { revalidatePath } from "next/cache";
import {
  capturePayPalOrder,
  getCaptureFromOrder,
  getPayPalOrder,
  type PayPalOrder,
} from "@/lib/paypal";
import { supabase } from "@/lib/supabase";

export async function fulfillPaidVault(options: {
  projectId: string;
  paypalOrderId: string;
  paypalCaptureId: string;
  capturedAmountCents: number;
}) {
  const { data: project, error } = await supabase
    .from("DeliveryProject")
    .select("id, price, paymentStatus, paypalCaptureId")
    .eq("id", options.projectId)
    .maybeSingle();

  if (error || !project) {
    throw new Error("Vault not found for PayPal order");
  }

  if (project.price !== options.capturedAmountCents) {
    throw new Error("Captured amount does not match vault price");
  }

  const alreadyFulfilled =
    project.paymentStatus === "COMPLETED" ||
    (project.paypalCaptureId != null && project.paypalCaptureId === options.paypalCaptureId);

  if (!alreadyFulfilled) {
    const { error: projectError } = await supabase
      .from("DeliveryProject")
      .update({
        paymentStatus: "COMPLETED",
        paypalOrderId: options.paypalOrderId,
        paypalCaptureId: options.paypalCaptureId,
      })
      .eq("id", project.id)
      .eq("paymentStatus", "PENDING");

    if (projectError) {
      throw new Error("Failed to mark vault as paid");
    }
  }

  const { data: unlockedAsset, error: assetError } = await supabase
    .from("Asset")
    .update({ isUnlocked: true })
    .eq("projectId", project.id)
    .select("id")
    .maybeSingle();

  if (assetError || !unlockedAsset) {
    throw new Error("Failed to unlock asset");
  }

  revalidatePath("/");
  revalidatePath(`/p/${project.id}`);
  return { alreadyFulfilled };
}

function assertCompletedCapture(order: PayPalOrder, expectedProjectId?: string) {
  const capture = getCaptureFromOrder(order);
  const projectId = capture.projectId ?? expectedProjectId ?? null;
  if (!projectId || !capture.captureId || capture.amountCents == null) {
    throw new Error("Incomplete PayPal capture");
  }
  if (capture.projectId && expectedProjectId && capture.projectId !== expectedProjectId) {
    throw new Error("PayPal order does not match this vault");
  }
  if (capture.status !== "COMPLETED") {
    throw new Error("PayPal capture is not completed");
  }
  return {
    projectId,
    captureId: capture.captureId,
    amountCents: capture.amountCents,
  };
}

export async function captureAndFulfillPayPalOrder(orderId: string, expectedProjectId?: string) {
  let order = await capturePayPalOrder(orderId);
  if (!order.purchase_units?.[0]?.payments?.captures?.length) {
    order = await getPayPalOrder(orderId);
  }
  const capture = assertCompletedCapture(order, expectedProjectId);
  return fulfillPaidVault({
    projectId: capture.projectId,
    paypalOrderId: order.id,
    paypalCaptureId: capture.captureId,
    capturedAmountCents: capture.amountCents,
  });
}
