import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDiaryOffline } from "@/hooks/use-diary-offline";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorUtils";
import { useIsMobile } from "@/hooks/use-mobile";

import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Plus, 
  Fish, 
  Edit, 
  Trash2, 
  Eye, 
  Users,
  Clock,
  FileText,
  Globe,
  Lock,
  AlertCircle,
  WifiOff,
  Loader2,
  Upload,
  ClipboardCheck,
  Search,
  History,
  ArrowDown,
  Filter,
  List
} from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryTrip, InsertDiaryTrip, DiaryCatch } from "@shared/schema";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { Compass } from "lucide-react";
import { TripCard } from "@/components/diary/TripCard";
import { PremiumUpsellModal } from "@/components/PremiumUpsellModal";
import { ChecklistModal } from "@/components/diary/ChecklistModal";
import { LocationSearchField } from "@/components/LocationSearchField";

// Type for premium status
type PremiumStatus = {
  isPremium: boolean;
};

// FREE users can access only the last 3 trips
const FREE_ACCESSIBLE_TRIPS = 3;

// Type for freemium limits response
type FreemiumLimits = {
  canCreate: boolean;
  currentCount: number;
  limit: number;
};

// Trip form validation schema
const tripFormSchema = z.object({
  name: z.string().min(1, "Názov výpravy je povinný").max(255, "Názov môže mať maximálne 255 znakov"),
  startDate: z.date({ required_error: "Dátum začiatku je povinný" }),
  endDate: z.date({ required_error: "Dátum ukončenia je povinný" }),
  location: z.string().min(1, "Lokalita je povinná"),
  notes: z.string().optional(),
  visibility: z.enum(["private", "shared"]).default("private"),
  participants: z.array(z.object({
    name: z.string().min(1, "Meno účastníka je povinné")
  })).optional()
}).refine((data) => data.endDate >= data.startDate, {
  message: "Dátum ukončenia musí byť po dátume začiatku",
  path: ["endDate"]
});

type TripFormData = z.infer<typeof tripFormSchema>;

