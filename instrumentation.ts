export async function register() {
  const payload = {
    sessionId: "18b56a",
    runId: "post-fix",
    hypothesisId: "A",
    location: "instrumentation.ts:register",
    message: "Next instrumentation register",
    data: {
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
      hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
      nodeEnv: process.env.NODE_ENV ?? null,
      vercel: Boolean(process.env.VERCEL),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      nextRuntime: process.env.NEXT_RUNTIME ?? null,
    },
    timestamp: Date.now(),
  };
  // #region agent log
  fetch("http://127.0.0.1:7530/ingest/2c2c58bb-5602-46f9-b362-f532a1588821", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "18b56a" },
    body: JSON.stringify(payload),
  }).catch(() => {});
  console.error("[debug-18b56a]", JSON.stringify(payload));
  // #endregion
}

export function onRequestError(
  error: { digest?: string } & Error,
  request: { path: string; method: string },
  context: { routePath?: string; routeType?: string; renderSource?: string },
) {
  const payload = {
    sessionId: "18b56a",
    runId: "post-fix",
    hypothesisId: "F",
    location: "instrumentation.ts:onRequestError",
    message: "request error",
    data: {
      errorName: error.name,
      errorMessage: error.message,
      digest: error.digest ?? null,
      path: request.path,
      method: request.method,
      routePath: context.routePath ?? null,
      routeType: context.routeType ?? null,
      renderSource: context.renderSource ?? null,
      stackHead: (error.stack ?? "").split("\n").slice(0, 8).join(" | "),
      hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
      hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    },
    timestamp: Date.now(),
  };
  // #region agent log
  fetch("http://127.0.0.1:7530/ingest/2c2c58bb-5602-46f9-b362-f532a1588821", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "18b56a" },
    body: JSON.stringify(payload),
  }).catch(() => {});
  console.error("[debug-18b56a]", JSON.stringify(payload));
  // #endregion
}
