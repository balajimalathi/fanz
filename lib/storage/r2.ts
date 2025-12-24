import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/env";
import { readdir, readFile, stat } from "fs/promises";
import { join, relative } from "path";

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

/**
 * Upload a file from local filesystem to R2
 * @param filePath - Local file path
 * @param key - R2 object key (path)
 * @param contentType - MIME type
 * @returns The public URL of the uploaded file
 */
export async function uploadFileToR2(params: {
  filePath: string;
  key: string;
  contentType: string;
}): Promise<string> {
  const { filePath, key, contentType } = params;
  const fileBuffer = await readFile(filePath);

  const command = new PutObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  return getR2FileUrl(key);
}

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(dirPath: string, basePath: string = dirPath): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, basePath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Upload all files from a directory to R2
 * @param dirPath - Local directory path
 * @param baseKey - Base R2 key prefix (e.g., "videos/123/")
 * @param fileExtensions - Optional filter by file extensions (e.g., [".ts", ".m3u8"])
 * @returns Array of uploaded file URLs
 */
export async function uploadDirectoryToR2(params: {
  dirPath: string;
  baseKey: string;
  fileExtensions?: string[];
}): Promise<string[]> {
  const { dirPath, baseKey, fileExtensions } = params;
  const allFiles = await getAllFiles(dirPath);
  const uploadedUrls: string[] = [];

  for (const filePath of allFiles) {
    const relativePath = relative(dirPath, filePath).replace(/\\/g, "/");

    // Filter by extension if provided
    if (fileExtensions && fileExtensions.length > 0) {
      const ext = relativePath.substring(relativePath.lastIndexOf("."));
      if (!fileExtensions.includes(ext)) continue;
    }

    // Determine content type
    let contentType = "application/octet-stream";
    if (relativePath.endsWith(".m3u8")) {
      contentType = "application/vnd.apple.mpegurl";
    } else if (relativePath.endsWith(".ts")) {
      contentType = "video/mp2t";
    } else if (relativePath.endsWith(".jpg") || relativePath.endsWith(".jpeg")) {
      contentType = "image/jpeg";
    } else if (relativePath.endsWith(".png")) {
      contentType = "image/png";
    }

    const r2Key = baseKey.endsWith("/")
      ? `${baseKey}${relativePath}`
      : `${baseKey}/${relativePath}`;

    try {
      const url = await uploadFileToR2({
        filePath,
        key: r2Key,
        contentType,
      });
      uploadedUrls.push(url);
    } catch (error) {
      console.error(`Failed to upload ${filePath}:`, error);
    }
  }

  return uploadedUrls;
}

