import { env } from "@/env";

const RUSTFS_BASE_URL = env.RUSTFS_URL.replace(/\/+$/, "");

function authHeaders() {
  return {
    Authorization: `Bearer ${env.RUSTFS_API_KEY}`,
  };
}

export async function uploadToRustFs(params: {
  file: Blob;
  filename: string;
  contentType?: string;
  folder?: string;
}): Promise<{ key: string }> {
  const { file, filename, contentType, folder } = params;

  const formData = new FormData();
  formData.append("file", file, filename);
  if (folder) formData.append("folder", folder);
  if (contentType) formData.append("contentType", contentType);

  const res = await fetch(`${RUSTFS_BASE_URL}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RustFS upload failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { key?: string; id?: string };
  const key = json.key ?? json.id;

  if (!key) {
    throw new Error("RustFS upload response did not include a key");
  }

  return { key };
}

export function getRustFsFileUrl(key: string): string {
  return `${RUSTFS_BASE_URL}/files/${encodeURIComponent(key)}`;
}

export async function downloadFromRustFs(key: string): Promise<ArrayBuffer> {
  const res = await fetch(getRustFsFileUrl(key), {
    method: "GET",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RustFS download failed: ${res.status} ${text}`);
  }

  const buffer = await res.arrayBuffer();
  return buffer;
}


