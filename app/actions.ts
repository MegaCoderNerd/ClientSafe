"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function createProject(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Authentication required to create a vault.");
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
    throw new Error("Please provide valid vault and asset details.");
  }

  // Create the project, then the asset in Supabase.
  const { data: project, error: projectError } = await supabase
    .from("DeliveryProject")
    .insert({
      title,
      description,
      currency,
      price: Math.round(priceInDollars * 100),
      freelancerId: session.user.id,
      clientId,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    throw new Error("Failed to create project");
  }

  const { error: assetError } = await supabase.from("Asset").insert({
    projectId: project.id,
    previewUrl,
    originalFileUrl,
  });

  if (assetError) {
    throw new Error("Failed to create asset");
  }

  revalidatePath("/");
}
