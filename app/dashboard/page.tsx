import { createProject } from "@/app/dashboard/actions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "FREELANCER") {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-semibold">Freelancer Dashboard</h1>
        <p className="mt-4">Only FREELANCER accounts can access this portal.</p>
      </main>
    );
  }

  const [clients, projects] = await Promise.all([
    prisma.user.findMany({ where: { role: "CLIENT" }, orderBy: { email: "asc" } }),
    prisma.deliveryProject.findMany({
      where: { freelancerId: session.user.id },
      include: { client: true, asset: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Freelancer Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Create secure delivery projects and share preview links.</p>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Create New Delivery Project</h2>
        <form action={createProject} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            Client
            {clients.length > 0 ? (
              <select name="clientId" required className="rounded-md border p-2">
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-md border bg-slate-50 p-2 text-xs text-slate-600">
                No CLIENT users found. Run <code>npm run prisma:seed</code> to create demo client data.
              </p>
            )}
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Price (USD)
            <input name="price" type="number" min="1" step="0.01" required className="rounded-md border p-2" />
          </label>
          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            Title
            <input name="title" required className="rounded-md border p-2" />
          </label>
          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            Description
            <textarea name="description" required className="rounded-md border p-2" rows={3} />
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
            className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
          >
            Save Project and Generate Preview Link
          </button>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Your Delivery Projects</h2>
        <ul className="mt-4 space-y-3">
          {projects.map((project) => (
            <li key={project.id} className="rounded-md border p-4">
              <p className="font-medium">{project.title}</p>
              <p className="text-sm text-slate-600">Client: {project.client.email}</p>
              <p className="text-sm text-slate-600">Status: {project.paymentStatus}</p>
              <Link href={`/p/${project.id}`} className="mt-2 inline-block text-sm font-medium text-blue-700 underline">
                Open Preview Link
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
