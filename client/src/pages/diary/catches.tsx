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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorUtils";

import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Plus, 
  Fish, 
  Edit, 
  Trash2, 
  Camera,
  Users,
  Weight,
  Ruler,
  Clock,
  Award,
  AlertCircle,
  Filter,
  Search,
  Eye,
  Download,
  WifiOff,
  Loader2,
  Upload
} from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryCatch, InsertDiaryCatch, DiaryTrip } from "@shared/schema";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";
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
  method: z.string().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
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

export default function DiaryCatches() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<DiaryCatch | null>(null);
  const [deletingCatch, setDeletingCatch] = useState<DiaryCatch | null>(null);
  const [selectedCatch, setSelectedCatch] = useState<DiaryCatch | null>(null);
  const [activeTab, setActiveTab] = useState("recent");
  const [filterTrip, setFilterTrip] = useState<string>("all");
  const [filterFishType, setFilterFishType] = useState<string>("all");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
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
      method: "",
      notes: "",
      location: "",
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
    const processedData = {
      ...data,
      tripId: data.tripId === "none" ? undefined : data.tripId,
      method: data.method === "none" ? undefined : data.method
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
      method: "",
      notes: catch_.notes || "",
      location: "",
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

  // Filter catches based on active filters
  const filteredCatches = catches.filter(catch_ => {
    const tripMatch = filterTrip === "all" || 
      (filterTrip === "none" && !catch_.tripId) || 
      catch_.tripId === filterTrip;
    const fishTypeMatch = filterFishType === "all" || catch_.fishType === filterFishType;
    return tripMatch && fishTypeMatch;
  });

  // Group catches by date for better organization
  const catchesByDate = filteredCatches.reduce((acc, catch_) => {
    const date = format(new Date(catch_.capturedAt), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(catch_);
    return acc;
  }, {} as Record<string, DiaryCatch[]>);

  // Calculate statistics
  const totalCatches = catches.length;
  const totalWeight = catches.reduce((sum, catch_) => sum + parseFloat(catch_.weight), 0);
  const heaviestCatch = catches.reduce((max, catch_) => {
    const weight = parseFloat(catch_.weight);
    return weight > max ? weight : max;
  }, 0);
  const mostCommonFish = catches.reduce((acc, catch_) => {
    acc[catch_.fishType] = (acc[catch_.fishType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topFishType = Object.entries(mostCommonFish).sort(([,a], [,b]) => b - a)[0];

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">Úlovky</h1>
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
                      ? "Aktualizujte detaily vašeho úlovku."
                      : "Pridajte nový úlovok do vašeho rybárskeho denníka."
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
                                    className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                    data-testid="button-capture-date"
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP HH:mm", { locale: sk })
                                    ) : (
                                      <span>Vyberte dátum a čas</span>
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
                                  disabled={(date) => date > new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Váha (kg)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  placeholder="napr. 2.5" 
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
                              <FormLabel>Dĺžka (cm) - voliteľné</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  placeholder="napr. 45" 
                                  data-testid="input-length"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="fishType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Druh ryby</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                      <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Metóda (voliteľné)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-method">
                                  <SelectValue placeholder="Vyberte metódu" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Nevybrané</SelectItem>
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
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lokalita (voliteľné)</FormLabel>
                            <FormControl>
                              <Input placeholder="napr. Dunaj - Bratislava" data-testid="input-location" {...field} />
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
                            <FormLabel>Poznámky (voliteľné)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Dodatočné informácie o úlovku..."
                                data-testid="textarea-notes"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button type="button" variant="outline" onClick={closeDialog}>
                        Zrušiť
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createCatchMutation.isPending || updateCatchMutation.isPending}
                        data-testid="button-submit-catch"
                      >
                        {editingCatch ? "Aktualizovať" : "Pridať"} úlovok
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Freemium Limits Warning */}
          {limits && !limits.canCreate && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Dosiahli ste limit {limits.limit} úlovkov v rámci bezplatného plánu ({limits.currentCount}/{limits.limit}). 
                <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setLocation('/pricing')}>
                  Prejdite na Premium
                </Button> pre neobmedzený počet úlovkov.
              </AlertDescription>
            </Alert>
          )}

          {/* Statistics Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Fish className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{totalCatches}</div>
                <div className="text-sm text-muted-foreground">Celkom úlovkov</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Weight className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{totalWeight.toFixed(1)} kg</div>
                <div className="text-sm text-muted-foreground">Celková váha</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Award className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{heaviestCatch.toFixed(1)} kg</div>
                <div className="text-sm text-muted-foreground">Najťažší úlovok</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Fish className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-lg font-bold text-foreground truncate">
                  {topFishType ? getFishTypeLabel(topFishType[0]) : "—"}
                </div>
                <div className="text-sm text-muted-foreground">Najčastejšia ryba</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtre
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Select value={filterTrip} onValueChange={setFilterTrip}>
                    <SelectTrigger data-testid="filter-trip">
                      <SelectValue placeholder="Filtrovať podľa výpravy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všetky výpravy</SelectItem>
                      <SelectItem value="none">Bez výpravy</SelectItem>
                      {trips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id}>
                          {trip.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select value={filterFishType} onValueChange={setFilterFishType}>
                    <SelectTrigger data-testid="filter-fish-type">
                      <SelectValue placeholder="Filtrovať podľa druhu ryby" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všetky druhy rýb</SelectItem>
                      {fishTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Catches List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 animate-pulse">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCatches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Fish className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {catches.length === 0 ? "Zatiaľ nemáte žiadne úlovky" : "Žiadne úlovky nevyhovujú filtrom"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {catches.length === 0 
                    ? "Pridajte svoj prvý úlovok a začnite viesť rybársky denník."
                    : "Skúste upraviť filtre alebo pridajte nové úlovky."
                  }
                </p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={limits && !limits.canCreate}
                  data-testid="button-add-first-catch"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Pridať prvý úlovok
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(catchesByDate)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([date, dateCatches]) => (
                  <div key={date}>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      {format(new Date(date), "EEEE, d. MMMM yyyy", { locale: sk })}
                    </h3>
                    <div className="space-y-3">
                      {dateCatches.map((catch_) => (
                        <Card 
                          key={catch_.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setSelectedCatch(catch_)}
                          data-testid={`catch-card-${catch_.id}`}
                        >
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-foreground">
                                    {getFishTypeLabel(catch_.fishType)}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {catch_.angler.name}
                                  </p>
                                </div>
                                {catch_.verified && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Overené
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Weight className="w-4 h-4 text-muted-foreground" />
                                  <span>{catch_.weight} kg</span>
                                </div>
                                {catch_.lengthCm && (
                                  <div className="flex items-center gap-2">
                                    <Ruler className="w-4 h-4 text-muted-foreground" />
                                    <span>{catch_.lengthCm} cm</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span>{format(new Date(catch_.capturedAt), "HH:mm")}</span>
                                </div>
                              </div>


                              {catch_.notes && (
                                <div className="text-sm text-muted-foreground">
                                  <strong>Poznámky:</strong> {catch_.notes}
                                </div>
                              )}

                              <Separator />

                              <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => openEditDialog(catch_)}
                                    data-testid={`button-edit-catch-${catch_.id}`}
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Upraviť
                                  </Button>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  onClick={() => setDeletingCatch(catch_)}
                                  data-testid={`button-delete-catch-${catch_.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!deletingCatch} onOpenChange={() => setDeletingCatch(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Zmazať úlovok</DialogTitle>
                <DialogDescription>
                  Naozaj chcete zmazať tento úlovok? Táto akcia sa nedá vrátiť späť.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => setDeletingCatch(null)}>
                  Zrušiť
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteCatch}
                  disabled={deleteCatchMutation.isPending}
                  data-testid="button-confirm-delete-catch"
                >
                  {deleteCatchMutation.isPending ? "Maže sa..." : "Zmazať"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DiaryLayout>
  );
}