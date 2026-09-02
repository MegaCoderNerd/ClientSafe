/** @type {import('next').NextConfig} */

function supabaseRemotePatterns() {
  const patterns = [
    {
      protocol: "https",
      hostname: "**.supabase.co",
      pathname: "/storage/v1/object/public/**",
    },
  ];
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return patterns;
  try {
    const url = new URL(raw.replace(/\/rest\/v1\/?$/, ""));
    patterns.unshift({
      protocol: url.protocol === "http:" ? "http" : "https",
      hostname: url.hostname,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // ignore malformed env during local tooling
  }
  return patterns;
}

const nextConfig = {
  serverExternalPackages: ["nodemailer"],
  images: {
    formats: ["image/webp"],
    qualities: [75],
    minimumCacheTTL: 2678400,
    remotePatterns: supabaseRemotePatterns(),
  },
  async headers() {
    return [
      {
        source: "/stock/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/uploads/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/logo.webp",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
