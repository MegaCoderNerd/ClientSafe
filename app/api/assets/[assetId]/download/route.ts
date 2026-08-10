import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { project: true },
  });

  if (!asset) {
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
