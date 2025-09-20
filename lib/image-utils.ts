/**
 * Browser-side image conversion utilities
 * Handles PNG to JPG conversion with quality control
 */

export interface ConversionOptions {
  quality?: number; // 0.0 to 1.0 (default: 0.8)
  maxWidth?: number; // Maximum width in pixels (optional)
  maxHeight?: number; // Maximum height in pixels (optional)
  format?: 'jpeg' | 'webp'; // Output format (default: 'jpeg')
}

export interface ConversionResult {
  b64: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Converts a base64 PNG image to JPG format using Canvas API
 * @param b64Input - Base64 encoded PNG image
 * @param options - Conversion options
 * @returns Promise with converted image data
 */
export async function convertImageToJpg(
  b64Input: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const {
    quality = 0.8,
    maxWidth,
    maxHeight,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    try {
      // Create an image element
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate dimensions
          let { width, height } = img;
          
          // Resize if needed while maintaining aspect ratio
          if (maxWidth || maxHeight) {
            const aspectRatio = width / height;
            
            if (maxWidth && width > maxWidth) {
              width = maxWidth;
              height = width / aspectRatio;
            }
            
            if (maxHeight && height > maxHeight) {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }
          
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }
          
          // Fill with white background for JPG (to avoid transparency issues)
          if (format === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }
          
          // Draw the image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to desired format
          const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to convert image'));
                return;
              }
              
              // Convert blob to base64
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const b64 = result.split(',')[1];
                
                // Calculate sizes for compression info
                const originalSize = Math.ceil((b64Input.length * 3) / 4);
                const compressedSize = Math.ceil((b64.length * 3) / 4);
                const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
                
                resolve({
                  b64,
                  mimeType,
                  originalSize,
                  compressedSize,
                  compressionRatio
                });
              };
              
              reader.onerror = () => reject(new Error('Failed to read converted blob'));
              reader.readAsDataURL(blob);
            },
            mimeType,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      // Load the image
      // Handle both raw base64 and data URL formats
      if (b64Input.startsWith('data:')) {
        img.src = b64Input;
      } else {
        // Assume it's PNG if no mime type is specified
        img.src = `data:image/png;base64,${b64Input}`;
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Estimates token savings for AI context usage
 * Based on typical base64 encoding patterns
 */
export function estimateTokenSavings(originalSize: number, compressedSize: number): number {
  // Rough estimate: 1 token ≈ 4 characters in base64
  const originalTokens = Math.ceil(originalSize / 3);
  const compressedTokens = Math.ceil(compressedSize / 3);
  return originalTokens - compressedTokens;
}

/**
 * Formats byte size for human-readable display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Determines optimal quality setting based on use case
 */
export function getOptimalQuality(purpose: 'display' | 'download' | 'ai-context'): number {
  switch (purpose) {
    case 'display':
      return 0.85; // High quality for visual display
    case 'download':
      return 0.9;  // Very high quality for user downloads
    case 'ai-context':
      return 0.75; // Balanced for AI processing
    default:
      return 0.8;  // Default middle ground
  }
}
