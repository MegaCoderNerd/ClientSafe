import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">ClientVault</h1>
      <p className="text-lg text-slate-700">
        Secure digital asset delivery with preview-before-payment protection for freelancers and clients.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="rounded-md bg-slate-900 px-4 py-2 text-white">
          Freelancer Dashboard
        </Link>
        <Link href="/auth/signin" className="rounded-md border px-4 py-2">
          Sign In
        </Link>
      </div>
    </main>
  );
}
