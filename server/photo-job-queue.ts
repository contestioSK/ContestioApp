import { EventEmitter } from 'events';
import { ImageService } from './image-service';
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
  priority: number;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
}

export interface PhotoProcessingResult {
  photoId: string;
  catchId: string;
  status: 'ready' | 'failed';
  url?: string;
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

      // Process image with ImageService
      const imageMetadata = await ImageService.processImage(
        job.originalPath,
        job.outputBasePath,
        baseFilename
      );

      // Get best variant (prefer WebP 800w)
      const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 800, 'webp') ||
                          ImageService.getBestVariantForWidth(imageMetadata.variants, 800, 'jpeg') ||
                          imageMetadata.variants[0];

      // Clean up original temp file
      await ImageService.cleanupTempFile(job.originalPath);

      return {
        photoId: job.photoId,
        catchId: job.catchId,
        status: 'ready',
        url: bestVariant?.url || '',
        variants: imageMetadata.variants,
        placeholder: imageMetadata.placeholder
      };
    } catch (error) {
      console.error(`[PhotoQueue] Processing failed for job ${job.id}:`, error);
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
}

// Singleton instance
export const photoJobQueue = new PhotoJobQueue();
