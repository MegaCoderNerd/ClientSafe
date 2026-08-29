function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "");
}

export function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return normalizeSupabaseUrl(url);
}

export function getSupabaseAnonKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return key;
}

type HeaderSource = { headers: Headers };

function readEnv(name: string) {
  return process.env[name];
}

function firstHeader(headers: Headers, name: string) {
  const value = headers.get(name);
  if (!value) return undefined;
  return value.split(",")[0]?.trim() || undefined;
}

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1";
}

export function isLoopbackOrigin(value: string | undefined | null) {
  if (!value) return true;
  const origin = normalizeOrigin(value);
  if (!origin) return true;
  try {
    return isLoopbackHostname(new URL(origin).hostname);
  } catch {
    return true;
  }
}

function isDeployedRuntime() {
  return Boolean(readEnv("VERCEL")) || readEnv("NODE_ENV") === "production";
}

export function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    if (!url.hostname || !/^https?:$/.test(url.protocol)) return null;
    if (isLoopbackHostname(url.hostname)) {
      url.protocol = "http:";
    } else {
      url.protocol = "https:";
    }
    url.username = "";
    url.password = "";
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.origin;
  } catch {
    return null;
  }
}

function hostnameFromHost(host: string) {
  try {
    return new URL(`https://${host}`).hostname;
  } catch {
    return null;
  }
}

function originFromHeaders(headers: Headers): string | null {
  const host = firstHeader(headers, "x-forwarded-host") || firstHeader(headers, "host");
  if (host) {
    const hostname = hostnameFromHost(host);
    const protoHeader = firstHeader(headers, "x-forwarded-proto");
    const proto = hostname && isLoopbackHostname(hostname)
      ? protoHeader === "https"
        ? "https"
        : "http"
      : "https";
    const fromHost = normalizeOrigin(`${proto}://${host}`);
    if (fromHost) return fromHost;
  }

  const originHeader = firstHeader(headers, "origin");
  if (originHeader && originHeader !== "null") {
    return normalizeOrigin(originHeader);
  }

  return null;
}

function configuredPublicOrigins() {
  const vercelEnv = readEnv("VERCEL_ENV");
  const vercelHosts =
    vercelEnv === "production"
      ? [readEnv("VERCEL_PROJECT_PRODUCTION_URL"), readEnv("VERCEL_BRANCH_URL"), readEnv("VERCEL_URL")]
      : [readEnv("VERCEL_URL"), readEnv("VERCEL_BRANCH_URL"), readEnv("VERCEL_PROJECT_PRODUCTION_URL")];

  const values = [
    readEnv("NEXT_PUBLIC_SITE_URL"),
    readEnv("NEXT_PUBLIC_APP_URL"),
    readEnv("AUTH_URL"),
    readEnv("NEXTAUTH_URL"),
    ...vercelHosts,
  ];

  const origins: string[] = [];
  for (const value of values) {
    const origin = normalizeOrigin(value);
    if (!origin || isLoopbackHostname(new URL(origin).hostname)) continue;
    if (!origins.includes(origin)) origins.push(origin);
  }
  return origins;
}

export function originFromRequest(request?: HeaderSource | Request | null) {
  if (!request) return null;
  return originFromHeaders(request.headers);
}

export function getAppOrigin(request?: HeaderSource | Request | null) {
  sanitizeDeployedAuthUrl();

  const fromRequest = originFromRequest(request);
  if (fromRequest && !isLoopbackHostname(new URL(fromRequest).hostname)) {
    return fromRequest;
  }

  const configured = configuredPublicOrigins()[0];
  if (configured) return configured;

  if (fromRequest && !isDeployedRuntime()) return fromRequest;

  return "http://localhost:3000";
}

export function getAppUrl(path: string, request?: HeaderSource | Request | null) {
  const origin = getAppOrigin(request);
  if (/^https?:\/\//i.test(path)) {
    try {
      return new URL(path).toString();
    } catch {
      return `${origin}/`;
    }
  }
  const relative = path.replace(/^\/+/, "");
  return new URL(relative, `${origin}/`).toString();
}

export function sanitizeDeployedAuthUrl() {
  if (!readEnv("VERCEL")) return;
  const current = readEnv("NEXTAUTH_URL");
  if (current && isLoopbackOrigin(current)) {
    process.env.NEXTAUTH_URL = "";
  }
  if (!readEnv("AUTH_TRUST_HOST")) {
    process.env.AUTH_TRUST_HOST = "true";
  }
}

sanitizeDeployedAuthUrl();

export function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return key;
}
