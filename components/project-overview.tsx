"use client";

import { DeleteVaultButton } from "@/components/delete-vault-button";
import Link from "next/link";
import { useMemo, useState } from "react";

export type OverviewProject = {
  id: string;
  title: string;
  price: number;
  currency: string;
  paymentStatus: "PENDING" | "COMPLETED";
  freelancerPayoutAmount: number | null;
  platformFeeAmount: number | null;
  paidAt: string | null;
  checkoutStartedAt: string | null;
  clientName: string;
  clientEmail: string;
};

type Filter = "all" | "pending" | "paid";

function money(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function payoutOf(project: OverviewProject) {
  if (project.freelancerPayoutAmount != null) return project.freelancerPayoutAmount;
  return project.price - (project.platformFeeAmount ?? 0);
}

export function ProjectOverview({ projects }: { projects: OverviewProject[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const totals = useMemo(() => {
    const pending = projects.filter((project) => project.paymentStatus === "PENDING");
    const paid = projects.filter((project) => project.paymentStatus === "COMPLETED");
    return {
      pendingCount: pending.length,
      pendingTotal: pending.reduce((sum, project) => sum + project.price, 0),
      paidCount: paid.length,
      paidPayout: paid.reduce((sum, project) => sum + payoutOf(project), 0),
      fees: paid.reduce((sum, project) => sum + (project.platformFeeAmount ?? 0), 0),
      currency: projects[0]?.currency ?? "USD",
    };
  }, [projects]);

  const visible = projects.filter((project) => {
    if (filter === "pending") return project.paymentStatus === "PENDING";
    if (filter === "paid") return project.paymentStatus === "COMPLETED";
    return true;
  });

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Project Overview</h2>
      <p className="mt-2 text-sm text-slate-600">Track active deliveries, payment status, and income from paid vaults.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Awaiting payment</p>
          <p className="mt-1 text-2xl font-semibold">{totals.pendingCount}</p>
          <p className="text-sm text-slate-600">{money(totals.pendingTotal, totals.currency)} outstanding</p>
        </div>
        <div className="rounded-lg border bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Paid income</p>
          <p className="mt-1 text-2xl font-semibold">{money(totals.paidPayout, totals.currency)}</p>
          <p className="text-sm text-slate-600">{totals.paidCount} completed vault{totals.paidCount === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-lg border bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Platform fees</p>
          <p className="mt-1 text-2xl font-semibold">{money(totals.fees, totals.currency)}</p>
          <p className="text-sm text-slate-600">On captured payments</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {([
          ["all", "All"],
          ["pending", "Awaiting payment"],
          ["paid", "Paid"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-md px-3 py-1.5 text-sm ${filter === id ? "bg-slate-900 text-white" : "border"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No vaults in this filter.</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {visible.map((project) => {
            const unpaid = project.paymentStatus === "PENDING";
            return (
              <li key={project.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{project.title}</p>
                  <p className="text-sm text-slate-600">
                    {project.clientName} ({project.clientEmail})
                  </p>
                  <p className="mt-1 text-sm">
                    {money(project.price, project.currency)} • payout {money(payoutOf(project), project.currency)}
                    {project.paidAt ? ` • paid ${new Date(project.paidAt).toLocaleDateString()}` : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      unpaid ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {unpaid ? "Awaiting payment" : "Paid"}
                  </span>
                  <Link href={`/p/${project.id}`} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
                    View
                  </Link>
                  {unpaid ? (
                    <>
                      <Link href={`/p/${project.id}/edit`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50">
                        Edit
                      </Link>
                      <DeleteVaultButton
                        projectId={project.id}
                        paymentStatus={project.paymentStatus}
                        checkoutStartedAt={project.checkoutStartedAt}
                      />
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
