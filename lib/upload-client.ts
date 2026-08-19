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

export function uploadAssets(body: FormData, onProgress: (percent: number) => void) {
  return new Promise<UploadPayload>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/assets/upload");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as Omit<UploadPayload, "ok" | "status">;
        resolve({ ...payload, ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(body);
  });
}
