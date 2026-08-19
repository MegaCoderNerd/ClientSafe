import { authOptions } from "@/lib/auth";
import { verifyDemoAccessToken } from "@/lib/demo-access";
import { resolveDemoFile } from "@/lib/extract-demo";
import { contentTypeFor, streamLocalFile } from "@/lib/file-delivery";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import path from "path";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    assetId: string;
    path?: string[];
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { assetId, path: segments } = await context.params;
  const rawSegments = segments ?? [];
  const token = rawSegments[0] ?? "";
  const tokenOk = Boolean(token) && verifyDemoAccessToken(assetId, token);
  const fileSegments = tokenOk ? rawSegments.slice(1) : rawSegments;

  const { data: asset, error } = await supabase
    .from("Asset")
    .select("id, demoIndexUrl, project:DeliveryProject(freelancerId, clientId)")
    .eq("id", assetId)
    .single();

  if (error || !asset || !asset.demoIndexUrl) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (!tokenOk) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = Array.isArray(asset.project) ? asset.project[0] : asset.project;
    if (!project) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    const allowed = session.user.id === project.freelancerId || session.user.id === project.clientId;
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const relative = fileSegments.join("/") || "index.html";
  const filePath = resolveDemoFile(assetId, relative);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid demo path" }, { status: 400 });
  }

  try {
    const fileName = path.basename(filePath);
    const response = await streamLocalFile(filePath, fileName);
    const headers = new Headers(response.headers);
    headers.set("Content-Type", contentTypeFor(filePath));
    headers.set("Content-Disposition", "inline");
    headers.set("X-Content-Type-Options", "nosniff");
    if (filePath.endsWith(".html") || filePath.endsWith(".htm")) {
      headers.set("Content-Security-Policy", "sandbox allow-scripts");
    }
    return new NextResponse(response.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Demo file missing" }, { status: 404 });
  }
}
