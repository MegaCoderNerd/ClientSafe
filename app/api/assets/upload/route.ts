import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

const PREVIEW_ROOT = path.resolve(process.cwd(), "public", "uploads", "previews");
const ORIGINAL_ROOT = path.resolve(process.cwd(), "storage", "uploads");
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = new Set(["webp", "png", "jpg", "jpeg", "zip", "pdf", "svg", "gif", "txt", "json", "html", "css"]);

function extensionFor(file: File) {
  const fromName = path.extname(file.name).toLowerCase().replace(".", "");
  if (ALLOWED_EXT.has(fromName)) return fromName;
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "application/zip") return "zip";
  return "bin";
}

function safeFileName(userId: string, kind: string, ext: string) {
  const id = randomBytes(6).toString("hex");
  const user = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || "user";
  return `${user}-${kind}-${Date.now()}-${id}.${ext}`;
}

async function writeFileStream(file: File, destination: string) {
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large (20MB max).");
  }

  const nodeStream = Readable.fromWeb(file.stream() as ReadableStream<Uint8Array>);
  await pipeline(nodeStream, createWriteStream(destination));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const preview = form.get("preview");
  const original = form.get("original");

  if (!(preview instanceof File) || !preview.size || !(original instanceof File) || !original.size) {
    return NextResponse.json({ error: "Preview and original files are required" }, { status: 400 });
  }

  await mkdir(PREVIEW_ROOT, { recursive: true });
  await mkdir(ORIGINAL_ROOT, { recursive: true });

  const previewName = safeFileName(session.user.id, "preview", extensionFor(preview));
  const originalName = safeFileName(session.user.id, "original", extensionFor(original));

  try {
    await Promise.all([
      writeFileStream(preview, path.join(PREVIEW_ROOT, previewName)),
      writeFileStream(original, path.join(ORIGINAL_ROOT, originalName)),
    ]);
  } catch (error) {
    console.error("[upload] write failed", error);
    return NextResponse.json({ error: "Failed to save files" }, { status: 500 });
  }

  return NextResponse.json({
    previewUrl: `/uploads/previews/${previewName}`,
    originalFileUrl: `/storage-uploads/${originalName}`,
  });
}
