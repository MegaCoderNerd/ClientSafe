import { AssetImage } from "@/components/asset-image";

type AssetPreviewProps = {
  imageSrc?: string | null;
  videoSrc?: string | null;
  alt: string;
  sizes: string;
  preload?: boolean;
  showPlayBadge?: boolean;
  fit?: "cover" | "contain";
};

function isSvg(src: string) {
  return /\.svg(\?|$)/i.test(src);
}

export function AssetPreview({
  imageSrc,
  videoSrc,
  alt,
  sizes,
  preload = false,
  showPlayBadge = false,
  fit = "cover",
}: AssetPreviewProps) {
  const fitClass = fit === "contain" ? "object-contain" : "object-cover";

  if (videoSrc && !showPlayBadge) {
    return (
      <div className="relative h-full w-full bg-slate-950">
        <video
          className={`h-full w-full ${fitClass}`}
          src={videoSrc}
          poster={imageSrc || undefined}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
        />
      </div>
    );
  }

  if (!imageSrc) {
    return (
      <div className="relative flex h-full items-center justify-center bg-slate-200 text-sm text-slate-500">
        {showPlayBadge ? (
          <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs font-medium text-white">Video</span>
        ) : (
          "No preview"
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {isSvg(imageSrc) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt={alt} className={`h-full w-full ${fitClass}`} />
      ) : (
        <AssetImage src={imageSrc} alt={alt} sizes={sizes} preload={preload} className={fitClass} />
      )}
      {showPlayBadge ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs font-medium text-white">Video</span>
        </span>
      ) : null}
    </div>
  );
}
