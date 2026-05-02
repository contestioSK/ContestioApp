import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

let bucket: any = null;

if (!projectId || !clientEmail || !privateKey || !storageBucket) {
  console.warn('[Firebase] Missing Firebase credentials - photo storage will not work');
} else {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
  }
  bucket = getStorage().bucket(storageBucket);
  console.log(`[Firebase] Storage configured with bucket: ${storageBucket}`);
}

export interface UploadResult {
  publicUrl: string;
  storagePath: string;
}

/**
 * Permanent errors that retrying cannot fix:
 *   - invalid_grant / unauthorized_client → broken service account credentials
 *   - 404 bucket not found → storage bucket missing or wrong name
 *   - 403 permission denied → service account missing Storage Admin role
 * These should fail fast so the user sees an honest failure instead of waiting
 * 7+ seconds for retries that will never succeed.
 */
function isPermanentFirebaseError(err: any): boolean {
  const message = String(err?.message || '').toLowerCase();
  const code = err?.code;
  const status = err?.status;

  if (message.includes('invalid_grant')) return true;
  if (message.includes('unauthorized_client')) return true;
  if (message.includes('account not found')) return true;
  if (message.includes('bucket does not exist')) return true;
  if (message.includes('does not exist') && message.includes('bucket')) return true;
  if (code === 401 || code === 403) return true;
  if (status === 401 || status === 403) return true;
  // Bucket-level 404 (not object 404) — Firebase throws { code: 404 } for both,
  // but message contains "bucket" only for missing bucket
  if ((code === 404 || status === 404) && message.includes('bucket')) return true;

  return false;
}

/**
 * Retry helper with exponential backoff.
 * Attempts: 1s delay → 2s delay → final failure.
 * Permanent errors (auth/bucket) fail fast without retry.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  label: string = ''
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      if (isPermanentFirebaseError(err)) {
        console.error('[IMAGE_UPLOAD_FAILED]', {
          label,
          reason: err?.message || 'Unknown error',
          classification: 'permanent — not retrying',
        });
        throw err;
      }

      if (attempt < maxAttempts) {
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        console.warn(
          `[Firebase] Upload attempt ${attempt}/${maxAttempts} failed for "${label}", retrying in ${delayMs}ms:`,
          err?.message
        );
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  console.error('[IMAGE_UPLOAD_FAILED]', {
    label,
    reason: lastError?.message || 'Unknown error',
    attempts: maxAttempts,
  });
  throw lastError;
}

async function makePublicSafe(file: any, destinationPath: string): Promise<void> {
  try {
    await file.makePublic();
  } catch (error: any) {
    if (error?.code === 403 || error?.message?.includes('uniform bucket-level access')) {
      console.log(`[Firebase] Bucket uses uniform access - skipping makePublic for ${destinationPath}`);
    } else {
      console.warn(`[Firebase] makePublic failed for ${destinationPath}:`, error?.message);
    }
  }
}

export async function uploadToFirebase(
  localFilePath: string,
  destinationPath: string,
  contentType?: string
): Promise<UploadResult> {
  if (!bucket) {
    throw new Error('Firebase Storage not configured');
  }

  await withRetry(
    () => bucket.upload(localFilePath, {
      destination: destinationPath,
      metadata: {
        contentType: contentType || 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
    }),
    3,
    destinationPath
  );

  const file = bucket.file(destinationPath);
  await makePublicSafe(file, destinationPath);

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;

  return {
    publicUrl,
    storagePath: destinationPath,
  };
}

export async function uploadBufferToFirebase(
  buffer: Buffer,
  destinationPath: string,
  contentType: string
): Promise<UploadResult> {
  if (!bucket) {
    throw new Error('Firebase Storage not configured');
  }

  const file = bucket.file(destinationPath);

  await withRetry(
    () => file.save(buffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000',
      },
    }),
    3,
    destinationPath
  );

  await makePublicSafe(file, destinationPath);

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;

  return {
    publicUrl,
    storagePath: destinationPath,
  };
}

export async function deleteFromFirebase(storagePath: string): Promise<void> {
  if (!bucket) {
    throw new Error('Firebase Storage not configured');
  }

  try {
    await bucket.file(storagePath).delete();
  } catch (error) {
    console.warn(`[Firebase] Failed to delete ${storagePath}:`, error);
  }
}

export function isFirebaseConfigured(): boolean {
  return bucket !== null;
}

export { bucket };
