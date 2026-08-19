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
const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const VIDEO_MAX_BYTES = 30 * 1024 * 1024;
const DEMO_ZIP_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set([
  "webp",
  "png",
  "jpg",
  "jpeg",
  "zip",
  "pdf",
  "svg",
  "gif",
  "txt",
  "json",
  "html",
  "css",
  "mp4",
  "webm",
]);

function extensionFor(file: File) {
  const fromName = path.extname(file.name).toLowerCase().replace(".", "");
  if (ALLOWED_EXT.has(fromName)) return fromName;
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "video/mp4") return "mp4";
  if (file.type === "video/webm") return "webm";
  if (file.type === "application/zip") return "zip";
  return "bin";
}

function isVideo(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name);
}

function isImage(file: File) {
  return file.type.startsWith("image/") || /\.(webp|png|jpe?g|gif|svg)$/i.test(file.name);
}

function safeFileName(userId: string, kind: string, ext: string) {
  const id = randomBytes(6).toString("hex");
  const user = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || "user";
  return `${user}-${kind}-${Date.now()}-${id}.${ext}`;
}

async function writeFileStream(file: File, destination: string, maxBytes: number) {
  if (file.size > maxBytes) {
    throw new Error(`File is too large (${Math.round(maxBytes / (1024 * 1024))}MB max).`);
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
  const previewVideo = form.get("previewVideo");
  const original = form.get("original");
  const demoZip = form.get("demoZip");

  const previewFile = preview instanceof File && preview.size ? preview : null;
  const videoFile = previewVideo instanceof File && previewVideo.size ? previewVideo : null;
  const originalFile = original instanceof File && original.size ? original : null;
  const demoFile = demoZip instanceof File && demoZip.size ? demoZip : null;
  const isPatch = String(form.get("patch") ?? "") === "1";

  if (!isPatch) {
    if (!originalFile) {
      return NextResponse.json({ error: "Original file is required" }, { status: 400 });
    }
    if (!previewFile && !videoFile) {
      return NextResponse.json({ error: "Upload a preview image or a preview video." }, { status: 400 });
    }
  } else if (!previewFile && !videoFile && !originalFile && !demoFile) {
    return NextResponse.json({ error: "Choose at least one file to replace." }, { status: 400 });
  }
  if (previewFile && !isImage(previewFile)) {
    return NextResponse.json({ error: "Preview image must be an image file." }, { status: 400 });
  }
  if (videoFile && !isVideo(videoFile)) {
    return NextResponse.json({ error: "Preview video must be mp4 or webm." }, { status: 400 });
  }
  if (demoFile && !/\.zip$/i.test(demoFile.name) && demoFile.type !== "application/zip") {
    return NextResponse.json({ error: "Interactive demo must be a .zip of static HTML files." }, { status: 400 });
  }

  await mkdir(PREVIEW_ROOT, { recursive: true });
  await mkdir(ORIGINAL_ROOT, { recursive: true });

  const originalName = originalFile ? safeFileName(session.user.id, "original", extensionFor(originalFile)) : null;
  const previewName = previewFile ? safeFileName(session.user.id, "preview", extensionFor(previewFile)) : null;
  const videoName = videoFile ? safeFileName(session.user.id, "video", extensionFor(videoFile)) : null;
  const demoName = demoFile ? safeFileName(session.user.id, "demo", "zip") : null;

  try {
    if (originalFile && originalName) {
      await writeFileStream(originalFile, path.join(ORIGINAL_ROOT, originalName), IMAGE_MAX_BYTES);
    }
    if (previewFile && previewName) {
      await writeFileStream(previewFile, path.join(PREVIEW_ROOT, previewName), IMAGE_MAX_BYTES);
    }
    if (videoFile && videoName) {
      await writeFileStream(videoFile, path.join(PREVIEW_ROOT, videoName), VIDEO_MAX_BYTES);
    }
    if (demoFile && demoName) {
      await writeFileStream(demoFile, path.join(ORIGINAL_ROOT, demoName), DEMO_ZIP_MAX_BYTES);
    }
  } catch (error) {
    console.error("[upload] write failed", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to save files",
    }, { status: 500 });
  }

  return NextResponse.json({
    previewUrl: previewName ? `/uploads/previews/${previewName}` : "",
    previewVideoUrl: videoName ? `/uploads/previews/${videoName}` : "",
    originalFileUrl: originalName ? `/storage-uploads/${originalName}` : "",
    demoZipUrl: demoName ? `/storage-uploads/${demoName}` : "",
  });
}
