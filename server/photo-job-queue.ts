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
  // Firebase URL of original if upload endpoint already persisted it.
  // When set, processPhoto skips re-upload of the original.
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
  originalUrl?: string;
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

  addJob(job: Omit<PhotoJob, 'id' | 'createdAt' | 'attempts'>): void {
    const fullJob: PhotoJob = {
      ...job,
      id: randomUUID(),
      createdAt: new Date(),
      attempts: 0
    };

    this.queue.push(fullJob);
    console.log(`[PhotoQueue] Job added: ${fullJob.id} for photo ${fullJob.photoId}`);

    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
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
          job.priority = Math.max(0, job.priority - 1);
          this.queue.push(job);
          console.log(`[PhotoQueue] Re-queuing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);
        } else {
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

  private async processPhoto(job: PhotoJob): Promise<PhotoProcessingResult> {
    try {
      const baseFilename = path.parse(job.originalFilename).name;
      let originalUrl: string | undefined;

      if (isQueueFirebaseHostedUrl(job.existingOriginalUrl)) {
        originalUrl = job.existingOriginalUrl;
        console.log(`[PhotoQueue] Reusing pre-uploaded Firebase original for photo ${job.photoId}`);
      } else if (isFirebaseConfigured()) {
        // Fallback path (legacy callers): upload original here.
        // Original is the contract source-of-truth — failure must propagate
        // to the retry/failed path, not be swallowed in favor of variants.
        const originalStoragePath = `diary_photos/${job.userId}/${job.photoId}/sanitized-original.jpg`;
        const result = await uploadToFirebase(job.originalPath, originalStoragePath, 'image/jpeg');
        originalUrl = result.publicUrl;
        console.log(`[PhotoQueue] Sanitized original uploaded to Firebase: ${originalStoragePath}`);
      } else {
        throw new Error('Firebase not configured — cannot upload original');
      }

      // Variants are best-effort: if they fail but the original is intact,
      // the photo is still serveable at full resolution.
      let imageMetadata: Awaited<ReturnType<typeof ImageService.processImage>> | null = null;
      try {
        imageMetadata = await ImageService.processImage(
          job.originalPath,
          job.outputBasePath,
          baseFilename,
          undefined,
          job.userId,
          job.photoId,
        );
      } catch (variantError: any) {
        console.warn(
          `[PhotoQueue] Variant generation failed for photo ${job.photoId} — falling back to original. Reason:`,
          variantError?.message,
        );
      }

      const variants = imageMetadata?.variants ?? [];
      const bestVariant =
        ImageService.getBestVariantForWidth(variants, 800, 'webp') ||
        ImageService.getBestVariantForWidth(variants, 800, 'jpeg') ||
        variants[0];

      if (variants.length > 0) {
        await ImageService.cleanupTempFile(job.originalPath);
      } else {
        console.warn(`[PhotoQueue] No variants created for ${job.photoId}, keeping original`);
      }

      // Only Firebase-hosted URLs may surface as 'ready'.
      const bestUrl = bestVariant?.url;
      const resolvedUrl =
        isQueueFirebaseHostedUrl(bestUrl) ? bestUrl :
        isQueueFirebaseHostedUrl(originalUrl) ? originalUrl :
        null;

      if (!resolvedUrl) {
        console.error('[IMAGE_UPLOAD_FAILED]', {
          photoId: job.photoId,
          userId: job.userId,
          reason: 'No Firebase-hosted URL produced',
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
        error: resolvedUrl ? undefined : 'Firebase upload produced no valid URL',
      };
    } catch (error: any) {
      console.error('[IMAGE_UPLOAD_FAILED]', {
        photoId: job.photoId,
        userId: job.userId,
        jobId: job.id,
        reason: error?.message || 'Unknown error',
      });
      throw error;
    }
  }

  getStatus(): { queueLength: number; processing: boolean } {
    return {
      queueLength: this.queue.length,
      processing: this.processing
    };
  }

  getJobsByCatchId(catchId: string): PhotoJob[] {
    return this.queue.filter(job => job.catchId === catchId);
  }

  hasActiveJobForPhoto(photoId: string): boolean {
    return this.queue.some(job => job.photoId === photoId);
  }

  isProcessingActive(): boolean {
    return this.processing || this.queue.length > 0;
  }
}

export const photoJobQueue = new PhotoJobQueue();
