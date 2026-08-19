import { supabase } from "@/lib/supabase";
import { STOCK_ASSETS } from "@/lib/stock-assets";

const DEMO_USERS = [
  {
    id: "freelancer-demo",
    email: "freelancer@clientvault.dev",
    name: "Freelancer Demo",
    password: "demo123",
  },
  {
    id: "client-demo",
    email: "client@clientvault.dev",
    name: "Client Demo",
    password: "demo123",
  },
] as const;

async function ensureUser(user: (typeof DEMO_USERS)[number]) {
  const { data: existing } = await supabase
    .from("User")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("User")
    .upsert(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        password: user.password,
      },
      { onConflict: "email" },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[demo] user upsert failed", error);
  }

  return created?.id ?? user.id;
}

async function ensureProject(options: {
  id: string;
  assetId: string;
  stockId: "landing-page" | "brand-kit";
  paymentStatus: "PENDING" | "COMPLETED";
  isUnlocked: boolean;
  freelancerId: string;
  clientId: string;
}) {
  const stock = STOCK_ASSETS.find((asset) => asset.id === options.stockId);
  if (!stock) return;

  const { error: projectError } = await supabase.from("DeliveryProject").upsert(
    {
      id: options.id,
      title: stock.title,
      description: stock.description,
      price: Math.round(stock.price * 100),
      currency: "USD",
      paymentStatus: options.paymentStatus,
      freelancerId: options.freelancerId,
      clientId: options.clientId,
    },
    { onConflict: "id" },
  );

  if (projectError) {
    console.error("[demo] project upsert failed", projectError);
    return;
  }

  const { data: existingAsset } = await supabase
    .from("Asset")
    .select("id")
    .eq("projectId", options.id)
    .maybeSingle();

  const assetPayload = {
    previewUrl: stock.previewUrl,
    previewVideoUrl: stock.previewVideoUrl ?? null,
    demoIndexUrl: stock.demoIndexUrl ?? null,
    originalFileUrl: stock.originalFileUrl,
    isUnlocked: options.isUnlocked,
    projectId: options.id,
  };

  if (existingAsset?.id) {
    const { error: updateError } = await supabase
      .from("Asset")
      .update(assetPayload)
      .eq("id", existingAsset.id);

    if (updateError) console.error("[demo] asset update failed", updateError);
    return;
  }

  const { error: insertError } = await supabase.from("Asset").insert({
    id: options.assetId,
    ...assetPayload,
  });

  if (insertError) console.error("[demo] asset insert failed", insertError);
}

export async function ensureDemoWorkspace() {
  try {
    const landing = STOCK_ASSETS.find((asset) => asset.id === "landing-page");
    const brand = STOCK_ASSETS.find((asset) => asset.id === "brand-kit");
    const [{ data: existingProjects }, { data: existingAssets }] = await Promise.all([
      supabase.from("DeliveryProject").select("id").in("id", ["demo-locked-project", "demo-unlocked-project"]),
      supabase
        .from("Asset")
        .select("projectId, previewUrl, demoIndexUrl")
        .in("projectId", ["demo-locked-project", "demo-unlocked-project"]),
    ]);

    const hasLocked = Boolean(existingProjects?.some((project) => project.id === "demo-locked-project"));
    const hasUnlocked = Boolean(existingProjects?.some((project) => project.id === "demo-unlocked-project"));
    const lockedReady = existingAssets?.some(
      (asset) =>
        asset.projectId === "demo-locked-project" &&
        asset.previewUrl === landing?.previewUrl &&
        asset.demoIndexUrl === landing?.demoIndexUrl,
    );
    const unlockedReady = existingAssets?.some(
      (asset) => asset.projectId === "demo-unlocked-project" && asset.previewUrl === brand?.previewUrl,
    );

    if (lockedReady && unlockedReady) return;

    const freelancerId = await ensureUser(DEMO_USERS[0]);
    const clientId = await ensureUser(DEMO_USERS[1]);

    if (!hasLocked && !hasUnlocked) {
      await ensureProject({
        id: "demo-locked-project",
        assetId: "demo-locked-asset",
        stockId: "landing-page",
        paymentStatus: "PENDING",
        isUnlocked: false,
        freelancerId,
        clientId,
      });
      await ensureProject({
        id: "demo-unlocked-project",
        assetId: "demo-unlocked-asset",
        stockId: "brand-kit",
        paymentStatus: "COMPLETED",
        isUnlocked: true,
        freelancerId,
        clientId,
      });
      return;
    }

    if (hasLocked && !lockedReady) {
      await ensureProject({
        id: "demo-locked-project",
        assetId: "demo-locked-asset",
        stockId: "landing-page",
        paymentStatus: "PENDING",
        isUnlocked: false,
        freelancerId,
        clientId,
      });
    }

    if (hasUnlocked && !unlockedReady) {
      await ensureProject({
        id: "demo-unlocked-project",
        assetId: "demo-unlocked-asset",
        stockId: "brand-kit",
        paymentStatus: "COMPLETED",
        isUnlocked: true,
        freelancerId,
        clientId,
      });
    }
  } catch (error) {
    console.error("[demo] workspace seed failed", error);
  }
}
