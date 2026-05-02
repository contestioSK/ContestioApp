import { EventEmitter } from 'events';
import { ImageService } from './image-service';
import { uploadToFirebase, isFirebaseConfigured } from './firebase-storage';
import path from 'path';
import { randomUUID } from 'crypto';

export interface PhotoJob {
  id: string;
  catchId: string;
  photoId: string;
  userId: string;
  originalPath: string;
  originalFilename: string;
  outputBasePath: string;
  /**
   * Firebase URL of the original photo if it was already uploaded
   * synchronously by the upload endpoint (the common case). When set, the
   * background processor will SKIP the redundant Firebase re-upload of
   * the original and only generate variants — saves time, cost, and
   * eliminates a class of false-failed states caused by transient
   * Firebase issues during re-upload of an already-persisted original.
   */
  existingOriginalUrl?: string;
  priority: number;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
}

const QUEUE_FIREBASE_URL_PREFIXES = [
  'https://storage.googleapis.com/',
  'https://firebasestorage.googleapis.com/',
];
const isQueueFirebaseHostedUrl = (u: unknown): u is string =>
  typeof u === 'string' && QUEUE_FIREBASE_URL_PREFIXES.some((p) => u.startsWith(p));

export interface PhotoProcessingResult {
  photoId: string;
  catchId: string;
  status: 'ready' | 'failed';
  url?: string;
  originalUrl?: string; // Firebase URL of original photo
  variants?: Array<{width: number; format: string; url: string;}>;
  placeholder?: string;
  error?: string;
}

export class PhotoJobQueue extends EventEmitter {
  private queue: PhotoJob[] = [];
  private processing = false;
  private isRunning = false;

  constructor() {
    super();
  }

