import { AssetPreview } from "@/components/asset-preview";
import { CreateVaultForm } from "@/components/create-vault-form";
import { DashboardShell, type DashboardTab } from "@/components/dashboard-shell";
import { DeleteVaultButton } from "@/components/delete-vault-button";
import { DownloadOriginalLink } from "@/components/download-original-link";
import { ProjectOverview, type OverviewProject } from "@/components/project-overview";
import { SupabaseLiveRefresh } from "@/components/supabase-live-refresh";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { ensureDemoWorkspace } from "@/lib/demo-data";
import { fetchFreelancerProjects } from "@/lib/delivery-project";
import { createProtectedDownloadLink, getPreviewAssetUrl } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=%2Fdashboard");
  }

  if (session.user.email?.endsWith("@clientvault.dev")) {
    await ensureDemoWorkspace();
  }

  const [{ data: clients }, { data: clientProjects }, freelancerProjects] = await Promise.all([
    supabase.from("User").select("id, name, email").neq("id", session.user.id).order("email", { ascending: true }),
    supabase
      .from("DeliveryProject")
      .select(
        "id, title, description, price, currency, paymentStatus, freelancer:User!freelancerId(name, email), asset:Asset(id, previewUrl, previewVideoUrl, demoIndexUrl, isUnlocked)",
      )
      .eq("clientId", session.user.id)
      .neq("freelancerId", session.user.id)
      .order("title", { ascending: true }),
    fetchFreelancerProjects(session.user.id),
  ]);

  const safeClients = clients || [];
  const safeClientProjects = clientProjects || [];
  const safeFreelancerProjects = freelancerProjects || [];

  const overviewProjects: OverviewProject[] = safeFreelancerProjects.map((project: any) => {
    const clientData = Array.isArray(project.client) ? project.client[0] : project.client;
    return {
      id: project.id,
      title: project.title,
      price: project.price,
      currency: project.currency,
      paymentStatus: project.paymentStatus,
      freelancerPayoutAmount: project.freelancerPayoutAmount ?? null,
      platformFeeAmount: project.platformFeeAmount ?? null,
      paidAt: project.paidAt ?? null,
      checkoutStartedAt: project.checkoutStartedAt ?? null,
      clientName: clientData?.name ?? "Client",
      clientEmail: clientData?.email ?? "",
    };
  });

  const hasMine = safeFreelancerProjects.length > 0;
  const hasShared = safeClientProjects.length > 0;
  const defaultTab: DashboardTab = hasMine ? "overview" : hasShared ? "shared" : "create";

  return (
    <>
      <SupabaseLiveRefresh tables={[{ table: "DeliveryProject" }, { table: "Asset" }, { table: "User" }]} />
      <Suspense fallback={<div className="mx-auto max-w-5xl p-8 text-sm text-slate-500">Loading dashboard…</div>}>
        <DashboardShell
          userName={session.user.name ?? session.user.email ?? "there"}
          defaultTab={defaultTab}
          overview={
            hasMine ? <ProjectOverview projects={overviewProjects} /> : undefined
          }
          create={
            <Card>
              <h2 className="font-display text-2xl font-semibold">Create New Vault</h2>
              <p className="mb-4 mt-2 text-sm text-slate-600">
                Create a secure delivery vault to share with clients. Start with a stock demo pack.
              </p>
              <CreateVaultForm clients={safeClients} />
            </Card>
          }
          mine={
            hasMine ? (
              <Card>
                <h2 className="font-display text-2xl font-semibold">Your Vaults</h2>
                <p className="mb-4 mt-2 text-sm text-slate-600">Vaults you created for your clients.</p>
                <ul className="space-y-4">
                  {safeFreelancerProjects.map((project: any) => {
                    const clientData = Array.isArray(project.client) ? project.client[0] : project.client;
                    return (
                      <li key={project.id} className="rounded-xl border border-border/10 bg-white/70 p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-lg font-semibold">{project.title}</p>
                            <p className="text-sm text-slate-600">
                              Client: {clientData?.name} ({clientData?.email})
                            </p>
                            <p className="text-sm text-slate-600">{project.description}</p>
                            <p className="mt-2 text-sm font-medium">
                              {project.price / 100} {project.currency} • Status:{" "}
                              <span className={project.paymentStatus === "COMPLETED" ? "text-green-600" : "text-yellow-600"}>
                                {project.paymentStatus}
                              </span>
                            </p>
                          </div>
                          <div className="flex w-full flex-col gap-2 sm:ml-4 sm:w-auto sm:shrink-0">
                            <Button href={`/p/${project.id}`} size="sm">
                              View
                            </Button>
                            {project.paymentStatus === "PENDING" ? (
                              <>
                                <Button href={`/p/${project.id}/edit`} variant="secondary" size="sm">
                                  Edit
                                </Button>
                                <DeleteVaultButton
                                  projectId={project.id}
                                  paymentStatus={project.paymentStatus}
                                  checkoutStartedAt={project.checkoutStartedAt}
                                  className="w-full"
                                />
                              </>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ) : undefined
          }
          shared={
            hasShared ? (
              <Card>
                <h2 className="font-display text-2xl font-semibold">Vaults Shared With You</h2>
                <p className="mb-4 mt-2 text-sm text-slate-600">Vaults that have been shared with you as a client.</p>
                <ul className="space-y-4">
                  {safeClientProjects.map((project: any) => {
                    const assetData = Array.isArray(project.asset) ? project.asset[0] : project.asset;
                    const freelancerData = Array.isArray(project.freelancer) ? project.freelancer[0] : project.freelancer;
                    const previewUrl = assetData?.previewUrl ? getPreviewAssetUrl(assetData.previewUrl) : null;
                    const previewVideoUrl = assetData?.previewVideoUrl || null;
                    const protectedDownloadUrl = assetData ? createProtectedDownloadLink(assetData.id) : null;

                    return (
                      <li key={project.id} className="rounded-xl border border-border/10 bg-white/70 p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-lg font-semibold">{project.title}</p>
                            <p className="text-sm text-slate-600">
                              From: {freelancerData?.name} ({freelancerData?.email})
                            </p>
                            <p className="text-sm text-slate-600">{project.description}</p>
                            <p className="mt-2 text-sm font-medium">
                              {project.price / 100} {project.currency} • Status:{" "}
                              <span className={project.paymentStatus === "COMPLETED" ? "text-green-600" : "text-yellow-600"}>
                                {project.paymentStatus}
                              </span>
                            </p>
                          </div>
                        </div>

                        {previewUrl || previewVideoUrl ? (
                          <div className="relative mb-3 aspect-video overflow-hidden rounded-lg border border-border/10 bg-slate-100">
                            <AssetPreview
                              imageSrc={previewUrl}
                              videoSrc={previewVideoUrl}
                              alt={`${project.title} preview`}
                              sizes="(max-width: 768px) 100vw, 640px"
                              showPlayBadge={Boolean(previewVideoUrl)}
                            />
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          <Button href={`/p/${project.id}`} size="sm">
                            View Preview
                          </Button>
                          {project.paymentStatus === "COMPLETED" && protectedDownloadUrl ? (
                            <DownloadOriginalLink href={protectedDownloadUrl} size="sm">Download Original</DownloadOriginalLink>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ) : undefined
          }
        />
      </Suspense>
    </>
  );
}
