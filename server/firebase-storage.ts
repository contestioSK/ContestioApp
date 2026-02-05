import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!projectId || !clientEmail || !privateKey || !storageBucket) {
  console.warn('[Firebase] Missing Firebase credentials - photo storage will not work');
}

if (getApps().length === 0 && projectId && clientEmail && privateKey) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
  });
}

const bucket = projectId && clientEmail && privateKey ? getStorage().bucket() : null;

export interface UploadResult {
  publicUrl: string;
  storagePath: string;
}

export async function uploadToFirebase(
  localFilePath: string,
  destinationPath: string
): Promise<UploadResult> {
  if (!bucket) {
    throw new Error('Firebase Storage not configured');
  }

  await bucket.upload(localFilePath, {
    destination: destinationPath,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });

  const file = bucket.file(destinationPath);
  await file.makePublic();

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
  
  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000',
    },
  });

  await file.makePublic();

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
