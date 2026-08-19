"use client";

import { useEffect, useMemo, useState } from "react";
import { AssetPreview } from "@/components/asset-preview";

type Tab = "image" | "video" | "demo";

type VaultPreviewStageProps = {
  projectId: string;
  title: string;
  imageSrc?: string | null;
  videoSrc?: string | null;
  posterSrc?: string | null;
  demoSrc?: string | null;
  isOwner: boolean;
  isPaid: boolean;
};

export function VaultPreviewStage({
  projectId,
  title,
  imageSrc,
  videoSrc,
  posterSrc,
  demoSrc,
  isOwner,
  isPaid,
}: VaultPreviewStageProps) {
  const tabs = useMemo(() => {
    const available: Tab[] = [];
    if (imageSrc) available.push("image");
    if (videoSrc) available.push("video");
    if (demoSrc) available.push("demo");
    return available;
  }, [demoSrc, imageSrc, videoSrc]);

  const [tab, setTab] = useState<Tab>(tabs[0] ?? "image");
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (tabs.length && !tabs.includes(tab)) setTab(tabs[0]);
  }, [tab, tabs]);

  useEffect(() => {
    if (isOwner) return;
    const key = `vault-welcome:${projectId}`;
    if (window.localStorage.getItem(key)) return;
    setShowTip(true);
  }, [isOwner, projectId]);

  function dismissTip() {
    window.localStorage.setItem(`vault-welcome:${projectId}`, "1");
    setShowTip(false);
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      {!isOwner ? (
        <div className="mb-5 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Preview this delivery before you pay</p>
          <ol className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
            <li className="rounded-lg border bg-white px-3 py-2">1. Preview</li>
            <li className="rounded-lg border bg-white px-3 py-2">2. Ask in chat</li>
            <li className="rounded-lg border bg-white px-3 py-2">3. Pay to unlock</li>
          </ol>
        </div>
      ) : null}

      {showTip ? (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p>Start with the preview tabs. The live demo is a limited look at the work, not the full original.</p>
          <button type="button" onClick={dismissTip} className="shrink-0 text-xs font-medium underline">
            Got it
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Asset Preview</h2>
        {tabs.length > 1 ? (
          <div className="flex rounded-lg border p-1 text-sm">
            {tabs.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`rounded-md px-3 py-1 capitalize ${tab === item ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                {item === "demo" ? "Live demo" : item}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {tab === "demo" && demoSrc ? (
          <div className="overflow-hidden rounded-xl border bg-slate-900 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-700 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 truncate text-xs text-slate-300">Limited preview · {title}</span>
            </div>
            <iframe
              title={`${title} live demo`}
              src={demoSrc}
              sandbox="allow-scripts"
              className="aspect-video w-full bg-white"
            />
          </div>
        ) : (
          <div className="relative aspect-video overflow-hidden rounded-lg border bg-slate-100">
            <AssetPreview
              imageSrc={tab === "video" ? imageSrc || posterSrc : imageSrc}
              videoSrc={tab === "video" ? videoSrc : undefined}
              alt={`${title} preview`}
              sizes="(max-width: 1024px) 100vw, 720px"
              preload
            />
          </div>
        )}
      </div>

      {!isPaid && !isOwner ? (
        <p className="mt-4 text-sm italic text-slate-600">
          This is a limited preview. Purchase to download the original files.
        </p>
      ) : null}
    </section>
  );
}
