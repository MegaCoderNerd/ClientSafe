export function isVideoUrl(url?: string | null) {
  if (!url) return false;
  return /\.(mp4|webm)(\?|$)/i.test(url) || url.includes("/video/");
}

export function isImageUrl(url?: string | null) {
  if (!url) return false;
  return /\.(webp|png|jpe?g|gif|svg)(\?|$)/i.test(url) || url.startsWith("/uploads/previews/") || url.startsWith("/stock/");
}

export function createDemoPreviewLink(assetId: string, filePath = "index.html") {
  return `/api/assets/${assetId}/demo/${filePath.replace(/^\/+/, "")}`;
}
