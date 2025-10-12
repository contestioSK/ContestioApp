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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorUtils";

import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Camera,
  X,
  Loader2,
  Cloud,
  Thermometer,
  Wind,
  Gauge
} from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryCatch, DiaryTrip } from "@shared/schema";

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
}

export default function CatchFormDialog({ isOpen, onClose, editingCatch, onSuccess }: CatchFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<Array<PhotoObject>>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

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
      capturedAt: new Date(),
      weight: "",
      fishType: "kapor_supinac",
      bait: "",
      notes: "",
      spot: "",
      verified: false
    }
  });

  // Update form when editing catch changes
  useEffect(() => {
    if (editingCatch) {
      console.log('[CatchFormDialog] Editing catch:', editingCatch);
      setExistingPhotos(editingCatch.photos || []);
      
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
  }, [editingCatch, form]);

  // Create catch mutation
  const createCatchMutation = useMutation({
    mutationFn: async (data: CatchFormData) => {
      const response = await apiRequest("POST", "/api/diary/catches", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
      handleClose();
      toast({
        title: "Úlovok pridaný!",
        description: "Váš úlovok bol úspešne pridaný do denníka.",
      });
      onSuccess?.();
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
        title: "Úlovok aktualizovaný!",
        description: "Váš úlovok bol úspešne aktualizovaný.",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'update');
    }
  });

  const handleSubmit = async (data: CatchFormData) => {
    // Convert "none" values to undefined (no selection)
    // CRITICAL: Always include userId in angler object - server will auto-assign trip
    const processedData = {
      ...data,
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

  const handleClose = () => {
    setSelectedPhotos([]);
    setExistingPhotos([]);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      PREMIUM: až {maxPhotos} fotiek
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
              <FormField
                control={form.control}
                name="capturedAt"
                render={({ field }) => {
                  const dateValue = field.value ? format(field.value, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
                  const timeValue = field.value ? format(field.value, "HH:mm") : format(new Date(), "HH:mm");
                  
                  const handleDateChange = (newDate: string) => {
                    const currentDate = field.value || new Date();
                    const [year, month, day] = newDate.split('-').map(Number);
                    const updatedDate = new Date(currentDate);
                    updatedDate.setFullYear(year);
                    updatedDate.setMonth(month - 1);
                    updatedDate.setDate(day);
                    field.onChange(updatedDate);
                  };
                  
                  const handleTimeChange = (newTime: string) => {
                    const currentDate = field.value || new Date();
                    const [hours, minutes] = newTime.split(':').map(Number);
                    const updatedDate = new Date(currentDate);
                    updatedDate.setHours(hours);
                    updatedDate.setMinutes(minutes);
                    field.onChange(updatedDate);
                  };
                  
                  return (
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                  );
                }}
              />
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
                        {fishTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                    <FormLabel>Revír / Miesto</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="napr. Dunaj pri Bratislave" 
                        data-testid="input-spot"
                        {...field} 
                      />
                    </FormControl>
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

            {/* Weather Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-medium">Podmienky počasia (voliteľné)</h3>
              </div>
              
              {/* GPS Coordinates for weather lookup */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Širka (GPS)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001"
                          placeholder="napr. 48.148636" 
                          data-testid="input-latitude"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Dĺžka (GPS)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001"
                          placeholder="napr. 17.107748" 
                          data-testid="input-longitude"
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

              {/* Get My Location Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getMyLocation}
                disabled={isLoadingWeather}
                className="w-full"
                data-testid="button-get-location"
              >
                {isLoadingWeather ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Získavam polohu...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Získať moju polohu
                  </>
                )}
              </Button>

              {/* Load Weather Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadWeatherData}
                disabled={isLoadingWeather}
                className="w-full"
                data-testid="button-load-weather"
              >
                {isLoadingWeather ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Načítavam počasie...
                  </>
                ) : (
                  <>
                    <Cloud className="mr-2 h-4 w-4" />
                    Načítať počasie z API
                  </>
                )}
              </Button>

              {/* Weather Data Fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="waterTemp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1">
                        <Thermometer className="h-3 w-3" />
                        Teplota vody (°C)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          placeholder="napr. 18.5" 
                          data-testid="input-water-temp"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value && e.target.value.trim() !== '' ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="airTemp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1">
                        <Thermometer className="h-3 w-3" />
                        Teplota vzduchu (°C)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          placeholder="z API" 
                          data-testid="input-air-temp"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value && e.target.value.trim() !== '' ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="windSpeed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1">
                        <Wind className="h-3 w-3" />
                        Vietor (km/h)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          placeholder="z API" 
                          data-testid="input-wind-speed"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value && e.target.value.trim() !== '' ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="airPressure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        Tlak (mb)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          placeholder="z API" 
                          data-testid="input-air-pressure"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value && e.target.value.trim() !== '' ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
    </Dialog>
  );
}
