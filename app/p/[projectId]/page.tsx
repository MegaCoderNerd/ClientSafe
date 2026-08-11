import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createProtectedDownloadLink, getPreviewAssetUrl } from "@/lib/storage";
import { PayButton } from "@/app/p/[projectId]/pay-button";
import { Chat } from "@/components/chat";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ClientPreviewPage({ params }: Props) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  // Fetch project and related data from Supabase
  const { data: project, error } = await supabase
    .from("DeliveryProject")
    .select(`
      *,
      freelancer:User (id, name),
      client:User (id, name),
      asset:Asset (*)
    `)
    .eq("id", projectId)
    .single();

  if (error || !project || !project.asset) {
    notFound();
  }

  const previewUrl = getPreviewAssetUrl(project.asset.previewUrl);
  const protectedDownloadUrl = createProtectedDownloadLink(project.asset.id);
  
  // Check if the current user is the vault owner (freelancer)
  const isVaultOwner = session?.user?.id === project.freelancerId;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
        <span className="mr-2">←</span> Back to Dashboard
      </Link>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">{project.title}</h1>
        <p className="mt-2 text-slate-700">{project.description}</p>
        <p className="mt-4 text-sm text-slate-600">Freelancer: {project.freelancer?.name}</p>
        <p className="text-sm text-slate-600">Price: {(project.price / 100).toFixed(2)} {project.currency.toUpperCase()}</p>
        {isVaultOwner && <p className="text-sm text-slate-600">Payment Status: {project.paymentStatus}</p>}
      </section>

      {isVaultOwner || project.paymentStatus === "COMPLETED" ? (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Asset Preview</h2>
          <div className="relative mt-4 aspect-video overflow-hidden rounded-lg border bg-slate-100">
            <Image src={previewUrl} alt={`${project.title} preview`} fill className="object-cover" unoptimized />
          </div>
        </section>
      ) : (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Asset Preview</h2>
          <div className="relative mt-4 aspect-video overflow-hidden rounded-lg border bg-slate-100">
            <Image src={previewUrl} alt={`${project.title} preview`} fill className="object-cover" unoptimized />
          </div>
          <p className="mt-4 text-sm text-slate-600 italic">This is a watermarked preview. Purchase to download the full version.</p>
        </section>
      )}

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        {isVaultOwner ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">This is your vault. Download your original asset:</p>
            <Link href={protectedDownloadUrl} className="inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
              Download Original Asset
            </Link>
          </div>
        ) : project.paymentStatus === "COMPLETED" && project.asset.isUnlocked ? (
          <Link href={protectedDownloadUrl} className="inline-block rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
            Download Original Asset
          </Link>
        ) : (
          <PayButton projectId={project.id} />
        )}
      </section>

      <Chat
        projectId={project.id}
        currentUserId={session?.user?.id || ""}
        otherUserName={isVaultOwner ? project.client?.name : project.freelancer?.name}
      />
    </main>
  );
}
