export function supabaseFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: "no-store" }).catch((error: unknown) => {
    const err = error instanceof Error ? error : new Error(String(error));
    // #region agent log
    fetch("http://127.0.0.1:7530/ingest/2c2c58bb-5602-46f9-b362-f532a1588821",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"18b56a"},body:JSON.stringify({sessionId:"18b56a",runId:"pre-fix",hypothesisId:"D",location:"lib/supabase-fetch.ts:catch",message:"supabaseFetch failed",data:{errorMessage:err.message,cause:err.cause instanceof Error ? err.cause.message : String(err.cause ?? ""),target:typeof input === "string" ? input.slice(0, 80) : "url"},timestamp:Date.now()})}).catch(()=>{});
    console.error("[debug-18b56a] supabaseFetch failed", err.message, err.cause instanceof Error ? err.cause.message : err.cause);
    // #endregion
    throw error;
  });
}
