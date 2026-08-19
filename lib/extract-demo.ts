import { unzipSync } from "fflate";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const DEMO_ROOT = path.resolve(process.cwd(), "storage", "demos");
const MAX_UNCOMPRESSED = 5 * 1024 * 1024;
const MAX_FILES = 50;
const ALLOWED_EXT = new Set([
  "html",
  "css",
  "js",
  "svg",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "ico",
  "woff",
  "woff2",
  "ttf",
  "json",
  "txt",
  "map",
]);

function posixJoin(...parts: string[]) {
  return parts.join("/").replace(/\/+/g, "/");
}

function normalizeEntry(name: string) {
  const cleaned = name.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.endsWith("/")) return null;
  if (cleaned.includes("..") || path.isAbsolute(name) || /^[a-zA-Z]:/.test(name)) {
    throw new Error("Demo zip contains an unsafe path.");
  }
  return cleaned;
}

function maybeStripRoot(entries: { original: string; safe: string }[]) {
  const tops = new Set(entries.map((entry) => entry.safe.split("/")[0]));
  if (tops.size !== 1) return entries;
  const root = [...tops][0];
  if (!entries.every((entry) => entry.safe === root || entry.safe.startsWith(`${root}/`))) {
    return entries;
  }
  return entries
    .map((entry) => ({
      ...entry,
      safe: entry.safe === root ? "" : entry.safe.slice(root.length + 1),
    }))
    .filter((entry) => Boolean(entry.safe));
}

export function demoStorageRoot(assetId: string) {
  const safeId = assetId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) throw new Error("Invalid asset id");
  return path.resolve(DEMO_ROOT, safeId);
}

export async function extractDemoZip(assetId: string, zipBytes: Uint8Array) {
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(zipBytes);
  } catch {
    throw new Error("Could not read the demo zip.");
  }

  const rawNames = Object.keys(unzipped).filter((name) => !name.endsWith("/"));
  if (rawNames.length === 0) throw new Error("Demo zip is empty.");
  if (rawNames.length > MAX_FILES) throw new Error("Demo zip has too many files.");

  const normalized = rawNames.map((name) => {
    const safe = normalizeEntry(name);
    if (!safe) return null;
    return { original: name, safe };
  }).filter((entry): entry is { original: string; safe: string } => Boolean(entry));

  const renamed = maybeStripRoot(normalized);

  let uncompressed = 0;
  for (const entry of renamed) {
    const ext = path.extname(entry.safe).slice(1).toLowerCase();
    if (ext === "zip") {
      throw new Error("Nested zip files are not allowed in a demo upload.");
    }
    if (!ALLOWED_EXT.has(ext)) {
      throw new Error(`Demo zip includes a blocked file type: ${entry.safe}`);
    }
    uncompressed += unzipped[entry.original].byteLength;
    if (uncompressed > MAX_UNCOMPRESSED) {
      throw new Error("Demo zip is larger than 5MB uncompressed.");
    }
  }

  if (!renamed.some((entry) => entry.safe === "index.html" || entry.safe.endsWith("/index.html"))) {
    throw new Error("Demo zip must include index.html.");
  }

  const root = demoStorageRoot(assetId);
  await mkdir(root, { recursive: true });

  for (const entry of renamed) {
    const destination = path.resolve(root, entry.safe);
    if (!destination.startsWith(root + path.sep) && destination !== root) {
      throw new Error("Demo zip contains an unsafe path.");
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, unzipped[entry.original]);
  }

  const index = renamed.find((entry) => entry.safe === "index.html") ?? renamed.find((entry) => entry.safe.endsWith("/index.html"));
  return index?.safe ?? "index.html";
}

export function resolveDemoFile(assetId: string, requestPath: string) {
  const root = demoStorageRoot(assetId);
  const relative = posixJoin(...requestPath.split("/").filter(Boolean)).replace(/^\/+/, "") || "index.html";
  if (relative.includes("..")) return null;
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null;
  return resolved;
}
