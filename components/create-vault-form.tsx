"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/app/actions";
import { AssetImage } from "@/components/asset-image";
import { compressImageFile } from "@/lib/compress-image";
import { STOCK_ASSETS, type StockAsset } from "@/lib/stock-assets";

type ClientOption = {
  id: string;
  name: string;
  email: string;
};

type Source = "stock" | "upload";

export function CreateVaultForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(STOCK_ASSETS[0]?.id ?? "");
  const [source, setSource] = useState<Source>("stock");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(
    () => STOCK_ASSETS.find((asset) => asset.id === selectedId) ?? STOCK_ASSETS[0],
    [selectedId],
  );

  if (!selected) return null;

  async function handleSubmit(formData: FormData) {
    setBusy(true);
    setError(null);

    try {
      if (source === "upload") {
        const previewFile = formData.get("previewFile");
        const originalFile = formData.get("originalFile");
        if (!(previewFile instanceof File) || !previewFile.size || !(originalFile instanceof File) || !originalFile.size) {
          throw new Error("Choose a preview image and an original file.");
        }

        const [preview, original] = await Promise.all([
          compressImageFile(previewFile, { maxWidth: 1280, quality: 0.7 }),
          compressImageFile(originalFile, { maxWidth: 1600, quality: 0.8 }),
        ]);

        const body = new FormData();
        body.set("preview", preview);
        body.set("original", original);

        const response = await fetch("/api/assets/upload", { method: "POST", body });
        const payload = (await response.json()) as { previewUrl?: string; originalFileUrl?: string; error?: string };
        if (!response.ok || !payload.previewUrl || !payload.originalFileUrl) {
          throw new Error(payload.error || "Upload failed");
        }

        formData.set("previewUrl", payload.previewUrl);
        formData.set("originalFileUrl", payload.originalFileUrl);
      }

      formData.delete("previewFile");
      formData.delete("originalFile");
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
    }
  }

  return (
    <form action={handleSubmit} className="grid gap-4 md:grid-cols-2">
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
              Pick a demo pack with a compressed preview and a small original file.
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
              <input name="previewFile" type="file" accept="image/*" required={source === "upload"} className="rounded-md border p-2" />
              <span className="text-xs text-slate-500">Compressed in the browser before upload.</span>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Original file
              <input name="originalFile" type="file" required={source === "upload"} className="rounded-md border p-2" />
              <span className="text-xs text-slate-500">Images are resized to WebP; zip/pdf stay as-is.</span>
            </label>
          </div>
        )}
      </fieldset>

      {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}

      <button
        type="submit"
        disabled={clients.length === 0 || busy}
        className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 font-medium"
      >
        {busy ? "Saving vault..." : "Create Vault"}
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
      </span>
    </button>
  );
}
