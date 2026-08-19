import { DeleteVaultButton } from "@/components/delete-vault-button";
import { EditVaultForm } from "@/components/edit-vault-form";
import { authOptions } from "@/lib/auth";
import { fetchDeliveryProjectById } from "@/lib/delivery-project";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function EditVaultPage({ params }: Props) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;
  if (!currentUserId) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/p/${projectId}/edit`)}`);
  }

  const [{ data: project }, { data: clients }] = await Promise.all([
    fetchDeliveryProjectById(
      projectId,
      "id, title, description, price, currency, paymentStatus, freelancerId, clientId, checkoutStartedAt, asset:Asset(previewUrl, previewVideoUrl, demoIndexUrl, originalFileUrl)",
      "id, title, description, price, currency, paymentStatus, freelancerId, clientId, asset:Asset(previewUrl, previewVideoUrl, demoIndexUrl, originalFileUrl)",
    ),
    supabase.from("User").select("id, name, email").neq("id", currentUserId).order("email", { ascending: true }),
  ]);

  if (!project) notFound();
  if (project.freelancerId !== currentUserId) notFound();
  if (project.paymentStatus !== "PENDING") {
    redirect(`/p/${projectId}`);
  }

  const asset = Array.isArray(project.asset) ? project.asset[0] : project.asset;
  if (!asset) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <Link href={`/p/${projectId}`} className="inline-flex items-center text-blue-600 hover:text-blue-700">
        <span className="mr-2">←</span> Back to vault
      </Link>
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Edit vault</h1>
        <p className="mt-2 text-sm text-slate-600">
          Unpaid deliveries can be changed completely. Paid vaults stay locked.
        </p>
        <div className="mt-4">
          <DeleteVaultButton
            projectId={project.id}
            paymentStatus={project.paymentStatus}
            checkoutStartedAt={project.checkoutStartedAt}
          />
        </div>
        <div className="mt-6">
          <EditVaultForm
            clients={clients ?? []}
            vault={{
              id: project.id,
              title: project.title,
              description: project.description,
              price: project.price,
              currency: project.currency,
              clientId: project.clientId,
              previewUrl: asset.previewUrl,
              previewVideoUrl: asset.previewVideoUrl,
              demoIndexUrl: asset.demoIndexUrl,
              originalFileUrl: asset.originalFileUrl,
            }}
          />
        </div>
      </section>
    </main>
  );
}
