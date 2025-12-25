/**
 * Server-side image processing utilities
 * These functions use Node.js-only libraries and should only be imported in API routes
 */

import sharp from "sharp"

/**
 * Generate a thumbnail from an image buffer using sharp
 * @param imageBuffer - The image buffer
 * @param maxWidth - Maximum width for thumbnail (default: 400)
 * @param maxHeight - Maximum height for thumbnail (default: 400)
 * @returns Buffer containing the thumbnail image
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  maxWidth: number = 400,
  maxHeight: number = 400
): Promise<Buffer> {
  try {
    const thumbnail = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer()

    return thumbnail
  } catch (error) {
    console.error("Error generating thumbnail:", error)
    throw new Error("Failed to generate thumbnail")
  }
}

/**
 * Generate a blurred thumbnail from an image buffer using sharp
 * @param imageBuffer - The image buffer (can be original or thumbnail)
 * @param blurSigma - Blur intensity (default: 20)
 * @param maxWidth - Maximum width for blur thumbnail (default: 400)
 * @param maxHeight - Maximum height for blur thumbnail (default: 400)
 * @returns Buffer containing the blurred thumbnail image
 */
export async function generateBlurThumbnail(
  imageBuffer: Buffer,
  blurSigma: number = 20,
  maxWidth: number = 400,
  maxHeight: number = 400
): Promise<Buffer> {
  try {
    const blurThumbnail = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .blur(blurSigma)
      .jpeg({ quality: 60 })
      .toBuffer()

    return blurThumbnail
  } catch (error) {
    console.error("Error generating blur thumbnail:", error)
    throw new Error("Failed to generate blur thumbnail")
  }
}

