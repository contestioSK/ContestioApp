/**
 * Module-level in-memory cache: photoId -> original `File`.
 *
 * Purpose: when the upload endpoint successfully persists an original to
 * Firebase but the background variant pipeline later fails (or any other
 * post-upload step degrades the photo to status='failed'), the user-facing
 * "Skúsiť znovu" button needs the ORIGINAL `File` to retry without forcing
 * the user to re-pick the same photo from disk.
 *
 * The Files only live for the current tab session; on reload the cache is
 * empty by design and the slider falls back to its file-picker branch
 * ("Pôvodný súbor stratený, nahraj fotku znova"). That fallback is intentional
 * — File handles cannot be persisted across reloads.
 *
 * Memory profile: each entry is a `File` reference (no extra copy of the
 * bytes). The browser holds the file content as long as the reference exists.
 * Realistic upper bound: a handful of failed photos per session — no
 * eviction policy needed for the diary use case.
 */

const cache = new Map<string, File>();

export const photoFileCache = {
  /** Store the original File against a server-assigned photoId. */
  set(photoId: string, file: File): void {
    if (!photoId || !file) return;
    cache.set(photoId, file);
  },
  /** Look up the in-memory File for a photoId, if any. */
  get(photoId: string): File | undefined {
    return cache.get(photoId);
  },
  /** Drop a single entry (e.g. on confirmed delete). */
  delete(photoId: string): void {
    cache.delete(photoId);
  },
  /**
   * Direct Map handle — passed to slider components as the `originalFiles`
   * prop. The slider reads via `Map#get` and falls back to file picker if
   * absent. Mutations from `set/delete` above are visible to the slider on
   * its next render (which fires when the photos query refetches).
   */
  map: cache,
};
