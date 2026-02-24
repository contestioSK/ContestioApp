import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { uploadBufferToFirebase, isFirebaseConfigured } from "./firebase-storage";

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

const SIZES = [200, 800, 1920]; // optimized sizes: thumbnail, preview, fullscreen
const FORMATS = ['webp', 'jpeg'] as const;
const QUALITY = { webp: 70, jpeg: 70 };

export class ImageService {
  static async processImage(
    inputPath: string,
    outputBasePath: string,
    baseFilename: string,
    urlBasePath?: string,
    userId?: string,
    photoId?: string,
    storagePrefix?: string
  ): Promise<ProcessedImageResult> {
    const useFirebase = isFirebaseConfigured();
    const outputDir = path.dirname(outputBasePath);
    
    // For local storage fallback, create output directory
    if (!useFirebase) {
      const effectiveUrlBase = urlBasePath || ImageService.detectUrlBase(outputDir);
      if (!existsSync(outputDir)) {
        await fs.mkdir(outputDir, { recursive: true });
      }
    }

    // Get original image metadata
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error("Unable to read image dimensions");
    }

    // Auto-rotate based on EXIF orientation tag, then explicitly strip ALL metadata
    // (including GPS coordinates). .withMetadata(false) is explicit — do not rely on default behaviour.
    const processedImage = image
      .rotate()           // auto-orient from EXIF
      .withMetadata(false); // strip ALL EXIF/IPTC/XMP — especially GPS coordinates

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

    // Generate variants for each size and format in parallel
    const variantPromises: Promise<ImageVariant | null>[] = [];

    for (const targetWidth of SIZES) {
      // Don't upscale - skip sizes larger than original
      if (targetWidth > metadata.width) continue;

      for (const format of FORMATS) {
        variantPromises.push(
          (async () => {
            const filename = `${baseFilename}-${targetWidth}w.${format}`;
            const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg';

            try {
              let processedVariant = processedImage
                .clone()
                .resize(targetWidth, null, { 
                  withoutEnlargement: true,
                  kernel: sharp.kernel.lanczos3 
                });

              switch (format) {
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

              if (useFirebase) {
                const buffer = await processedVariant.toBuffer();
                const prefix = storagePrefix || (userId ? `diary_photos/${userId}` : 'diary_photos/unknown');
                const photoPath = photoId || baseFilename;
                const storagePath = `${prefix}/${photoPath}/${filename}`;
                const result = await uploadBufferToFirebase(buffer, storagePath, contentType);
                
                return {
                  width: targetWidth,
                  format,
                  url: result.publicUrl,
                  size: buffer.length
                };
              } else {
                // Fallback to local storage
                const effectiveUrlBase = urlBasePath || ImageService.detectUrlBase(outputDir);
                const localOutputPath = path.join(outputDir, filename);
                const url = `${effectiveUrlBase}/${filename}`;

                await processedVariant.toFile(localOutputPath);
                const stats = await fs.stat(localOutputPath);
                
                return {
                  width: targetWidth,
                  format,
                  url,
                  size: stats.size
                };
              }
            } catch (error) {
              console.warn(`Failed to process ${format} variant at ${targetWidth}w:`, error);
              return null;
            }
          })()
        );
      }
    }

    // Wait for all variants to be generated in parallel
    const variantResults = await Promise.all(variantPromises);
    variants.push(...variantResults.filter((v): v is ImageVariant => v !== null));

    // Sort variants by width then by format preference
    variants.sort((a, b) => {
      if (a.width !== b.width) return a.width - b.width;
      
      const formatOrder = { webp: 0, jpeg: 1 };
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

  /**
   * Sanitize an image file in-place: auto-orient from EXIF, strip ALL metadata
   * (including GPS), re-encode to high-quality JPEG. Always produces JPEG output
   * regardless of input format (HEIC, PNG, GIF → JPEG). Sharp decode failure
   * throws — acts as implicit magic-bytes validation.
   *
   * This MUST be called before any file is saved to disk or served to the client.
   */
  static async sanitizeToFile(inputPath: string, outputPath: string): Promise<void> {
    await sharp(inputPath)
      .rotate()             // auto-orient from EXIF orientation tag
      .withMetadata(false)  // strip ALL EXIF/IPTC/XMP — especially GPS coordinates
      .jpeg({ quality: 90, mozjpeg: true }) // high quality, always JPEG output
      .toFile(outputPath);
  }

  static detectUrlBase(outputDir: string): string {
    const normalizedPath = outputDir.replace(/\\/g, '/');
    
    // Handle attached_assets/diary_photos/{userId} paths
    if (normalizedPath.includes('attached_assets/diary_photos/')) {
      const match = normalizedPath.match(/attached_assets\/diary_photos\/([^/]+)/);
      if (match) {
        return `/attached_assets/diary_photos/${match[1]}`;
      }
    }
    
    // Handle legacy uploads/diary_photos/{userId} paths
    if (normalizedPath.includes('uploads/diary_photos/')) {
      const match = normalizedPath.match(/uploads\/diary_photos\/([^/]+)/);
      if (match) {
        return `/uploads/diary_photos/${match[1]}`;
      }
    }
    
    // Handle uploads/users/{userId} paths (avatars)
    if (normalizedPath.includes('uploads/users/')) {
      const match = normalizedPath.match(/uploads\/users\/([^/]+)/);
      if (match) {
        return `/uploads/users/${match[1]}`;
      }
    }
    
    // Handle uploads/competitions/{competitionId} paths
    if (normalizedPath.includes('uploads/competitions/')) {
      const match = normalizedPath.match(/uploads\/competitions\/([^/]+)/);
      if (match) {
        return `/uploads/competitions/${match[1]}`;
      }
    }
    
    // Handle other attached_assets paths
    if (normalizedPath.includes('attached_assets/')) {
      const relativePath = normalizedPath.split('attached_assets/')[1] || '';
      return `/attached_assets/${relativePath}`.replace(/\/$/, '');
    }
    
    // Handle other uploads paths - preserve full structure
    if (normalizedPath.includes('uploads/')) {
      const relativePath = normalizedPath.split('uploads/')[1] || '';
      return `/uploads/${relativePath}`.replace(/\/$/, '');
    }
    
    // Fallback - should rarely happen
    console.warn(`[ImageService] Could not detect URL base for path: ${outputDir}`);
    return `/uploads`;
  }
}