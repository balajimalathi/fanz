import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

/**
 * Default expiration times for different asset types (in seconds)
 */
export const SIGNED_URL_EXPIRATION = {
  /** Images: 1 hour */
  IMAGE: 3600,
  /** Videos/HLS segments: 4 hours (for streaming continuity) */
  VIDEO: 14400,
  /** HLS Manifests: 15 minutes (they reference segments with their own expiration) */
  MANIFEST: 900,
  /** Downloadable content: 5 minutes */
  DOWNLOAD: 300,
  /** Default: 1 hour */
  DEFAULT: 3600,
} as const;

export interface SignedUrlOptions {
  /** The R2 object key (path) */
  key: string;
  /** Expiration time in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
  /** Response content disposition (for downloads) */
  responseContentDisposition?: string;
  /** Response content type override */
  responseContentType?: string;
}

/**
 * Generate a presigned URL for accessing a private R2 object
 * The URL will expire after the specified time
 * 
 * @param options - Options for generating the signed URL
 * @returns A presigned URL that expires after the specified time
 */
export async function getSignedR2Url(options: SignedUrlOptions): Promise<string> {
  const {
    key,
    expiresIn = SIGNED_URL_EXPIRATION.DEFAULT,
    responseContentDisposition,
    responseContentType,
  } = options;

  // Remove leading slash if present
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;

  const command = new GetObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: cleanKey,
    ...(responseContentDisposition && { ResponseContentDisposition: responseContentDisposition }),
    ...(responseContentType && { ResponseContentType: responseContentType }),
  });

  const signedUrl = await getSignedUrl(r2Client, command, {
    expiresIn,
  });

  return signedUrl;
}

/**
 * Generate a signed URL for an image asset
 * @param key - The R2 object key (path)
 * @param expiresIn - Optional custom expiration time in seconds
 */
export async function getSignedImageUrl(key: string, expiresIn?: number): Promise<string> {
  return getSignedR2Url({
    key,
    expiresIn: expiresIn ?? SIGNED_URL_EXPIRATION.IMAGE,
  });
}

/**
 * Generate a signed URL for a video/HLS segment
 * @param key - The R2 object key (path)
 * @param expiresIn - Optional custom expiration time in seconds
 */
export async function getSignedVideoUrl(key: string, expiresIn?: number): Promise<string> {
  return getSignedR2Url({
    key,
    expiresIn: expiresIn ?? SIGNED_URL_EXPIRATION.VIDEO,
  });
}

/**
 * Generate a signed URL for an HLS manifest (.m3u8)
 * @param key - The R2 object key (path)
 * @param expiresIn - Optional custom expiration time in seconds
 */
export async function getSignedManifestUrl(key: string, expiresIn?: number): Promise<string> {
  return getSignedR2Url({
    key,
    expiresIn: expiresIn ?? SIGNED_URL_EXPIRATION.MANIFEST,
    responseContentType: "application/vnd.apple.mpegurl",
  });
}

/**
 * Get the appropriate expiration time based on file extension
 * @param key - The R2 object key (path)
 */
export function getExpirationForKey(key: string): number {
  const lowerKey = key.toLowerCase();

  if (lowerKey.endsWith(".m3u8")) {
    return SIGNED_URL_EXPIRATION.MANIFEST;
  }

  if (lowerKey.endsWith(".ts") || lowerKey.endsWith(".mp4") || lowerKey.endsWith(".webm")) {
    return SIGNED_URL_EXPIRATION.VIDEO;
  }

  if (
    lowerKey.endsWith(".jpg") ||
    lowerKey.endsWith(".jpeg") ||
    lowerKey.endsWith(".png") ||
    lowerKey.endsWith(".gif") ||
    lowerKey.endsWith(".webp")
  ) {
    return SIGNED_URL_EXPIRATION.IMAGE;
  }

  return SIGNED_URL_EXPIRATION.DEFAULT;
}

/**
 * Generate a signed URL with automatic expiration time based on file type
 * @param key - The R2 object key (path)
 */
export async function getAutoSignedUrl(key: string): Promise<string> {
  const expiresIn = getExpirationForKey(key);
  return getSignedR2Url({ key, expiresIn });
}

/**
 * Extract the R2 key from a public URL
 * @param publicUrl - The public R2 URL
 * @returns The R2 object key or null if not a valid R2 URL
 */
export function extractKeyFromPublicUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const r2PublicUrl = env.CLOUDFLARE_R2_PUBLIC_URL;
    const r2Hostname = new URL(r2PublicUrl).hostname;

    if (url.hostname !== r2Hostname) {
      return null;
    }

    // Remove leading slash
    return url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  } catch {
    return null;
  }
}

/**
 * Convert a public R2 URL to a signed URL
 * @param publicUrl - The public R2 URL
 * @param expiresIn - Optional custom expiration time in seconds
 */
export async function publicUrlToSignedUrl(publicUrl: string, expiresIn?: number): Promise<string | null> {
  const key = extractKeyFromPublicUrl(publicUrl);
  if (!key) {
    return null;
  }

  const expiration = expiresIn ?? getExpirationForKey(key);
  return getSignedR2Url({ key, expiresIn: expiration });
}
