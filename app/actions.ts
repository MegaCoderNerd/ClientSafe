"use server";

import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { extractDemoZip } from "@/lib/extract-demo";
import { resolveDeliverableFile } from "@/lib/file-delivery";
import { getPlatformFeePercent, splitVaultPrice } from "@/lib/paypal";
import { createDemoPreviewLink } from "@/lib/preview";
import { STOCK_ASSETS } from "@/lib/stock-assets";
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

  const clientEmail = String(formData.get("clientEmail") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase();
  const previewUrl = String(formData.get("previewUrl") ?? "").trim();
  const previewVideoUrl = String(formData.get("previewVideoUrl") ?? "").trim();
  const demoIndexUrl = String(formData.get("demoIndexUrl") ?? "").trim();
  const demoZipUrl = String(formData.get("demoZipUrl") ?? "").trim();
  const originalFileUrl = String(formData.get("originalFileUrl") ?? "").trim();
  const priceInDollars = Number(formData.get("price") ?? "0");

  if (
    !clientEmail ||
    !title ||
    !description ||
    !currency ||
    !originalFileUrl ||
    (!previewUrl && !previewVideoUrl) ||
    Number.isNaN(priceInDollars) ||
    priceInDollars <= 0
  ) {
    return { ok: false, error: "Please provide valid vault and asset details." };
  }

  const freelancerLookup = resolveUserId(session.user);
  const clientLookup = supabase.from("User").select("id").eq("email", clientEmail).maybeSingle();
  const [{ freelancerId }, { data: client }] = await Promise.all([
    freelancerLookup.then((id) => ({ freelancerId: id })),
    clientLookup,
  ]);

  if (!freelancerId) {
    return { ok: false, error: "Your account was not found. Sign out and sign in again." };
  }

  if (client?.id === freelancerId) {
    return { ok: false, error: "Choose a client other than yourself." };
  }

  if (demoIndexUrl && !demoZipUrl) {
    const allowedStockDemo = STOCK_ASSETS.some((asset) => asset.demoIndexUrl === demoIndexUrl);
    if (!allowedStockDemo) {
      return { ok: false, error: "Invalid live demo preview." };
    }
  }

  if (!client?.id) {
    return { ok: false, error: "Client with this email was not found." };
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
      clientId: client.id,
      platformFeePercent: fees.platformFeePercent,
      platformFeeAmount: fees.platformFeeAmount,
      freelancerPayoutAmount: fees.freelancerPayoutAmount,
      createdAt: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("[createProject] insert failed", projectError);
    return { ok: false, error: publicError(projectError, "Failed to create project") };
  }

  const assetId = randomUUID();
  let resolvedDemoIndex = demoIndexUrl || null;

  if (demoZipUrl) {
    const zipPath = resolveDeliverableFile(demoZipUrl);
    if (!zipPath) {
      await supabase.from("DeliveryProject").delete().eq("id", project.id);
      return { ok: false, error: "Demo zip could not be read." };
    }
    try {
      const zipBytes = await readFile(zipPath);
      const indexPath = await extractDemoZip(assetId, zipBytes);
      resolvedDemoIndex = createDemoPreviewLink(assetId, indexPath);
    } catch (demoError) {
      console.error("[createProject] demo extract failed", demoError);
      await supabase.from("DeliveryProject").delete().eq("id", project.id);
      return {
        ok: false,
        error: demoError instanceof Error ? demoError.message : "Failed to extract demo zip",
      };
    }
  }

  const { error: assetError } = await supabase.from("Asset").insert({
    id: assetId,
    projectId: project.id,
    previewUrl: previewUrl || "/stock/video-poster.svg",
    previewVideoUrl: previewVideoUrl || null,
    demoIndexUrl: resolvedDemoIndex,
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

async function extractUploadedDemo(assetId: string, demoZipUrl: string) {
  const zipPath = resolveDeliverableFile(demoZipUrl);
  if (!zipPath) {
    throw new Error("Demo zip could not be read.");
  }
  const zipBytes = await readFile(zipPath);
  const indexPath = await extractDemoZip(assetId, zipBytes);
  return createDemoPreviewLink(assetId, indexPath);
}

export async function updateProject(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false, error: "Authentication required to edit a vault." };
  }

  const projectId = String(formData.get("projectId") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase();
  const previewUrl = String(formData.get("previewUrl") ?? "").trim();
  const previewVideoUrl = String(formData.get("previewVideoUrl") ?? "").trim();
  const demoIndexUrl = String(formData.get("demoIndexUrl") ?? "").trim();
  const demoZipUrl = String(formData.get("demoZipUrl") ?? "").trim();
  const originalFileUrl = String(formData.get("originalFileUrl") ?? "").trim();
  const priceInDollars = Number(formData.get("price") ?? "0");

  if (
    !projectId ||
    !clientEmail ||
    !title ||
    !description ||
    !currency ||
    Number.isNaN(priceInDollars) ||
    priceInDollars <= 0
  ) {
    return { ok: false, error: "Please provide valid vault details." };
  }

  const freelancerId = await resolveUserId(session.user);
  if (!freelancerId) {
    return { ok: false, error: "Your account was not found. Sign out and sign in again." };
  }

  const { data: client } = await supabase.from("User").select("id").eq("email", clientEmail).maybeSingle();
  if (!client?.id) {
    return { ok: false, error: "Client with this email was not found." };
  }

  if (client.id === freelancerId) {
    return { ok: false, error: "Choose a client other than yourself." };
  }

  const { data: project, error: projectError } = await supabase
    .from("DeliveryProject")
    .select("id, freelancerId, clientId, paymentStatus, price, asset:Asset(id, previewUrl, previewVideoUrl, demoIndexUrl, originalFileUrl)")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return { ok: false, error: "Vault not found." };
  }

  if (project.freelancerId !== freelancerId) {
    return { ok: false, error: "Only the vault owner can edit this delivery." };
  }

  if (project.paymentStatus !== "PENDING") {
    return { ok: false, error: "Paid vaults cannot be edited." };
  }

  const asset = Array.isArray(project.asset) ? project.asset[0] : project.asset;
  if (!asset?.id) {
    return { ok: false, error: "Vault asset was not found." };
  }

  const nextPreviewUrl = previewUrl || asset.previewUrl;
  const nextOriginalUrl = originalFileUrl || asset.originalFileUrl;

  if (!nextPreviewUrl && !previewVideoUrl) {
    return { ok: false, error: "A preview image or video is required." };
  }

  if (demoIndexUrl && !demoZipUrl && demoIndexUrl !== asset.demoIndexUrl) {
    const allowedStockDemo = STOCK_ASSETS.some((item) => item.demoIndexUrl === demoIndexUrl);
    if (!allowedStockDemo) {
      return { ok: false, error: "Invalid live demo preview." };
    }
  }

  const price = Math.round(priceInDollars * 100);
  const fees = splitVaultPrice(price, getPlatformFeePercent());
  const clientOrPriceChanged = client.id !== project.clientId || price !== project.price;

  let resolvedDemoIndex = demoIndexUrl || null;
  if (demoZipUrl) {
    try {
      resolvedDemoIndex = await extractUploadedDemo(asset.id, demoZipUrl);
    } catch (demoError) {
      console.error("[updateProject] demo extract failed", demoError);
      return {
        ok: false,
        error: demoError instanceof Error ? demoError.message : "Failed to extract demo zip",
      };
    }
  }

  const { error: updateError } = await supabase
    .from("DeliveryProject")
    .update({
      title,
      description,
      currency,
      price,
      clientId: client.id,
      platformFeePercent: fees.platformFeePercent,
      platformFeeAmount: fees.platformFeeAmount,
      freelancerPayoutAmount: fees.freelancerPayoutAmount,
      ...(clientOrPriceChanged ? { paypalOrderId: null } : {}),
    })
    .eq("id", project.id)
    .eq("paymentStatus", "PENDING");

  if (updateError) {
    console.error("[updateProject] project update failed", updateError);
    return { ok: false, error: publicError(updateError, "Failed to update vault") };
  }

  const { error: assetError } = await supabase
    .from("Asset")
    .update({
      previewUrl: nextPreviewUrl || "/stock/video-poster.svg",
      previewVideoUrl: previewVideoUrl || null,
      demoIndexUrl: resolvedDemoIndex,
      originalFileUrl: nextOriginalUrl,
    })
    .eq("id", asset.id);

  if (assetError) {
    console.error("[updateProject] asset update failed", assetError);
    return { ok: false, error: publicError(assetError, "Failed to update asset") };
  }

  revalidatePath("/");
  revalidatePath(`/p/${project.id}`);
  revalidatePath(`/p/${project.id}/edit`);
  return { ok: true, projectId: project.id };
}
