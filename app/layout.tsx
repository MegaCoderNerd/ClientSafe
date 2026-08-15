import type { Metadata } from "next";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "ClientVault",
  description: "Secure digital asset delivery for freelancers and clients.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Providers session={session}>
          <SiteHeader />
          <main className="pt-16">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
