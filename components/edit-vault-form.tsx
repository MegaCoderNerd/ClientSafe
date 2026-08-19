"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProject } from "@/app/actions";
import { AssetImage } from "@/components/asset-image";
import { compressImageFile } from "@/lib/compress-image";
import { STOCK_ASSETS, type StockAsset } from "@/lib/stock-assets";
import { paintFrame, uploadAssets } from "@/lib/upload-client";

type ClientOption = {
  id: string;
  name: string;
  email: string;
};

type Source = "keep" | "stock" | "upload";
type UploadPhase = "idle" | "compress" | "upload" | "save";

export type EditableVault = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  clientId: string;
  previewUrl: string;
  previewVideoUrl: string | null;
  demoIndexUrl: string | null;
  originalFileUrl: string;
};

export function EditVaultForm({
  clients,
  vault,
}: {
  clients: ClientOption[];
  vault: EditableVault;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(STOCK_ASSETS[0]?.id ?? "");
  const [source, setSource] = useState<Source>("keep");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const currentClient = useMemo(
    () => clients.find((client) => client.id === vault.clientId) ?? null,
    [clients, vault.clientId],
  );
  const selected = useMemo(
    () => STOCK_ASSETS.find((asset) => asset.id === selectedId) ?? STOCK_ASSETS[0],
    [selectedId],
  );

  async function handleSubmit(formData: FormData) {
    setBusy(true);
    setError(null);
    setPhase(source === "upload" ? "compress" : "save");
    setUploadPercent(0);
    await paintFrame();

    try {
      formData.set("projectId", vault.id);
      formData.set("currency", vault.currency || "USD");

      if (source === "keep") {
        formData.set("previewUrl", vault.previewUrl);
        formData.set("previewVideoUrl", vault.previewVideoUrl ?? "");
        formData.set("demoIndexUrl", vault.demoIndexUrl ?? "");
        formData.set("originalFileUrl", vault.originalFileUrl);
      } else if (source === "stock") {
        if (!selected) throw new Error("Choose a stock pack.");
        formData.set("previewUrl", selected.previewUrl);
        formData.set("previewVideoUrl", selected.previewVideoUrl ?? "");
        formData.set("demoIndexUrl", selected.demoIndexUrl ?? "");
        formData.set("originalFileUrl", selected.originalFileUrl);
      } else {
        const previewFile = formData.get("previewFile");
        const previewVideoFile = formData.get("previewVideoFile");
        const demoZipFile = formData.get("demoZipFile");
        const originalFile = formData.get("originalFile");
        const hasImage = previewFile instanceof File && previewFile.size > 0;
        const hasVideo = previewVideoFile instanceof File && previewVideoFile.size > 0;
        const hasDemo = demoZipFile instanceof File && demoZipFile.size > 0;
        const hasOriginal = originalFile instanceof File && originalFile.size > 0;

        formData.set("previewUrl", vault.previewUrl);
        formData.set("previewVideoUrl", vault.previewVideoUrl ?? "");
        formData.set("demoIndexUrl", vault.demoIndexUrl ?? "");
        formData.set("originalFileUrl", vault.originalFileUrl);

        if (hasImage || hasVideo || hasDemo || hasOriginal) {
          const body = new FormData();
          body.set("patch", "1");
          if (hasImage && previewFile instanceof File) {
            body.set("preview", await compressImageFile(previewFile, { maxWidth: 1280, quality: 0.7 }));
          }
          if (hasVideo && previewVideoFile instanceof File) {
            body.set("previewVideo", previewVideoFile);
          }
          if (hasDemo && demoZipFile instanceof File) {
            body.set("demoZip", demoZipFile);
          }
          if (hasOriginal && originalFile instanceof File) {
            body.set("original", await compressImageFile(originalFile, { maxWidth: 1600, quality: 0.8 }));
          }

          setPhase("upload");
          await paintFrame();
          const payload = await uploadAssets(body, setUploadPercent);
          if (!payload.ok) {
            throw new Error(payload.error || "Upload failed");
          }
          if (payload.previewUrl) formData.set("previewUrl", payload.previewUrl);
          if (payload.previewVideoUrl) formData.set("previewVideoUrl", payload.previewVideoUrl);
          if (payload.originalFileUrl) formData.set("originalFileUrl", payload.originalFileUrl);
          if (payload.demoZipUrl) formData.set("demoZipUrl", payload.demoZipUrl);
        }
      }

      formData.delete("previewFile");
      formData.delete("previewVideoFile");
      formData.delete("demoZipFile");
      formData.delete("originalFile");
      setPhase("save");
      await paintFrame();
      const result = await updateProject(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/p/${vault.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not update vault");
    } finally {
      setBusy(false);
      setPhase("idle");
      setUploadPercent(0);
    }
  }

  return (
    <form action={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm">
        Client email
        <input
          name="clientEmail"
          type="email"
          required
          defaultValue={currentClient?.email ?? ""}
          placeholder="client@example.com"
          className="rounded-md border p-2"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Price (USD)
        <input
          name="price"
          type="number"
          min="1"
          step="0.01"
          required
          defaultValue={(vault.price / 100).toFixed(2)}
          className="rounded-md border p-2"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm md:col-span-2">
        Title
        <input name="title" required defaultValue={vault.title} className="rounded-md border p-2" />
      </label>
      <label className="flex flex-col gap-2 text-sm md:col-span-2">
        Description
        <textarea name="description" required defaultValue={vault.description} className="rounded-md border p-2" rows={3} />
      </label>

      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-sm font-medium">Assets</legend>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSource("keep")}
            className={`rounded-md px-3 py-1.5 text-sm ${source === "keep" ? "bg-slate-900 text-white" : "border"}`}
          >
            Keep current files
          </button>
          <button
            type="button"
            onClick={() => setSource("stock")}
            className={`rounded-md px-3 py-1.5 text-sm ${source === "stock" ? "bg-slate-900 text-white" : "border"}`}
          >
            Replace with stock pack
          </button>
          <button
            type="button"
            onClick={() => setSource("upload")}
            className={`rounded-md px-3 py-1.5 text-sm ${source === "upload" ? "bg-slate-900 text-white" : "border"}`}
          >
            Upload replacements
          </button>
        </div>

        {source === "keep" ? (
          <div className="relative aspect-video max-w-md overflow-hidden rounded-lg border bg-slate-100">
            <AssetImage src={vault.previewUrl} alt="Current preview" sizes="(max-width: 768px) 100vw, 448px" />
          </div>
        ) : null}

        {source === "stock" && selected ? (
          <>
            <p className="mb-3 text-xs text-slate-600">This replaces the preview, demo, and original with the selected pack.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {STOCK_ASSETS.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedId(asset.id)}
                  className={`overflow-hidden rounded-lg border text-left ${
                    asset.id === selected.id ? "border-slate-900 ring-2 ring-slate-900" : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <span className="relative block aspect-video bg-slate-100">
                    <AssetImage src={asset.previewUrl} alt="" sizes="(max-width: 640px) 100vw, 280px" />
                  </span>
                  <span className="block p-3">
                    <span className="block text-sm font-medium">{asset.title}</span>
                    <span className="mt-1 block text-xs text-slate-600">{asset.price.toFixed(2)} USD</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {source === "upload" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              Preview image
              <input name="previewFile" type="file" accept="image/*" className="rounded-md border p-2" />
              <span className="text-xs text-slate-500">Leave empty to keep the current image.</span>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Preview video
              <input name="previewVideoFile" type="file" accept="video/mp4,video/webm,.mp4,.webm" className="rounded-md border p-2" />
              <span className="text-xs text-slate-500">Optional mp4 or webm, up to 30MB.</span>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Live demo zip
              <input name="demoZipFile" type="file" accept=".zip,application/zip" className="rounded-md border p-2" />
              <span className="text-xs text-slate-500">Optional static HTML zip with index.html.</span>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Original file
              <input name="originalFile" type="file" className="rounded-md border p-2" />
              <span className="text-xs text-slate-500">Leave empty to keep the current original.</span>
            </label>
          </div>
        ) : null}
      </fieldset>

      {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}

      {busy ? (
        <div className="rounded-lg border bg-slate-50 p-3 md:col-span-2">
          <p className="text-sm text-slate-700">
            {phase === "compress"
              ? "Preparing files…"
              : phase === "upload"
                ? `Uploading in the background… ${uploadPercent}%`
                : "Saving vault…"}
          </p>
          {phase === "upload" ? (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-slate-900 transition-[width]" style={{ width: `${uploadPercent}%` }} />
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 font-medium"
      >
        {busy
          ? phase === "upload"
            ? `Uploading ${uploadPercent}%…`
            : phase === "compress"
              ? "Preparing files…"
              : "Saving vault…"
          : "Save changes"}
      </button>
    </form>
  );
}
