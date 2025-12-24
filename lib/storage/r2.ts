import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/env";

// Initialize S3 client for Cloudflare R2 (R2 is S3-compatible)
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadToR2Params {
  file: Blob | Buffer;
  key: string;
  contentType: string;
}

/**
 * Upload a file to Cloudflare R2
 * @param params - Upload parameters
 * @returns The public URL of the uploaded file
 */
export async function uploadToR2(params: UploadToR2Params): Promise<string> {
  const { file, key, contentType } = params;

  let buffer: Buffer;
  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else {
    const arrayBuffer = await (file as Blob).arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  const command = new PutObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Return public URL
  return getR2FileUrl(key);
}

/**
 * Get the public URL for an R2 file
 * @param key - The R2 object key (path)
 * @returns The public URL
 */
export function getR2FileUrl(key: string): string {
  // Remove leading slash if present
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  const baseUrl = env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/+$/, "") || "";
  return `${baseUrl}/${cleanKey}`;
}

/**
 * Delete a file from Cloudflare R2
 * @param key - The R2 object key (path)
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