  /**
   * Add a photo processing job to the queue
   */
  addJob(job: Omit<PhotoJob, 'id' | 'createdAt' | 'attempts'>): void {
    const fullJob: PhotoJob = {
      ...job,
      id: randomUUID(),
      createdAt: new Date(),
      attempts: 0
    };

    this.queue.push(fullJob);
    console.log(`[PhotoQueue] Job added: ${fullJob.id} for photo ${fullJob.photoId}`);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Start processing jobs from the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Sort by priority (higher first) and creation time (older first)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const job = this.queue.shift();
      if (!job) break;

      console.log(`[PhotoQueue] Processing job ${job.id} (attempt ${job.attempts + 1}/${job.maxAttempts})`);

      try {
        const result = await this.processPhoto(job);
        this.emit('photoProcessed', result);
        console.log(`[PhotoQueue] Successfully processed photo ${job.photoId}`);
      } catch (error) {
        console.error(`[PhotoQueue] Error processing photo ${job.photoId}:`, error);

        job.attempts++;
        
        if (job.attempts < job.maxAttempts) {
          // Re-queue the job with lower priority
          job.priority = Math.max(0, job.priority - 1);
          this.queue.push(job);
          console.log(`[PhotoQueue] Re-queuing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);
        } else {
          // Max attempts reached, mark as failed
          const failedResult: PhotoProcessingResult = {
            photoId: job.photoId,
            catchId: job.catchId,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          this.emit('photoProcessed', failedResult);
          console.error(`[PhotoQueue] Max attempts reached for photo ${job.photoId}, marking as failed`);
        }
      }
    }

    this.processing = false;
    console.log('[PhotoQueue] Queue empty, waiting for new jobs...');
  }

  /**
   * Process a single photo job
   */
  private async processPhoto(job: PhotoJob): Promise<PhotoProcessingResult> {
    try {
      const baseFilename = path.parse(job.originalFilename).name;
      let originalUrl: string | undefined;

      // Skip redundant Firebase re-upload of the original when the upload
      // endpoint already persisted it synchronously and handed us the URL.
      // The original is the contract — duplicating the upload here just adds
      // failure surface (network blips during background processing would
      // otherwise downgrade an already-good photo). Variants stay best-effort.
      if (isQueueFirebaseHostedUrl(job.existingOriginalUrl)) {
        originalUrl = job.existingOriginalUrl;
        console.log(
          `[PhotoQueue] Reusing synchronously-uploaded Firebase original for photo ${job.photoId}`
        );
      } else if (isFirebaseConfigured()) {
        // Fallback path: no synchronous upload happened (legacy callers /
        // future code paths). Upload sanitized original to Firebase here.
        try {
          const originalStoragePath = `diary_photos/${job.userId}/${job.photoId}/sanitized-original.jpg`;
          const result = await uploadToFirebase(job.originalPath, originalStoragePath, 'image/jpeg');
          originalUrl = result.publicUrl;
          console.log(`[PhotoQueue] Sanitized original uploaded to Firebase: ${originalStoragePath}`);
        } catch (error) {
          console.warn(`[PhotoQueue] Failed to upload sanitized original to Firebase, continuing with variants:`, error);
        }
      }

      // Variant generation is degrade-gracefully: if it fails but we already have
      // a confirmed Firebase original URL, the photo is still serveable at full
      // resolution — only thumbnails/responsive sizes are missing.
      let imageMetadata: Awaited<ReturnType<typeof ImageService.processImage>> | null = null;
      try {
        imageMetadata = await ImageService.processImage(
          job.originalPath,
          job.outputBasePath,
          baseFilename,
          undefined, // urlBasePath - auto-detected
          job.userId,
          job.photoId,
        );
      } catch (variantError: any) {
        console.warn(
          `[PhotoQueue] Variant generation failed for photo ${job.photoId} — falling back to original. Reason:`,
          variantError?.message,
        );
      }

      // Get best variant (prefer WebP 800w)
      const variants = imageMetadata?.variants ?? [];
      const bestVariant =
        ImageService.getBestVariantForWidth(variants, 800, 'webp') ||
        ImageService.getBestVariantForWidth(variants, 800, 'jpeg') ||
        variants[0];

      // Only clean up local temp file AFTER variants are successfully created.
      // If variants failed but we have originalUrl, we still keep the local temp
      // (best-effort) since processing may be retried.
      if (variants.length > 0) {
        await ImageService.cleanupTempFile(job.originalPath);
      } else {
        console.warn(`[PhotoQueue] No variants created for ${job.photoId}, keeping original`);
      }

      // Guard: only accept HTTPS URLs — local paths must never reach the DB
      const bestUrl = bestVariant?.url;
      const resolvedUrl =
        bestUrl?.startsWith('https://') ? bestUrl :
        originalUrl?.startsWith('https://') ? originalUrl :
        null;

      // status === 'ready' is acceptable as long as ANY HTTPS URL exists
      // (variants OR original). status === 'failed' only when both failed.
      if (!resolvedUrl) {
        console.error('[IMAGE_UPLOAD_FAILED]', {
          photoId: job.photoId,
          userId: job.userId,
          reason: 'No HTTPS URL produced — all Firebase uploads failed',
          bestVariantUrl: bestUrl,
          originalUrl,
        });
      }

      return {
        photoId: job.photoId,
        catchId: job.catchId,
        status: resolvedUrl ? 'ready' : 'failed',
        url: resolvedUrl || '',
        originalUrl,
        variants,
        placeholder: imageMetadata?.placeholder,
        error: resolvedUrl ? undefined : 'Firebase upload produced no valid HTTPS URL',
      };
    } catch (error: any) {
      // We reach this branch only if Firebase original upload itself threw
      // synchronously (rare — wrapped in try/catch above) or some non-recoverable
      // I/O error happened. If by this point originalUrl was already obtained,
      // we still want to publish a 'ready' result instead of 'failed'.
      console.error('[IMAGE_UPLOAD_FAILED]', {
        photoId: job.photoId,
        userId: job.userId,
        jobId: job.id,
        reason: error?.message || 'Unknown error',
      });
      // Don't delete original on failure - it can be used as fallback
      throw error;
    }
  }

  /**
   * Get current queue status
   */
  getStatus(): { queueLength: number; processing: boolean } {
    return {
      queueLength: this.queue.length,
      processing: this.processing
    };
  }

  /**
   * Get all jobs for a specific catch
   */
  getJobsByCatchId(catchId: string): PhotoJob[] {
    return this.queue.filter(job => job.catchId === catchId);
  }

  /**
   * Check if there's an active job for a specific photo
   */
  hasActiveJobForPhoto(photoId: string): boolean {
    return this.queue.some(job => job.photoId === photoId);
  }

  /**
   * Check if the queue has any active processing
   */
  isProcessingActive(): boolean {
    return this.processing || this.queue.length > 0;
  }
}

// Singleton instance
export const photoJobQueue = new PhotoJobQueue();
