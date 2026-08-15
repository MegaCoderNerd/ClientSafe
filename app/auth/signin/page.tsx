import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; reset?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-start items-center p-6 pt-20">
      <div className="rounded-xl border bg-white p-6 shadow-sm w-full">
        <h1 className="text-2xl font-semibold">Sign in to ClientVault</h1>
        <p className="mt-2 text-sm text-slate-600">Use a verified account or a demo login to test freelancer and client flows.</p>
        <SignInForm
          verified={params.verified === "1"}
          reset={params.reset === "1"}
          initialError={params.error ?? null}
        />
      </div>
    </main>
  );
}
