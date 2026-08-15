import { ensureAppUserFromAuth } from "@/lib/ensure-app-user";
import { createClient } from "@/utils/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthCallbackClient } from "./callback-client";

type SearchParams = {
  code?: string;
  token_hash?: string;
  type?: string;
  next?: string;
  error?: string;
  error_description?: string;
};

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (params.error) {
    redirect(`/auth/signin?error=${encodeURIComponent(params.error_description || params.error)}`);
  }

  const isPasswordRecovery =
    params.type === "recovery" || Boolean(params.next?.startsWith("/auth/update-password"));

  if (isPasswordRecovery && (params.code || (params.token_hash && params.type))) {
    const query = new URLSearchParams();
    if (params.code) query.set("code", params.code);
    if (params.token_hash) query.set("token_hash", params.token_hash);
    if (params.type) query.set("type", params.type);
    redirect(`/auth/update-password?${query.toString()}`);
  }

  if (params.code || (params.token_hash && params.type)) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const result = params.code
      ? await supabase.auth.exchangeCodeForSession(params.code)
      : await supabase.auth.verifyOtp({
          type: params.type as EmailOtpType,
          token_hash: params.token_hash!,
        });

    if (result.error) {
      redirect(`/auth/signin?error=${encodeURIComponent(result.error.message)}`);
    }

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      redirect(
        `/auth/signin?error=${encodeURIComponent("Email confirmation succeeded, but no signed-in user was found. Try signing in.")}`,
      );
    }

    const appUser = await ensureAppUserFromAuth(data.user);
    if (!appUser) {
      redirect(
        `/auth/signin?error=${encodeURIComponent("Email confirmed, but we could not finish creating your account. Try signing in again, or use password reset if sign-in fails.")}`,
      );
    }

    redirect("/auth/signin?verified=1");
  }

  return <AuthCallbackClient next={params.next} />;
}
