// Module-level cache: photoId -> original File.
// Used by retry-from-memory path in SimplePhotoSlider when a photo flips
// to status='failed' after upload. Cleared on tab reload by design —
// File handles cannot be persisted, so the slider falls back to its
// file-picker branch in that case.

const cache = new Map<string, File>();

export const photoFileCache = {
  set(photoId: string, file: File): void {
    if (!photoId || !file) return;
    cache.set(photoId, file);
  },
  get(photoId: string): File | undefined {
    return cache.get(photoId);
  },
  delete(photoId: string): void {
    cache.delete(photoId);
  },
  // Direct Map handle passed to slider components as `originalFiles` prop.
  map: cache,
};
