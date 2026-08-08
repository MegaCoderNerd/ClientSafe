import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const localStorageToken = process.env.LOCAL_STORAGE_TOKEN ?? "mock-local-token";
  const token = new URL(request.url).searchParams.get("token");

  if (token !== localStorageToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const asset = await prisma.asset.findUnique({
    where: { id: (await context.params).assetId },
  });

  if (!asset || !asset.isUnlocked) {
    return NextResponse.json({ error: "Asset not available" }, { status: 404 });
  }

  return NextResponse.redirect(asset.originalFileUrl);
}
