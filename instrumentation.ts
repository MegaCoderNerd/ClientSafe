export async function register() {
  const payload = {
    sessionId: "18b56a",
    runId: "pre-fix",
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

  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    const rejection = {
      sessionId: "18b56a",
      runId: "pre-fix",
      hypothesisId: "D",
      location: "instrumentation.ts:unhandledRejection",
      message: "unhandledRejection during collect/runtime",
      data: {
        name: err.name,
        errorMessage: err.message,
        cause: err.cause instanceof Error ? err.cause.message : String(err.cause ?? ""),
        stackHead: (err.stack ?? "").split("\n").slice(0, 6).join(" | "),
      },
      timestamp: Date.now(),
    };
    // #region agent log
    fetch("http://127.0.0.1:7530/ingest/2c2c58bb-5602-46f9-b362-f532a1588821", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "18b56a" },
      body: JSON.stringify(rejection),
    }).catch(() => {});
    console.error("[debug-18b56a]", JSON.stringify(rejection));
    // #endregion
  });
}
