import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDiaryOffline } from "@/hooks/use-diary-offline";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  X
} from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryCatch, InsertDiaryCatch, DiaryTrip } from "@shared/schema";
import { getFishTypeLabel, getFishTypeOptions } from "@/utils/fishTypeMapping";
import DiaryLayout from "@/components/DiaryLayout";

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

export default function DiaryCatches() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<DiaryCatch | null>(null);
  const [deletingCatch, setDeletingCatch] = useState<DiaryCatch | null>(null);
  const [selectedCatch, setSelectedCatch] = useState<DiaryCatch | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters state
  const [selectedTechnique, setSelectedTechnique] = useState<string>("all");
  const [selectedFishType, setSelectedFishType] = useState<string>("all");
  const [selectedSpot, setSelectedSpot] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
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
      // Save as draft when offline (with photo if available)
      try {
        const type = editingCatch ? 'update' : deletingCatch ? 'delete' : 'create';
        const originalId = editingCatch?.id || deletingCatch?.id;
        const catchDataWithPhoto = selectedPhoto ? { ...processedData, photo: selectedPhoto } : processedData;
        
        await saveCatchDraft(catchDataWithPhoto, type, originalId);
        
        setIsCreateDialogOpen(false);
        setEditingCatch(null);
        setSelectedPhoto(null);
        form.reset();
        
        toast({
          title: "Uložené offline",
          description: selectedPhoto 
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
      // Online - use normal mutations
      if (editingCatch) {
        updateCatchMutation.mutate(processedData);
      } else {
        createCatchMutation.mutate(processedData);
      }
    }
  };

  const openEditDialog = (catch_: DiaryCatch) => {
    setEditingCatch(catch_);
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
    setSelectedPhoto(null);
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
            <Dialog open={isCreateDialogOpen || !!editingCatch} onOpenChange={closeDialog}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={limits && !limits.canCreate}
                  data-testid="button-add-catch"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Pridať úlovok
                </Button>
              </DialogTrigger>
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
                      <FormField
                        control={form.control}
                        name="tripId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Výprava (voliteľné)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-trip">
                                  <SelectValue placeholder="Vyberte výpravu" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Bez výpravy</SelectItem>
                                {trips.map((trip) => (
                                  <SelectItem key={trip.id} value={trip.id}>
                                    {trip.name} - {format(new Date(trip.startDate), "d. MMM yyyy", { locale: sk })}
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
                        name="angler.name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rybár</FormLabel>
                            <FormControl>
                              <Input placeholder="Meno rybára" data-testid="input-angler-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Photo Upload */}
                      <div className="space-y-2">
                        <FormLabel>Fotka úlovku (voliteľné)</FormLabel>
                        <div className="flex items-center gap-4">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelectedPhoto(file);
                              }
                            }}
                            data-testid="input-photo"
                          />
                          {selectedPhoto && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              {selectedPhoto.name}
                            </Badge>
                          )}
                        </div>
                        {isOffline && (
                          <p className="text-xs text-muted-foreground">
                            Fotka sa uloží lokálne a odošle po obnovení pripojenia
                          </p>
                        )}
                      </div>

                      <FormField
                        control={form.control}
                        name="capturedAt"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Čas chytenia</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                    data-testid="button-capture-date"
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
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
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

                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={closeDialog}
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
          </div>

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
                  {/* Photo */}
                  {selectedCatch.photos && selectedCatch.photos.length > 0 && (
                    <div>
                      <img 
                        src={selectedCatch.photos[0]} 
                        alt="Fotografia úlovku"
                        className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => selectedCatch.photos && setLightboxImage(selectedCatch.photos[0])}
                        data-testid="catch-photo"
                      />
                    </div>
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
