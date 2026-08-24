import { DeleteVaultButton } from "@/components/delete-vault-button";
import { EditVaultForm } from "@/components/edit-vault-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { fetchDeliveryProjectById, type EditVaultPageRow } from "@/lib/delivery-project";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
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
    fetchDeliveryProjectById<EditVaultPageRow>(
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <Button href={`/p/${projectId}`} variant="ghost" size="sm" className="w-fit px-0">
        ← Back to vault
      </Button>
      <Card className="p-6">
        <h1 className="font-display text-2xl font-semibold">Edit vault</h1>
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
              previewUrl: asset.previewUrl ?? "",
              previewVideoUrl: asset.previewVideoUrl ?? null,
              demoIndexUrl: asset.demoIndexUrl ?? null,
              originalFileUrl: asset.originalFileUrl ?? "",
            }}
          />
        </div>
      </Card>
    </div>
  );
}
