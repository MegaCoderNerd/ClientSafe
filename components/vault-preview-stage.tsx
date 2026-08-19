"use client";

import { useEffect, useMemo, useState } from "react";
import { AssetPreview } from "@/components/asset-preview";
import { Button } from "@/components/ui/button";

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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (tabs.length && !tabs.includes(tab)) setTab(tabs[0]);
  }, [tab, tabs]);

  useEffect(() => {
    if (isOwner) return;
    const key = `vault-welcome:${projectId}`;
    if (window.localStorage.getItem(key)) return;
    setShowTip(true);
  }, [isOwner, projectId]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  function dismissTip() {
    window.localStorage.setItem(`vault-welcome:${projectId}`, "1");
    setShowTip(false);
  }

  const preview = (
    <AssetPreview
      imageSrc={tab === "video" ? imageSrc || posterSrc : imageSrc}
      videoSrc={tab === "video" ? videoSrc : undefined}
      alt={`${title} preview`}
      sizes={expanded ? "100vw" : "(max-width: 1024px) 100vw, 720px"}
      preload
      fit="contain"
    />
  );

  const demoFrame = demoSrc ? (
    <iframe
      title={`${title} live demo`}
      src={demoSrc}
      sandbox="allow-scripts"
      className={expanded ? "h-full w-full bg-white" : "h-[min(70vh,36rem)] min-h-[16rem] w-full bg-white sm:h-auto sm:min-h-0 sm:aspect-video"}
    />
  ) : null;

  return (
    <section className="glass-card p-4 sm:p-6">
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
          <button type="button" onClick={dismissTip} className="shrink-0 text-xs font-medium text-accent hover:underline">
            Got it
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Asset Preview</h2>
        <div className="flex flex-wrap items-center gap-2">
          {tabs.length > 1 ? (
            <div className="flex rounded-lg border p-1 text-sm">
              {tabs.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`rounded-md px-3 py-1 capitalize transition duration-150 ${tab === item ? "bg-accent text-white" : "text-slate-600 hover:bg-white/80"}`}
                >
                  {item === "demo" ? "Live demo" : item}
                </button>
              ))}
            </div>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setExpanded(true)}
          >
            Full window
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {tab === "demo" && demoFrame ? (
          <div className="overflow-hidden rounded-xl border bg-slate-900 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-700 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 truncate text-xs text-slate-300">Limited preview · {title}</span>
            </div>
            {demoFrame}
          </div>
        ) : (
          <div className="relative aspect-video min-h-[12rem] w-full rounded-lg border bg-slate-950">
            {preview}
          </div>
        )}
      </div>

      {expanded ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950">
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <p className="truncate text-sm font-medium">{title}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setExpanded(false)}
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Close
            </Button>
          </div>
          <div className="relative min-h-0 flex-1">
            {tab === "demo" ? demoFrame : preview}
          </div>
        </div>
      ) : null}

      {!isPaid && !isOwner ? (
        <p className="mt-4 text-sm italic text-slate-600">
          This is a limited preview. Purchase to download the original files.
        </p>
      ) : null}
    </section>
  );
}
