/**
 * Client-side image resizing and compression utility
 * Reduces image size before upload to improve performance
 */

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

const DEFAULT_OPTIONS: Required<ResizeOptions> = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.85,
  format: 'jpeg'
};

/**
 * Resize and compress an image file
 * @param file - Original image file
 * @param options - Resize options
 * @returns Promise<File> - Resized image file
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const aspectRatio = width / height;

          if (width > height) {
            width = opts.maxWidth;
            height = width / aspectRatio;
          } else {
            height = opts.maxHeight;
            width = height * aspectRatio;
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            // Create new file from blob
            const resizedFile = new File(
              [blob],
              file.name,
              {
                type: `image/${opts.format}`,
                lastModified: Date.now()
              }
            );

            resolve(resizedFile);
          },
          `image/${opts.format}`,
          opts.quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Resize multiple images in parallel
 * @param files - Array of image files
 * @param options - Resize options
 * @returns Promise<File[]> - Array of resized image files
 */
export async function resizeImages(
  files: File[],
  options: ResizeOptions = {}
): Promise<File[]> {
  return Promise.all(files.map(file => resizeImage(file, options)));
}
