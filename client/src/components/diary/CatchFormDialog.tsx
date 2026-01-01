import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDiaryOffline } from "@/hooks/use-diary-offline";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorUtils";
import { useConfetti } from "@/hooks/useConfetti";
import { FishingAreaSelect } from "@/components/FishingAreaSelect";
import { getPersonalizedFishTypeOptions, getAllFishTypeKeys, fishPrioritiesByStyle } from "@/utils/fishTypeMapping";

import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Camera,
  X,
  Loader2,
  Cloud,
  Thermometer,
  Wind,
  Gauge,
  Trophy,
  Star,
  Lock
} from "lucide-react";

import { PremiumUpsellModal } from "@/components/PremiumUpsellModal";
import { BadgeCelebrationModal } from "@/components/diary/BadgeCelebrationModal";
import { BadgeTier } from "@shared/badges";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryCatch, DiaryTrip } from "@shared/schema";

// Get all fish type keys for the schema
const allFishTypes = getAllFishTypeKeys();

// Catch form validation schema
const catchFormSchema = z.object({
  capturedAt: z.date({ required_error: "Čas chytenia je povinný" }),
  weight: z.string().min(1, "Váha je povinná").transform((val) => {
    const weight = parseFloat(val);
    if (isNaN(weight) || weight < 0) {
      throw new Error("Neplatná váha");
    }
    return weight.toString();
  }),
  lengthCm: z.coerce.number().positive("Dĺžka musí byť kladné číslo").optional(),
  fishType: z.string().min(1, "Typ ryby je povinný"),
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

type PhotoObject = {
  id: string;
  url: string;
  status: 'processing' | 'ready' | 'failed';
  originalUrl?: string;
  variants?: Array<{width: number; format: string; url: string;}>;
  placeholder?: string;
  error?: string;
};

interface CatchFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingCatch: DiaryCatch | null;
  onSuccess?: () => void;
  battleId?: string; // Optional: if opened from a battle page
}

export default function CatchFormDialog({ isOpen, onClose, editingCatch, onSuccess, battleId }: CatchFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fireworks, celebrateGoalCompletion } = useConfetti();
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<Array<PhotoObject>>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherDataLoaded, setWeatherDataLoaded] = useState(false);
  const [showGpsPremiumModal, setShowGpsPremiumModal] = useState(false);

  // Offline functionality
  const { 
    isOffline, 
    saveCatchDraft
  } = useDiaryOffline();

  // Fetch user's trips for the trip selector
  const { data: trips = [] } = useQuery<DiaryTrip[]>({
    queryKey: ["/api/diary/trips"],
    enabled: !!user
  });

  // Fetch active battles to auto-assign catches to ongoing battles
  const { data: activeBattles = [] } = useQuery<any[]>({
    queryKey: ["/api/diary/battles/active"],
    enabled: !!user && isOpen
  });

  // Check premium status for photo limits
  const { data: premiumStatus } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id
  });

  const isPremium = premiumStatus?.isPremium || false;
  const maxPhotos = isPremium ? 99 : 1; // Premium: unlimited (99), Free: 1

  // Fetch favorite baits from arsenal
  const { data: favoriteBaits = [] } = useQuery<Array<{
    id: number;
    diameter: string | null;
    manufacturer: { id: number; name: string; };
    productLine: { id: number; name: string; };
    flavor: { id: number; name: string; };
  }>>({
    queryKey: ["/api/diary/arsenal/baits/favorites"],
    enabled: !!user && isOpen
  });

  // Find active battle (either from battleId prop or first active battle)
  const activeBattle = battleId 
    ? activeBattles.find(b => b.id === battleId)
    : activeBattles[0]; // Use first active battle if any

  // State for tripId (will be auto-set if active battle exists)
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(undefined);
  
  // State for badge celebration modal
  const [badgeQueue, setBadgeQueue] = useState<Array<{ badgeType: string; badgeName: string; tier: BadgeTier; icon: string }>>([]);
  const [currentBadge, setCurrentBadge] = useState<{ badgeType: string; badgeName: string; tier: BadgeTier; icon: string } | null>(null);

  // Get personalized fish options based on user's fishing style preference
  const userFishingStyle = (user as any)?.preferences?.fishingStyle || null;
  const fishOptions = getPersonalizedFishTypeOptions(userFishingStyle);
  const hasPriorityFish = 'priorityOptions' in fishOptions;

  // Get default fish type based on user's fishing style
  const getDefaultFishType = () => {
    if (userFishingStyle && fishPrioritiesByStyle[userFishingStyle]) {
      return fishPrioritiesByStyle[userFishingStyle][0] || "kapor_rybnicny";
    }
    return "kapor_supinac";
  };

  const form = useForm<CatchFormData>({
    resolver: zodResolver(catchFormSchema),
    defaultValues: {
      capturedAt: new Date(),
      weight: "",
      fishType: getDefaultFishType(),
      bait: "",
      notes: "",
      spot: "",
      verified: false
    }
  });

  // Auto-set tripId when active battle exists
  useEffect(() => {
    if (isOpen && !editingCatch && activeBattle) {
      setSelectedTripId(activeBattle.tripId);
    }
  }, [isOpen, editingCatch, activeBattle]);

  // Update form when editing catch changes
  useEffect(() => {
    if (editingCatch) {
      setExistingPhotos(editingCatch.photos || []);
      setSelectedTripId(editingCatch.tripId || undefined);
      
      // Parse date safely
      let capturedDate = new Date();
      try {
        capturedDate = new Date(editingCatch.capturedAt);
      } catch (e) {
        console.error('Error parsing capturedAt:', e);
      }
      
      form.reset({
        capturedAt: capturedDate,
        weight: editingCatch.weight || "",
        lengthCm: editingCatch.lengthCm || undefined,
        fishType: editingCatch.fishType as any,
        bait: editingCatch.bait || "",
        notes: editingCatch.notes || "",
        spot: editingCatch.spot || "",
        verified: editingCatch.verified || false,
        waterTemp: editingCatch.waterTemp ? Number(editingCatch.waterTemp) : undefined,
        airTemp: editingCatch.airTemp ? Number(editingCatch.airTemp) : undefined,
        windSpeed: editingCatch.windSpeed ? Number(editingCatch.windSpeed) : undefined,
        airPressure: editingCatch.airPressure ? Number(editingCatch.airPressure) : undefined,
        latitude: editingCatch.latitude ? Number(editingCatch.latitude) : undefined,
        longitude: editingCatch.longitude ? Number(editingCatch.longitude) : undefined,
      });
    } else {
      setExistingPhotos([]);
      setSelectedTripId(activeBattle?.tripId);
      form.reset({
        capturedAt: new Date(),
        weight: "",
        fishType: "kapor_supinac",
        bait: "",
        notes: "",
        spot: "",
        verified: false
      });
    }
  }, [editingCatch, form, activeBattle]);

  // Create catch mutation
  const createCatchMutation = useMutation({
    mutationFn: async (data: CatchFormData) => {
      const response = await apiRequest("POST", "/api/diary/catches", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/badges"] });
      
      // Check for new badges and show celebration modal
      const newBadges = data?.newBadges || [];
      if (newBadges.length > 0) {
        // Queue all badges for celebration
        const badgesToShow = newBadges.map((badge: { badgeType: string; badgeName: string; tier: string; icon: string }) => ({
          badgeType: badge.badgeType,
          badgeName: badge.badgeName,
          tier: badge.tier as BadgeTier,
          icon: badge.icon
        }));
        
        // Show first badge immediately, queue the rest
        setCurrentBadge(badgesToShow[0]);
        if (badgesToShow.length > 1) {
          setBadgeQueue(badgesToShow.slice(1));
        }
        
        // Close form dialog but keep badge modal open
        handleClose();
        onSuccess?.();
      } else {
        toast({
          title: "✅ Úlovok pridaný!",
          description: "Váš úlovok bol úspešne pridaný do denníka.",
          variant: "success" as any,
        });
        handleClose();
        onSuccess?.();
      }
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
      handleClose();
      toast({
        title: "✅ Úlovok aktualizovaný!",
        description: "Váš úlovok bol úspešne aktualizovaný.",
        variant: "success" as any,
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'update');
    }
  });

  const handleSubmit = async (data: CatchFormData) => {
    // Convert "none" values to undefined (no selection)
    // CRITICAL: Always include userId in angler object
    // Include tripId if active battle exists (so it gets assigned to battle trip, not just today's active trip)
    const processedData = {
      ...data,
      tripId: selectedTripId, // Include tripId from active battle or selected trip
      angler: {
        name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "",
        userId: user?.id || ''
      },
      bait: data.bait === "none" ? undefined : data.bait
    };

    if (isOffline) {
      // Save as draft when offline (with photos if available)
      try {
        const type = editingCatch ? 'update' : 'create';
        const originalId = editingCatch?.id;
        const catchDataWithPhoto = selectedPhotos.length > 0 ? { ...processedData, photo: selectedPhotos[0] } : processedData;
        
        await saveCatchDraft(catchDataWithPhoto, type, originalId);
        
        handleClose();
        
        toast({
          title: "📤 Uložené offline",
          description: selectedPhotos.length > 0
            ? "Úlovok s fotkou sa odošle automaticky po obnovení pripojenia"
            : "Úlovok sa odošle automaticky po obnovení pripojenia",
          variant: "default",
        });
      } catch (error) {
        console.error('Failed to save catch draft:', error);
        toast({
          title: "❌ Chyba",
          description: "Nepodarilo sa uložiť úlovok offline",
          variant: "destructive",
        });
      }
    } else {
      // Online mode - instant save with background photo upload
      
      if (editingCatch) {
        // EDITING MODE: Use old flow with photo upload first
        let newPhotos: Array<PhotoObject> = [];
        
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
              title: "❌ Chyba pri nahrávaní fotiek",
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
                title: "✅ Úlovok uložený!",
                description: `${photosToUpload.length} ${photosToUpload.length === 1 ? 'fotka sa nahráva' : 'fotky sa nahrávajú'} na pozadí...`,
                variant: "success" as any,
              });
              
              // Background photo upload (async, non-blocking)
              uploadPhotosInBackground(newCatch.id, photosToUpload);
            }
          }
        });
      }
    }
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

  // Intelligent function: Get GPS location and weather in one step
  const getLocationAndWeather = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS nie je podporované",
        description: "Váš prehliadač nepodporuje získavanie GPS polohy.",
        variant: "destructive",
      });
      return;
    }

    const datetime = form.getValues("capturedAt");
    if (!datetime) {
      toast({
        title: "Chýbajúci dátum",
        description: "Prosím zadajte dátum a čas úlovku pred načítaním počasia.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingWeather(true);
    setWeatherDataLoaded(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Update form with GPS coordinates (stored in background)
        form.setValue("latitude", lat);
        form.setValue("longitude", lon);

        // Immediately fetch weather data
        try {
          const response = await fetch(
            `/api/weather?lat=${lat}&lon=${lon}&datetime=${datetime.toISOString()}`,
            { credentials: 'include' }
          );

          if (!response.ok) {
            throw new Error('Failed to fetch weather data');
          }

          const weatherData = await response.json();

          // Update form with weather data (stored in background)
          if (weatherData.temperature !== null && weatherData.temperature !== undefined) {
            form.setValue("airTemp", weatherData.temperature);
          }
          if (weatherData.windSpeed !== null && weatherData.windSpeed !== undefined) {
            form.setValue("windSpeed", weatherData.windSpeed);
          }
          if (weatherData.pressure !== null && weatherData.pressure !== undefined) {
            form.setValue("airPressure", weatherData.pressure);
          }

          setIsLoadingWeather(false);
          setWeatherDataLoaded(true);

          toast({
            title: "Dáta načítané! ✓",
            description: `GPS poloha a počasie boli automaticky uložené pre váš úlovok.`,
          });
        } catch (error) {
          console.error('Weather fetch error:', error);
          setIsLoadingWeather(false);
          
          toast({
            title: "Chyba pri načítaní počasia",
            description: "GPS poloha bola uložená, ale nepodarilo sa načítať počasie.",
            variant: "destructive",
          });
        }
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
        timeout: 30000,
        maximumAge: 300000
      }
    );
  };

  const handleClose = () => {
    setSelectedPhotos([]);
    setExistingPhotos([]);
    setWeatherDataLoaded(false);
    form.reset();
    onClose();
  };

  // Handle badge modal close - show next badge in queue or close
  const handleBadgeModalClose = () => {
    if (badgeQueue.length > 0) {
      // Show next badge
      setCurrentBadge(badgeQueue[0]);
      setBadgeQueue(badgeQueue.slice(1));
    } else {
      // No more badges, close modal
      setCurrentBadge(null);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingCatch ? "Upraviť úlovok" : "Nový úlovok"}
          </DialogTitle>
          <DialogDescription>
            {editingCatch 
              ? "Aktualizujte detaily vášeho úlovku."
              : "Pridajte nový úlovok do vášeho rybárskeho denníka."
            }
          </DialogDescription>
          {!editingCatch && activeBattle && (
            <div className="mt-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Trophy className="w-3 h-3 mr-1" />
                Pridáva sa do aktívneho battle: {activeBattle.name}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              {/* Photo Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Fotky úlovku (voliteľné)</FormLabel>
                  {!isPremium && (
                    <Badge variant="outline" className="text-xs">
                      FREE: max 1 fotka
                    </Badge>
                  )}
                  {isPremium && (
                    <Badge variant="secondary" className="text-xs">
                      PREMIUM: neobmedzené fotky
                    </Badge>
                  )}
                </div>
                
                {/* Existing photos (when editing) */}
                {existingPhotos.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">Existujúce fotky:</p>
                    <div className="flex flex-wrap gap-2">
                      {existingPhotos.map((photo, index) => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.url || photo.originalUrl}
                            alt={`Existujúca fotka ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setExistingPhotos(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-remove-photo-${index}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Upload new photos if under limit */}
                {(existingPhotos.length + selectedPhotos.length) < maxPhotos && (
                  <>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple={isPremium}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const totalPhotos = existingPhotos.length + selectedPhotos.length + files.length;
                        const remainingSlots = maxPhotos - existingPhotos.length - selectedPhotos.length;
                        
                        if (totalPhotos > maxPhotos) {
                          toast({
                            title: "Príliš veľa fotiek",
                            description: `Môžete mať celkovo maximálne ${maxPhotos} ${maxPhotos === 1 ? 'fotku' : 'fotiek'}. Môžete pridať ešte ${remainingSlots}.`,
                            variant: "destructive",
                          });
                          e.target.value = '';
                          return;
                        }
                        setSelectedPhotos([...selectedPhotos, ...files]);
                        e.target.value = ''; // Reset input to allow same file again
                      }}
                      data-testid="input-photos"
                    />
                    <p className="text-xs text-muted-foreground">
                      {isPremium 
                        ? `Môžete vybrať viacero fotiek naraz (Ctrl+klik alebo Cmd+klik)`
                        : `FREE verzia: ${existingPhotos.length > 0 ? 'Limit fotiek dosiahnutý' : '1 fotka na úlovok'}`
                      }
                    </p>
                  </>
                )}
                
                {selectedPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedPhotos.map((photo, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        {photo.name}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {isOffline && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPhotos.length > 0 
                      ? `${selectedPhotos.length} ${selectedPhotos.length === 1 ? 'fotka' : 'fotky'} sa uložia lokálne a odošlú po obnovení pripojenia`
                      : 'Fotky sa uložia lokálne a odošlú po obnovení pripojenia'}
                  </p>
                )}
              </div>

              {/* Date and Time - Split into two inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="capturedAt"
                  render={({ field }) => {
                    const currentValue = field.value instanceof Date && !isNaN(field.value.getTime()) 
                      ? field.value 
                      : new Date();
                    
                    const dateValue = format(currentValue, "yyyy-MM-dd");
                    
                    const handleDateChange = (newDate: string) => {
                      if (!newDate) return;
                      const baseDate = field.value instanceof Date && !isNaN(field.value.getTime()) 
                        ? new Date(field.value) 
                        : new Date();
                      const [year, month, day] = newDate.split('-').map(Number);
                      baseDate.setFullYear(year);
                      baseDate.setMonth(month - 1);
                      baseDate.setDate(day);
                      field.onChange(baseDate);
                    };
                    
                    return (
                      <FormItem>
                        <FormLabel>Dátum</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={dateValue}
                            onChange={(e) => handleDateChange(e.target.value)}
                            data-testid="input-capture-date"
                            max={format(new Date(), "yyyy-MM-dd")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="capturedAt"
                  render={({ field }) => {
                    const currentValue = field.value instanceof Date && !isNaN(field.value.getTime()) 
                      ? field.value 
                      : new Date();
                    
                    const timeValue = format(currentValue, "HH:mm");
                    
                    const handleTimeChange = (newTime: string) => {
                      if (!newTime) return;
                      const baseDate = field.value instanceof Date && !isNaN(field.value.getTime()) 
                        ? new Date(field.value) 
                        : new Date();
                      const [hours, minutes] = newTime.split(':').map(Number);
                      baseDate.setHours(hours);
                      baseDate.setMinutes(minutes);
                      field.onChange(baseDate);
                    };
                    
                    return (
                      <FormItem>
                        <FormLabel>Čas</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            value={timeValue}
                            onChange={(e) => handleTimeChange(e.target.value)}
                            data-testid="input-capture-time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>

            {/* Fish Details */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="fishType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Druh ryby</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fish-type">
                          <SelectValue placeholder="Vyberte druh ryby" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {hasPriorityFish ? (
                          <>
                            {(fishOptions as { priorityOptions: { value: string; label: string }[]; otherOptions: { value: string; label: string }[] }).priorityOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                ⭐ {option.label}
                              </SelectItem>
                            ))}
                            <SelectSeparator />
                            {(fishOptions as { priorityOptions: { value: string; label: string }[]; otherOptions: { value: string; label: string }[] }).otherOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </>
                        ) : (
                          (fishOptions as { value: string; label: string }[]).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Váha (kg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="napr. 5.2" 
                          data-testid="input-weight"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lengthCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dĺžka (cm)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="napr. 65" 
                          data-testid="input-length"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bait"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nástraha</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-bait">
                          <SelectValue placeholder="Vyberte nástrahu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Neuvedené</SelectItem>
                        
                        {/* Favorite baits from arsenal */}
                        {favoriteBaits.length > 0 && (
                          <>
                            {favoriteBaits.map((bait) => {
                              const label = `${bait.manufacturer.name} - ${bait.productLine.name} - ${bait.flavor.name}${bait.diameter ? ` (${bait.diameter})` : ''}`;
                              return (
                                <SelectItem 
                                  key={`fav-${bait.id}`} 
                                  value={label}
                                  data-testid={`select-favorite-bait-${bait.id}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                    <span>{label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                            <SelectSeparator />
                          </>
                        )}
                        
                        {/* Classic fishing methods */}
                        {fishingMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="spot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revír (Rybársky revír)</FormLabel>
                    <FishingAreaSelect value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poznámky</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Dodatočné poznámky k úlovku..."
                        className="resize-none"
                        rows={3}
                        data-testid="textarea-notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Premium Data Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Prémiové Dáta</h2>
                <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded">
                  PREMIUM
                </span>
              </div>

              {/* Intelligent Button - Premium gated */}
              <Button
                type="button"
                size="lg"
                onClick={isPremium ? getLocationAndWeather : () => setShowGpsPremiumModal(true)}
                disabled={isPremium && (isLoadingWeather || weatherDataLoaded)}
                className={`w-full ${
                  !isPremium
                    ? 'bg-gray-500 hover:bg-gray-600'
                    : weatherDataLoaded 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-[#3b82f6] hover:bg-[#2563eb]'
                }`}
                data-testid="button-get-location-weather"
              >
                {!isPremium ? (
                  <>
                    <Lock className="mr-2 h-5 w-5" />
                    Získať Polohu a Počasie
                  </>
                ) : isLoadingWeather ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Načítavam dáta...
                  </>
                ) : weatherDataLoaded ? (
                  <>
                    <MapPin className="mr-2 h-5 w-5" />
                    Dáta o polohe a počasí načítané ✔
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-5 w-5" />
                    Získať Polohu a Počasie
                  </>
                )}
              </Button>

              {/* Descriptive Text */}
              <p className="text-sm text-muted-foreground text-center">
                {isPremium 
                  ? "Automaticky získa GPS súradnice a načíta kompletnú predpoveď počasia z API pre čas úlovku."
                  : "Táto funkcia je dostupná len pre Premium používateľov."
                }
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Zrušiť
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createCatchMutation.isPending || updateCatchMutation.isPending}
                data-testid="button-submit-catch"
              >
                {editingCatch ? "Uložiť zmeny" : "Pridať úlovok"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* GPS Premium Upsell Modal */}
      <PremiumUpsellModal
        isOpen={showGpsPremiumModal}
        onClose={() => setShowGpsPremiumModal(false)}
        trigger="gps"
      />
    </Dialog>

    {/* Badge Celebration Modal - Outside Dialog so it persists after form closes */}
    <BadgeCelebrationModal
      badge={currentBadge}
      onClose={handleBadgeModalClose}
    />
    </>
  );
}
