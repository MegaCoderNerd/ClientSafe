import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 12 * 60 * 60 * 1000;

function secret() {
  return process.env.NEXTAUTH_SECRET || "";
}

export function createDemoAccessToken(assetId: string) {
  const exp = Date.now() + TTL_MS;
  const sig = createHmac("sha256", secret()).update(`${assetId}.${exp}`).digest("base64url");
  return `${exp}.${sig}`;
}

export function verifyDemoAccessToken(assetId: string, token: string) {
  const parts = token.split(".");
  if (parts.length !== 2 || !secret()) return false;
  const [expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = createHmac("sha256", secret()).update(`${assetId}.${exp}`).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function withDemoAccessToken(demoIndexUrl: string, assetId: string) {
  const prefix = `/api/assets/${assetId}/demo/`;
  if (!demoIndexUrl.startsWith(prefix)) return demoIndexUrl;
  const rest = demoIndexUrl.slice(prefix.length).replace(/^\/+/, "") || "index.html";
  return `${prefix}${createDemoAccessToken(assetId)}/${rest}`;
}
