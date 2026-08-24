import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";
import { MotionPause } from "@/components/motion-pause";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "600", "700"],
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

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
  // #region agent log
  fetch("http://127.0.0.1:7530/ingest/2c2c58bb-5602-46f9-b362-f532a1588821",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"18b56a"},body:JSON.stringify({sessionId:"18b56a",runId:"pre-fix",hypothesisId:"C",location:"app/layout.tsx:RootLayout",message:"RootLayout start",data:{hasNextAuthSecret:Boolean(process.env.NEXTAUTH_SECRET),vercel:Boolean(process.env.VERCEL)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    // #region agent log
    fetch("http://127.0.0.1:7530/ingest/2c2c58bb-5602-46f9-b362-f532a1588821",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"18b56a"},body:JSON.stringify({sessionId:"18b56a",runId:"pre-fix",hypothesisId:"C",location:"app/layout.tsx:getServerSession",message:"getServerSession threw",data:{errorMessage:err.message,stackHead:(err.stack??"").split("\n").slice(0,5).join(" | ")},timestamp:Date.now()})}).catch(()=>{});
    console.error("[debug-18b56a] getServerSession threw", err.message);
    // #endregion
    throw error;
  }

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-canvas font-sans text-ink antialiased">
        <MotionPause />
        <Providers session={session}>
          <SiteHeader />
          <main className="pt-[calc(3.5rem+env(safe-area-inset-top))] sm:pt-[calc(4rem+env(safe-area-inset-top))]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
