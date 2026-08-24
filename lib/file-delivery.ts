import { createReadStream } from "fs";
import { readFile, stat, unlink } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import {
  downloadStorageBytes,
  fetchStorageObject,
  isAppBucket,
  parseStorageRef,
  removeStorageObject,
  type StorageRef,
} from "@/lib/object-storage";

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
  if (filePath.endsWith(".ttf")) return "font/ttf";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  if (filePath.endsWith(".map")) return "application/json";
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

export async function readOwnedBytes(url: string): Promise<Uint8Array | null> {
  const localFile = resolveDeliverableFile(url);
  if (localFile) {
    return new Uint8Array(await readFile(/* turbopackIgnore: true */ localFile));
  }
  const ref = parseStorageRef(url);
  if (!ref || !isAppBucket(ref.bucket)) return null;
  return downloadStorageBytes(ref);
}

export async function removeOwnedUpload(url?: string | null) {
  if (!url || url.startsWith("/stock/")) return;
  if (url.startsWith("/uploads/") || url.startsWith("/storage-uploads/")) {
    const localFile = resolveDeliverableFile(url);
    if (!localFile) return;
    await unlink(/* turbopackIgnore: true */ localFile).catch(() => {});
    return;
  }
  const ref = parseStorageRef(url);
  if (!ref || !isAppBucket(ref.bucket)) return;
  await removeStorageObject(ref);
}

function contentDisposition(fileName: string, inline = false) {
  const fallback = fileName.replace(/[^\w.\-]+/g, "_") || "download";
  const kind = inline ? "inline" : "attachment";
  return `${kind}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function deliveryHeaders(filePath: string, fileName: string, inline = false) {
  return {
    "Content-Type": contentTypeFor(filePath),
    "Content-Disposition": contentDisposition(fileName, inline),
    "Cache-Control": "private, no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };
}

export async function streamLocalFile(filePath: string, fileName: string, inline = false) {
  const fileStat = await stat(/* turbopackIgnore: true */ filePath);
  const nodeStream = createReadStream(/* turbopackIgnore: true */ filePath);
  const body = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  return new NextResponse(body, {
    headers: {
      ...deliveryHeaders(filePath, fileName, inline),
      "Content-Length": String(fileStat.size),
    },
  });
}

export async function streamStorageFile(
  ref: StorageRef,
  fileName: string,
  options?: { inline?: boolean; extraHeaders?: Record<string, string> },
) {
  const response = await fetchStorageObject(ref);
  const headers = new Headers(deliveryHeaders(ref.path, fileName, options?.inline));
  const length = response.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  if (options?.extraHeaders) {
    for (const [key, value] of Object.entries(options.extraHeaders)) {
      headers.set(key, value);
    }
  }
  return new NextResponse(response.body, { status: 200, headers });
}
