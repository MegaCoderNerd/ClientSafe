import { prisma } from "@/lib/prisma";
import { createProtectedDownloadLink, getPreviewAssetUrl } from "@/lib/storage";
import { PayButton } from "@/app/p/[projectId]/pay-button";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ClientPreviewPage({ params }: Props) {
  const { projectId } = await params;

  const project = await prisma.deliveryProject.findUnique({
    where: { id: projectId },
    include: { freelancer: true, asset: true },
  });

  if (!project || !project.asset) {
    notFound();
  }

  const previewUrl = getPreviewAssetUrl(project.asset.previewUrl);
  const protectedDownloadUrl = createProtectedDownloadLink(project.asset.id);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">{project.title}</h1>
        <p className="mt-2 text-slate-700">{project.description}</p>
        <p className="mt-4 text-sm text-slate-600">Freelancer: {project.freelancer.name}</p>
        <p className="text-sm text-slate-600">Price: {(project.price / 100).toFixed(2)} {project.currency.toUpperCase()}</p>
        <p className="text-sm text-slate-600">Payment Status: {project.paymentStatus}</p>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Asset Preview</h2>
        <div className="relative mt-4 aspect-video overflow-hidden rounded-lg border bg-slate-100">
          <Image src={previewUrl} alt={`${project.title} preview`} fill className="object-cover" unoptimized />
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        {project.paymentStatus === "COMPLETED" && project.asset.isUnlocked ? (
          <Link href={protectedDownloadUrl} className="inline-block rounded-md bg-slate-900 px-4 py-2 text-white">
            Download Original Asset
          </Link>
        ) : (
          <PayButton projectId={project.id} />
        )}
      </section>
    </main>
  );
}
