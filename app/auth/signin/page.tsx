import { authOptions } from "@/lib/auth";
import { firstQueryValue, safeCallbackPath } from "@/lib/search-params";
import { Card } from "@/components/ui/card";
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
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-md flex-col items-center justify-start p-6 pt-8 sm:min-h-[calc(100dvh-4rem)] sm:pt-12">
      <Card className="w-full p-6">
        <h1 className="font-display text-2xl font-semibold">Sign in to ClientSafe</h1>
        <p className="mt-2 text-sm text-slate-600">Use a verified account or a demo login to test freelancer and client flows.</p>
        <SignInForm
          verified={firstQueryValue(params.verified) === "1"}
          reset={firstQueryValue(params.reset) === "1"}
          initialError={firstQueryValue(params.error) ?? null}
          callbackUrl={callbackUrl}
        />
      </Card>
    </div>
  );
}
