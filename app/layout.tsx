import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = {
  title: "ClientVault",
  description: "Secure digital asset delivery for freelancers and clients.",
  icons: {
  icon: "/logo.png?v=5",
  },
};

async function Header() {
  const session = await getServerSession(authOptions);

  return (
    <header className="w-full border-b bg-white relative h-16">
      {/* Left: logo flush to left */}
      <div className="absolute left-0 top-0 flex items-center h-16 pl-4">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.png?v=5" alt="ClientVault logo" className="w-10 h-10 object-contain" />
          <span className="text-lg font-bold">ClientVault</span>
        </Link>
      </div>

      {/* Right: buttons flush to right */}
      <div className="absolute right-0 top-0 flex items-center h-16 pr-4">
        <nav className="flex gap-3">
          {session?.user ? (
            <>
              <Link href="/guide" className="rounded-md border px-3 py-1 text-sm hover:bg-slate-100">
                Guide
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="rounded-md border px-3 py-1 hover:bg-slate-100">
                Sign In
              </Link>
              <Link href="/auth/signup" className="rounded-md bg-slate-900 px-3 py-1 text-white hover:bg-slate-800">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Center spacer keeps header height consistent */}
      <div className="mx-auto max-w-5xl h-16" />
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Header />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
