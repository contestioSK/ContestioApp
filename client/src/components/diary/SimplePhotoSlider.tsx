import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Fish, Loader2, AlertCircle } from "lucide-react";

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
}

export function SimplePhotoSlider({ photos, onPhotoClick }: SimplePhotoSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

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
    
    if (photoUrl && status !== 'processing') {
      onPhotoClick(photoUrl, activeIndex);
    }
  }, [photos, activeIndex, onPhotoClick]);

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
              {status === 'processing' && photoUrl && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-20">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Optimalizujem...</span>
                </div>
              )}
              {status === 'processing' && !photoUrl && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              {status === 'failed' && (
                <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center z-20">
                  <AlertCircle className="w-8 h-8 text-white" />
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
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            aria-label="Predchádzajúca fotografia"
            data-testid="button-prev-photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            aria-label="Ďalšia fotografia"
            data-testid="button-next-photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute top-2 right-2 z-20 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {activeIndex + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}
