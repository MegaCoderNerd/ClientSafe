export function paintFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export type UploadPayload = {
  previewUrl?: string;
  previewVideoUrl?: string;
  originalFileUrl?: string;
  demoZipUrl?: string;
  error?: string;
  ok: boolean;
  status: number;
};

type SignUpload = {
  kind: "preview" | "previewVideo" | "original" | "demoZip";
  signedUrl: string;
  storedUrl: string;
};

type SignResponse = {
  ok?: boolean;
  error?: string;
  uploads?: SignUpload[];
};

const KIND_TO_FIELD = {
  preview: "previewUrl",
  previewVideo: "previewVideoUrl",
  original: "originalFileUrl",
  demoZip: "demoZipUrl",
} as const;

function putFile(signedUrl: string, file: File, onProgress: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(event.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(parseUploadError(xhr.responseText, xhr.status)));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(body);
  });
}

function parseUploadError(text: string, status: number) {
  try {
    const payload = JSON.parse(text) as { error?: string; message?: string };
    return payload.error || payload.message || `Upload failed (${status})`;
  } catch {
    return text?.trim() || `Upload failed (${status})`;
  }
}

export async function uploadAssets(body: FormData, onProgress: (percent: number) => void): Promise<UploadPayload> {
  const files = (
    [
      ["preview", body.get("preview")],
      ["previewVideo", body.get("previewVideo")],
      ["original", body.get("original")],
      ["demoZip", body.get("demoZip")],
    ] as const
  )
    .map(([kind, value]) => (value instanceof File && value.size > 0 ? { kind, file: value } : null))
    .filter((entry): entry is { kind: SignUpload["kind"]; file: File } => Boolean(entry));

  const signRes = await fetch("/api/assets/upload-sign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patch: String(body.get("patch") ?? "") === "1",
      files: files.map(({ kind, file }) => ({
        kind,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      })),
    }),
  });

  let signed: SignResponse;
  try {
    signed = (await signRes.json()) as SignResponse;
  } catch {
    return { ok: false, status: signRes.status, error: "Could not start upload" };
  }

  if (!signRes.ok || !signed.ok || !signed.uploads) {
    return { ok: false, status: signRes.status, error: signed.error || "Could not start upload" };
  }

  const total = files.reduce((sum, entry) => sum + entry.file.size, 0) || 1;
  let completed = 0;
  const result: UploadPayload = { ok: true, status: 200 };

  try {
    for (const upload of signed.uploads) {
      const match = files.find((entry) => entry.kind === upload.kind);
      if (!match) continue;
      await putFile(upload.signedUrl, match.file, (loaded) => {
        onProgress(Math.min(100, Math.round(((completed + loaded) / total) * 100)));
      });
      completed += match.file.size;
      result[KIND_TO_FIELD[upload.kind]] = upload.storedUrl;
    }
    onProgress(100);
    return result;
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
