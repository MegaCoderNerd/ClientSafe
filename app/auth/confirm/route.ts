import { verifyAuthEmailToken } from "@/lib/auth-email-token";
import { ensureAppUserFromAuth } from "@/lib/ensure-app-user";
import { getAppUrl } from "@/lib/supabase-env";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function signInRedirect(request: Request, query: string) {
  return NextResponse.redirect(getAppUrl(`/auth/signin?${query}`, request));
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const payload = token ? verifyAuthEmailToken(token, "confirm") : null;

  if (!payload) {
    return signInRedirect(
      request,
      `error=${encodeURIComponent("This confirmation link is invalid or expired. Request a new one.")}`,
    );
  }

  const { data, error } = await supabase.auth.admin.updateUserById(payload.uid, { email_confirm: true });
  if (error || !data.user) {
    console.error("/auth/confirm:", error);
    return signInRedirect(
      request,
      `error=${encodeURIComponent("Could not confirm this email. Try signing in, or request a new link.")}`,
    );
  }

  const appUser = await ensureAppUserFromAuth(data.user);
  if (!appUser) {
    return signInRedirect(
      request,
      `error=${encodeURIComponent("Email confirmed, but we could not finish creating your account. Try signing in again, or use password reset if sign-in fails.")}`,
    );
  }

  return signInRedirect(request, "verified=1");
}
