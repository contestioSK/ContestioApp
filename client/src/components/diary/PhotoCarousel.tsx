import { useState, useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Fish, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type PhotoObject = {
  id: number | string;
  url: string;
  originalUrl?: string;
  status?: 'processing' | 'ready' | 'failed';
  variants?: Array<{ url: string; width: number; format: string }>;
  placeholder?: string;
  error?: string;
};

interface PhotoCarouselProps {
  photos: (string | PhotoObject)[];
  onPhotoClick: (photo: string, index: number) => void;
  onRetryPhoto?: (photoId: string, file: File) => void;
}

export function PhotoCarousel({ photos, onPhotoClick, onRetryPhoto }: PhotoCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const isDraggingRef = useRef(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  }, []);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerStartRef.current) {
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);
      if (dx > 10 || dy > 10) {
        isDraggingRef.current = true;
      }
    }
  }, []);
  
  const handlePointerCancel = useCallback(() => {
    pointerStartRef.current = null;
    isDraggingRef.current = false;
  }, []);
  
  const handleClick = useCallback((e: React.MouseEvent, photoUrl: string, index: number, status: string | null) => {
    e.stopPropagation();
    if (!isDraggingRef.current && status !== 'processing' && status !== 'failed') {
      onPhotoClick(photoUrl, index);
    }
    pointerStartRef.current = null;
    isDraggingRef.current = false;
  }, [onPhotoClick]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
    emblaApi.scrollTo(0);
    setSelectedIndex(0);
  }, [photos, emblaApi]);

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

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

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
    <div className="relative">
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {photos.map((photo, index) => {
            const photoUrl = getPhotoUrl(photo);
            const status = getPhotoStatus(photo);
            const photoId = typeof photo === 'string' ? String(index) : String(photo.id);
            const isRetrying = retryingIds.has(photoId);
            
            return (
              <div key={typeof photo === 'string' ? index : photo.id} className="flex-[0_0_100%] min-w-0 relative">
                {photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt={`Fotografia úlovku ${index + 1}`}
                    className="w-full h-48 sm:h-64 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerCancel={handlePointerCancel}
                    onPointerLeave={handlePointerCancel}
                    onClick={(e) => handleClick(e, photoUrl, index, status)}
                    draggable={false}
                    data-testid={`catch-photo-${index}`}
                  />
                ) : (
                  <div className="w-full h-48 sm:h-64 bg-muted flex items-center justify-center">
                    <Fish className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                )}
                {status === 'processing' && photoUrl && !isRetrying && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Optimalizujem...</span>
                  </div>
                )}
                {status === 'processing' && !photoUrl && !isRetrying && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                {isRetrying && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <span className="text-white text-sm">Nahrávam...</span>
                  </div>
                )}
                {status === 'failed' && !isRetrying && (
                  <div
                    className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-3"
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
      </div>
      
      {photos.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Predchádzajúca fotografia"
            data-testid="button-prev-photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Ďalšia fotografia"
            data-testid="button-next-photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
      
      {photos.length > 1 && (
        <div className="flex justify-center gap-3 mt-3">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={`Zobraziť fotografiu ${index + 1}`}
              data-testid={`dot-${index}`}
            >
              <span className={cn(
                "rounded-full transition-all",
                index === selectedIndex 
                  ? "bg-white w-6 h-3" 
                  : "bg-white/50 hover:bg-white/70 w-3 h-3"
              )} />
            </button>
          ))}
        </div>
      )}
      
      {photos.length > 1 && (
        <div className="absolute top-2 right-2 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
          {selectedIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
