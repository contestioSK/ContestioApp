import { useState, useEffect, useCallback } from 'react';

// IndexedDB for storing photos and data offline
const DB_NAME = 'DiaryOfflineStorage';
const DB_VERSION = 1;
const PHOTOS_STORE = 'photos';
const TRIPS_STORE = 'trips';
const CATCHES_STORE = 'catches';

interface PendingTrip {
  id: string;
  timestamp: string;
  data: any;
  type: 'create' | 'update' | 'delete';
  originalId?: string; // For updates/deletes
}

interface PendingCatch {
  id: string;
  timestamp: string;
  data: any;
  hasPhoto: boolean;
  photoMissing?: boolean;
  type: 'create' | 'update' | 'delete';
  originalId?: string; // For updates/deletes
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
        db.createObjectStore(PHOTOS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TRIPS_STORE)) {
        db.createObjectStore(TRIPS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CATCHES_STORE)) {
        db.createObjectStore(CATCHES_STORE, { keyPath: 'id' });
      }
    };
  });
};

const savePhotoToDB = async (id: string, photo: File): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction([PHOTOS_STORE], 'readwrite');
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(PHOTOS_STORE).put({ id, photo });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getPhotoFromDB = async (id: string): Promise<File | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction([PHOTOS_STORE], 'readonly');
    return new Promise((resolve, reject) => {
      const request = tx.objectStore(PHOTOS_STORE).get(id);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.photo || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get photo from DB:', e);
    return null;
  }
};

const removePhotoFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction([PHOTOS_STORE], 'readwrite');
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(PHOTOS_STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const useDiaryOffline = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingTrips, setPendingTrips] = useState<PendingTrip[]>([]);
  const [pendingCatches, setPendingCatches] = useState<PendingCatch[]>([]);

  // Load pending data from localStorage on mount
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load pending trips
    const storedTrips = localStorage.getItem('pendingDiaryTrips');
    if (storedTrips) {
      try {
        setPendingTrips(JSON.parse(storedTrips));
      } catch (e) {
        console.error('Failed to parse pending trips:', e);
      }
    }
    
    // Load pending catches and reconcile photos
    const storedCatches = localStorage.getItem('pendingDiaryCatches');
    if (storedCatches) {
      try {
        const parsedCatches = JSON.parse(storedCatches);
        setPendingCatches(parsedCatches);
        
        // Reconcile with IndexedDB for missing photos
        parsedCatches.forEach(async (catch_: PendingCatch) => {
          if (catch_.hasPhoto && !catch_.photoMissing) {
            const photo = await getPhotoFromDB(catch_.id);
            if (!photo) {
              setPendingCatches(prev => prev.map(c => 
                c.id === catch_.id ? { ...c, photoMissing: true } : c
              ));
            }
          }
        });
      } catch (e) {
        console.error('Failed to parse pending catches:', e);
      }
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save trip draft
  const saveTripDraft = useCallback((tripData: any, type: 'create' | 'update' | 'delete', originalId?: string) => {
    const draftId = Date.now().toString();
    const draft: PendingTrip = {
      id: draftId,
      timestamp: new Date().toISOString(),
      data: tripData,
      type,
      originalId
    };
    
    setPendingTrips(prev => {
      const updated = [...prev, draft];
      localStorage.setItem('pendingDiaryTrips', JSON.stringify(updated));
      return updated;
    });
    
    return draftId;
  }, []);

  // Save catch draft
  const saveCatchDraft = useCallback(async (catchData: any, type: 'create' | 'update' | 'delete', originalId?: string) => {
    const draftId = Date.now().toString();
    const { photo, ...metadataOnly } = catchData;
    
    const draft: PendingCatch = {
      id: draftId,
      timestamp: new Date().toISOString(),
      hasPhoto: !!photo,
      photoMissing: false,
      data: metadataOnly,
      type,
      originalId
    };
    
    // Save photo to IndexedDB if present
    if (photo instanceof File) {
      try {
        await savePhotoToDB(draftId, photo);
      } catch (e) {
        console.error('Failed to save photo to IndexedDB:', e);
      }
    }
    
    setPendingCatches(prev => {
      const updated = [...prev, draft];
      localStorage.setItem('pendingDiaryCatches', JSON.stringify(updated));
      return updated;
    });
    
    return draftId;
  }, []);

  // Remove trip draft
  const removeTripDraft = useCallback((draftId: string) => {
    setPendingTrips(prev => {
      const updated = prev.filter(t => t.id !== draftId);
      localStorage.setItem('pendingDiaryTrips', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Remove catch draft
  const removeCatchDraft = useCallback(async (draftId: string) => {
    try {
      await removePhotoFromDB(draftId);
    } catch (e) {
      console.error('Failed to remove photo from IndexedDB:', e);
    }
    
    setPendingCatches(prev => {
      const updated = prev.filter(c => c.id !== draftId);
      localStorage.setItem('pendingDiaryCatches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Update catch draft (e.g., mark photo as missing)
  const updateCatchDraft = useCallback((draftId: string, patch: Partial<PendingCatch>) => {
    setPendingCatches(prev => {
      const updated = prev.map(c => c.id === draftId ? { ...c, ...patch } : c);
      localStorage.setItem('pendingDiaryCatches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Get photo from IndexedDB for syncing
  const getPhoto = useCallback(async (draftId: string) => {
    return await getPhotoFromDB(draftId);
  }, []);

  return {
    isOffline,
    pendingTrips,
    pendingCatches,
    saveTripDraft,
    saveCatchDraft,
    removeTripDraft,
    removeCatchDraft,
    updateCatchDraft,
    getPhoto
  };
};
