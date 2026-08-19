import { revalidatePath } from "next/cache";
import { isMissingColumnError } from "@/lib/delivery-project";
import {
  capturePayPalOrder,
  findPayPalOrder,
  getCaptureFromOrder,
  getPayPalOrder,
  PayPalApiError,
  shouldAbandonPayPalOrder,
  type PayPalOrder,
} from "@/lib/paypal";
import { supabase } from "@/lib/supabase";

export type FulfillResult = {
  alreadyFulfilled: boolean;
  missing?: boolean;
};

export async function fulfillPaidVault(options: {
  projectId: string;
  paypalOrderId: string;
  paypalCaptureId: string;
  capturedAmountCents: number;
}): Promise<FulfillResult> {
  const { data: project, error } = await supabase
    .from("DeliveryProject")
    .select("id, price, paymentStatus, paypalCaptureId")
    .eq("id", options.projectId)
    .maybeSingle();

  if (error || !project) {
    return { alreadyFulfilled: true, missing: true };
  }

  if (project.price !== options.capturedAmountCents) {
    throw new Error("Captured amount does not match vault price");
  }

  const alreadyFulfilled =
    project.paymentStatus === "COMPLETED" ||
    (project.paypalCaptureId != null && project.paypalCaptureId === options.paypalCaptureId);

  if (!alreadyFulfilled) {
    const { data: paid, error: projectError } = await supabase
      .from("DeliveryProject")
      .update({
        paymentStatus: "COMPLETED",
        paypalOrderId: options.paypalOrderId,
        paypalCaptureId: options.paypalCaptureId,
        paidAt: new Date().toISOString(),
      })
      .eq("id", project.id)
      .eq("paymentStatus", "PENDING")
      .select("id")
      .maybeSingle();

    if (projectError) {
      throw new Error("Failed to mark vault as paid");
    }

    if (!paid) {
      const { data: latest } = await supabase
        .from("DeliveryProject")
        .select("id, paymentStatus")
        .eq("id", project.id)
        .maybeSingle();
      if (!latest) {
        return { alreadyFulfilled: true, missing: true };
      }
      if (latest.paymentStatus !== "COMPLETED") {
        throw new Error("Failed to mark vault as paid");
      }
    }
  }

  const { data: unlockedAsset, error: assetError } = await supabase
    .from("Asset")
    .update({ isUnlocked: true })
    .eq("projectId", project.id)
    .select("id")
    .maybeSingle();

  if (assetError || !unlockedAsset) {
    const { data: latest } = await supabase
      .from("DeliveryProject")
      .select("id")
      .eq("id", project.id)
      .maybeSingle();
    if (!latest) {
      return { alreadyFulfilled: true, missing: true };
    }
    throw new Error("Failed to unlock asset");
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
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

async function vaultStillPayable(projectId?: string | null): Promise<FulfillResult | null> {
  if (!projectId) return null;
  const { data: vault } = await supabase
    .from("DeliveryProject")
    .select("id, paymentStatus")
    .eq("id", projectId)
    .maybeSingle();
  if (!vault) return { alreadyFulfilled: true, missing: true };
  if (vault.paymentStatus === "COMPLETED") return { alreadyFulfilled: true };
  return null;
}

export async function captureAndFulfillPayPalOrder(orderId: string, expectedProjectId?: string) {
  const existing = await findPayPalOrder(orderId);
  const hintedProjectId = expectedProjectId ?? existing?.purchase_units?.[0]?.custom_id ?? null;
  const blocked = await vaultStillPayable(hintedProjectId);
  if (blocked?.missing) return blocked;
  if (blocked?.alreadyFulfilled) return blocked;

  try {
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
  } catch (error) {
    const issue = error instanceof PayPalApiError ? error.issue : null;
    if (shouldAbandonPayPalOrder(issue) && hintedProjectId) {
      await abandonPayPalOrder(hintedProjectId, orderId);
    }
    throw error;
  }
}

async function abandonPayPalOrder(projectId: string, orderId: string) {
  const withGrace = await supabase
    .from("DeliveryProject")
    .update({ paypalOrderId: null, checkoutStartedAt: null })
    .eq("id", projectId)
    .eq("paypalOrderId", orderId)
    .eq("paymentStatus", "PENDING")
    .select("id")
    .maybeSingle();
  if (withGrace.error && isMissingColumnError(withGrace.error)) {
    await supabase
      .from("DeliveryProject")
      .update({ paypalOrderId: null })
      .eq("id", projectId)
      .eq("paypalOrderId", orderId)
      .eq("paymentStatus", "PENDING");
  }
}