export default function DiaryTrips() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<DiaryTrip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<DiaryTrip | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [searchQuery, setSearchQuery] = useState("");

  const scrollToHistory = () => {
    setActiveTab("history");
    setTimeout(() => {
      const element = document.getElementById("trips-list-anchor");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };
  
  // Offline functionality
  const { 
    isOffline, 
    pendingTrips, 
    saveTripDraft, 
    removeTripDraft 
  } = useDiaryOffline();

  // Fetch user's trips
  const { data: trips = [], isLoading } = useQuery<DiaryTrip[]>({
    queryKey: ["/api/diary/trips"],
    enabled: !!user
  });

  // Fetch all catches for statistics
  const { data: allCatches = [] } = useQuery<DiaryCatch[]>({
    queryKey: ["/api/diary/catches/all"],
    enabled: !!user
  });

  // Check freemium limits
  const { data: limits } = useQuery<FreemiumLimits>({
    queryKey: ["/api/diary/trip-limits"],
    enabled: !!user
  });

  // Check premium status
  const { data: premiumStatus } = useQuery<PremiumStatus>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id
  });
  
  const isPremium = premiumStatus?.isPremium || false;

  const form = useForm<TripFormData>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      name: "",
      startDate: new Date(),
      endDate: new Date(),
      location: "",
      notes: "",
      visibility: "private",
      participants: []
    }
  });

  // Create trip mutation
  const createTripMutation = useMutation({
    mutationFn: async (data: TripFormData & { coverImageUrl?: string }) => {
      // Server will set ownerUserId from auth session
      const tripData = {
        ...data,
        participants: data.participants || []
      };
      const response = await apiRequest("POST", "/api/diary/trips", tripData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trip-limits"] });
      setIsCreateDialogOpen(false);
      form.reset();
      setCoverImageFile(null);
      setCoverImagePreview(null);
      toast({
        title: "✅ Výprava vytvorená!",
        description: "Vaša rybárska výprava bola úspešne vytvorená.",
        variant: "success" as any,
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'trip');
    }
  });

  // Update trip mutation
  const updateTripMutation = useMutation({
    mutationFn: async (data: TripFormData & { coverImageUrl?: string }) => {
      const response = await apiRequest("PUT", `/api/diary/trips/${editingTrip!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
      setEditingTrip(null);
      form.reset();
      setCoverImageFile(null);
      setCoverImagePreview(null);
      toast({
        title: "✅ Výprava aktualizovaná!",
        description: "Vaša rybárska výprava bola úspešne aktualizovaná.",
        variant: "success" as any,
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'update');
    }
  });

  // Delete trip mutation
  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      await apiRequest("DELETE", `/api/diary/trips/${tripId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trip-limits"] });
      setDeletingTrip(null);
      toast({
        title: "✅ Výprava zmazaná!",
        description: "Rybárska výprava bola úspešne zmazaná.",
        variant: "success" as any,
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'delete');
    }
  });

  // Handle cover image selection
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload cover image and return URL
  const uploadCoverImage = async (): Promise<string | null> => {
    if (!coverImageFile) return null;
    
    const formData = new FormData();
    formData.append('coverImage', coverImageFile);
    
    try {
      const response = await fetch('/api/diary/trips/upload-cover', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload cover image');
      }
      
      const { coverImageUrl } = await response.json();
      return coverImageUrl;
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast({
        title: "❌ Chyba uploadu",
        description: "Nepodarilo sa nahrať titulnú fotografiu",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleSubmit = async (data: TripFormData) => {
    if (isOffline) {
      // Save as draft when offline
      try {
        const type = editingTrip ? 'update' : deletingTrip ? 'delete' : 'create';
        const originalId = editingTrip?.id || deletingTrip?.id;
        await saveTripDraft(data, type, originalId);
        
        setIsCreateDialogOpen(false);
        setEditingTrip(null);
        form.reset();
        
        toast({
          title: "📤 Uložené offline",
          description: "Výprava sa odošle automaticky po obnovení pripojenia",
          variant: "default",
        });
      } catch (error) {
        console.error('Failed to save trip draft:', error);
        toast({
          title: "❌ Chyba",
          description: "Nepodarilo sa uložiť výpravu offline",
          variant: "destructive",
        });
      }
    } else {
      // Online - upload cover image first if selected
      let coverImageUrl: string | undefined = editingTrip?.coverImageUrl || undefined;
      
      if (coverImageFile) {
        const uploadedUrl = await uploadCoverImage();
        if (uploadedUrl === null && coverImageFile) {
          // Upload failed, don't proceed
          return;
        }
        coverImageUrl = uploadedUrl || undefined;
      }
      
      // Use normal mutations
      const tripData = { ...data, ...(coverImageUrl && { coverImageUrl }) };
      if (editingTrip) {
        updateTripMutation.mutate(tripData);
      } else {
        createTripMutation.mutate(tripData);
      }
    }
  };

  const addParticipant = () => {
    const currentParticipants = form.getValues("participants") || [];
    form.setValue("participants", [...currentParticipants, { name: "" }]);
  };

  const removeParticipant = (index: number) => {
    const currentParticipants = form.getValues("participants") || [];
    form.setValue("participants", currentParticipants.filter((_, i) => i !== index));
  };

  const openEditDialog = (trip: DiaryTrip) => {
    setEditingTrip(trip);
    setCoverImageFile(null);
    setCoverImagePreview(null);
    form.reset({
      name: trip.name,
      startDate: new Date(trip.startDate),
      endDate: new Date(trip.endDate),
      location: trip.location,
      notes: trip.notes || "",
      visibility: trip.visibility as "private" | "shared",
      participants: trip.participants || []
    });
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingTrip(null);
    form.reset();
    setCoverImageFile(null);
    setCoverImagePreview(null);
  };

  const handleDeleteTrip = async () => {
    if (!deletingTrip) return;
    
    if (isOffline) {
      // Save delete as draft when offline
      try {
        await saveTripDraft({ id: deletingTrip.id }, 'delete', deletingTrip.id);
        setDeletingTrip(null);
        
        toast({
          title: "📤 Uložené offline",
          description: "Výprava sa zmaže automaticky po obnovení pripojenia",
          variant: "default",
        });
      } catch (error) {
        console.error('Failed to save delete draft:', error);
        toast({
          title: "❌ Chyba",
          description: "Nepodarilo sa uložiť operáciu offline",
          variant: "destructive",
        });
      }
    } else {
      deleteTripMutation.mutate(deletingTrip.id);
    }
  };

  // Sync pending trips when back online
  const syncPendingTrips = useCallback(async () => {
    if (isOffline || pendingTrips.length === 0 || isSyncing) return;
    
    setIsSyncing(true);
    
    for (const tripDraft of pendingTrips) {
      try {
        if (tripDraft.type === 'create') {
          const response = await apiRequest("POST", "/api/diary/trips", tripDraft.data);
          await response.json();
          await removeTripDraft(tripDraft.id);
          
          toast({
            title: "✅ Synchronizované",
            description: `Výprava "${tripDraft.data.name}" bola úspešne vytvorená`,
            variant: "success" as any,
          });
        } else if (tripDraft.type === 'update' && tripDraft.originalId) {
          const response = await apiRequest("PUT", `/api/diary/trips/${tripDraft.originalId}`, tripDraft.data);
          await response.json();
          await removeTripDraft(tripDraft.id);
          
          toast({
            title: "✅ Synchronizované",
            description: `Výprava "${tripDraft.data.name}" bola úspešne aktualizovaná`,
            variant: "success" as any,
          });
        } else if (tripDraft.type === 'delete' && tripDraft.originalId) {
          await apiRequest("DELETE", `/api/diary/trips/${tripDraft.originalId}`);
          await removeTripDraft(tripDraft.id);
          
          toast({
            title: "✅ Synchronizované",
            description: "Výprava bola úspešne zmazaná",
            variant: "success" as any,
          });
        }
        
        // Invalidate queries after successful sync
        queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
        queryClient.invalidateQueries({ queryKey: ["/api/diary/trip-limits"] });
      } catch (error) {
        console.error('Failed to sync trip:', error);
        toast({
          title: "❌ Chyba synchronizácie",
          description: `Nepodarilo sa synchronizovať výpravu z ${new Date(tripDraft.timestamp).toLocaleTimeString()}`,
          variant: "destructive",
        });
      }
    }
    
    setIsSyncing(false);
  }, [isOffline, pendingTrips, isSyncing, removeTripDraft, toast]);

  // Auto-sync when connection is restored
  useEffect(() => {
    if (!isOffline && pendingTrips.length > 0) {
      const timeout = setTimeout(() => {
        syncPendingTrips();
      }, 1000); // Wait 1s after reconnection
      return () => clearTimeout(timeout);
    }
  }, [isOffline, pendingTrips.length, syncPendingTrips]);

  // Calculate trip statistics
  const tripStats = useMemo(() => {
    const stats: Record<string, { catchCount: number; biggestCatch: { weight: string; fishType: string } | null }> = {};
    
    allCatches.forEach((catch_) => {
      if (!catch_.tripId) return;
      
      if (!stats[catch_.tripId]) {
        stats[catch_.tripId] = { catchCount: 0, biggestCatch: null };
      }
      
      stats[catch_.tripId].catchCount++;
      
      const weight = parseFloat(catch_.weight);
      if (!stats[catch_.tripId].biggestCatch || weight > parseFloat(stats[catch_.tripId].biggestCatch!.weight)) {
        stats[catch_.tripId].biggestCatch = {
          weight: catch_.weight,
          fishType: catch_.fishType
        };
      }
    });
    
    return stats;
  }, [allCatches]);

  // Split trips into active/planned and finished, sorted by date (newest first)
  const { activeAndPlannedTrips, finishedTrips, accessibleTripIds
  } = useMemo(() => {
    const now = new Date();
    const active: DiaryTrip[] = [];
    const finished: DiaryTrip[] = [];
    
    // Sort all trips by start date descending (newest first)
    const sortedTrips = [...trips].sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    
    // Filter by search query
    const query = searchQuery.toLowerCase().trim();
    const filteredTrips = query 
      ? sortedTrips.filter(trip => 
          trip.name.toLowerCase().includes(query) || 
          trip.location.toLowerCase().includes(query)
        )
      : sortedTrips;
    
    filteredTrips.forEach((trip) => {
      if (new Date(trip.endDate) >= now) {
        active.push(trip);
      } else {
        finished.push(trip);
      }
    });
    
    // For FREE users, only the last 3 trips (newest) are accessible
    // Active/planned trips are always accessible
    const accessibleIds = new Set<string>();
    
    if (isPremium) {
      // Premium users can access all trips
      sortedTrips.forEach(t => accessibleIds.add(t.id));
    } else {
      // FREE users: all active/planned trips + last 3 overall trips are accessible
      active.forEach(t => accessibleIds.add(t.id));
      sortedTrips.slice(0, FREE_ACCESSIBLE_TRIPS).forEach(t => accessibleIds.add(t.id));
    }
    
    return {
      activeAndPlannedTrips: active,
      finishedTrips: finished,
      accessibleTripIds: accessibleIds
    };
  }, [trips, isPremium, searchQuery]);
  
  // Check if a trip is locked for FREE users
  const isTripLocked = useCallback((tripId: string): boolean => {
    if (isPremium) return false;
    return !accessibleTripIds.has(tripId);
  }, [isPremium, accessibleTripIds]);
  
  // Handle click on locked trip
  const handleLockedTripClick = useCallback(() => {
    setIsPremiumModalOpen(true);
  }, []);

  // Trip form content - reusable for both Dialog and Drawer
  const TripFormContent = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Názov výpravy</FormLabel>
                <FormControl>
                  <Input placeholder="napr. Víkendová výprava na Dunaj" data-testid="input-trip-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Lokalita</FormLabel>
                <FormControl>
                  <LocationSearchField 
                    value={field.value} 
                    onChange={field.onChange}
                    testId="input-trip-location"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Začiatok výpravy</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          data-testid="button-start-date"
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: sk })
                          ) : (
                            <span>Vyberte dátum</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Koniec výpravy</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          data-testid="button-end-date"
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: sk })
                          ) : (
                            <span>Vyberte dátum</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <FormLabel>Titulná fotografia (voliteľné)</FormLabel>
            <div className="flex flex-col gap-4">
              <Input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                data-testid="input-cover-image"
              />
              {(coverImagePreview || editingTrip?.coverImageUrl) && (
                <div className="relative w-full h-32 md:h-48 rounded-lg overflow-hidden border">
                  <img
                    src={coverImagePreview || editingTrip?.coverImageUrl || ''}
                    alt="Náhľad titulnej fotografie"
                    className="w-full h-full object-cover"
                    data-testid="img-cover-preview"
                  />
                </div>
              )}
            </div>
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Poznámky (voliteľné)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Dodatočné informácie o výprave..."
                    data-testid="textarea-trip-notes"
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Viditeľnosť</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-trip-visibility">
                      <SelectValue placeholder="Vyberte viditeľnosť" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span>Súkromné - len vy</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="shared">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span>Zdieľané - viditeľné pre ostatných</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Účastníci (voliteľné)</FormLabel>
            <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
              <Plus className="w-4 h-4 mr-1" />
              Pridať
            </Button>
          </div>
          
          {form.watch("participants")?.map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <FormField
                control={form.control}
                name={`participants.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input 
                        placeholder="Meno účastníka"
                        data-testid={`input-participant-${index}`}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeParticipant(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={closeDialog}>
            Zrušiť
          </Button>
          <Button 
            type="submit" 
            disabled={createTripMutation.isPending || updateTripMutation.isPending}
            data-testid="button-submit-trip"
          >
            {editingTrip ? "Aktualizovať" : "Vytvoriť"} výpravu
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <DiaryLayout>
      <div className="space-y-6 pb-24 md:pb-0">
          {/* Page Header */}
          <div className="mb-2">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Moje Výpravy</h1>
              {(isOffline || isSyncing || (!isOffline && pendingTrips.length > 0)) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        {isOffline ? (
                          <Badge variant="destructive" className="h-6 w-6 p-0 flex items-center justify-center rounded-full" data-testid="badge-offline">
                            <WifiOff className="w-3 h-3" />
                          </Badge>
                        ) : isSyncing ? (
                          <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center rounded-full" data-testid="badge-syncing">
                            <Loader2 className="w-3 h-3 animate-spin" />
                          </Badge>
                        ) : pendingTrips.length > 0 ? (
                          <Badge variant="outline" className="h-6 px-2 flex items-center gap-1" data-testid="badge-pending">
                            <Upload className="w-3 h-3" />
                            <span className="text-xs">{pendingTrips.length}</span>
                          </Badge>
                        ) : null}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isOffline ? (
                        <p>Bez pripojenia - zmeny sa uložia lokálne</p>
                      ) : isSyncing ? (
                        <p>Synchronizujem zmeny...</p>
                      ) : (
                        <p>{pendingTrips.length} čakajúcich na synchronizáciu</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-muted-foreground">Plánuj, spravuj a uchovávaj svoje rybárske výpravy.</p>
          </div>

          {/* Hero Grid (2/3 + 1/3 Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Main Card: Trip Planner (2/3) */}
            <div className="col-span-1 md:col-span-2 bg-cyan-600 dark:bg-cyan-700 rounded-xl p-6 md:p-8 relative overflow-hidden flex flex-col justify-between min-h-[220px] md:min-h-[260px] shadow-xl group border border-cyan-400/20">
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-60 md:w-80 h-60 md:h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              <MapPin className="absolute -bottom-6 -right-6 w-32 md:w-48 h-32 md:h-48 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700" strokeWidth={1.75} />

              <div className="relative z-10 max-w-lg">
                <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-cyan-50 mb-3 md:mb-4 border border-white/10">
                  <CalendarIcon size={12} />
                  <span>Výpravy</span>
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3 leading-tight">
                  Kam vyrazíš najbližšie?
                </h2>
                <p className="text-cyan-50 font-medium text-base md:text-lg opacity-90">
                  Naplánuj novú výpravu alebo sa vráť k miestam, kde si už chytal.
                </p>
              </div>

              {/* Main action buttons */}
              <div className="relative z-10 flex flex-wrap gap-3 md:gap-4 mt-6 md:mt-8">
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={limits && !limits.canCreate}
                  className="bg-white text-cyan-900 font-bold px-5 md:px-6 py-3 md:py-3.5 rounded-full shadow-lg hover:shadow-xl hover:bg-slate-50 transition-all transform hover:-translate-y-1 h-auto"
                  data-testid="button-create-trip"
                >
                  <Plus size={20} strokeWidth={1.75} className="mr-2" />
                  <span>Nová výprava</span>
                </Button>

                {/* Secondary button with scroll UX */}
                <Button 
                  variant="ghost"
                  onClick={scrollToHistory}
                  className="group/hist backdrop-blur-md border border-white/20 text-white font-medium px-5 md:px-6 py-3 md:py-3.5 rounded-full hover:bg-white/10 transition-all h-auto"
                >
                  <History size={18} className="opacity-80 mr-2" />
                  <span>História výprav</span>
                  <ArrowDown size={14} className="ml-1 opacity-0 -translate-y-1 group-hover/hist:opacity-100 group-hover/hist:translate-y-0 transition-all text-cyan-200" />
                </Button>
              </div>
            </div>

            {/* Secondary Card: Checklist (1/3) */}
            <div className="col-span-1 bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6 md:p-8 flex flex-col justify-between hover:border-emerald-500/30 hover:bg-card/80 transition-all shadow-lg group relative overflow-hidden min-h-[200px] md:min-h-[260px]">
              <div className="absolute top-0 right-0 p-4 md:p-6 opacity-50 group-hover:opacity-100 transition-opacity">
                <div className="bg-emerald-500/10 p-2 md:p-3 rounded-xl border border-emerald-500/20">
                  <ClipboardCheck className="text-emerald-500 dark:text-emerald-400" size={24} />
                </div>
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 leading-tight pr-12">
                  Mám všetko zbalené?
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Rýchla kontrola výbavy pred odchodom k vode.
                  <span className="opacity-70 mt-1 block">Podberák, váha, náhradné baterky…</span>
                </p>
              </div>

              <Button 
                onClick={() => setIsChecklistOpen(true)}
                className="mt-4 md:mt-6 w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl font-bold transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                variant="ghost"
                data-testid="button-checklist"
              >
                <span>Skontrolovať výbavu</span>
              </Button>
            </div>
          </div>

          {/* Responsive Dialog (Desktop) / Drawer (Mobile) for trip form */}
          {isMobile ? (
            <Drawer open={isCreateDialogOpen || !!editingTrip} onOpenChange={(open) => !open && closeDialog()}>
              <DrawerContent className="max-h-[90vh] overflow-y-auto">
                <DrawerHeader className="text-left">
                  <DrawerTitle>
                    {editingTrip ? "Upraviť výpravu" : "Nová výprava"}
                  </DrawerTitle>
                  <DrawerDescription>
                    {editingTrip 
                      ? "Aktualizujte detaily výpravy."
                      : "Vytvorte novú rybársku výpravu."
                    }
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-6">
                  <TripFormContent />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={isCreateDialogOpen || !!editingTrip} onOpenChange={(open) => !open && closeDialog()}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTrip ? "Upraviť výpravu" : "Nová rybárska výprava"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTrip 
                      ? "Aktualizujte detaily vašej rybárskej výpravy."
                      : "Vytvorte novú rybársku výpravu a začnite zapisovať úlovky."
                    }
                  </DialogDescription>
                </DialogHeader>
                <TripFormContent />
              </DialogContent>
            </Dialog>
          )}

          {/* Freemium Limits Warning */}
          {limits && !limits.canCreate && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Dosiahli ste limit {limits.limit} výprav v rámci bezplatného plánu ({limits.currentCount}/{limits.limit}). 
                <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setLocation('/pricing')}>
                  Prejdite na Premium
                </Button> pre neobmedzený počet výprav.
              </AlertDescription>
            </Alert>
          )}

          {/* Scroll anchor for history */}
          <div id="trips-list-anchor" className="scroll-mt-6"></div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
              <List size={20} className="text-cyan-500" />
              {activeTab === "active" ? "Aktuálne a plánované výpravy" : "Archív výprav"}
              {activeTab === "active" && activeAndPlannedTrips.length > 0 && (
                <Badge variant="secondary" className="ml-1">{activeAndPlannedTrips.length}</Badge>
              )}
              {activeTab === "history" && finishedTrips.length > 0 && (
                <Badge variant="secondary" className="ml-1">{finishedTrips.length}</Badge>
              )}
            </h3>

            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  type="text"
                  placeholder="Hľadať výpravu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Tabs for switching between active and history */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "history")} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="active" className="flex items-center gap-2" data-testid="tab-active">
                <Clock className="w-4 h-4" />
                <span>Aktívne</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
                <FileText className="w-4 h-4" />
                <span>História</span>
              </TabsTrigger>
            </TabsList>

            {/* Loading state */}
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-muted rounded-xl animate-pulse">
                    <div className="h-32 bg-muted-foreground/10 rounded-t-xl" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-muted-foreground/10 rounded w-3/4" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-1/2" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : trips.length === 0 ? (
              /* First-time empty state */
              <div className="flex flex-col items-center justify-center py-16 md:py-20 px-4 text-center rounded-xl border-2 border-dashed border-border/50 bg-card/30">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-card rounded-full flex items-center justify-center mb-6 shadow-xl border border-border/50 relative">
                  <div className="absolute inset-0 rounded-full blur-xl opacity-20 bg-cyan-500"></div>
                  <Compass size={36} className="text-cyan-500 relative z-10" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                  Žiadne naplánované výpravy
                </h3>
                <p className="text-muted-foreground max-w-sm mb-6 md:mb-8 text-base md:text-lg leading-relaxed">
                  Voda volá! Naplánuj si termín, vyber revír a my ti postrážime počasie.
                </p>
                <Button 
                  size="lg"
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={limits && !limits.canCreate}
                  className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold px-6 md:px-8 py-3 md:py-4 rounded-full shadow-lg transition-all transform hover:-translate-y-1"
                  data-testid="button-create-first-trip"
                >
                  <Plus size={20} strokeWidth={1.75} className="mr-2" />
                  <span>Naplánovať prvú výpravu</span>
                </Button>
              </div>
            ) : (
              <>
                <TabsContent value="active" className="space-y-6 mt-0">
                  {activeAndPlannedTrips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 md:py-20 px-4 text-center rounded-xl border-2 border-dashed border-border/50 bg-card/30">
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-card rounded-full flex items-center justify-center mb-6 shadow-xl border border-border/50 relative">
                        <div className="absolute inset-0 rounded-full blur-xl opacity-20 bg-cyan-500"></div>
                        <Compass size={36} className="text-cyan-500 relative z-10" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                        Žiadne naplánované výpravy
                      </h3>
                      <p className="text-muted-foreground max-w-sm mb-6 md:mb-8 text-base md:text-lg leading-relaxed">
                        Voda volá! Naplánuj si termín, vyber revír a my ti postrážime počasie.
                      </p>
                      <Button 
                        onClick={() => setIsCreateDialogOpen(true)}
                        disabled={limits && !limits.canCreate}
                        className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold px-6 py-3 rounded-full shadow-lg transition-all transform hover:-translate-y-1"
                      >
                        <Plus size={20} strokeWidth={1.75} className="mr-2" />
                        <span>Nová výprava</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {activeAndPlannedTrips.map((trip) => (
                        <TripCard
                          key={trip.id}
                          trip={trip}
                          catchCount={tripStats[trip.id]?.catchCount || 0}
                          biggestCatch={tripStats[trip.id]?.biggestCatch || null}
                          onClick={() => setLocation(`/diary/trips/${trip.id}`)}
                          isLocked={isTripLocked(trip.id)}
                          onLockedClick={handleLockedTripClick}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-6 mt-0">
                  {finishedTrips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 md:py-20 px-4 text-center rounded-xl border-2 border-dashed border-border/50 bg-card/30">
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-card rounded-full flex items-center justify-center mb-6 shadow-xl border border-border/50 relative">
                        <div className="absolute inset-0 rounded-full blur-xl opacity-20 bg-purple-500"></div>
                        <History size={36} className="text-purple-500 relative z-10" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                        História zíva prázdnotou
                      </h3>
                      <p className="text-muted-foreground max-w-sm text-base md:text-lg leading-relaxed">
                        Tvoj denník je zatiaľ čistý. Všetky tvoje legendárne úlovky a spomienky sa uložia práve sem.
                      </p>
                    </div>
                  ) : (
                    <>
                      {!isPremium && finishedTrips.some(t => isTripLocked(t.id)) && (
                        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          <span>Posledné 3 výpravy sú prístupné. Staršie vyžadujú Premium.</span>
                        </div>
                      )}
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {finishedTrips.map((trip) => (
                          <TripCard
                            key={trip.id}
                            trip={trip}
                            catchCount={tripStats[trip.id]?.catchCount || 0}
                            biggestCatch={tripStats[trip.id]?.biggestCatch || null}
                            onClick={() => setLocation(`/diary/trips/${trip.id}`)}
                            isLocked={isTripLocked(trip.id)}
                            onLockedClick={handleLockedTripClick}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>

          {/* Mobile FAB - only for quick trip creation */}
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={limits && !limits.canCreate}
            className="md:hidden fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-2xl shadow-cyan-500/40 bg-cyan-500 hover:bg-cyan-400 text-white"
            size="icon"
            data-testid="fab-create-trip"
            aria-label="Nová výprava"
          >
            <Plus className="w-7 h-7" />
          </Button>

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!deletingTrip} onOpenChange={() => setDeletingTrip(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Zmazať výpravu</DialogTitle>
                <DialogDescription>
                  Naozaj chcete zmazať výpravu "{deletingTrip?.name}"? Táto akcia sa nedá vrátiť späť.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => setDeletingTrip(null)}>
                  Zrušiť
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteTrip}
                  disabled={deleteTripMutation.isPending}
                  data-testid="button-confirm-delete-trip"
                >
                  {deleteTripMutation.isPending ? "Maže sa..." : "Zmazať"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
      </div>

      {/* Premium Upsell Modal */}
      <PremiumUpsellModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        trigger="trip_history"
      />

      <ChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
      />
    </DiaryLayout>
  );
}