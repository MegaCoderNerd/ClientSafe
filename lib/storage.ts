const LOCAL_STORAGE_TOKEN = process.env.LOCAL_STORAGE_TOKEN ?? "mock-local-token";

export function getPreviewAssetUrl(previewUrl: string) {
  return previewUrl;
}

export function createProtectedDownloadLink(assetId: string) {
  return `/api/assets/${assetId}/download?token=${LOCAL_STORAGE_TOKEN}`;
}
