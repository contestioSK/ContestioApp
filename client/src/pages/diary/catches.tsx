import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  ArrowLeft,
  Weight,
  Ruler,
  Clock,
  Award,
  AlertCircle,
  Filter,
  Search,
  Eye,
  Download
} from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryCatch, InsertDiaryCatch, DiaryTrip } from "@shared/schema";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";

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
    "podustva", 
    "mrena", 
    "pstruh", 
    "jalec"
  ], {
    required_error: "Typ ryby je povinný"
  }),
  bait: z.string().optional(),
  spot: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  photos: z.array(z.instanceof(File)).max(5, "Maximálne 5 fotiek").optional(),
  notes: z.string().optional()
});

type CatchFormData = z.infer<typeof catchFormSchema>;

// Type for freemium limits response
type FreemiumLimits = {
  canCreate: boolean;
  currentCount: number;
  limit: number;
};

// Type for photo upload response
type PhotoUploadResponse = {
  id: string;
  originalName: string;
  url: string;
  variants: Array<{
    format: string;
    width: number;
    url: string;
  }>;
  placeholder: string;
  width: number;
  height: number;
};

// Helper function to upload photos
async function uploadPhotos(files: File[]): Promise<PhotoUploadResponse[]> {
  if (files.length === 0) return [];
  
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('photos', file);
  });
  
  const response = await fetch('/api/diary/photos/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chyba pri nahrávaní fotiek: ${errorText}`);
  }
  
  const result = await response.json();
  
  // Handle different response shapes flexibly
  let photos: PhotoUploadResponse[] = [];
  
  if (result.photos && Array.isArray(result.photos)) {
    // Standard response shape: { photos: [{ url, id, ... }] }
    photos = result.photos;
  } else if (result.urls && Array.isArray(result.urls)) {
    // Alternative shape: { urls: ["url1", "url2"] }
    photos = result.urls.map((url: string, index: number) => ({
      id: `temp-${index}`,
      originalName: files[index]?.name || `photo-${index}`,
      url,
      variants: [],
      placeholder: '',
      width: 0,
      height: 0
    }));
  } else if (Array.isArray(result)) {
    // Direct array response: ["url1", "url2"]
    photos = result.map((url: string, index: number) => ({
      id: `temp-${index}`,
      originalName: files[index]?.name || `photo-${index}`,
      url,
      variants: [],
      placeholder: '',
      width: 0,
      height: 0
    }));
  }
  
  // Validate that we have valid URLs
  const validPhotos = photos.filter(photo => 
    photo && typeof photo === 'object' && typeof photo.url === 'string' && photo.url.trim() !== ''
  );
  
  if (validPhotos.length === 0 && files.length > 0) {
    throw new Error('Server nevrátil žiadne platné URL fotiek');
  }
  
  return validPhotos;
}

