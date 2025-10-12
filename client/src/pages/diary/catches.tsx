import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDiaryOffline } from "@/hooks/use-diary-offline";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorUtils";

import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Plus, 
  Fish, 
  Edit2, 
  Trash2, 
  Camera,
  Weight,
  Ruler,
  Target,
  WifiOff,
  Loader2,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Thermometer,
  Wind,
  Gauge
} from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryCatch, InsertDiaryCatch, DiaryTrip } from "@shared/schema";
import { getFishTypeLabel, getFishTypeOptions } from "@/utils/fishTypeMapping";
import DiaryLayout from "@/components/DiaryLayout";
import CatchFormDialog from "@/components/diary/CatchFormDialog";

// Type for freemium limits response
type FreemiumLimits = {
  canCreate: boolean;
  currentCount: number;
  limit: number;
};

// Catch form validation schema
const catchFormSchema = z.object({
  tripId: z.string().optional(),
  angler: z.object({
    name: z.string().min(1, "Meno rybára je povinné")
  }),
  capturedAt: z.date({ required_error: "Čas chytenia je povinný" }),
  weight: z.string().min(1, "Váha je povinná").transform((val) => {
    const weight = parseFloat(val);
    if (isNaN(weight) || weight < 0) {
      throw new Error("Neplatná váha");
    }
    return weight.toString();
  }),
  lengthCm: z.coerce.number().positive("Dĺžka musí byť kladné číslo").optional(),
  fishType: z.enum([
    "kapor_supinac", 
    "kapor_lysec", 
    "amur", 
    "sumec", 
    "zubac", 
    "stuka", 
    "pleskac", 
    "zubac_zubatovity",
    "ostretus",
    "tolstolobik",
    "bream",
    "other"
  ]),
  bait: z.string().optional(),
  notes: z.string().optional(),
  spot: z.string().optional(),
  verified: z.boolean().default(false),
  // Weather data (optional)
  waterTemp: z.coerce.number().min(-50).max(50).optional(),
  airTemp: z.coerce.number().min(-50).max(50).optional(),
  windSpeed: z.coerce.number().min(0).max(500).optional(),
  airPressure: z.coerce.number().min(800).max(1200).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

type CatchFormData = z.infer<typeof catchFormSchema>;

// Fish type options
const fishTypeOptions = [
  { value: "kapor_supinac", label: "Kapor šupinkatý" },
  { value: "kapor_lysec", label: "Kapor lysec" },
  { value: "amur", label: "Amur" },
  { value: "sumec", label: "Sumec" },
  { value: "zubac", label: "Zubáč" },
  { value: "stuka", label: "Šťuka" },
  { value: "pleskac", label: "Pleskáč" },
  { value: "zubac_zubatovity", label: "Zubáč zubatovitý" },
  { value: "ostretus", label: "Ostretuš" },
  { value: "tolstolobik", label: "Tolstolobik" },
  { value: "bream", label: "Pleskáč obecný" },
  { value: "other", label: "Iné" }
];

// Fishing methods
const fishingMethods = [
  "Boilie",
  "Kukurica",
  "Pelety", 
  "Dážďovka",
  "Návnada",
  "Spoon",
  "Spinner",
  "Wobler",
  "Gumiak",
  "Iné"
];

// Function to get fish icon based on fish type
const getFishIcon = (fishType?: string) => {
  const iconColor = getFishIconColor(fishType);
  return <Fish className={`w-5 h-5 ${iconColor}`} />;
};

// Function to get fish icon color based on fish type
const getFishIconColor = (fishType?: string) => {
  if (!fishType) return "text-blue-400";
  
  if (fishType.includes("kapor")) return "text-yellow-400";
  if (fishType.includes("stuka")) return "text-green-400";
  if (fishType.includes("sumec")) return "text-purple-400";
  if (fishType.includes("amur")) return "text-emerald-400";
  if (fishType.includes("pstruh")) return "text-pink-400";
  if (fishType.includes("zubac")) return "text-orange-400";
  
  return "text-blue-400"; // default
};

type PhotoObject = {
  id: string;
  url: string;
  status: 'processing' | 'ready' | 'failed';
  originalUrl?: string;
  variants?: Array<{width: number; format: string; url: string;}>;
  placeholder?: string;
  error?: string;
};

// Photo Carousel Component
function PhotoCarousel({ photos, onPhotoClick }: { photos: (string | PhotoObject)[], onPhotoClick: (photo: string) => void }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  // Reset to first photo when photos change
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
    emblaApi.scrollTo(0);
    setSelectedIndex(0);
  }, [photos, emblaApi]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  // Helper to get best photo URL
  const getPhotoUrl = (photo: string | PhotoObject): string => {
    if (typeof photo === 'string') return photo;
    
    // Prefer WebP 800w variant if available
    const webp800 = photo.variants?.find(v => v.width === 800 && v.format === 'webp');
    if (webp800) return webp800.url;
    
    // Fallback to any 800w variant
    const any800 = photo.variants?.find(v => v.width === 800);
    if (any800) return any800.url;
    
    // Use main URL
    return photo.url;
  };

  // Helper to get photo status
  const getPhotoStatus = (photo: string | PhotoObject): 'processing' | 'ready' | 'failed' | null => {
    if (typeof photo === 'string') return null;
    return photo.status;
  };

  if (photos.length === 0) return null;

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {photos.map((photo, index) => {
            const photoUrl = getPhotoUrl(photo);
            const status = getPhotoStatus(photo);
            
            return (
              <div key={typeof photo === 'string' ? index : photo.id} className="flex-[0_0_100%] min-w-0 relative">
                <img 
                  src={photoUrl} 
                  alt={`Fotografia úlovku ${index + 1}`}
                  className="w-full h-64 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => status !== 'processing' && onPhotoClick(photoUrl)}
                  data-testid={`catch-photo-${index}`}
                />
                {status === 'processing' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                {status === 'failed' && (
                  <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                    <X className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Navigation Buttons (only show if more than 1 photo) */}
      {photos.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            aria-label="Predchádzajúca fotka"
            data-testid="button-prev-photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            aria-label="Ďalšia fotka"
            data-testid="button-next-photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
      
      {/* Dots Indicator (only show if more than 1 photo) */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === selectedIndex 
                  ? "bg-white w-6" 
                  : "bg-white/50 hover:bg-white/70"
              )}
              aria-label={`Zobraziť fotku ${index + 1}`}
              data-testid={`dot-${index}`}
            />
          ))}
        </div>
      )}
      
      {/* Photo counter */}
      {photos.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {selectedIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}

export default function DiaryCatches() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // WebSocket connection for real-time photo processing updates
  useWebSocket((message) => {
    if (message.type === 'diary_photo_processed') {
      console.log('[Catches] Photo processed:', message);
      
      // Update the photo in selectedCatch if it contains this photo
      if (selectedCatch && message.photoId) {
        const photoIndex = selectedCatch.photos?.findIndex(p => p.id === message.photoId);
        if (photoIndex !== undefined && photoIndex >= 0) {
          setSelectedCatch(prev => {
            if (!prev || !prev.photos) return prev;
            const updatedPhotos = [...prev.photos];
            updatedPhotos[photoIndex] = {
              ...updatedPhotos[photoIndex],
              status: message.status,
              url: message.url || updatedPhotos[photoIndex].url,
              variants: message.variants || updatedPhotos[photoIndex].variants,
              placeholder: message.placeholder || updatedPhotos[photoIndex].placeholder,
              error: message.error
            };
            return { ...prev, photos: updatedPhotos };
          });
        }
      }

      // Update the photo in existingPhotos if it's in the current editing catch
      if (editingCatch && message.photoId) {
        setExistingPhotos(prev => prev.map(photo => {
          if (photo.id === message.photoId) {
            return {
              ...photo,
              status: message.status,
              url: message.url || photo.url,
              variants: message.variants || photo.variants,
              placeholder: message.placeholder || photo.placeholder,
              error: message.error
            };
          }
          return photo;
        }));
      }

      // Invalidate catches query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
    }
  });
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<DiaryCatch | null>(null);
  const [deletingCatch, setDeletingCatch] = useState<DiaryCatch | null>(null);
  const [selectedCatch, setSelectedCatch] = useState<DiaryCatch | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<Array<{
    id: string;
    url: string;
    status: 'processing' | 'ready' | 'failed';
    originalUrl?: string;
    variants?: Array<{width: number; format: string; url: string;}>;
    placeholder?: string;
    error?: string;
  }>>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters state
  const [selectedTechnique, setSelectedTechnique] = useState<string>("all");
  const [selectedFishType, setSelectedFishType] = useState<string>("all");
  const [selectedSpot, setSelectedSpot] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  // Weather state
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  
  // Offline functionality
  const { 
    isOffline, 
    pendingCatches, 
    saveCatchDraft, 
    removeCatchDraft,
    getPhoto
  } = useDiaryOffline();

  // Fetch user's catches
  const { data: catches = [], isLoading } = useQuery<DiaryCatch[]>({
    queryKey: ["/api/diary/catches/all"],
    enabled: !!user
  });

  // Fetch user's trips for the trip selector
  const { data: trips = [] } = useQuery<DiaryTrip[]>({
    queryKey: ["/api/diary/trips"],
    enabled: !!user
  });

  // Check freemium limits
  const { data: limits } = useQuery<FreemiumLimits>({
    queryKey: ["/api/diary/catch-limits"],
    enabled: !!user
  });

  // Check premium status for photo limits
  const { data: premiumStatus } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id
  });

  const isPremium = premiumStatus?.isPremium || false;
  const maxPhotos = isPremium ? 5 : 1;

  const form = useForm<CatchFormData>({
    resolver: zodResolver(catchFormSchema),
    defaultValues: {
      angler: { name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "" },
      capturedAt: new Date(),
      weight: "",
      fishType: "kapor_supinac",
      bait: "",
      notes: "",
      spot: "",
      verified: false
    }
  });

  // Create catch mutation
  const createCatchMutation = useMutation({
    mutationFn: async (data: CatchFormData) => {
      const response = await apiRequest("POST", "/api/diary/catches", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
      setIsCreateDialogOpen(false);
      setSelectedPhotos([]);
      setExistingPhotos([]);
      form.reset();
      toast({
        title: "Úlovok pridaný!",
        description: "Váš úlovok bol úspešne pridaný do denníka.",
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'catch');
    }
  });

  // Update catch mutation
  const updateCatchMutation = useMutation({
    mutationFn: async (data: CatchFormData) => {
      const response = await apiRequest("PUT", `/api/diary/catches/${editingCatch!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
      setEditingCatch(null);
      setSelectedPhotos([]);
      setExistingPhotos([]);
      form.reset();
      toast({
        title: "Úlovok aktualizovaný!",
        description: "Váš úlovok bol úspešne aktualizovaný.",
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'update');
    }
  });

  // Delete catch mutation
  const deleteCatchMutation = useMutation({
    mutationFn: async (catchId: string) => {
      await apiRequest("DELETE", `/api/diary/catches/${catchId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
      setDeletingCatch(null);
      toast({
        title: "Úlovok zmazaný!",
        description: "Úlovok bol úspešne zmazaný.",
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'delete');
    }
  });

  const handleSubmit = async (data: CatchFormData) => {
    // Convert "none" values to undefined (no selection)
    // CRITICAL: Always include userId in angler object for proper filtering
    const processedData = {
      ...data,
      angler: {
        ...data.angler,
        userId: user?.id || ''
      },
      tripId: data.tripId === "none" ? undefined : data.tripId,
      bait: data.bait === "none" ? undefined : data.bait
    };

    if (isOffline) {
      // Save as draft when offline (with photos if available)
      try {
        const type = editingCatch ? 'update' : deletingCatch ? 'delete' : 'create';
        const originalId = editingCatch?.id || deletingCatch?.id;
        const catchDataWithPhoto = selectedPhotos.length > 0 ? { ...processedData, photo: selectedPhotos[0] } : processedData;
        
        await saveCatchDraft(catchDataWithPhoto, type, originalId);
        
        setIsCreateDialogOpen(false);
        setEditingCatch(null);
        setSelectedPhotos([]);
        setExistingPhotos([]);
        form.reset();
        
        toast({
          title: "Uložené offline",
          description: selectedPhotos.length > 0
            ? "Úlovok s fotkou sa odošle automaticky po obnovení pripojenia"
            : "Úlovok sa odošle automaticky po obnovení pripojenia",
          variant: "default",
        });
      } catch (error) {
        console.error('Failed to save catch draft:', error);
        toast({
          title: "Chyba",
          description: "Nepodarilo sa uložiť úlovok offline",
          variant: "destructive",
        });
      }
    } else {
      // Online mode - instant save with background photo upload
      
      if (editingCatch) {
        // EDITING MODE: Use old flow with photo upload first
        let newPhotos: Array<{
          id: string;
          url: string;
          status: 'processing' | 'ready' | 'failed';
          originalUrl?: string;
        }> = [];
        
        if (selectedPhotos.length > 0) {
          try {
            const formData = new FormData();
            selectedPhotos.forEach(photo => {
              formData.append('photos', photo);
            });
            
            const uploadResponse = await fetch('/api/diary/photos/upload', {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });
            
            if (!uploadResponse.ok) {
              throw new Error('Failed to upload photos');
            }
            
            const uploadResult = await uploadResponse.json();
            newPhotos = uploadResult.photos || [];
          } catch (error) {
            console.error('Photo upload error:', error);
            toast({
              title: "Chyba pri nahrávaní fotiek",
              description: "Úlovok bude aktualizovaný bez nových fotiek",
              variant: "destructive",
            });
          }
        }

        const allPhotos = [...existingPhotos, ...newPhotos];
        const finalData = allPhotos.length > 0 
          ? { ...processedData, photos: allPhotos }
          : processedData;
        
        updateCatchMutation.mutate(finalData);
      } else {
        // NEW CATCH MODE: Instant save with background photo upload
        
        // 1. Save catch IMMEDIATELY without photos
        const immediateData = existingPhotos.length > 0 
          ? { ...processedData, photos: existingPhotos }
          : processedData;
        
        // Store photos to upload for background processing
        const photosToUpload = [...selectedPhotos];
        
        // 2. Create catch with immediate success callback
        createCatchMutation.mutate(immediateData, {
          onSuccess: async (newCatch: any) => {
            // 3. If there are photos, upload them in background
            if (photosToUpload.length > 0) {
              toast({
                title: "Úlovok uložený!",
                description: `${photosToUpload.length} ${photosToUpload.length === 1 ? 'fotka sa nahráva' : 'fotky sa nahrávajú'} na pozadí...`,
              });
              
              // Background photo upload (async, non-blocking)
              uploadPhotosInBackground(newCatch.id, photosToUpload);
            }
          }
        });
      }
    }
  };

  // Load weather data from API
  const loadWeatherData = async () => {
    const lat = form.getValues("latitude");
    const lon = form.getValues("longitude");
    const datetime = form.getValues("capturedAt");

    if (!lat || !lon || !datetime) {
      toast({
        title: "Chýbajúce údaje",
        description: "Prosím zadajte GPS súradnice (široká/dĺžka) a čas chytenia.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingWeather(true);
    
    try {
      const response = await fetch(
        `/api/weather?lat=${lat}&lon=${lon}&datetime=${datetime.toISOString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const weatherData = await response.json();

      // Update form with weather data
      if (weatherData.temperature !== null && weatherData.temperature !== undefined) {
        form.setValue("airTemp", weatherData.temperature);
      }
      if (weatherData.windSpeed !== null && weatherData.windSpeed !== undefined) {
        form.setValue("windSpeed", weatherData.windSpeed);
      }
      if (weatherData.pressure !== null && weatherData.pressure !== undefined) {
        form.setValue("airPressure", weatherData.pressure);
      }

      toast({
        title: "Počasie načítané!",
        description: `Teplota: ${weatherData.temperature}°C, Vietor: ${weatherData.windSpeed} km/h, Tlak: ${weatherData.pressure} mb`,
      });
    } catch (error) {
      console.error('Weather fetch error:', error);
      toast({
        title: "Chyba pri načítaní počasia",
        description: "Nepodarilo sa načítať údaje o počasí. Skúste to znova.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingWeather(false);
    }
  };

  // Get user's current GPS location
  const getMyLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS nie je podporované",
        description: "Váš prehliadač nepodporuje získavanie GPS polohy.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingWeather(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Update form with GPS coordinates
        form.setValue("latitude", lat);
        form.setValue("longitude", lon);
        
        setIsLoadingWeather(false);
        
        toast({
          title: "Poloha získaná!",
          description: `GPS: ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        });
      },
      (error) => {
        setIsLoadingWeather(false);
        
        let errorMessage = "Nepodarilo sa získať GPS polohu.";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Povolenie na prístup k polohe bolo zamietnuté. Prosím povoľte prístup v nastaveniach prehliadača.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Informácie o polohe nie sú dostupné.";
            break;
          case error.TIMEOUT:
            errorMessage = "Požiadavka na získanie polohy vypršala.";
            break;
        }
        
        toast({
          title: "Chyba GPS",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Background photo upload function (runs after catch is saved)
  const uploadPhotosInBackground = async (catchId: string, photos: File[]) => {
    try {
      // Import resize utility
      const { resizeImages } = await import('@/utils/imageResize');
      
      // Resize images to 2048px max (reduces upload time significantly)
      const resizedPhotos = await resizeImages(photos, { 
        maxWidth: 2048, 
        maxHeight: 2048, 
        quality: 0.85 
      });
      
      // Upload resized photos in parallel
      const formData = new FormData();
      resizedPhotos.forEach(photo => {
        formData.append('photos', photo);
      });
      
      const uploadResponse = await fetch('/api/diary/photos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload photos');
      }
      
      const uploadResult = await uploadResponse.json();
      const uploadedPhotos = uploadResult.photos || [];
      
      // Add photos to catch via PATCH endpoint
      const patchResponse = await fetch(`/api/diary/catches/${catchId}/photos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: uploadedPhotos }),
        credentials: 'include'
      });
      
      if (!patchResponse.ok) {
        throw new Error('Failed to attach photos to catch');
      }
      
      // Refresh catch list to show uploaded photos
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
      
      toast({
        title: "Fotky nahrané!",
        description: "Fotky sa optimalizujú na pozadí a onedlho sa zobrazia.",
      });
    } catch (error) {
      console.error('Background photo upload error:', error);
      toast({
        title: "Chyba pri nahrávaní fotiek",
        description: "Úlovok je uložený, ale fotky sa nepodarilo nahrať",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (catch_: DiaryCatch) => {
    setEditingCatch(catch_);
    setExistingPhotos(catch_.photos || []);
    form.reset({
      tripId: catch_.tripId || undefined,
      angler: { name: catch_.angler.name },
      capturedAt: new Date(catch_.capturedAt),
      weight: catch_.weight,
      lengthCm: catch_.lengthCm || undefined,
      fishType: catch_.fishType as any,
      bait: catch_.bait || "",
      notes: catch_.notes || "",
      spot: catch_.spot || "",
      verified: catch_.verified
    });
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingCatch(null);
    setSelectedPhotos([]);
    setExistingPhotos([]);
    form.reset();
  };

  const handleDeleteCatch = async () => {
    if (!deletingCatch) return;
    
    if (isOffline) {
      // Save delete as draft when offline
      try {
        await saveCatchDraft({ id: deletingCatch.id }, 'delete', deletingCatch.id);
        setDeletingCatch(null);
        
        toast({
          title: "Uložené offline",
          description: "Úlovok sa zmaže automaticky po obnovení pripojenia",
          variant: "default",
        });
      } catch (error) {
        console.error('Failed to save delete draft:', error);
        toast({
          title: "Chyba",
          description: "Nepodarilo sa uložiť operáciu offline",
          variant: "destructive",
        });
      }
    } else {
      deleteCatchMutation.mutate(deletingCatch.id);
    }
  };

  // Sync pending catches when back online
  const syncPendingCatches = useCallback(async () => {
    if (isOffline || pendingCatches.length === 0 || isSyncing) return;
    
    setIsSyncing(true);
    
    for (const catchDraft of pendingCatches) {
      try {
        if (catchDraft.type === 'create') {
          // Get photo from IndexedDB if it has one
          let photo = null;
          if (catchDraft.hasPhoto) {
            photo = await getPhoto(catchDraft.id);
            if (!photo) {
              toast({
                title: "Chyba synchronizácie",
                description: `Fotka pre úlovok z ${new Date(catchDraft.timestamp).toLocaleTimeString()} chýba`,
                variant: "destructive",
              });
              continue; // Skip this draft until photo is resolved
            }
          }
          
          const response = await apiRequest("POST", "/api/diary/catches", { ...catchDraft.data, photo });
          await response.json();
          await removeCatchDraft(catchDraft.id);
          
          toast({
            title: "Synchronizované",
            description: `Úlovok ${catchDraft.data.angler?.name || ''} - ${catchDraft.data.weight}kg bol úspešne pridaný`,
          });
        } else if (catchDraft.type === 'update' && catchDraft.originalId) {
          const response = await apiRequest("PUT", `/api/diary/catches/${catchDraft.originalId}`, catchDraft.data);
          await response.json();
          await removeCatchDraft(catchDraft.id);
          
          toast({
            title: "Synchronizované",
            description: "Úlovok bol úspešne aktualizovaný",
          });
        } else if (catchDraft.type === 'delete' && catchDraft.originalId) {
          await apiRequest("DELETE", `/api/diary/catches/${catchDraft.originalId}`);
          await removeCatchDraft(catchDraft.id);
          
          toast({
            title: "Synchronizované",
            description: "Úlovok bol úspešne zmazaný",
          });
        }
        
        // Invalidate queries after successful sync
        queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
        queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
      } catch (error) {
        console.error('Failed to sync catch:', error);
        toast({
          title: "Chyba synchronizácie",
          description: `Nepodarilo sa synchronizovať úlovok z ${new Date(catchDraft.timestamp).toLocaleTimeString()}`,
          variant: "destructive",
        });
      }
    }
    
    setIsSyncing(false);
  }, [isOffline, pendingCatches, isSyncing, removeCatchDraft, getPhoto, toast]);

  // Auto-sync when connection is restored
  useEffect(() => {
    if (!isOffline && pendingCatches.length > 0) {
      const timeout = setTimeout(() => {
        syncPendingCatches();
      }, 1000); // Wait 1s after reconnection
      return () => clearTimeout(timeout);
    }
  }, [isOffline, pendingCatches.length, syncPendingCatches]);

  // Handle edit query parameter from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    
    if (editId && catches.length > 0 && !editingCatch) {
      const catchToEdit = catches.find(c => c.id === editId);
      if (catchToEdit) {
        openEditDialog(catchToEdit);
        // Clear query parameter from URL using replaceState to avoid adding history entry
        window.history.replaceState({}, '', '/diary/catches');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, catches, editingCatch]);

  // Filter catches for 2025 season (January 15, 2025 onwards)
  const season2025Catches = Array.isArray(catches) ? catches.filter((catch_: any) => {
    if (!catch_.capturedAt) return false;
    const catchDate = new Date(catch_.capturedAt);
    const season2025Start = new Date('2025-01-15');
    return catchDate >= season2025Start;
  }) : [];

  // Apply filters to catches
  const filteredCatches = season2025Catches.filter((catch_: any) => {
    // Filter by technique
    if (selectedTechnique !== "all" && catch_.bait !== selectedTechnique) {
      return false;
    }
    
    // Filter by fish type
    if (selectedFishType !== "all" && catch_.fishType !== selectedFishType) {
      return false;
    }
    
    // Filter by spot
    if (selectedSpot !== "all" && catch_.spot !== selectedSpot) {
      return false;
    }
    
    // Filter by date
    if (selectedDate) {
      const catchDate = new Date(catch_.capturedAt);
      if (catchDate.toDateString() !== selectedDate.toDateString()) {
        return false;
      }
    }
    
    return true;
  });

  // Get unique techniques and spots for filter dropdowns
  const uniqueTechniques = Array.from(new Set(season2025Catches.map((c: any) => c.bait).filter(Boolean)));
  const uniqueSpots = Array.from(new Set(season2025Catches.map((c: any) => c.spot).filter(Boolean)));

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">Moje úlovky</h1>
                {isOffline && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="destructive" className="flex items-center gap-1" data-testid="badge-offline">
                          <WifiOff className="w-3 h-3" />
                          Offline
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Bez pripojenia - úlovky sa uložia lokálne s fotkami</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {isSyncing && (
                  <Badge variant="secondary" className="flex items-center gap-1" data-testid="badge-syncing">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Synchronizujem...
                  </Badge>
                )}
                {!isOffline && pendingCatches.length > 0 && !isSyncing && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="flex items-center gap-1" data-testid="badge-pending">
                          <Upload className="w-3 h-3" />
                          {pendingCatches.length} čakajúcich
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{pendingCatches.filter(c => c.hasPhoto).length} s fotkami</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-muted-foreground">
                Spravujte svoje úlovky a sledujte svoje rybárske úspechy
              </p>
            </div>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={limits && !limits.canCreate}
              data-testid="button-add-catch"
            >
              <Plus className="w-4 h-4 mr-2" />
              Pridať úlovok
            </Button>
          </div>

          <CatchFormDialog
            isOpen={isCreateDialogOpen || !!editingCatch}
            onClose={closeDialog}
            editingCatch={editingCatch}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
              queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
            }}
          />

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={selectedTechnique} onValueChange={setSelectedTechnique}>
              <SelectTrigger className="w-[200px] bg-slate-700/50 border text-white" data-testid="filter-technique">
                <SelectValue placeholder="Všetky Techniky" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetky Techniky</SelectItem>
                {uniqueTechniques.map((technique: string) => (
                  <SelectItem key={technique} value={technique}>
                    {technique}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedFishType} onValueChange={setSelectedFishType}>
              <SelectTrigger className="w-[200px] bg-slate-700/50 border text-white" data-testid="filter-fish-type">
                <SelectValue placeholder="Všetky Druhy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetky Druhy</SelectItem>
                {getFishTypeOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSpot} onValueChange={setSelectedSpot}>
              <SelectTrigger className="w-[200px] bg-slate-700/50 border text-white" data-testid="filter-spot">
                <SelectValue placeholder="Všetky Revíry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetky Revíry</SelectItem>
                {uniqueSpots.map((spot: string) => (
                  <SelectItem key={spot} value={spot}>
                    {spot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal bg-slate-700/50 border text-white hover:bg-slate-700/70",
                    !selectedDate && "text-slate-400"
                  )}
                  data-testid="filter-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd. MMM yyyy", { locale: sk }) : "Vybrať dátum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {(selectedTechnique !== "all" || selectedFishType !== "all" || selectedSpot !== "all" || selectedDate) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedTechnique("all");
                  setSelectedFishType("all");
                  setSelectedSpot("all");
                  setSelectedDate(undefined);
                }}
                className="text-slate-400 hover:text-white"
                data-testid="button-clear-filters"
              >
                <X className="w-4 h-4 mr-2" />
                Zrušiť filtre
              </Button>
            )}
          </div>

          {/* Catches Table */}
          <Card className="bg-slate-800/50 border overflow-hidden">
            <CardContent className="p-0">
              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-5 gap-4 p-4 border-b text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-700/30">
                <div>DRUH RYBY</div>
                <div>VÁHA / DĹŽKA</div>
                <div>REVÍR</div>
                <div>TECHNIKA</div>
                <div>DÁTUM</div>
              </div>
              
              {/* Table Rows */}
              {filteredCatches.length > 0 ? (
                filteredCatches.map((catch_: any, index: number) => (
                  <div 
                    key={catch_.id || index} 
                    className="border-b hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedCatch(catch_)}
                    data-testid={`catch-row-${catch_.id || index}`}
                  >
                    {/* Desktop Row */}
                    <div className="hidden md:grid grid-cols-5 gap-4 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center">
                          {getFishIcon(catch_.fishType)}
                        </div>
                        <div className="text-white font-medium">
                          {catch_.fishType ? getFishTypeLabel(catch_.fishType) : 'Neznámy druh'}
                        </div>
                      </div>
                      
                      <div className="text-white font-semibold">
                        {catch_.weight ? `${catch_.weight} kg` : catch_.lengthCm ? `${catch_.lengthCm} cm` : 'N/A'}
                      </div>
                      
                      <div className="text-slate-300">
                        {catch_.spot || 'Neznáme miesto'}
                      </div>
                      
                      <div className="text-slate-300">
                        {catch_.bait || 'Neznáma'}
                      </div>
                      
                      <div className="text-slate-300">
                        {catch_.capturedAt ? format(new Date(catch_.capturedAt), "dd. MMM yyyy", { locale: sk }) : 'N/A'}
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="md:hidden p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-slate-600/50 rounded-lg flex items-center justify-center flex-shrink-0">
                          {getFishIcon(catch_.fishType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium mb-1">
                            {catch_.fishType ? getFishTypeLabel(catch_.fishType) : 'Neznámy druh'}
                          </div>
                          <div className="text-white/80 text-sm mb-2">
                            {catch_.weight ? `${catch_.weight} kg` : catch_.lengthCm ? `${catch_.lengthCm} cm` : 'N/A'}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                            <div>
                              <span className="text-slate-500">Miesto:</span> {catch_.spot || 'N/A'}
                            </div>
                            <div>
                              <span className="text-slate-500">Technika:</span> {catch_.bait || 'N/A'}
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-500">Dátum:</span> {catch_.capturedAt ? format(new Date(catch_.capturedAt), "dd. MMM yyyy", { locale: sk }) : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Fish className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">
                    {season2025Catches.length === 0 
                      ? "Zatiaľ nemáte žiadne úlovky" 
                      : "Žiadne úlovky nevyhovujú zvoleným filtrom"}
                  </p>
                  {season2025Catches.length === 0 && (
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Pridať prvý úlovok
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detail Panel */}
          <Sheet open={!!selectedCatch} onOpenChange={() => setSelectedCatch(null)}>
            <SheetContent className="w-full sm:max-w-md bg-slate-800 border text-white overflow-y-auto" data-testid="catch-detail-panel">
              <SheetHeader className="pb-6">
                <SheetTitle className="text-white flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center">
                    {getFishIcon(selectedCatch?.fishType)}
                  </div>
                  {selectedCatch?.fishType ? getFishTypeLabel(selectedCatch.fishType) : 'Detail úlovku'}
                </SheetTitle>
              </SheetHeader>

              {selectedCatch && (
                <div className="space-y-6">
                  {/* Photo Carousel */}
                  {selectedCatch.photos && selectedCatch.photos.length > 0 && (
                    <PhotoCarousel 
                      photos={selectedCatch.photos} 
                      onPhotoClick={(photo) => setLightboxImage(photo)}
                    />
                  )}

                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Weight className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-400">Váha</div>
                        <div className="font-semibold" data-testid="detail-weight">{selectedCatch.weight ? `${selectedCatch.weight} kg` : 'Neuvedené'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Ruler className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-400">Dĺžka</div>
                        <div className="font-semibold">{selectedCatch.lengthCm ? `${selectedCatch.lengthCm} cm` : 'Neuvedené'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-400">Revír</div>
                        <div className="font-semibold">{selectedCatch.spot || 'Neuvedené'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-400">Nástraha</div>
                        <div className="font-semibold">{selectedCatch.bait || 'Neuvedené'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <CalendarIcon className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-sm text-slate-400">Dátum úlovku</div>
                        <div className="font-semibold">
                          {selectedCatch.capturedAt ? format(new Date(selectedCatch.capturedAt), "EEEE, d. MMMM yyyy", { locale: sk }) : 'Neuvedené'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedCatch.notes && (
                    <div>
                      <div className="text-sm text-slate-400 mb-2">Poznámky</div>
                      <div className="bg-slate-700/50 rounded-lg p-3 text-sm">
                        {selectedCatch.notes}
                      </div>
                    </div>
                  )}

                  {/* Weather Conditions */}
                  {(selectedCatch.waterTemp !== null && selectedCatch.waterTemp !== undefined) || 
                   (selectedCatch.airTemp !== null && selectedCatch.airTemp !== undefined) || 
                   (selectedCatch.windSpeed !== null && selectedCatch.windSpeed !== undefined) || 
                   (selectedCatch.airPressure !== null && selectedCatch.airPressure !== undefined) ? (
                    <div className="border-t border-slate-700 pt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Cloud className="w-5 h-5 text-slate-400" />
                        <div className="text-sm text-slate-400">Podmienky počasia</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(selectedCatch.waterTemp !== null && selectedCatch.waterTemp !== undefined) && (
                          <div className="bg-slate-700/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                              <Thermometer className="w-4 h-4" />
                              <span className="text-xs">Teplota vody</span>
                            </div>
                            <div className="font-semibold" data-testid="detail-water-temp">{selectedCatch.waterTemp}°C</div>
                          </div>
                        )}
                        {(selectedCatch.airTemp !== null && selectedCatch.airTemp !== undefined) && (
                          <div className="bg-slate-700/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                              <Thermometer className="w-4 h-4" />
                              <span className="text-xs">Teplota vzduchu</span>
                            </div>
                            <div className="font-semibold" data-testid="detail-air-temp">{selectedCatch.airTemp}°C</div>
                          </div>
                        )}
                        {(selectedCatch.windSpeed !== null && selectedCatch.windSpeed !== undefined) && (
                          <div className="bg-slate-700/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                              <Wind className="w-4 h-4" />
                              <span className="text-xs">Vietor</span>
                            </div>
                            <div className="font-semibold" data-testid="detail-wind-speed">{selectedCatch.windSpeed} km/h</div>
                          </div>
                        )}
                        {(selectedCatch.airPressure !== null && selectedCatch.airPressure !== undefined) && (
                          <div className="bg-slate-700/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                              <Gauge className="w-4 h-4" />
                              <span className="text-xs">Tlak vzduchu</span>
                            </div>
                            <div className="font-semibold" data-testid="detail-air-pressure">{selectedCatch.airPressure} mb</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Action Buttons */}
                  <div className="pt-4 space-y-3">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        openEditDialog(selectedCatch);
                        setSelectedCatch(null);
                      }}
                      data-testid="button-edit-catch"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Upraviť
                    </Button>
                    <Button 
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        setDeletingCatch(selectedCatch);
                        setSelectedCatch(null);
                      }}
                      data-testid="button-delete-catch"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Zmazať
                    </Button>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Photo Lightbox */}
          <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/90 border-0" data-testid="photo-lightbox">
              <div className="relative flex items-center justify-center h-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLightboxImage(null)}
                  className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
                {lightboxImage && (
                  <img 
                    src={lightboxImage} 
                    alt="Fotografia úlovku"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!deletingCatch} onOpenChange={(open) => !open && setDeletingCatch(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Naozaj chcete zmazať tento úlovok?</AlertDialogTitle>
                <AlertDialogDescription>
                  Táto akcia je nenávratná. Úlovok bude trvalo odstránený z vášeho denníka.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Zrušiť</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteCatch}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-confirm-delete"
                >
                  Zmazať
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      </DiaryLayout>
    );
  }
