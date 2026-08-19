"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";

export type DashboardTab = "overview" | "create" | "mine" | "shared";

const TAB_LABELS: Record<DashboardTab, string> = {
  overview: "Overview",
  create: "Create",
  mine: "My vaults",
  shared: "Shared",
};

type DashboardShellProps = {
  userName: string;
  defaultTab: DashboardTab;
  overview?: ReactNode;
  create: ReactNode;
  mine?: ReactNode;
  shared?: ReactNode;
};

export function DashboardShell({
  userName,
  defaultTab,
  overview,
  create,
  mine,
  shared,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const available = useMemo(() => {
    const tabs: DashboardTab[] = [];
    if (overview) tabs.push("overview");
    tabs.push("create");
    if (mine) tabs.push("mine");
    if (shared) tabs.push("shared");
    return tabs;
  }, [mine, overview, shared]);

  const requested = searchParams.get("tab");
  const active: DashboardTab = available.includes(requested as DashboardTab)
    ? (requested as DashboardTab)
    : defaultTab;

  function selectTab(tab: DashboardTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (requested === active) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", active);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [active, pathname, requested, router, searchParams]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8">
      <Card className="p-4 sm:p-6">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Welcome, {userName}</h1>
        <p className="mt-2 text-slate-600">Manage your vaults and deliveries in one place.</p>
      </Card>

      <div role="tablist" aria-label="Dashboard sections" className="flex flex-wrap gap-2">
        {available.map((tab) => {
          const selected = tab === active;
          return (
            <Button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              variant={selected ? "primary" : "secondary"}
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => selectTab(tab)}
            >
              {TAB_LABELS[tab]}
            </Button>
          );
        })}
      </div>

      <div hidden={active !== "overview"}>{overview}</div>
      <div hidden={active !== "create"}>{create}</div>
      <div hidden={active !== "mine"}>{mine}</div>
      <div hidden={active !== "shared"}>{shared}</div>
    </div>
  );
}