export default function DiaryCatches() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<DiaryCatch | null>(null);
  const [deletingCatch, setDeletingCatch] = useState<DiaryCatch | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fishTypeFilter, setFishTypeFilter] = useState<string>("all");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Get tripId from URL params if present
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const urlTripId = urlParams.get('tripId');

  useEffect(() => {
    if (urlTripId) {
      setSelectedTrip(urlTripId);
    }
  }, [urlTripId]);

  // Fetch user's trips
  const { data: trips = [] } = useQuery<DiaryTrip[]>({
    queryKey: ["/api/diary/trips"],
    enabled: !!user
  });

  // Fetch catches (filtered by trip if selected)
  const { data: catches = [], isLoading } = useQuery<DiaryCatch[]>({
    queryKey: ["/api/diary/catches", selectedTrip || "all"],
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
      tripId: selectedTrip || undefined,
      angler: { name: user?.firstName + " " + user?.lastName || "" },
      capturedAt: new Date(),
      weight: "",
      fishType: "kapor_supinac" as const,
      bait: "",
      spot: "",
      latitude: undefined,
      longitude: undefined,
      photos: [],
      notes: ""
    }
  });

  // Create catch mutation
  const createCatchMutation = useMutation({
    mutationFn: async (data: CatchFormData) => {
      // First upload photos if any
      const uploadedPhotos = await uploadPhotos(data.photos || []);
      
      // Server will set userId and verified status
      const catchData = {
        ...data,
        angler: {
          name: data.angler.name
        },
        photos: uploadedPhotos.map(photo => photo.url) // Convert to URL strings
      };
      const response = await apiRequest("POST", "/api/diary/catches", catchData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
      handleCloseDialog(); // This clears selectedFiles and resets form
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
      // First upload new photos if any
      const uploadedPhotos = await uploadPhotos(data.photos || []);
      
      // Convert uploaded photos to URLs and combine with existing photos
      const newPhotoUrls = uploadedPhotos.map(photo => photo.url);
      const existingPhotoUrls = editingCatch?.photos || [];
      const allPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls];
      
      const updateData = {
        ...data,
        angler: {
          name: data.angler.name
        },
        photos: allPhotoUrls
      };
      const response = await apiRequest("PUT", `/api/diary/catches/${editingCatch!.id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches"] });
      handleCloseDialog(); // This clears selectedFiles and resets form
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
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
      setDeletingCatch(null);
      toast({
        title: "Úlovok zmazaný!",
        description: "Úlovok bol úspešne zmazaný z denníka.",
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'delete');
    }
  });

  const handleSubmit = (data: CatchFormData) => {
    if (editingCatch) {
      updateCatchMutation.mutate(data);
    } else {
      // Client-side freemium guard - prevent bypassing disabled button
      if (!canCreateCatch) {
        showErrorToast(toast, new Error('403: Dosiahli ste limit úlovkov'), 'catch');
        return;
      }
      createCatchMutation.mutate(data);
    }
  };

  const handleEdit = (catch_: DiaryCatch) => {
    setEditingCatch(catch_);
    form.reset({
      tripId: catch_.tripId || "",
      angler: { name: catch_.angler.name },
      capturedAt: new Date(catch_.capturedAt),
      weight: catch_.weight,
      lengthCm: catch_.lengthCm || undefined,
      fishType: catch_.fishType as any,
      bait: catch_.bait || "",
      spot: catch_.spot || "",
      latitude: catch_.latitude ? parseFloat(catch_.latitude.toString()) : undefined,
      longitude: catch_.longitude ? parseFloat(catch_.longitude.toString()) : undefined,
      photos: [], // Reset photos for editing
      notes: catch_.notes || ""
    });
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingCatch(null);
    setSelectedFiles([]);
    form.reset();
  };
  
  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    form.setValue('photos', newFiles);
  };


  // Filter catches based on search and filters
  const filteredCatches = catches.filter(catch_ => {
    const matchesSearch = searchTerm === "" || 
      catch_.angler.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      catch_.spot?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      catch_.bait?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFishType = fishTypeFilter === "all" || catch_.fishType === fishTypeFilter;
    
    return matchesSearch && matchesFishType;
  });

  // Enforce strict freemium gating - don't allow bypass during loading
  const canCreateCatch = limits?.canCreate === true;
  const isAtLimit = limits && !limits.canCreate;
  const limitsLoading = !limits;

  return (
    <div className="min-h-screen bg-background" data-testid="page-diary-catches">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/diary")}
              className="gap-2"
              data-testid="button-back-to-diary"
            >
              <ArrowLeft className="w-4 h-4" />
              Späť do denníka
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Úlovky</h1>
              <p className="text-muted-foreground">Spravujte svoje úlovky a sledujte rybárske úspechy</p>
            </div>
          </div>

          <Dialog 
            open={isCreateDialogOpen || !!editingCatch} 
            onOpenChange={(open) => {
              if (open) {
                setIsCreateDialogOpen(true);
              } else {
                handleCloseDialog();
              }
            }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span 
                    className="inline-flex" 
                    tabIndex={(!canCreateCatch || limitsLoading) ? 0 : -1}
                  >
                    <DialogTrigger asChild>
                      <Button 
                        className="gap-2"
                        disabled={!canCreateCatch}
                        data-testid="button-create-catch"
                      >
                        <Plus className="w-4 h-4" />
                        Nový úlovok
                      </Button>
                    </DialogTrigger>
                  </span>
                </TooltipTrigger>
                {!canCreateCatch && (
                  <TooltipContent>
                    <p>
                      {limitsLoading 
                        ? "Načítavam limity..." 
                        : `Dosiahli ste limit ${limits?.limit} úlovkov. Prejdite na PREMIUM pre neobmedzené úlovky.`
                      }
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCatch ? "Upraviť úlovok" : "Nový úlovok"}
                </DialogTitle>
                <DialogDescription>
                  {editingCatch ? "Aktualizujte informácie o úlovku" : "Pridajte nový úlovok do svojho rybárskeho denníka"}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Disable all form fields during submission */}
                  <fieldset disabled={createCatchMutation.isPending || updateCatchMutation.isPending} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="tripId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Výprava</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-trip">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte výpravu" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {trips.map((trip) => (
                              <SelectItem key={trip.id} value={trip.id}>
                                {trip.name} - {format(new Date(trip.startDate), "dd.MM.yyyy", { locale: sk })}
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
                          <Input placeholder="Meno rybára" {...field} data-testid="input-angler-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                                className="w-full pl-3 text-left font-normal"
                                data-testid="button-capture-time"
                              >
                                {field.value ? (
                                  format(field.value, "PPp", { locale: sk })
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
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
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
                              type="number" 
                              step="0.1" 
                              min="0" 
                              placeholder="napr. 2.5" 
                              {...field} 
                              data-testid="input-weight" 
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
                              min="0" 
                              placeholder="napr. 65" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-length" 
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
                        <FormLabel>Typ ryby</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-fish-type">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte typ ryby" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kapor_supinac">Kapor - šupináč</SelectItem>
                            <SelectItem value="kapor_lysec">Kapor - lysec</SelectItem>
                            <SelectItem value="amur">Amur</SelectItem>
                            <SelectItem value="sumec">Sumec</SelectItem>
                            <SelectItem value="zubac">Zubáč</SelectItem>
                            <SelectItem value="stuka">Šťuka</SelectItem>
                            <SelectItem value="pleskac">Pleskáč</SelectItem>
                            <SelectItem value="podustva">Podustva</SelectItem>
                            <SelectItem value="mrena">Mrena</SelectItem>
                            <SelectItem value="pstruh">Pstruh</SelectItem>
                            <SelectItem value="jalec">Jalec</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bait"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Návnada</FormLabel>
                          <FormControl>
                            <Input placeholder="napr. Boilies, kukurica" {...field} data-testid="input-bait" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="spot"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Miesto chytenia</FormLabel>
                          <FormControl>
                            <Input placeholder="napr. Sektor A, miesto 12" {...field} data-testid="input-spot" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* GPS Coordinates */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GPS šírka</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="any"
                              placeholder="napr. 48.1486"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              data-testid="input-latitude"
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
                          <FormLabel>GPS dĺžka</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="any"
                              placeholder="napr. 17.1077"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              data-testid="input-longitude"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Photo Upload */}
                  <FormField
                    control={form.control}
                    name="photos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fotografie úlovku (max 5)</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/gif"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              const existingPhotosCount = editingCatch?.photos?.length || 0;
                              const totalFiles = existingPhotosCount + selectedFiles.length + files.length;
                              
                              if (totalFiles > 5) {
                                toast({
                                  title: "Príliš veľa súborov",
                                  description: `Maximálne 5 fotografií. Už máte ${existingPhotosCount} existujúcich a ${selectedFiles.length} vybraných.`,
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              const newFiles = [...selectedFiles, ...files];
                              setSelectedFiles(newFiles);
                              field.onChange(newFiles);
                              // Clear the input value so same file can be selected again
                              e.target.value = '';
                            }}
                            data-testid="input-photos"
                          />
                        </FormControl>
                        <FormDescription>
                          Podporované formáty: JPEG, PNG, GIF. Maximálne 5 fotografií.
                        </FormDescription>
                        
                        {/* Photo Preview */}
                        {selectedFiles.length > 0 && (
                          <div className="mt-4">
                            <div className="text-sm font-medium mb-2">Vybrané fotografie:</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {selectedFiles.map((file, index) => {
                                const previewUrl = URL.createObjectURL(file);
                                return (
                                  <div key={index} className="relative group">
                                    <img
                                      src={previewUrl}
                                      alt={file.name}
                                      className="w-full h-20 object-cover rounded border"
                                      onLoad={() => URL.revokeObjectURL(previewUrl)}
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => removeFile(index)}
                                      data-testid={`button-remove-photo-${index}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b truncate">
                                      {file.name}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Existing Photos for Edit Mode */}
                        {editingCatch && editingCatch.photos && editingCatch.photos.length > 0 && (
                          <div className="mt-4">
                            <div className="text-sm font-medium mb-2">Existujúce fotografie:</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {editingCatch.photos.map((photoUrl, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={photoUrl}
                                    alt={`Fotografia ${index + 1}`}
                                    className="w-full h-20 object-cover rounded border"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b truncate">
                                    Fotografia {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
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
                            placeholder="Dodatočné poznámky o úlovku..."
                            className="resize-none"
                            {...field}
                            data-testid="textarea-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-catch">
                      Zrušiť
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={limitsLoading || !canCreateCatch || createCatchMutation.isPending || updateCatchMutation.isPending}
                      data-testid="button-save-catch"
                    >
                      {(createCatchMutation.isPending || updateCatchMutation.isPending) && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      )}
                      {editingCatch ? "Uložiť zmeny" : "Pridať úlovok"}
                    </Button>
                  </div>
                  </fieldset>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Freemium Limit Alert */}
        {isAtLimit && (
          <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              Dosiahli ste limit {limits.limit} úlovkov vo FREE verzii. 
              <Button variant="link" className="p-0 h-auto font-medium text-orange-600" data-testid="link-upgrade-premium">
                Prejdite na PREMIUM
              </Button> pre neobmedzené úlovky.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Celkové úlovky</CardTitle>
              <Fish className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{catches.length}</div>
              <p className="text-xs text-muted-foreground">
                {limits && `${limits.currentCount}/${limits.limit} použité`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Celková váha</CardTitle>
              <Weight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {catches.reduce((sum, catch_) => sum + parseFloat(catch_.weight), 0).toFixed(1)} kg
              </div>
              <p className="text-xs text-muted-foreground">Všetky úlovky</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Najväčší úlovok</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {catches.length > 0 
                  ? Math.max(...catches.map(c => parseFloat(c.weight))).toFixed(1) + " kg"
                  : "0 kg"
                }
              </div>
              <p className="text-xs text-muted-foreground">Najťažší úlovok</p>
            </CardContent>
          </Card>

          {/* Filters Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Input
                  placeholder="Hľadať..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8"
                  data-testid="input-search"
                />
              </div>
              <div>
                <Select value={fishTypeFilter} onValueChange={setFishTypeFilter} data-testid="select-fish-filter">
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všetky typy</SelectItem>
                    <SelectItem value="kapor_supinac">Kapor - šupináč</SelectItem>
                    <SelectItem value="kapor_lysec">Kapor - lysec</SelectItem>
                    <SelectItem value="amur">Amur</SelectItem>
                    <SelectItem value="sumec">Sumec</SelectItem>
                    <SelectItem value="zubac">Zubáč</SelectItem>
                    <SelectItem value="stuka">Šťuka</SelectItem>
                    <SelectItem value="pleskac">Pleskáč</SelectItem>
                    <SelectItem value="podustva">Podustva</SelectItem>
                    <SelectItem value="mrena">Mrena</SelectItem>
                    <SelectItem value="pstruh">Pstruh</SelectItem>
                    <SelectItem value="jalec">Jalec</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trip Filter */}
        {trips.length > 0 && (
          <div className="mb-6">
            <Select value={selectedTrip} onValueChange={setSelectedTrip} data-testid="select-trip-filter">
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Filtrovať podľa výpravy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Všetky výpravy</SelectItem>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.name} - {format(new Date(trip.startDate), "dd.MM.yyyy", { locale: sk })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Catches List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse" data-testid="skeleton-catch-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Weight and fish icon */}
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-muted rounded"></div>
                        <div className="h-5 bg-muted rounded w-20"></div>
                      </div>
                      {/* Angler name */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-3 h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-24"></div>
                      </div>
                    </div>
                    {/* Badges */}
                    <div className="flex gap-1">
                      <div className="h-5 bg-muted rounded w-16"></div>
                      {i % 3 === 0 && <div className="h-5 bg-muted rounded w-12"></div>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Date/time */}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-32"></div>
                    </div>
                    {/* Trip location */}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-28"></div>
                    </div>
                    {/* Additional details */}
                    {i % 2 === 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-20"></div>
                      </div>
                    )}
                    {/* Notes */}
                    {i % 3 === 1 && (
                      <div className="space-y-1">
                        <div className="h-3 bg-muted rounded w-full"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                      </div>
                    )}
                    {/* Photo skeleton */}
                    {i % 4 === 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-4 h-4 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-20"></div>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <div className="aspect-square bg-muted rounded"></div>
                          <div className="aspect-square bg-muted rounded"></div>
                          <div className="aspect-square bg-muted rounded"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Separator */}
                  <div className="h-px bg-muted my-4"></div>
                  {/* Action buttons */}
                  <div className="flex justify-end gap-2">
                    <div className="w-8 h-8 bg-muted rounded"></div>
                    <div className="w-8 h-8 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCatches.length === 0 ? (
          <Card className={`text-center ${catches.length === 0 ? 'py-16 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-dashed border-2' : 'py-12'}`}>
            <CardContent>
              {catches.length === 0 ? (
                /* Enhanced empty state for first-time users */
                <>
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Fish className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="absolute -top-2 -right-4 w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                      <Camera className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">
                    Zaznamenajte svoj prvý úlovok
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                    Pridajte úlovok do svojho denníka s hmotnosťou, druhou kapra, miestom chytenia a fotkami. 
                    Sledujte svoj pokrok a vytvárajte si spomienky na najlepšie chvíle pri vode.
                  </p>
                  
                  <div className="space-y-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span 
                            className="inline-flex" 
                            tabIndex={(!canCreateCatch || limitsLoading) ? 0 : -1}
                          >
                            <Button 
                              onClick={() => setIsCreateDialogOpen(true)} 
                              disabled={!canCreateCatch}
                              size="lg"
                              className="gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                              data-testid="button-create-first-catch"
                            >
                              <Plus className="w-5 h-5" />
                              Pridať prvý úlovok
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!canCreateCatch && (
                          <TooltipContent>
                            <p>
                              {limitsLoading 
                                ? "Načítavam limity..." 
                                : `Dosiahli ste limit ${limits?.limit} úlovkov. Prejdite na PREMIUM pre neobmedzené úlovky.`
                              }
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    
                    <p className="text-sm text-muted-foreground">
                      📸 Môžete pridať až 5 fotiek k úlovku
                    </p>
                  </div>
                </>
              ) : (
                /* Simple no-results state for filtered searches */
                <>
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    Žiadne výsledky
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Skúste zmeniť filtre alebo vyhľadávací termín.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    💡 Tip: Skúste hľadať podľa typu kapra alebo hmotnosti
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatches.map((catch_) => {
              const trip = trips.find(t => t.id === catch_.tripId);

              return (
                <Card key={catch_.id} className="hover:shadow-md transition-shadow" data-testid={`card-catch-${catch_.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Fish className="w-5 h-5" />
                          {parseFloat(catch_.weight).toFixed(1)} kg
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Users className="w-3 h-3" />
                          {catch_.angler.name}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {getFishTypeLabel(catch_.fishType)}
                        </Badge>
                        {catch_.verified && (
                          <Badge variant="default" className="text-xs">
                            <Award className="w-3 h-3 mr-1" />
                            Overený
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(catch_.capturedAt), "dd.MM.yyyy HH:mm", { locale: sk })}
                        </span>
                      </div>

                      {trip && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span className="line-clamp-1">{trip.name}</span>
                        </div>
                      )}

                      {catch_.lengthCm && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Ruler className="w-4 h-4" />
                          <span>{catch_.lengthCm} cm</span>
                        </div>
                      )}

                      {catch_.bait && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-4 h-4 rounded-full bg-yellow-500 flex-shrink-0"></div>
                          <span className="line-clamp-1">{catch_.bait}</span>
                        </div>
                      )}

                      {catch_.spot && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span className="line-clamp-1">{catch_.spot}</span>
                        </div>
                      )}

                      {catch_.notes && (
                        <div className="text-sm text-muted-foreground">
                          <p className="line-clamp-2">{catch_.notes}</p>
                        </div>
                      )}
                      
                      {/* Photo Gallery */}
                      {catch_.photos && catch_.photos.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Camera className="w-4 h-4" />
                            <span>{catch_.photos.length} fotografi{catch_.photos.length === 1 ? 'a' : 'í'}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {catch_.photos.slice(0, 3).map((photoUrl, index) => (
                              <div key={index} className="relative aspect-square">
                                <img
                                  src={photoUrl}
                                  alt={`Fotografia ${index + 1}`}
                                  className="w-full h-full object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setLightboxPhoto(photoUrl)}
                                  data-testid={`thumbnail-photo-${catch_.id}-${index}`}
                                />
                                {index === 2 && catch_.photos && catch_.photos.length > 3 && (
                                  <div 
                                    className="absolute inset-0 bg-black/50 rounded border flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors"
                                    onClick={() => setLightboxPhoto(photoUrl)}
                                  >
                                    <span className="text-white text-sm font-medium">+{catch_.photos ? catch_.photos.length - 3 : 0}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator className="my-4" />

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(catch_)}
                        data-testid={`button-edit-catch-${catch_.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingCatch(catch_)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-catch-${catch_.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Photo Lightbox Dialog */}
      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <div className="relative">
            <img
              src={lightboxPhoto || ""}
              alt="Detail fotografie"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
              data-testid="lightbox-photo"
            />
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white"
              onClick={() => setLightboxPhoto(null)}
              data-testid="button-close-lightbox"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingCatch} onOpenChange={() => setDeletingCatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmazať úlovok</DialogTitle>
            <DialogDescription>
              Naozaj chcete zmazať tento úlovok? Táto akcia je nevratná.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeletingCatch(null)} data-testid="button-cancel-delete-catch">
              Zrušiť
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingCatch && deleteCatchMutation.mutate(deletingCatch.id)}
              disabled={deleteCatchMutation.isPending}
              data-testid="button-confirm-delete-catch"
            >
              {deleteCatchMutation.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              )}
              Zmazať úlovok
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}