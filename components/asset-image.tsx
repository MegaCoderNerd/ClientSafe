import Image from "next/image";

type AssetImageProps = {
  src: string;
  alt: string;
  sizes: string;
  preload?: boolean;
  className?: string;
};

export function AssetImage({
  src,
  alt,
  sizes,
  preload = false,
  className = "object-cover",
}: AssetImageProps) {
  const isRemote = src.startsWith("http://") || src.startsWith("https://");

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={75}
      preload={preload}
      unoptimized={isRemote}
      className={className}
    />
  );
}
