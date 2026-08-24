import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    step: "01",
    title: "Preview",
    body: "Share a watermarked look at the work so clients can review it before they pay.",
  },
  {
    step: "02",
    title: "Pay",
    body: "Clients unlock the original on PayPal hosted checkout. Card details never touch ClientVault.",
  },
  {
    step: "03",
    title: "Unlock",
    body: "After a verified capture, the original files become available to download.",
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative overflow-hidden">
      <AmbientBackdrop />
      <div className="relative mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl flex-col justify-center gap-8 px-4 py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:min-h-[calc(100dvh-4rem)] sm:gap-12 sm:px-6 sm:py-16">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <div className="landing-enter max-w-xl md:max-w-none">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent sm:text-sm">ClientVault</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Deliver work. Preview first. Unlock after payment.
            </h1>
            <p className="mt-4 max-w-prose text-base text-slate-600 sm:text-lg">
              Secure digital asset delivery with preview-before-payment protection. Create vaults, share preview
              links, and unlock originals after payment.
            </p>
            <div className="mt-7">
              <Button href="/auth/signup">Get started</Button>
            </div>
          </div>

          <div className="landing-enter landing-enter-delay-1">
            <div className="overflow-hidden rounded-2xl border border-border/10 bg-white/40 shadow-card">
              <div className="flex items-center gap-2 border-b border-border/10 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-red-400/80" />
                <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                <span className="ml-2 truncate text-[11px] text-slate-500">Preview before pay</span>
              </div>
              <div className="relative aspect-[4/3] max-h-[min(52vw,16rem)] w-full bg-slate-950 sm:max-h-none md:aspect-[16/10]">
                <Image
                  src="/stock/landing-page/preview.webp"
                  alt="Watermarked preview of a client delivery"
                  fill
                  priority
                  quality={75}
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 560px"
                />
              </div>
            </div>
          </div>
        </div>

        <ol className="landing-enter landing-enter-delay-2 grid w-full gap-3 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <Card className="h-full p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                  {feature.step} · {feature.title}
                </p>
                <p className="mt-2 text-sm text-slate-600">{feature.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
