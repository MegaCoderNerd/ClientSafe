import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  createSignedUpload,
  isImageUpload,
  isVideoUpload,
  isZipUpload,
  kindConfig,
  type UploadKind,
} from "@/lib/object-storage";

export const dynamic = "force-dynamic";

type SignFile = {
  kind: UploadKind;
  filename: string;
  contentType: string;
  size: number;
};

function isKind(value: unknown): value is UploadKind {
  return value === "preview" || value === "previewVideo" || value === "original" || value === "demoZip";
}

function asSignFiles(value: unknown): SignFile[] | null {
  if (!Array.isArray(value)) return null;
  const files: SignFile[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    if (!isKind(record.kind) || typeof record.filename !== "string" || typeof record.contentType !== "string") {
      return null;
    }
    const size = Number(record.size);
    if (!Number.isFinite(size) || size <= 0) return null;
    files.push({
      kind: record.kind,
      filename: record.filename,
      contentType: record.contentType,
      size,
    });
  }
  return files;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: { patch?: boolean; files?: unknown };
  try {
    payload = (await request.json()) as { patch?: boolean; files?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid upload request." }, { status: 400 });
  }

  const files = asSignFiles(payload.files);
  if (!files) {
    return NextResponse.json({ ok: false, error: "Choose at least one valid file." }, { status: 400 });
  }

  const kinds = new Set(files.map((file) => file.kind));
  if (kinds.size !== files.length) {
    return NextResponse.json({ ok: false, error: "Duplicate upload kinds." }, { status: 400 });
  }

  const isPatch = Boolean(payload.patch);
  const previewFile = files.find((file) => file.kind === "preview");
  const videoFile = files.find((file) => file.kind === "previewVideo");
  const originalFile = files.find((file) => file.kind === "original");
  const demoFile = files.find((file) => file.kind === "demoZip");

  if (!isPatch) {
    if (!originalFile) {
      return NextResponse.json({ ok: false, error: "Original file is required" }, { status: 400 });
    }
    if (!previewFile && !videoFile) {
      return NextResponse.json({ ok: false, error: "Upload a preview image or a preview video." }, { status: 400 });
    }
  } else if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "Choose at least one file to replace." }, { status: 400 });
  }

  if (previewFile && !isImageUpload(previewFile.filename, previewFile.contentType)) {
    return NextResponse.json({ ok: false, error: "Preview image must be an image file." }, { status: 400 });
  }
  if (videoFile && !isVideoUpload(videoFile.filename, videoFile.contentType)) {
    return NextResponse.json({ ok: false, error: "Preview video must be mp4 or webm." }, { status: 400 });
  }
  if (demoFile && !isZipUpload(demoFile.filename, demoFile.contentType)) {
    return NextResponse.json({ ok: false, error: "Interactive demo must be a .zip of static HTML files." }, { status: 400 });
  }

  for (const file of files) {
    const { maxBytes } = kindConfig(file.kind);
    if (file.size > maxBytes) {
      return NextResponse.json(
        { ok: false, error: `File is too large (${Math.round(maxBytes / (1024 * 1024))}MB max).` },
        { status: 400 },
      );
    }
  }

  try {
    const uploads = await Promise.all(
      files.map((file) => createSignedUpload(file.kind, session.user.id as string, file.filename, file.contentType)),
    );
    return NextResponse.json({ ok: true, uploads });
  } catch (error) {
    console.error("[upload-sign] failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not start upload" },
      { status: 500 },
    );
  }
}
