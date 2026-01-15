/**
 * Server-side watermark utilities
 * These functions use Node.js-only libraries and should only be imported in API routes
 */

import sharp from "sharp"

// Hardcoded constants for easy modification
export const WATERMARK_CONFIG = {
  BASE_DOMAIN: "skndan.cloud", // Base domain for subdomain construction (e.g., "balaji.skndan.cloud")
  BASE_FONT_SIZE: 32, // Base font size for 1080p resolution
  COLOR: "white", // Watermark text color
  BORDER_COLOR: "black", // Text border/shadow color for visibility
  POSITION: "bottom-left", // Bottom left corner
  X_OFFSET: 20, // Pixels from left edge
  Y_OFFSET: 20, // Pixels from bottom edge
  OPACITY: 0.9, // Text opacity (0-1)
  MIN_FONT_SIZE: 12, // Minimum font size for very small resolutions
  MAX_FONT_SIZE: 64, // Maximum font size for very large resolutions
  BASE_RESOLUTION: 1080, // Base resolution height for scaling (1080p)
}

/**
 * Construct full subdomain URL from subdomain string
 * @param subdomain - Creator subdomain (e.g., "balaji")
 * @returns Full subdomain URL (e.g., "balaji.skndan.cloud") or null if subdomain is invalid
 */
export function getSubdomainUrl(subdomain: string | null | undefined): string | null {
  if (!subdomain || typeof subdomain !== "string" || subdomain.trim() === "") {
    return null
  }
  return `${subdomain.trim()}.${WATERMARK_CONFIG.BASE_DOMAIN}`
}

/**
 * Calculate scaled font size based on resolution
 * @param width - Media width in pixels
 * @param height - Media height in pixels
 * @returns Scaled font size in pixels
 */
export function calculateFontSize(width: number, height: number): number {
  // Use the smaller dimension for scaling to ensure text fits
  const minDimension = Math.min(width, height)
  const baseMinDimension = Math.min(1920, WATERMARK_CONFIG.BASE_RESOLUTION) // 1080 for base

  // Calculate scale factor
  const scaleFactor = minDimension / baseMinDimension

  // Calculate font size
  let fontSize = WATERMARK_CONFIG.BASE_FONT_SIZE * scaleFactor

  // Clamp to min/max bounds
  fontSize = Math.max(WATERMARK_CONFIG.MIN_FONT_SIZE, Math.min(WATERMARK_CONFIG.MAX_FONT_SIZE, fontSize))

  return Math.round(fontSize)
}

/**
 * Add watermark to an image buffer using Sharp
 * @param imageBuffer - The image buffer to watermark
 * @param subdomainUrl - Full subdomain URL (e.g., "balaji.skndan.cloud")
 * @returns Buffer containing the watermarked image
 */
export async function addImageWatermark(
  imageBuffer: Buffer,
  subdomainUrl: string | null
): Promise<Buffer> {
  if (!subdomainUrl) {
    // If no subdomain, return original image
    return imageBuffer
  }

  try {
    // Get image metadata to determine dimensions
    const metadata = await sharp(imageBuffer).metadata()
    const width = metadata.width || 1920
    const height = metadata.height || 1080

    // Calculate font size based on resolution
    const fontSize = calculateFontSize(width, height)

    // Create text SVG overlay
    // Using SVG for better text rendering with borders
    const textSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="textBorder" x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology operator="dilate" radius="2" in="SourceAlpha" result="thickened"/>
            <feFlood flood-color="${WATERMARK_CONFIG.BORDER_COLOR}" result="border"/>
            <feComposite in="border" in2="thickened" operator="in" result="border"/>
            <feComposite in="SourceGraphic" in2="border" operator="over"/>
          </filter>
        </defs>
        <text
          x="${WATERMARK_CONFIG.X_OFFSET}"
          y="${height - WATERMARK_CONFIG.Y_OFFSET}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="bold"
          fill="${WATERMARK_CONFIG.COLOR}"
          opacity="${WATERMARK_CONFIG.OPACITY}"
          filter="url(#textBorder)"
        >${subdomainUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>
      </svg>
    `

    // Composite the text overlay onto the image
    const watermarkedImage = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(textSvg, 'utf-8'),
          top: 0,
          left: 0,
        },
      ])
      .toBuffer()

    // Ensure we return a proper Buffer instance
    return Buffer.from(watermarkedImage)
  } catch (error) {
    console.error("Error adding image watermark:", error)
    // If watermarking fails, return original image
    return imageBuffer
  }
}

/**
 * Generate FFmpeg drawtext filter string for video watermarking
 * @param subdomainUrl - Full subdomain URL (e.g., "balaji.skndan.cloud")
 * @param width - Target video width in pixels
 * @param height - Target video height in pixels
 * @returns FFmpeg drawtext filter string or empty string if subdomain is invalid
 */
export function getVideoWatermarkFilter(
  subdomainUrl: string | null,
  width: number,
  height: number
): string {
  if (!subdomainUrl) {
    return ""
  }

  // Calculate font size based on target resolution
  const fontSize = calculateFontSize(width, height)

  // Escape special characters in text for FFmpeg
  // FFmpeg drawtext requires escaping: single quotes, backslashes, colons
  const escapedText = subdomainUrl
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")

  // Build drawtext filter
  // x: horizontal position from left (X_OFFSET)
  // y: vertical position from bottom (h = height, th = text height, Y_OFFSET)
  // borderw: border width for text visibility
  // For opacity, use RGBA format: 0xRRGGBBAA where AA is alpha (00=transparent, FF=opaque)
  // Convert opacity (0-1) to hex alpha (0-255)
  const alphaHex = Math.round(WATERMARK_CONFIG.OPACITY * 255).toString(16).padStart(2, '0')
  const fontColorRGBA = WATERMARK_CONFIG.COLOR === "white" 
    ? `0xFFFFFF${alphaHex}` 
    : `0x000000${alphaHex}` // Default to black if not white
  
  const filter = `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColorRGBA}:borderw=2:bordercolor=${WATERMARK_CONFIG.BORDER_COLOR}:x=${WATERMARK_CONFIG.X_OFFSET}:y=h-th-${WATERMARK_CONFIG.Y_OFFSET}`

  return filter
}
