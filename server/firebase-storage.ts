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

export async function uploadToFirebase(
  localFilePath: string,
  destinationPath: string,
  contentType?: string
): Promise<UploadResult> {
  if (!bucket) {
    throw new Error('Firebase Storage not configured');
  }

  await bucket.upload(localFilePath, {
    destination: destinationPath,
    metadata: {
      contentType: contentType || 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    },
    public: true,
  });

  const file = bucket.file(destinationPath);
  
  // Try to make public, but continue if bucket uses uniform access control
  try {
    await file.makePublic();
  } catch (error: any) {
    if (error?.code === 403 || error?.message?.includes('uniform bucket-level access')) {
      console.log(`[Firebase] Bucket uses uniform access - skipping makePublic for ${destinationPath}`);
    } else {
      console.warn(`[Firebase] makePublic failed for ${destinationPath}:`, error?.message);
    }
  }

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
    public: true,
  });

  // Try to make public, but continue if bucket uses uniform access control
  try {
    await file.makePublic();
  } catch (error: any) {
    if (error?.code === 403 || error?.message?.includes('uniform bucket-level access')) {
      console.log(`[Firebase] Bucket uses uniform access - skipping makePublic for ${destinationPath}`);
    } else {
      console.warn(`[Firebase] makePublic failed for ${destinationPath}:`, error?.message);
    }
  }

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
