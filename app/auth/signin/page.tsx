import { authOptions } from "@/lib/auth";
import { firstQueryValue, safeCallbackPath } from "@/lib/search-params";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    verified?: string | string[];
    reset?: string | string[];
    error?: string | string[];
    callbackUrl?: string | string[];
  }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(firstQueryValue(params.callbackUrl));

  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-start items-center p-6 pt-20">
      <div className="rounded-xl border bg-white p-6 shadow-sm w-full">
        <h1 className="text-2xl font-semibold">Sign in to ClientVault</h1>
        <p className="mt-2 text-sm text-slate-600">Use a verified account or a demo login to test freelancer and client flows.</p>
        <SignInForm
          verified={firstQueryValue(params.verified) === "1"}
          reset={firstQueryValue(params.reset) === "1"}
          initialError={firstQueryValue(params.error) ?? null}
          callbackUrl={callbackUrl}
        />
      </div>
    </main>
  );
}
