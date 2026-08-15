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
    if (data.user) {
      await ensureAppUserFromAuth(data.user);
    }

    if (params.type === "recovery" || params.next?.startsWith("/auth/update-password")) {
      redirect("/auth/update-password");
    }

    redirect("/auth/signin?verified=1");
  }

  return <AuthCallbackClient next={params.next} />;
}
