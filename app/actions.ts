"use server";

import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getPlatformFeePercent, splitVaultPrice } from "@/lib/paypal";
import { supabase } from "@/lib/supabase";

type ActionResult = { ok: true; projectId: string } | { ok: false; error: string };

function publicError(error: { message?: string; code?: string; details?: string } | null, fallback: string) {
  if (error?.code === "23503") {
    return "The selected client or your account is missing. Sign out, sign in again, and retry.";
  }
  if (error?.code === "23502") {
    return "Vault could not be saved because a required field was missing.";
  }
  if (error?.code === "23505") {
    return "A vault with this identity already exists. Please try again.";
  }
  return fallback;
}

async function resolveUserId(user: { id?: string; email?: string | null }) {
  if (user.id) {
    const { data } = await supabase.from("User").select("id").eq("id", user.id).maybeSingle();
    if (data?.id) return data.id;
  }

  if (user.email) {
    const { data } = await supabase
      .from("User")
      .select("id")
      .eq("email", user.email.trim().toLowerCase())
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return { ok: false, error: "Authentication required to create a vault." };
  }

  const clientId = String(formData.get("clientId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase();
  const previewUrl = String(formData.get("previewUrl") ?? "").trim();
  const originalFileUrl = String(formData.get("originalFileUrl") ?? "").trim();
  const priceInDollars = Number(formData.get("price") ?? "0");

  if (
    !clientId ||
    !title ||
    !description ||
    !currency ||
    !previewUrl ||
    !originalFileUrl ||
    Number.isNaN(priceInDollars) ||
    priceInDollars <= 0
  ) {
    return { ok: false, error: "Please provide valid vault and asset details." };
  }

  const freelancerId = await resolveUserId(session.user);
  if (!freelancerId) {
    return { ok: false, error: "Your account was not found. Sign out and sign in again." };
  }

  if (clientId === freelancerId) {
    return { ok: false, error: "Choose a client other than yourself." };
  }

  const { data: client } = await supabase.from("User").select("id").eq("id", clientId).maybeSingle();
  if (!client?.id) {
    return { ok: false, error: "Selected client was not found." };
  }

  // Prisma @default(cuid()) is client-side only; Postgres has no id default.
  const projectId = randomUUID();
  const price = Math.round(priceInDollars * 100);
  const fees = splitVaultPrice(price, getPlatformFeePercent());
  const { data: project, error: projectError } = await supabase
    .from("DeliveryProject")
    .insert({
      id: projectId,
      title,
      description,
      currency,
      price,
      paymentStatus: "PENDING",
      freelancerId,
      clientId,
      platformFeePercent: fees.platformFeePercent,
      platformFeeAmount: fees.platformFeeAmount,
      freelancerPayoutAmount: fees.freelancerPayoutAmount,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("[createProject] insert failed", projectError);
    return { ok: false, error: publicError(projectError, "Failed to create project") };
  }

  const { error: assetError } = await supabase.from("Asset").insert({
    id: randomUUID(),
    projectId: project.id,
    previewUrl,
    originalFileUrl,
    isUnlocked: false,
  });

  if (assetError) {
    console.error("[createProject] asset insert failed", assetError);
    await supabase.from("DeliveryProject").delete().eq("id", project.id);
    return { ok: false, error: publicError(assetError, "Failed to create asset") };
  }

  revalidatePath("/");
  return { ok: true, projectId: project.id };
}
