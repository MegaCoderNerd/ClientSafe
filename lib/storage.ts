export function getPreviewAssetUrl(previewUrl: string) {
  return previewUrl;
}

export function createProtectedDownloadLink(assetId: string) {
  return `/api/assets/${assetId}/download`;
}
