"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/app/actions";
import { AssetImage } from "@/components/asset-image";
import { compressImageFile } from "@/lib/compress-image";
import { STOCK_ASSETS, type StockAsset } from "@/lib/stock-assets";
import { paintFrame, uploadAssets } from "@/lib/upload-client";

type ClientOption = {
  id: string;
  name: string;
  email: string;
};

type Source = "stock" | "upload";
type UploadPhase = "idle" | "compress" | "upload" | "save";

export function CreateVaultForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(STOCK_ASSETS[0]?.id ?? "");
  const [source, setSource] = useState<Source>("stock");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(
    () => STOCK_ASSETS.find((asset) => asset.id === selectedId) ?? STOCK_ASSETS[0],
    [selectedId],
  );

  if (!selected) return null;

  async function handleSubmit(formData: FormData) {
    setBusy(true);
    setError(null);
    setPhase(source === "upload" ? "compress" : "save");
    setUploadPercent(0);
    await paintFrame();

    try {
      if (source === "upload") {
        const previewFile = formData.get("previewFile");
        const previewVideoFile = formData.get("previewVideoFile");
        const demoZipFile = formData.get("demoZipFile");
        const originalFile = formData.get("originalFile");
        const hasImage = previewFile instanceof File && previewFile.size > 0;
        const hasVideo = previewVideoFile instanceof File && previewVideoFile.size > 0;
        const hasDemo = demoZipFile instanceof File && demoZipFile.size > 0;

        if (!hasImage && !hasVideo) {
          throw new Error("Upload a preview image or a preview video.");
        }
        if (!(originalFile instanceof File) || !originalFile.size) {
          throw new Error("Choose an original file to unlock after payment.");
        }

        const body = new FormData();
        const [preview, original] = await Promise.all([
          hasImage && previewFile instanceof File
            ? compressImageFile(previewFile, { maxWidth: 1280, quality: 0.7 })
            : Promise.resolve(null),
          compressImageFile(originalFile, { maxWidth: 1600, quality: 0.8 }),
        ]);
        if (preview) body.set("preview", preview);
        if (hasVideo && previewVideoFile instanceof File) {
          body.set("previewVideo", previewVideoFile);
        }
        if (hasDemo && demoZipFile instanceof File) {
          body.set("demoZip", demoZipFile);
        }
        body.set("original", original);

        setPhase("upload");
        await paintFrame();
        const payload = await uploadAssets(body, setUploadPercent);
        if (!payload.ok || !payload.originalFileUrl) {
          throw new Error(payload.error || "Upload failed");
        }

        formData.set("previewUrl", payload.previewUrl ?? "");
        formData.set("previewVideoUrl", payload.previewVideoUrl ?? "");
        formData.set("originalFileUrl", payload.originalFileUrl);
        formData.set("demoZipUrl", payload.demoZipUrl ?? "");
      }

      formData.delete("previewFile");
      formData.delete("previewVideoFile");
      formData.delete("demoZipFile");
      formData.delete("originalFile");
      setPhase("save");
      await paintFrame();
      const result = await createProject(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create vault");
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
          placeholder="client@example.com"
          className="rounded-md border p-2"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Price (USD)
        <input
          key={`${selected.id}-price`}
          name="price"
          type="number"
          min="1"
          step="0.01"
          required
          defaultValue={selected.price}
          className="rounded-md border p-2"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm md:col-span-2">
        Title
        <input
          key={`${selected.id}-title`}
          name="title"
          required
          defaultValue={source === "stock" ? selected.title : ""}
          className="rounded-md border p-2"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm md:col-span-2">
        Description
        <textarea
          key={`${selected.id}-description`}
          name="description"
          required
          defaultValue={source === "stock" ? selected.description : ""}
          className="rounded-md border p-2"
          rows={3}
        />
      </label>
      <input type="hidden" name="currency" value="USD" />
      {source === "stock" ? (
        <>
          <input type="hidden" name="previewUrl" value={selected.previewUrl} />
          <input type="hidden" name="previewVideoUrl" value={selected.previewVideoUrl ?? ""} />
          <input type="hidden" name="demoIndexUrl" value={selected.demoIndexUrl ?? ""} />
          <input type="hidden" name="originalFileUrl" value={selected.originalFileUrl} />
        </>
      ) : null}

      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-sm font-medium">Asset source</legend>
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setSource("stock")}
            className={`rounded-md px-3 py-1.5 text-sm ${source === "stock" ? "bg-slate-900 text-white" : "border"}`}
          >
            Stock pack
          </button>
          <button
            type="button"
            onClick={() => setSource("upload")}
            className={`rounded-md px-3 py-1.5 text-sm ${source === "upload" ? "bg-slate-900 text-white" : "border"}`}
          >
            Upload from computer
          </button>
        </div>

        {source === "stock" ? (
          <>
            <p className="mb-3 text-xs text-slate-600">
              Pick a demo pack. The landing-page pack includes a sandboxed live HTML demo.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {STOCK_ASSETS.map((asset) => (
                <StockPackButton
                  key={asset.id}
                  asset={asset}
                  selected={asset.id === selected.id}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              Preview image
              <input name="previewFile" type="file" accept="image/*" className="rounded-md border p-2" />
              <span className="text-xs text-slate-500">Poster for dashboard cards. Provide this or a video.</span>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Preview video
              <input name="previewVideoFile" type="file" accept="video/mp4,video/webm,.mp4,.webm" className="rounded-md border p-2" />
              <span className="text-xs text-slate-500">Optional mp4 or webm, up to 30MB. Not compressed.</span>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Live demo zip
              <input name="demoZipFile" type="file" accept=".zip,application/zip" className="rounded-md border p-2" />
              <span className="text-xs text-slate-500">Optional static HTML/CSS/JS with index.html at the root. 5MB max.</span>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Original file
              <input name="originalFile" type="file" required={source === "upload"} className="rounded-md border p-2" />
              <span className="text-xs text-slate-500">Unlocked after payment. Images are resized; zip/pdf stay as-is.</span>
            </label>
          </div>
        )}
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
          : "Create Vault"}
      </button>
    </form>
  );
}

function StockPackButton({
  asset,
  selected,
  onSelect,
}: {
  asset: StockAsset;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(asset.id)}
      className={`overflow-hidden rounded-lg border text-left ${
        selected ? "border-slate-900 ring-2 ring-slate-900" : "border-slate-200 hover:border-slate-400"
      }`}
    >
      <span className="relative block aspect-video bg-slate-100">
        <AssetImage src={asset.previewUrl} alt="" sizes="(max-width: 640px) 100vw, 280px" />
      </span>
      <span className="block p-3">
        <span className="block text-sm font-medium">{asset.title}</span>
        <span className="mt-1 block text-xs text-slate-600">{asset.price.toFixed(2)} USD</span>
        {asset.demoIndexUrl ? (
          <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            Live demo
          </span>
        ) : null}
      </span>
    </button>
  );
}
