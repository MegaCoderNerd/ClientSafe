export type StockAsset = {
  id: string;
  title: string;
  description: string;
  price: number;
  previewUrl: string;
  previewVideoUrl?: string;
  demoIndexUrl?: string;
  originalFileUrl: string;
  originalFileName: string;
};

export const STOCK_ASSETS: StockAsset[] = [
  {
    id: "landing-page",
    title: "Landing Page Source Package",
    description: "North Harbor coffee site. Watermarked preview until payment unlocks the HTML/CSS source zip.",
    price: 49.99,
    previewUrl: "/stock/landing-page/preview.webp",
    demoIndexUrl: "/stock/landing-page/demo/index.html",
    originalFileUrl: "/stock/landing-page/original.zip",
    originalFileName: "north-harbor-landing-page.zip",
  },
  {
    id: "brand-kit",
    title: "Brand Kit Delivery",
    description: "Lumen Studio logo, mark, and color tokens. Paid demo vault with the original kit unlocked.",
    price: 29.99,
    previewUrl: "/stock/brand-kit/preview.webp",
    originalFileUrl: "/stock/brand-kit/original.zip",
    originalFileName: "lumen-studio-brand-kit.zip",
  },
  {
    id: "product-photo",
    title: "Product Photo Pack",
    description: "Catalog kettle shot. Preview is watermarked; the original WebP is the clean delivery file.",
    price: 19.99,
    previewUrl: "/stock/product-photo/preview.webp",
    originalFileUrl: "/stock/product-photo/original.webp",
    originalFileName: "ceramic-kettle-original.webp",
  },
  {
    id: "dashboard",
    title: "Dashboard UI Mockup",
    description: "Orbit Metrics interface mockup. Use this pack to test a second unpaid vault from the freelancer tab.",
    price: 79.99,
    previewUrl: "/stock/dashboard/preview.webp",
    originalFileUrl: "/stock/dashboard/original.webp",
    originalFileName: "orbit-metrics-dashboard.webp",
  },
];

export function getStockAsset(id: string) {
  return STOCK_ASSETS.find((asset) => asset.id === id) ?? null;
}

export function getStockAssetByOriginalUrl(originalFileUrl: string) {
  return STOCK_ASSETS.find((asset) => asset.originalFileUrl === originalFileUrl) ?? null;
}
