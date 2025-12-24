/**
 * Image processing utilities for cropping and resizing
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Validate image file type and size
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default: 10)
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File, maxSizeMB: number = 10): string | null {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return "File must be an image";
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size must be less than ${maxSizeMB}MB`;
  }

  return null;
}

/**
 * Create an image element from a file
 */
export function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create an image element from a data URL
 */
export function createImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Crop and resize an image to target dimensions
 * @param image - The source image element
 * @param cropArea - The crop area (relative to original image)
 * @param targetWidth - Target width in pixels
 * @param targetHeight - Target height in pixels
 * @returns Blob of the processed image
 */
export async function cropAndResizeImage(
  image: HTMLImageElement,
  cropArea: CropArea,
  targetWidth: number,
  targetHeight: number
): Promise<Blob> {
  // Create canvas for cropping
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Calculate source coordinates and dimensions
  const sourceX = cropArea.x;
  const sourceY = cropArea.y;
  const sourceWidth = cropArea.width;
  const sourceHeight = cropArea.height;

  // Draw the cropped and resized image
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      "image/jpeg",
      0.92 // Quality (0-1)
    );
  });
}

/**
 * Convert a cropped image data (from react-easy-crop) to a blob
 * @param imageSrc - The source image URL or data URL
 * @param pixelCrop - The crop area from react-easy-crop
 * @param targetWidth - Target width in pixels
 * @param targetHeight - Target height in pixels
 * @returns Blob of the processed image
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  targetWidth: number,
  targetHeight: number
): Promise<Blob> {
  const image = await createImageFromDataUrl(imageSrc);

  // Calculate the crop area relative to the original image
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const cropArea: CropArea = {
    x: pixelCrop.x * scaleX,
    y: pixelCrop.y * scaleY,
    width: pixelCrop.width * scaleX,
    height: pixelCrop.height * scaleY,
  };

  return cropAndResizeImage(image, cropArea, targetWidth, targetHeight);
}

