import { randomBytes } from "crypto";
import { getServiceRoleKey, getSupabaseUrl } from "@/lib/supabase-env";
import { supabase } from "@/lib/supabase";

export const PREVIEW_BUCKET = "vault-previews";
export const PRIVATE_BUCKET = "vault-private";
export const STORAGE_SCHEME = "storage://";

export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 30 * 1024 * 1024;
export const DEMO_ZIP_MAX_BYTES = 5 * 1024 * 1024;

export type UploadKind = "preview" | "previewVideo" | "original" | "demoZip";

export type StorageRef = {
  bucket: string;
  path: string;
};

export const ALLOWED_UPLOAD_EXT = new Set([
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

type BucketConfig = {
  public: boolean;
  fileSizeLimit: number;
};

const BUCKETS: Record<string, BucketConfig> = {
  [PREVIEW_BUCKET]: { public: true, fileSizeLimit: VIDEO_MAX_BYTES },
  [PRIVATE_BUCKET]: { public: false, fileSizeLimit: VIDEO_MAX_BYTES },
};

let bucketsReady: Promise<void> | null = null;

export function isAppBucket(bucket: string) {
  return bucket === PREVIEW_BUCKET || bucket === PRIVATE_BUCKET;
}

export function toPrivateStorageUrl(path: string) {
  return `${STORAGE_SCHEME}${PRIVATE_BUCKET}/${path}`;
}

export function publicObjectUrl(bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function parseStorageRef(url: string): StorageRef | null {
  if (!url) return null;

  if (url.startsWith(STORAGE_SCHEME)) {
    const rest = url.slice(STORAGE_SCHEME.length);
    const slash = rest.indexOf("/");
    if (slash <= 0) return null;
    const bucket = rest.slice(0, slash);
    const objectPath = rest.slice(slash + 1);
    if (!bucket || !objectPath || objectPath.includes("..")) return null;
    return { bucket, path: objectPath };
  }

  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    const rest = parsed.pathname.slice(idx + marker.length);
    const slash = rest.indexOf("/");
    if (slash <= 0) return null;
    const bucket = decodeURIComponent(rest.slice(0, slash));
    const objectPath = decodeURIComponent(rest.slice(slash + 1));
    if (!objectPath || objectPath.includes("..")) return null;
    return { bucket, path: objectPath };
  } catch {
    return null;
  }
}

export function isAllowedPreviewUrl(url: string) {
  if (!url) return true;
  if (url.startsWith("/stock/") || url.startsWith("/uploads/")) return true;
  const ref = parseStorageRef(url);
  return Boolean(ref && ref.bucket === PREVIEW_BUCKET && isAppBucket(ref.bucket));
}

export function isAllowedOriginalUrl(url: string) {
  if (!url) return false;
  if (url.startsWith("/stock/") || url.startsWith("/storage-uploads/")) return true;
  const ref = parseStorageRef(url);
  return Boolean(ref && ref.bucket === PRIVATE_BUCKET);
}

export function demoObjectPrefix(assetId: string) {
  const safeId = assetId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) throw new Error("Invalid asset id");
  return `demos/${safeId}`;
}

export function demoObjectPath(assetId: string, relative: string) {
  const cleaned = relative.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!cleaned || cleaned.includes("..")) return null;
  return `${demoObjectPrefix(assetId)}/${cleaned}`;
}

export function extensionFor(filename: string, contentType: string) {
  const fromName = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  if (ALLOWED_UPLOAD_EXT.has(fromName)) return fromName;
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "video/mp4") return "mp4";
  if (contentType === "video/webm") return "webm";
  if (contentType === "application/zip" || contentType === "application/x-zip-compressed") return "zip";
  return "bin";
}

export function isVideoUpload(filename: string, contentType: string) {
  return contentType.startsWith("video/") || /\.(mp4|webm)$/i.test(filename);
}

export function isImageUpload(filename: string, contentType: string) {
  return contentType.startsWith("image/") || /\.(webp|png|jpe?g|gif|svg)$/i.test(filename);
}

export function isZipUpload(filename: string, contentType: string) {
  return /\.zip$/i.test(filename) || contentType === "application/zip" || contentType === "application/x-zip-compressed";
}

export function objectPathFor(userId: string, kind: UploadKind, ext: string) {
  const id = randomBytes(6).toString("hex");
  const user = userId.replace(/[^a-zA-Z0-9_-]/g, "") || "user";
  return `${user}/${kind}-${Date.now()}-${id}.${ext}`;
}

