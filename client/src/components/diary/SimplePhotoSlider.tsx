import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Fish, Loader2, AlertCircle, RefreshCw } from "lucide-react";

type PhotoObject = {
  id: number | string;
  url: string;
  originalUrl?: string;
  status?: 'processing' | 'ready' | 'failed';
  variants?: Array<{ url: string; width: number; format: string }>;
  placeholder?: string;
  error?: string;
};

interface SimplePhotoSliderProps {
  photos: (string | PhotoObject)[];
  onPhotoClick: (photo: string, index: number) => void;
  onRetryPhoto?: (photoId: string, file: File) => void;
}

export function SimplePhotoSlider({ photos, onPhotoClick, onRetryPhoto }: SimplePhotoSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (retryingIds.size === 0) return;
    setRetryingIds(prev => {
      const next = new Set(prev);
      for (const id of prev) {
        const photo = photos.find(p => typeof p !== 'string' && String(p.id) === String(id));
        if (!photo || typeof photo === 'string' || photo.status !== 'failed') {
          next.delete(id);
        }
      }
      return next;
    });
  }, [photos]);

  const getPhotoUrl = (photo: string | PhotoObject): string => {
    if (typeof photo === 'string') return photo;
    
    const webp800 = photo.variants?.find(v => v.width === 800 && v.format === 'webp');
    if (webp800) return webp800.url;
    
    const any800 = photo.variants?.find(v => v.width === 800);
    if (any800) return any800.url;
    
    return photo.url || photo.originalUrl || '';
  };

  const getPhotoStatus = (photo: string | PhotoObject): 'processing' | 'ready' | 'failed' | null => {
    if (typeof photo === 'string') return null;
    return photo.status || null;
  };

  const nextImage = useCallback(() => {
    if (photos.length > 1) {
      setActiveIndex((prev) => (prev + 1) % photos.length);
    }
  }, [photos.length]);

  const prevImage = useCallback(() => {
    if (photos.length > 1) {
      setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  }, [photos.length]);

  const handlePhotoClick = useCallback(() => {
    const currentPhoto = photos[activeIndex];
    const photoUrl = getPhotoUrl(currentPhoto);
    const status = getPhotoStatus(currentPhoto);
    
    if (photoUrl && status !== 'processing' && status !== 'failed') {
      onPhotoClick(photoUrl, activeIndex);
    }
  }, [photos, activeIndex, onPhotoClick]);

  const handleRetryClick = useCallback((e: React.MouseEvent, photoId: string) => {
    e.stopPropagation();
    fileInputRefs.current[photoId]?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, photoId: string) => {
    const file = e.target.files?.[0];
    if (!file || !onRetryPhoto) return;
    setRetryingIds(prev => new Set(prev).add(photoId));
    onRetryPhoto(photoId, file);
    e.target.value = '';
  }, [onRetryPhoto]);

  if (photos.length === 0) return null;

  return (
    <div className="relative rounded-lg overflow-hidden">
      <div 
        className="relative bg-slate-900 cursor-pointer min-h-48 sm:min-h-64"
        onClick={handlePhotoClick}
      >
        {photos.map((photo, idx) => {
          const photoUrl = getPhotoUrl(photo);
          const status = getPhotoStatus(photo);
          const photoId = typeof photo === 'string' ? String(idx) : String(photo.id);
          const isRetrying = retryingIds.has(photoId);
          
          return (
            <div
              key={typeof photo === 'string' ? idx : photo.id}
              className={`transition-opacity duration-500 ease-in-out ${
                idx === activeIndex ? 'relative opacity-100 z-10' : 'absolute inset-0 opacity-0 z-0'
              }`}
            >
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={`Fotografia úlovku ${idx + 1}`}
                  className="w-full max-h-[70vh] object-contain sm:object-cover hover:opacity-90 transition-opacity"
                  draggable={false}
                  data-testid={`catch-photo-${idx}`}
                />
              ) : (
                <div className="w-full min-h-48 bg-muted flex items-center justify-center">
                  <Fish className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
              {status === 'processing' && photoUrl && !isRetrying && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-20">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Optimalizujem...</span>
                </div>
              )}
              {status === 'processing' && !photoUrl && !isRetrying && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              {isRetrying && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 gap-2">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                  <span className="text-white text-sm">Nahrávam...</span>
                </div>
              )}
              {status === 'failed' && !isRetrying && (
                <div
                  className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center z-20 gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <p className="text-white text-sm font-medium">Nepodarilo sa nahrať</p>
                  {onRetryPhoto && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleRetryClick(e, photoId)}
                        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Nahradiť
                      </button>
                      <input
                        ref={el => { fileInputRefs.current[photoId] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, photoId)}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 text-white transition-opacity hover:opacity-80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            aria-label="Predchádzajúca fotografia"
            data-testid="button-prev-photo"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 text-white transition-opacity hover:opacity-80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            aria-label="Ďalšia fotografia"
            data-testid="button-next-photo"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <div className="absolute top-2 right-2 z-20 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {activeIndex + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}
