import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assetId = (await context.params).assetId;
  const { data: asset, error } = await supabase
    .from("Asset")
    .select("*, project:DeliveryProject(*)")
    .eq("id", assetId)
    .single();

  if (error || !asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const isVaultOwner = asset.project.freelancerId === session.user.id;
  const isPaid = asset.project.paymentStatus === "COMPLETED";

  if (!isVaultOwner && !isPaid) {
    return NextResponse.json({ error: "Unauthorized - payment required" }, { status: 403 });
  }

  if (!asset.isUnlocked && !isVaultOwner) {
    return NextResponse.json({ error: "Asset not available" }, { status: 404 });
  }

  return NextResponse.redirect(asset.originalFileUrl);
}
