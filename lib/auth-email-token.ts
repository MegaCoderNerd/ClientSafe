import { createHmac, timingSafeEqual } from "crypto";

const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export type AuthEmailPurpose = "confirm" | "reset";

export type AuthEmailTokenPayload = {
  purpose: AuthEmailPurpose;
  uid: string;
  email: string;
  exp: number;
};

function secret() {
  return process.env.NEXTAUTH_SECRET || "";
}

export function createAuthEmailToken(input: { purpose: AuthEmailPurpose; uid: string; email: string }) {
  const exp = Date.now() + (input.purpose === "reset" ? RESET_TTL_MS : CONFIRM_TTL_MS);
  const payload = Buffer.from(
    JSON.stringify({
      purpose: input.purpose,
      uid: input.uid,
      email: input.email.trim().toLowerCase(),
      exp,
    } satisfies AuthEmailTokenPayload),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAuthEmailToken(token: string, purpose: AuthEmailPurpose): AuthEmailTokenPayload | null {
  if (!secret() || !token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthEmailTokenPayload;
    if (data.purpose !== purpose || !data.uid || !data.email || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
