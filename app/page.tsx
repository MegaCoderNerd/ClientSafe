import { CreateVaultForm } from "@/components/create-vault-form";
import { AssetImage } from "@/components/asset-image";
import { DownloadOriginalLink } from "@/components/download-original-link";
import { SupabaseLiveRefresh } from "@/components/supabase-live-refresh";
import { authOptions } from "@/lib/auth";
import { ensureDemoWorkspace } from "@/lib/demo-data";
import { createProtectedDownloadLink, getPreviewAssetUrl } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl flex-col justify-start items-center gap-6 p-8 pt-20">
          <h1 className="text-4xl font-bold text-center">ClientVault</h1>
          <p className="text-lg text-slate-700 text-center max-w-prose">
            Secure digital asset delivery with preview-before-payment protection. Create vaults, share preview links, and unlock originals after payment.
          </p>

          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/auth/signin" className="rounded-md border px-4 py-2">
              Sign In
            </Link>
            <Link href="/auth/signup" className="rounded-md bg-slate-900 px-4 py-2 text-white">
              Sign Up
            </Link>
          </div>
        </main>
    );
  }

  if (session.user.email?.endsWith("@clientvault.dev")) {
    await ensureDemoWorkspace();
  }

  // Fetch all data for authenticated users using Supabase
  const [
    { data: clients },
    { data: clientProjects },
    { data: freelancerProjects }
  ] = await Promise.all([
    supabase
        .from("User")
        .select("id, name, email")
        .neq("id", session.user.id)
        .order("email", { ascending: true }),
    supabase
        .from("DeliveryProject")
        .select("id, title, description, price, currency, paymentStatus, freelancer:User!freelancerId(name, email), asset:Asset(id, previewUrl, isUnlocked)")
        .eq("clientId", session.user.id)
        .neq("freelancerId", session.user.id)
        .order("title", { ascending: true }),
    supabase
        .from("DeliveryProject")
        .select("id, title, description, price, currency, paymentStatus, client:User!clientId(name, email)")
        .eq("freelancerId", session.user.id)
        .order("title", { ascending: true }),
  ]);

  // Fallbacks in case data is null
  const safeClients = clients || [];
  const safeClientProjects = clientProjects || [];
  const safeFreelancerProjects = freelancerProjects || [];

  return (
      <main className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
        <SupabaseLiveRefresh tables={[{ table: "DeliveryProject" }, { table: "Asset" }, { table: "User" }]} />
        {/* Welcome Section */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold">Welcome, {session.user.name ?? session.user.email}</h1>
          <p className="mt-2 text-slate-600">Manage your vaults and deliveries in one place.</p>
        </section>

        {/* Create New Vault Section (Freelancer) */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Create New Vault</h2>
          <p className="text-sm text-slate-600 mb-4">Create a secure delivery vault to share with clients. Start with a stock demo pack.</p>
          <CreateVaultForm clients={safeClients} />
        </section>

        {/* Your Vaults Section (Freelancer Created) */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Your Vaults</h2>
          <p className="text-sm text-slate-600 mb-4">Vaults you created for your clients.</p>
          {safeFreelancerProjects.length > 0 ? (
              <ul className="space-y-4">
                {safeFreelancerProjects.map((project: any) => {
                  // Normalize data relationships (Supabase might return object or array)
                  const clientData = Array.isArray(project.client) ? project.client[0] : project.client;

                  return (
                      <li key={project.id} className="rounded-md border p-4 hover:bg-slate-50 transition">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-lg">{project.title}</p>
                            <p className="text-sm text-slate-600">Client: {clientData?.name} ({clientData?.email})</p>
                            <p className="text-sm text-slate-600">{project.description}</p>
                            <p className="text-sm font-medium mt-2">
                              {project.price / 100} {project.currency} • Status: <span className={project.paymentStatus === "COMPLETED" ? "text-green-600" : "text-yellow-600"}>{project.paymentStatus}</span>
                            </p>
                          </div>
                          <Link href={`/p/${project.id}`} className="ml-4 px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 whitespace-nowrap">
                            View
                          </Link>
                        </div>
                      </li>
                  );
                })}
              </ul>
          ) : (
              <p className="text-slate-600 text-sm">You haven't created any vaults yet. Start by filling the form above!</p>
          )}
        </section>

        {/* Invited Vaults Section (Client Invitations) */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Vaults Shared With You</h2>
          <p className="text-sm text-slate-600 mb-4">Vaults that have been shared with you as a client.</p>
          {safeClientProjects.length > 0 ? (
              <ul className="space-y-4">
                {safeClientProjects.map((project: any) => {
                  // Normalize data relationships (Supabase might return object or array)
                  const assetData = Array.isArray(project.asset) ? project.asset[0] : project.asset;
                  const freelancerData = Array.isArray(project.freelancer) ? project.freelancer[0] : project.freelancer;

                  const previewUrl = assetData ? getPreviewAssetUrl(assetData.previewUrl) : null;
                  const protectedDownloadUrl = assetData ? createProtectedDownloadLink(assetData.id) : null;

                  return (
                      <li key={project.id} className="rounded-md border p-4 hover:bg-slate-50 transition">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-lg">{project.title}</p>
                            <p className="text-sm text-slate-600">From: {freelancerData?.name} ({freelancerData?.email})</p>
                            <p className="text-sm text-slate-600">{project.description}</p>
                            <p className="text-sm font-medium mt-2">
                              {project.price / 100} {project.currency} • Status: <span className={project.paymentStatus === "COMPLETED" ? "text-green-600" : "text-yellow-600"}>{project.paymentStatus}</span>
                            </p>
                          </div>
                        </div>

                        {previewUrl ? (
                            <div className="relative aspect-video overflow-hidden rounded-lg border bg-slate-100 mb-3">
                              <AssetImage
                                src={previewUrl}
                                alt={`${project.title} preview`}
                                sizes="(max-width: 768px) 100vw, 640px"
                              />
                            </div>
                        ) : null}

                        <div className="flex gap-2 flex-wrap">
                          <Link href={`/p/${project.id}`} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                            View Preview
                          </Link>
                          {project.paymentStatus === "COMPLETED" && assetData?.isUnlocked && protectedDownloadUrl ? (
                              <DownloadOriginalLink href={protectedDownloadUrl} className="px-3 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                                Download Original
                              </DownloadOriginalLink>
                          ) : null}
                        </div>
                      </li>
                  );
                })}
              </ul>
          ) : (
              <p className="text-slate-600 text-sm">No vaults have been shared with you yet.</p>
          )}
        </section>
      </main>
  );
}