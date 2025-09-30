import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Fish, Plus, X, MapPin, Target, Ruler, Weight, Swords, Trophy, Crown, Play, Edit2, Trash2, CalendarIcon, CalendarDays, Camera } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DiaryLayout from "@/components/DiaryLayout";
import { getFishTypeLabel, getFishTypeOptions } from "@/utils/fishTypeMapping";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { showErrorToast } from "@/lib/errorUtils";
import type { DiaryCatch, DiaryTrip } from "@shared/schema";

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

// Quick start fishing form schema
const quickStartSchema = z.object({
  location: z.string().min(1, "Lokalita je povinná"),
  notes: z.string().optional(),
});

type QuickStartFormData = z.infer<typeof quickStartSchema>;

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

// Type for freemium limits response
type FreemiumLimits = {
  canCreate: boolean;
  currentCount: number;
  limit: number;
};

export default function DiaryIndex() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCatch, setSelectedCatch] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isStartFishingOpen, setIsStartFishingOpen] = useState(false);
  const [isCreateCatchOpen, setIsCreateCatchOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [catchToDelete, setCatchToDelete] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const { toast } = useToast();

  // Filters state
  const [selectedTechnique, setSelectedTechnique] = useState<string>("all");
  const [selectedFishType, setSelectedFishType] = useState<string>("all");
  const [selectedSpot, setSelectedSpot] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Load all catches for statistics
  const { data: allCatches = [] } = useQuery({
    queryKey: ['/api/diary/catches/all'],
    enabled: !!user?.id
  });

  // Check premium status
  const { data: premiumStatus, isLoading: premiumLoading } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id
  });

  const isPremium = premiumStatus?.isPremium || false;
  const maxPhotos = isPremium ? 5 : 1;

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

  // Filter catches for 2025 season (January 15, 2025 onwards)
  const season2025Catches = Array.isArray(allCatches) ? allCatches.filter((catch_: any) => {
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

  // Check if any filters are active
  const hasActiveFilters = selectedTechnique !== "all" || selectedFishType !== "all" || selectedSpot !== "all" || selectedDate !== undefined;

  // Display catches: show top 5 when no filters are active, otherwise show all filtered results
  const displayedCatches = hasActiveFilters ? filteredCatches : filteredCatches.slice(0, 5);

  // Get unique techniques and spots for filter dropdowns
  const uniqueTechniques = Array.from(new Set(season2025Catches.map((c: any) => c.bait).filter(Boolean)));
  const uniqueSpots = Array.from(new Set(season2025Catches.map((c: any) => c.spot).filter(Boolean)));

  // Calculate statistics from 2025 season catches
  const diaryStats = {
    totalCatches: season2025Catches.length,
    biggestFish: season2025Catches.length > 0 
      ? Math.max(...season2025Catches.map((c: any) => {
          const weight = parseFloat(c.weight || '0');
          return isNaN(weight) ? 0 : weight;
        }))
      : 0,
    daysAtWater: (() => {
      if (season2025Catches.length === 0) return 0;
      
      // Get unique dates (days) with catches
      const uniqueDates = new Set(
        season2025Catches.map((catch_: any) => {
          const date = new Date(catch_.capturedAt);
          return date.toDateString();
        })
      );
      
      return uniqueDates.size;
    })()
  };

  // Quick start fishing form
  const quickStartForm = useForm<QuickStartFormData>({
    resolver: zodResolver(quickStartSchema),
    defaultValues: {
      location: "",
      notes: "",
    }
  });

  // Catch form
  const catchForm = useForm<CatchFormData>({
    resolver: zodResolver(catchFormSchema),
    defaultValues: {
      angler: { name: "" },
      capturedAt: new Date(),
      weight: "",
      fishType: "kapor_supinac",
      bait: "",
      notes: "",
      spot: "",
      verified: false
    }
  });

  // Update form when user loads
  useEffect(() => {
    if (user && user.firstName) {
      catchForm.setValue('angler.name', `${user.firstName} ${user.lastName || ''}`.trim());
    }
  }, [user, catchForm]);

  // Create catch mutation
  const createCatchMutation = useMutation({
    mutationFn: async (data: CatchFormData) => {
      const response = await apiRequest("POST", "/api/diary/catches", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
      setIsCreateCatchOpen(false);
      setSelectedPhotos([]);
      catchForm.reset();
      toast({
        title: "Úlovok pridaný!",
        description: "Váš úlovok bol úspešne pridaný do denníka.",
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'catch');
    }
  });

  // Create quick trip mutation
  const createQuickTripMutation = useMutation({
    mutationFn: async (data: QuickStartFormData) => {
      const today = new Date();
      const tripData = {
        name: `Rybačka ${today.toLocaleDateString('sk-SK')}`,
        startDate: today.toISOString(),
        endDate: today.toISOString(),
        location: data.location,
        notes: data.notes || "",
        visibility: "private" as const,
        participants: []
      };
      const response = await apiRequest("POST", "/api/diary/trips", tripData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
      setIsStartFishingOpen(false);
      quickStartForm.reset();
      toast({
        title: "Rybačka začatá!",
        description: "Teraz môžete pridávať úlovky.",
      });
      setLocation("/diary/catches");
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa začať rybačku",
        variant: "destructive",
      });
    }
  });

  // Delete catch mutation
  const deleteCatchMutation = useMutation({
    mutationFn: async (catchId: string) => {
      await apiRequest("DELETE", `/api/diary/catches/${catchId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
      setSelectedCatch(null);
      setCatchToDelete(null);
      setDeleteDialogOpen(false);
      toast({
        title: "Úlovok zmazaný",
        description: "Úlovok bol úspešne odstránený z denníka.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa zmazať úlovok",
        variant: "destructive",
      });
    }
  });

  const handleQuickStart = (data: QuickStartFormData) => {
    createQuickTripMutation.mutate(data);
  };

  const handleCatchSubmit = async (data: CatchFormData) => {
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

    // Upload photos first if selected, then create catch
    let photoUrls: string[] = [];
    
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
        photoUrls = uploadResult.photos?.map((p: any) => p.url) || [];
      } catch (error) {
        console.error('Photo upload error:', error);
        toast({
          title: "Chyba pri nahrávaní fotiek",
          description: "Úlovok bude uložený bez fotiek",
          variant: "destructive",
        });
      }
    }

    const finalData = photoUrls.length > 0 
      ? { ...processedData, photos: photoUrls }
      : processedData;

    createCatchMutation.mutate(finalData);
  };

  const handleDeleteCatch = () => {
    if (catchToDelete) {
      deleteCatchMutation.mutate(catchToDelete);
    }
  };

  const openDeleteDialog = (catchId: string) => {
    setCatchToDelete(catchId);
    setDeleteDialogOpen(true);
  };

  const closeCreateCatchDialog = () => {
    setIsCreateCatchOpen(false);
    setSelectedPhotos([]);
    catchForm.reset();
  };

  return (
    <DiaryLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">
            Môj rybársky denník
          </h1>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setIsStartFishingOpen(true)}
              className="border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-100 hover:text-white transition-all"
              data-testid="button-start-fishing"
            >
              <Play className="w-4 h-4 mr-2" />
              Začať rybačku
            </Button>
            <Button 
              onClick={() => setIsCreateCatchOpen(true)}
              disabled={limits && !limits.canCreate}
              className="bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-500/50 transition-all"
              data-testid="button-add-catch"
            >
              <Plus className="w-4 h-4 mr-2" />
              Pridať Úlovok
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30" data-testid="card-season-catches">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Fish className="w-6 h-6 text-blue-300" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-300 mb-1">Úlovky (Sezóna 2025)</div>
                  <div className="text-3xl font-bold text-white" data-testid="text-total-catches">{diaryStats.totalCatches}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-emerald-500/30" data-testid="card-biggest-fish">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-600/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Weight className="w-6 h-6 text-emerald-300" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-300 mb-1">Najväčšia Ryba</div>
                  <div className="text-3xl font-bold text-white" data-testid="text-biggest-fish">
                    {diaryStats.biggestFish > 0 ? `${diaryStats.biggestFish.toFixed(1)} kg` : '0 kg'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30" data-testid="card-days-at-water">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-600/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-6 h-6 text-purple-300" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-300 mb-1">Dni Pri Vode (Sezóna 2025)</div>
                  <div className="text-3xl font-bold text-white" data-testid="text-days-at-water">{diaryStats.daysAtWater}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fishing Battle CTA */}
        <Card className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-600/30 mb-8" data-testid="card-battle-cta">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-600/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Swords className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">Fishing Battle</h3>
                    {!isPremium && (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-slate-300 text-sm">
                    Súťažte s karamátmi v priatelských rybárskych dueloch!
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {isPremium ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/diary/battle/archive")}
                      className="border-yellow-600/50 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-100"
                      data-testid="button-battle-archive"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Archív
                    </Button>
                    <Button
                      onClick={() => setLocation("/diary/battle/create")}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      data-testid="button-create-battle-cta"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Vytvoriť Battle
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setLocation("/diary/battle/paywall")}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    data-testid="button-unlock-battle"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Odomknúť PREMIUM
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
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
            {displayedCatches.length > 0 ? (
              displayedCatches.map((catch_: any, index: number) => (
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
                    onClick={() => setLocation("/diary/catches")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Pridať prvý úlovok
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View All Button - show when there are more than 5 catches total, regardless of filters */}
        {season2025Catches.length > 5 && (
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => setLocation("/diary/catches")}
              variant="outline"
              className="border text-slate-300 hover:bg-slate-700 hover:text-white"
              data-testid="button-view-all-catches"
            >
              Zobraziť všetky úlovky ({season2025Catches.length})
            </Button>
          </div>
        )}

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
                      onClick={() => setLightboxImage(selectedCatch.photos[0])}
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
                      const catchId = selectedCatch.id;
                      setSelectedCatch(null);
                      setLocation(`/diary/catches?edit=${catchId}`);
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
                      openDeleteDialog(selectedCatch.id);
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
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Naozaj chcete zmazať tento úlovok?</AlertDialogTitle>
              <AlertDialogDescription>
                Táto akcia je nenávratná. Úlovok bude trvalo odstránený z vášho denníka.
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

        {/* Create Catch Dialog */}
        <Dialog open={isCreateCatchOpen} onOpenChange={closeCreateCatchDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nový úlovok</DialogTitle>
              <DialogDescription>
                Pridajte nový úlovok do vášho rybárskeho denníka.
              </DialogDescription>
            </DialogHeader>

            <Form {...catchForm}>
              <form onSubmit={catchForm.handleSubmit(handleCatchSubmit, (errors) => {
                console.error('Form validation errors:', errors);
                toast({
                  title: "Chyba vo formulári",
                  description: "Prosím skontrolujte všetky povinné polia",
                  variant: "destructive"
                });
              })} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <FormField
                    control={catchForm.control}
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
                    control={catchForm.control}
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
                    <Input
                      type="file"
                      accept="image/*"
                      multiple={isPremium}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > maxPhotos) {
                          toast({
                            title: "Príliš veľa fotiek",
                            description: `Môžete nahrať maximálne ${maxPhotos} ${maxPhotos === 1 ? 'fotku' : 'fotiek'}.`,
                            variant: "destructive",
                          });
                          e.target.value = '';
                          return;
                        }
                        setSelectedPhotos(files);
                      }}
                      data-testid="input-photos"
                    />
                    {selectedPhotos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
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
                  </div>

                  <FormField
                    control={catchForm.control}
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
                    control={catchForm.control}
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
                            {getFishTypeOptions().map((option) => (
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
                      control={catchForm.control}
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
                      control={catchForm.control}
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
                    control={catchForm.control}
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
                    control={catchForm.control}
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
                    control={catchForm.control}
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
                    onClick={closeCreateCatchDialog}
                    className="flex-1"
                  >
                    Zrušiť
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createCatchMutation.isPending}
                    data-testid="button-submit-catch"
                  >
                    Pridať úlovok
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Quick Start Fishing Dialog */}
        <Dialog open={isStartFishingOpen} onOpenChange={setIsStartFishingOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-500" />
                Začať rybačku
              </DialogTitle>
              <DialogDescription>
                Rýchlo spustite jednodňovú rybačku. Stačí zadať lokalitu a môžete pridávať úlovky.
              </DialogDescription>
            </DialogHeader>
            <Form {...quickStartForm}>
              <form onSubmit={quickStartForm.handleSubmit(handleQuickStart)} className="space-y-4">
                <FormField
                  control={quickStartForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lokalita *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="napr. Dunaj - Bratislava" 
                            className="pl-10"
                            data-testid="input-quick-location"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={quickStartForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poznámka (voliteľné)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Napr. Prvý deň sezóny, krásne počasie..."
                          rows={3}
                          data-testid="input-quick-notes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsStartFishingOpen(false)}
                    className="flex-1"
                  >
                    Zrušiť
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={createQuickTripMutation.isPending}
                    data-testid="button-submit-quick-start"
                  >
                    {createQuickTripMutation.isPending ? "Vytváram..." : "Začať"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DiaryLayout>
  );
}