export function kindConfig(kind: UploadKind) {
  if (kind === "preview") {
    return { bucket: PREVIEW_BUCKET, maxBytes: IMAGE_MAX_BYTES, public: true };
  }
  if (kind === "previewVideo") {
    return { bucket: PREVIEW_BUCKET, maxBytes: VIDEO_MAX_BYTES, public: true };
  }
  if (kind === "demoZip") {
    return { bucket: PRIVATE_BUCKET, maxBytes: DEMO_ZIP_MAX_BYTES, public: false };
  }
  return { bucket: PRIVATE_BUCKET, maxBytes: IMAGE_MAX_BYTES, public: false };
}

export function storedUrlFor(kind: UploadKind, path: string) {
  const { bucket, public: isPublic } = kindConfig(kind);
  return isPublic ? publicObjectUrl(bucket, path) : toPrivateStorageUrl(path);
}

export function absoluteSignedUrl(signedUrl: string) {
  if (/^https?:\/\//i.test(signedUrl)) return signedUrl;
  const base = getSupabaseUrl().replace(/\/$/, "");
  if (signedUrl.startsWith("/storage/v1/")) return `${base}${signedUrl}`;
  if (signedUrl.startsWith("/object/")) return `${base}/storage/v1${signedUrl}`;
  return `${base}/storage/v1/${signedUrl.replace(/^\/+/, "")}`;
}

function alreadyExists(message: string) {
  return /already exists|duplicate|23505/i.test(message);
}

export async function ensureStorageBuckets() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for vault file storage.");
  }
  if (!bucketsReady) {
    bucketsReady = (async () => {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) {
        console.error("[storage] listBuckets failed", error);
        throw new Error("Could not access Supabase Storage. Check SUPABASE_SERVICE_ROLE_KEY.");
      }
      const names = new Set((buckets ?? []).map((bucket) => bucket.name));
      for (const [name, config] of Object.entries(BUCKETS)) {
        if (names.has(name)) continue;
        const { error: createError } = await supabase.storage.createBucket(name, {
          public: config.public,
          fileSizeLimit: config.fileSizeLimit,
        });
        if (createError && !alreadyExists(createError.message)) {
          throw new Error(
            `Create the "${name}" Storage bucket in the Supabase dashboard (${config.public ? "public" : "private"}). ${createError.message}`,
          );
        }
      }
    })().catch((error) => {
      bucketsReady = null;
      throw error;
    });
  }
  return bucketsReady;
}

export async function createSignedUpload(kind: UploadKind, userId: string, filename: string, contentType: string) {
  await ensureStorageBuckets();
  const ext = extensionFor(filename, contentType);
  const path = objectPathFor(userId, kind, ext);
  const { bucket } = kindConfig(kind);
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, { upsert: true });
  if (error || !data) {
    throw new Error(error?.message || "Could not create a signed upload URL.");
  }
  return {
    kind,
    path: data.path || path,
    token: data.token,
    signedUrl: absoluteSignedUrl(data.signedUrl),
    storedUrl: storedUrlFor(kind, data.path || path),
  };
}

export async function downloadStorageBytes(ref: StorageRef): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(ref.bucket).download(ref.path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export async function uploadStorageBytes(ref: StorageRef, bytes: Uint8Array, contentType: string) {
  const { error } = await supabase.storage.from(ref.bucket).upload(ref.path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(error.message || `Could not store ${ref.path}`);
  }
}

async function listStoragePaths(bucket: string, prefix: string): Promise<string[]> {
  const results: string[] = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return results;

  for (const item of data) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    const isFile = Boolean(item.id) && item.metadata != null;
    if (isFile) {
      results.push(full);
    } else {
      results.push(...(await listStoragePaths(bucket, full)));
    }
  }
  return results;
}

export async function removeStorageObject(ref: StorageRef) {
  if (!isAppBucket(ref.bucket) || !ref.path || ref.path.includes("..")) return;
  const { error } = await supabase.storage.from(ref.bucket).remove([ref.path]);
  if (error) {
    console.error("[storage] remove failed", ref, error);
  }
}

export async function removeStoragePrefix(bucket: string, prefix: string) {
  if (!isAppBucket(bucket) || !prefix || prefix.includes("..")) return;
  const paths = await listStoragePaths(bucket, prefix);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    console.error("[storage] remove prefix failed", { bucket, prefix }, error);
  }
}

export async function fetchStorageObject(ref: StorageRef) {
  const key = getServiceRoleKey();
  const encodedPath = ref.path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const url = `${getSupabaseUrl()}/storage/v1/object/${encodeURIComponent(ref.bucket)}/${encodedPath}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    throw new Error("missing");
  }
  return response;
}
