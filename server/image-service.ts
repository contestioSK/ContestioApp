import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

export interface ImageVariant {
  width: number;
  format: string;
  url: string;
  size?: number;
}

export interface ProcessedImageResult {
  originalWidth: number;
  originalHeight: number;
  variants: ImageVariant[];
  placeholder: string; // base64 tiny placeholder
}

const SIZES = [160, 320, 640, 1280, 1920]; // responsive sizes
const FORMATS = ['avif', 'webp', 'jpeg'] as const;
const QUALITY = { avif: 45, webp: 70, jpeg: 70 };

export class ImageService {
  static async processImage(
    inputPath: string,
    outputBasePath: string,
    baseFilename: string
  ): Promise<ProcessedImageResult> {
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputBasePath);
    if (!existsSync(outputDir)) {
      await fs.mkdir(outputDir, { recursive: true });
    }

    // Get original image metadata
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error("Unable to read image dimensions");
    }

    // Auto-rotate based on EXIF and strip metadata
    const processedImage = image
      .rotate(); // Auto-rotate based on EXIF, metadata is stripped by default

    // Ensure image doesn't exceed max dimension (2560px)
    const maxDimension = 2560;
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      const aspectRatio = metadata.width / metadata.height;
      if (metadata.width > metadata.height) {
        processedImage.resize(maxDimension, Math.round(maxDimension / aspectRatio));
      } else {
        processedImage.resize(Math.round(maxDimension * aspectRatio), maxDimension);
      }
    }

    const variants: ImageVariant[] = [];

    // Generate tiny placeholder (20px width, base64)
    const placeholderBuffer = await processedImage
      .clone()
      .resize(20, null, { withoutEnlargement: true })
      .jpeg({ quality: 30 })
      .toBuffer();
    const placeholder = `data:image/jpeg;base64,${placeholderBuffer.toString('base64')}`;

    // Generate variants for each size and format
    for (const targetWidth of SIZES) {
      // Don't upscale - skip sizes larger than original
      if (targetWidth > metadata.width) continue;

      for (const format of FORMATS) {
        const filename = `${baseFilename}-${targetWidth}w.${format}`;
        const outputPath = path.join(outputDir, filename);
        const url = `/uploads/${path.relative('uploads', outputPath).replace(/\\/g, '/')}`;

        try {
          let processedVariant = processedImage
            .clone()
            .resize(targetWidth, null, { 
              withoutEnlargement: true,
              kernel: sharp.kernel.lanczos3 
            });

          switch (format) {
            case 'avif':
              processedVariant = processedVariant.avif({ 
                quality: QUALITY.avif,
                effort: 6 // Higher effort for better compression
              });
              break;
            case 'webp':
              processedVariant = processedVariant.webp({ 
                quality: QUALITY.webp,
                effort: 6
              });
              break;
            case 'jpeg':
              processedVariant = processedVariant.jpeg({ 
                quality: QUALITY.jpeg,
                progressive: true,
                mozjpeg: true
              });
              break;
          }

          await processedVariant.toFile(outputPath);

          // Get file size for metadata
          const stats = await fs.stat(outputPath);
          
          variants.push({
            width: targetWidth,
            format,
            url,
            size: stats.size
          });
        } catch (error) {
          console.warn(`Failed to process ${format} variant at ${targetWidth}w:`, error);
        }
      }
    }

    // Sort variants by width then by format preference
    variants.sort((a, b) => {
      if (a.width !== b.width) return a.width - b.width;
      
      const formatOrder = { avif: 0, webp: 1, jpeg: 2 };
      return formatOrder[a.format as keyof typeof formatOrder] - formatOrder[b.format as keyof typeof formatOrder];
    });

    return {
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      variants,
      placeholder
    };
  }

  static async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${filePath}:`, error);
    }
  }

  static generateSrcSet(variants: ImageVariant[], format: string): string {
    return variants
      .filter(v => v.format === format)
      .map(v => `${v.url} ${v.width}w`)
      .join(', ');
  }

  static getBestVariantForWidth(variants: ImageVariant[], targetWidth: number, preferredFormat: string = 'webp'): ImageVariant | null {
    // Find variants that are at least as wide as target
    const suitableVariants = variants.filter(v => 
      v.width >= targetWidth && v.format === preferredFormat
    );

    if (suitableVariants.length === 0) {
      // Fall back to any format if preferred not available
      const fallbackVariants = variants.filter(v => v.width >= targetWidth);
      return fallbackVariants.length > 0 ? fallbackVariants[0] : variants[variants.length - 1];
    }

    // Return the smallest suitable variant
    return suitableVariants[0];
  }
}