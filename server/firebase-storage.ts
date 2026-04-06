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
 * Retry helper with exponential backoff.
 * Attempts: 1s delay → 2s delay → final failure.
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
