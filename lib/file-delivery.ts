import { createReadStream } from "fs";
import { stat, unlink } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";

const PUBLIC_ROOT = path.resolve(process.cwd(), "public");
const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "uploads");

export function contentTypeFor(filePath: string) {
  if (filePath.endsWith(".zip")) return "application/zip";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".gif")) return "image/gif";
  if (filePath.endsWith(".pdf")) return "application/pdf";
  if (filePath.endsWith(".mp4")) return "video/mp4";
  if (filePath.endsWith(".webm")) return "video/webm";
  if (filePath.endsWith(".html") || filePath.endsWith(".htm")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".woff")) return "font/woff";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

function isInside(resolved: string, root: string) {
  return resolved === root || resolved.startsWith(root + path.sep);
}

export function resolveDeliverableFile(originalFileUrl: string) {
  if (originalFileUrl.startsWith("/stock/") || originalFileUrl.startsWith("/uploads/")) {
    const relative = originalFileUrl.replace(/^\/+/, "").replace(/\//g, path.sep);
    const resolved = path.resolve(PUBLIC_ROOT, relative);
    return isInside(resolved, PUBLIC_ROOT) ? resolved : null;
  }

  if (originalFileUrl.startsWith("/storage-uploads/")) {
    const relative = originalFileUrl.replace(/^\/storage-uploads\//, "").replace(/\//g, path.sep);
    const resolved = path.resolve(STORAGE_ROOT, relative);
    return isInside(resolved, STORAGE_ROOT) ? resolved : null;
  }

  return null;
}

export async function removeOwnedUpload(url?: string | null) {
  if (!url || url.startsWith("/stock/")) return;
  if (!url.startsWith("/uploads/") && !url.startsWith("/storage-uploads/")) return;
  const localFile = resolveDeliverableFile(url);
  if (!localFile) return;
  await unlink(localFile).catch(() => {});
}

function contentDisposition(fileName: string) {
  const fallback = fileName.replace(/[^\w.\-]+/g, "_") || "download";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function streamLocalFile(filePath: string, fileName: string) {
  const fileStat = await stat(filePath);
  const nodeStream = createReadStream(filePath);
  const body = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentTypeFor(filePath),
      "Content-Length": String(fileStat.size),
      "Content-Disposition": contentDisposition(fileName),
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    },
  });
}
