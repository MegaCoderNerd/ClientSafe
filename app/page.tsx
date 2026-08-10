import { createProject } from "@/app/actions";
import { authOptions } from "@/lib/auth";
import { createProtectedDownloadLink, getPreviewAssetUrl } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

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

  // Fetch all data for authenticated users
  const [clients, clientProjects, freelancerProjects] = await Promise.all([
    prisma.user.findMany({ where: { NOT: { id: session.user.id } }, orderBy: { email: "asc" } }),
    prisma.deliveryProject.findMany({
      where: { 
        clientId: session.user.id,
        freelancerId: { not: session.user.id }
      },
      include: { freelancer: true, asset: true },
      orderBy: { title: "asc" },
    }),
    prisma.deliveryProject.findMany({
      where: { freelancerId: session.user.id },
      include: { client: true, asset: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
      {/* Welcome Section */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">Welcome, {session.user.name ?? session.user.email}</h1>
        <p className="mt-2 text-slate-600">Manage your vaults and deliveries in one place.</p>
      </section>

      {/* Create New Vault Section (Freelancer) */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Create New Vault</h2>
        <p className="text-sm text-slate-600 mb-4">Create a secure delivery vault to share with clients.</p>
        <form action={createProject} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            Client
            {clients.length > 0 ? (
              <select name="clientId" required className="rounded-md border p-2">
                <option value="">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-md border bg-slate-50 p-2 text-xs text-slate-600">
                No other users found yet.
              </p>
            )}
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Price (USD)
            <input name="price" type="number" min="1" step="0.01" required className="rounded-md border p-2" />
          </label>
          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            Title
            <input name="title" required className="rounded-md border p-2" placeholder="Vault title" />
          </label>
          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            Description
            <textarea name="description" required className="rounded-md border p-2" rows={3} placeholder="Describe your vault" />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Currency
            <input name="currency" defaultValue="USD" required className="rounded-md border p-2" />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Preview URL (watermarked)
            <input name="previewUrl" type="url" required className="rounded-md border p-2" />
          </label>
          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            Original File URL (protected)
            <input name="originalFileUrl" type="url" required className="rounded-md border p-2" />
          </label>
          <button
            type="submit"
            disabled={clients.length === 0}
            className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 font-medium"
          >
            Create Vault
          </button>
        </form>
      </section>

      {/* Your Vaults Section (Freelancer Created) */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Your Vaults</h2>
        <p className="text-sm text-slate-600 mb-4">Vaults you created for your clients.</p>
        {freelancerProjects.length > 0 ? (
          <ul className="space-y-4">
            {freelancerProjects.map((project) => (
              <li key={project.id} className="rounded-md border p-4 hover:bg-slate-50 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{project.title}</p>
                    <p className="text-sm text-slate-600">Client: {project.client.name} ({project.client.email})</p>
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
            ))}
          </ul>
        ) : (
          <p className="text-slate-600 text-sm">You haven't created any vaults yet. Start by filling the form above!</p>
        )}
      </section>

      {/* Invited Vaults Section (Client Invitations) */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Vaults Shared With You</h2>
        <p className="text-sm text-slate-600 mb-4">Vaults that have been shared with you as a client.</p>
        {clientProjects.length > 0 ? (
          <ul className="space-y-4">
            {clientProjects.map((project) => {
              const previewUrl = project.asset ? getPreviewAssetUrl(project.asset.previewUrl) : null;
              const protectedDownloadUrl = project.asset ? createProtectedDownloadLink(project.asset.id) : null;

              return (
                <li key={project.id} className="rounded-md border p-4 hover:bg-slate-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{project.title}</p>
                      <p className="text-sm text-slate-600">From: {project.freelancer.name} ({project.freelancer.email})</p>
                      <p className="text-sm text-slate-600">{project.description}</p>
                      <p className="text-sm font-medium mt-2">
                        {project.price / 100} {project.currency} • Status: <span className={project.paymentStatus === "COMPLETED" ? "text-green-600" : "text-yellow-600"}>{project.paymentStatus}</span>
                      </p>
                    </div>
                  </div>
                  
                  {previewUrl ? (
                    <div className="relative aspect-video overflow-hidden rounded-lg border bg-slate-100 mb-3">
                      <Image src={previewUrl} alt={`${project.title} preview`} fill className="object-cover" unoptimized />
                    </div>
                  ) : null}

                  <div className="flex gap-2 flex-wrap">
                    <Link href={`/p/${project.id}`} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                      View Preview
                    </Link>
                    {project.paymentStatus === "COMPLETED" && project.asset?.isUnlocked && protectedDownloadUrl ? (
                      <Link href={protectedDownloadUrl} className="px-3 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                        Download Original
                      </Link>
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
