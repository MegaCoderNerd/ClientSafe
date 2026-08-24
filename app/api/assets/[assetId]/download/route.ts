import { authOptions } from "@/lib/auth";
import { resolveDeliverableFile, streamLocalFile } from "@/lib/file-delivery";
import { isAppBucket, parseStorageRef } from "@/lib/object-storage";
import { getStockAssetByOriginalUrl } from "@/lib/stock-assets";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import path from "path";

export const dynamic = "force-dynamic";

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
    .select("id, originalFileUrl, isUnlocked, project:DeliveryProject(freelancerId, clientId, paymentStatus)")
    .eq("id", assetId)
    .single();

  if (error || !asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const project = Array.isArray(asset.project) ? asset.project[0] : asset.project;
  if (!project) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  const isVaultOwner = project.freelancerId === session.user.id;
  const isAssignedClient = project.clientId === session.user.id;
  const isPaid = project.paymentStatus === "COMPLETED";
  const allowed = isVaultOwner || (isPaid && isAssignedClient);

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized - payment required" }, { status: 403 });
  }

  if (isPaid && !asset.isUnlocked) {
    await supabase.from("Asset").update({ isUnlocked: true }).eq("id", asset.id);
  } else if (!asset.isUnlocked && !isVaultOwner) {
    return NextResponse.json({ error: "Asset not available" }, { status: 404 });
  }

  const localFile = resolveDeliverableFile(asset.originalFileUrl);
  if (localFile) {
    try {
      const stock = getStockAssetByOriginalUrl(asset.originalFileUrl);
      const fileName = stock?.originalFileName ?? path.basename(localFile);
      return await streamLocalFile(localFile, fileName);
    } catch {
      return NextResponse.json({ error: "Asset file missing" }, { status: 404 });
    }
  }

  const storageRef = parseStorageRef(asset.originalFileUrl);
  if (storageRef && isAppBucket(storageRef.bucket)) {
    const stock = getStockAssetByOriginalUrl(asset.originalFileUrl);
    const fileName = stock?.originalFileName ?? path.basename(storageRef.path);
    const { data, error: signError } = await supabase.storage
      .from(storageRef.bucket)
      .createSignedUrl(storageRef.path, 60, { download: fileName });
    if (signError || !data?.signedUrl) {
      return NextResponse.json({ error: "Asset file missing" }, { status: 404 });
    }
    return NextResponse.redirect(data.signedUrl);
  }

  if (asset.originalFileUrl.includes("/storage/v1/")) {
    return NextResponse.json({ error: "Asset file missing" }, { status: 404 });
  }

  const target = asset.originalFileUrl.startsWith("http")
    ? asset.originalFileUrl
    : new URL(asset.originalFileUrl, request.url).toString();

  return NextResponse.redirect(target);
}
