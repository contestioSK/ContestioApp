import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDiaryOffline } from "@/hooks/use-diary-offline";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import type { DateRange } from "react-day-picker";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  Gauge,
  Search,
  ArrowUpDown,
  Trophy,
  SlidersHorizontal
} from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryCatch, DiaryTrip } from "@shared/schema";
import { getFishTypeLabel, getFishTypeOptions } from "@/utils/fishTypeMapping";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import CatchFormDialog from "@/components/diary/CatchFormDialog";
import HistoricalCatchFormDialog from "@/components/diary/HistoricalCatchFormDialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Clock } from "lucide-react";

// Type for freemium limits response
type FreemiumLimits = {
  canCreate: boolean;
  currentCount: number;
  limit: number;
};

// Function to get fish variant based on fish type - mapped to Contestio palette
const getFishVariant = (fishType?: string): "amber" | "emerald" | "purple" | "cyan" | "rose" | "orange" | "blue" => {
  if (!fishType) return "blue";
  
  if (fishType.includes("kapor")) return "amber";
  if (fishType.includes("stuka")) return "emerald";
  if (fishType.includes("sumec")) return "purple";
  if (fishType.includes("amur")) return "cyan";
  if (fishType.includes("pstruh")) return "rose";
  if (fishType.includes("zubac")) return "orange";
  
  return "blue"; // default
};

// Function to get fish icon based on fish type with color variant (hexagonal)
const getFishIcon = (fishType?: string) => {
  const variant = getFishVariant(fishType);
  return <TacticalIcon icon={Fish} variant={variant} size="sm" showLabel={false} />;
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
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Predchádzajúca fotka"
            data-testid="button-prev-photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Ďalšia fotka"
            data-testid="button-next-photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
      
      {/* Dots Indicator (only show if more than 1 photo) */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-3 mt-3">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "min-w-[44px] min-h-[44px] flex items-center justify-center",
              )}
              aria-label={`Zobraziť fotku ${index + 1}`}
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

      // Invalidate catches query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
    }
  });
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isHistoricalDialogOpen, setIsHistoricalDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "historical">("current");
  
  // Reset to current tab when historical catches is disabled
  useEffect(() => {
    if (!user?.preferences?.allowHistoricalCatches && activeTab === "historical") {
      setActiveTab("current");
    }
  }, [user?.preferences?.allowHistoricalCatches, activeTab]);

  const [editingCatch, setEditingCatch] = useState<DiaryCatch | null>(null);
  const [deletingCatch, setDeletingCatch] = useState<DiaryCatch | null>(null);
  const [selectedCatch, setSelectedCatch] = useState<DiaryCatch | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters state
  const [selectedTechnique, setSelectedTechnique] = useState<string>("all");
  const [selectedFishType, setSelectedFishType] = useState<string>("all");
  const [selectedSpot, setSelectedSpot] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [minWeight, setMinWeight] = useState<string>("");
  const [maxWeight, setMaxWeight] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedSeason, setSelectedSeason] = useState<string>("2025");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  
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

  // Check freemium limits
  const { data: limits } = useQuery<FreemiumLimits>({
    queryKey: ["/api/diary/catch-limits"],
    enabled: !!user
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
        title: "✅ Úlovok zmazaný!",
        description: "Úlovok bol úspešne zmazaný.",
        variant: "success" as any,
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'delete');
    }
  });

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingCatch(null);
  };

  const handleDeleteCatch = async () => {
    if (!deletingCatch) return;
    
    if (isOffline) {
      // Save delete as draft when offline
      try {
        await saveCatchDraft({ id: deletingCatch.id }, 'delete', deletingCatch.id);
        setDeletingCatch(null);
        
        toast({
          title: "📤 Uložené offline",
          description: "Úlovok sa zmaže automaticky po obnovení pripojenia",
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
                title: "❌ Chyba synchronizácie",
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
        setEditingCatch(catchToEdit);
        // Clear query parameter from URL using replaceState to avoid adding history entry
        window.history.replaceState({}, '', '/diary/catches');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, catches, editingCatch]);

  // First filter by tab (current vs historical)
  const tabFilteredCatches = Array.isArray(catches) ? catches.filter((catch_: any) => {
    if (activeTab === "historical") {
      return catch_.isHistorical === true;
    } else {
      return catch_.isHistorical !== true; // current catches (including undefined/null)
    }
  }) : [];

  // Count historical catches for badge
  const historicalCatchCount = Array.isArray(catches) 
    ? catches.filter((c: any) => c.isHistorical === true).length 
    : 0;

  // Filter catches by selected season (only for current catches)
  const seasonFilteredCatches = activeTab === "historical" 
    ? tabFilteredCatches // Don't apply season filter to historical
    : tabFilteredCatches.filter((catch_: any) => {
        if (!catch_.capturedAt) return false;
        if (selectedSeason === "all") return true;
        
        const catchDate = new Date(catch_.capturedAt);
        const seasonYear = parseInt(selectedSeason);
        const seasonStart = new Date(`${seasonYear}-01-15`);
        const seasonEnd = new Date(`${seasonYear + 1}-01-14`);
        return catchDate >= seasonStart && catchDate <= seasonEnd;
      });

  // Apply filters to catches
  const filteredCatches = seasonFilteredCatches
    .filter((catch_: any) => {
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
      
      // Filter by date range
      if (dateRange?.from) {
        const catchDate = new Date(catch_.capturedAt);
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (catchDate < fromDate || catchDate > toDate) {
            return false;
          }
        } else {
          // If only 'from' is selected, filter for that single day
          const singleDayEnd = new Date(fromDate);
          singleDayEnd.setHours(23, 59, 59, 999);
          if (catchDate < fromDate || catchDate > singleDayEnd) {
            return false;
          }
        }
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const searchableText = [
          catch_.notes || '',
          catch_.spot || '',
          catch_.bait || '',
          catch_.fishType ? getFishTypeLabel(catch_.fishType) : '',
          catch_.fishType || ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      // Filter by weight range
      const hasWeightFilter = minWeight || maxWeight;
      if (hasWeightFilter) {
        // Exclude catches without weight when weight filter is active
        // Allow 0 as valid weight, only exclude null, undefined, or non-numeric values
        if (catch_.weight === undefined || catch_.weight === null || typeof catch_.weight !== 'number' || Number.isNaN(catch_.weight)) {
          return false;
        }
        
        if (minWeight) {
          const min = parseFloat(minWeight);
          if (!isNaN(min) && catch_.weight < min) {
            return false;
          }
        }
        
        if (maxWeight) {
          const max = parseFloat(maxWeight);
          if (!isNaN(max) && catch_.weight > max) {
            return false;
          }
        }
      }
      
      return true;
    })
    .sort((a: any, b: any) => {
      // Sort catches
      switch (sortBy) {
        case 'newest':
          return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime();
        case 'oldest':
          return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
        case 'heaviest':
          return (b.weight || 0) - (a.weight || 0);
        case 'lightest':
          return (a.weight || 0) - (b.weight || 0);
        default:
          return 0;
      }
    });

  // Get unique techniques and spots for filter dropdowns
  const uniqueTechniques = Array.from(new Set(seasonFilteredCatches.map((c: any) => c.bait).filter(Boolean)));
  const uniqueSpots = Array.from(new Set(seasonFilteredCatches.map((c: any) => c.spot).filter(Boolean)));
  
  // Count active filters for mobile badge
  const activeFilterCount = [
    selectedTechnique !== "all",
    selectedFishType !== "all", 
    selectedSpot !== "all",
    dateRange?.from,
    minWeight || maxWeight
  ].filter(Boolean).length;

  // Loading state
  if (isLoading) {
    return (
      <DiaryLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground dark:text-slate-400">Načítavam úlovky...</p>
        </div>
      </DiaryLayout>
    );
  }

  return (
    <DiaryLayout>
      <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <TacticalIcon icon={Fish} variant="cyan" size="lg" showLabel={false} />
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

          <HistoricalCatchFormDialog
            isOpen={isHistoricalDialogOpen}
            onClose={() => setIsHistoricalDialogOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
            }}
          />

          {/* Tabs: Aktuálne / Historické - historical tab only visible if preference enabled */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "current" | "historical")} className="w-full">
            {user?.preferences?.allowHistoricalCatches && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <TabsList className="bg-slate-200 dark:bg-slate-800 h-auto p-1">
                <TabsTrigger 
                  value="current" 
                  className="data-[state=active]:bg-card data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 px-4 py-2"
                  data-testid="tab-current-catches"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Aktuálne
                </TabsTrigger>
                <TabsTrigger 
                  value="historical" 
                  className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400 px-4 py-2"
                  data-testid="tab-historical-catches"
                >
                  <History className="w-4 h-4 mr-2" />
                  Historické
                  {historicalCatchCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      {historicalCatchCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {activeTab === "historical" && (
                <Button 
                  onClick={() => setIsHistoricalDialogOpen(true)}
                  variant="outline"
                  className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  data-testid="button-add-historical-catch"
                >
                  <History className="w-4 h-4 mr-2" />
                  Pridať starší úlovok
                </Button>
              )}
            </div>
            )}

            {/* Historical catches info banner */}
            {activeTab === "historical" && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🕰️</span>
                  <div>
                    <h3 className="font-medium text-amber-700 dark:text-amber-400">Archív starších úlovkov</h3>
                    <p className="text-sm text-amber-600/80 dark:text-amber-300/80">
                      Tu sú úlovky z minulosti. Tieto záznamy sa <strong>nepočítajú</strong> do štatistík, súťaží ani odznakov.
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Total Statistics Panel - only for current catches */}
          {activeTab === "current" && (() => {
            const nonHistoricalCatches = Array.isArray(catches) ? catches.filter((c: any) => !c.isHistorical) : [];
            const totalCount = nonHistoricalCatches.length;
            const totalWeight = nonHistoricalCatches.reduce((sum: number, c: any) => {
              const weight = parseFloat(c.weight || '0');
              return sum + (isNaN(weight) ? 0 : weight);
            }, 0);
            const biggestFish = nonHistoricalCatches.length > 0
              ? Math.max(...nonHistoricalCatches.map((c: any) => parseFloat(c.weight || '0') || 0))
              : 0;
            const averageWeight = totalCount > 0 ? totalWeight / totalCount : 0;

            return (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-muted-foreground dark:text-slate-400 mb-3">Moja celková štatistika</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card className="bg-card border border-slate-200 shadow-sm dark:bg-transparent dark:bg-gradient-to-br dark:from-blue-600/20 dark:to-cyan-600/20 dark:border-blue-500/30 transition-all duration-200 hover:shadow-md dark:hover:from-blue-600/30 dark:hover:to-cyan-600/30 dark:hover:border-blue-400/50 dark:hover:shadow-blue-500/20" data-testid="card-total-count">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <TacticalIcon icon={Fish} variant="cyan" size="sm" showLabel={false} />
                        <div className="flex-1">
                          <div className="text-xs md:text-sm text-muted-foreground dark:text-slate-300 mb-1">Úlovky</div>
                          <div className="text-xl md:text-2xl font-bold text-teal-700 dark:text-white" data-testid="text-total-count">{totalCount} ks</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border border-slate-200 shadow-sm dark:bg-transparent dark:bg-gradient-to-br dark:from-emerald-600/20 dark:to-green-600/20 dark:border-emerald-500/30 transition-all duration-200 hover:shadow-md dark:hover:from-emerald-600/30 dark:hover:to-green-600/30 dark:hover:border-emerald-400/50 dark:hover:shadow-emerald-500/20" data-testid="card-total-biggest">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <TacticalIcon icon={Trophy} variant="amber" size="sm" showLabel={false} />
                        <div className="flex-1">
                          <div className="text-xs md:text-sm text-muted-foreground dark:text-slate-300 mb-1">Najväčšia ryba</div>
                          <div className="text-xl md:text-2xl font-bold text-amber-700 dark:text-white" data-testid="text-total-biggest">{biggestFish.toFixed(1)} kg</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border border-slate-200 shadow-sm dark:bg-transparent dark:bg-gradient-to-br dark:from-purple-600/20 dark:to-pink-600/20 dark:border-purple-500/30 transition-all duration-200 hover:shadow-md dark:hover:from-purple-600/30 dark:hover:to-pink-600/30 dark:hover:border-purple-400/50 dark:hover:shadow-purple-500/20" data-testid="card-total-weight">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <TacticalIcon icon={Weight} variant="indigo" size="sm" showLabel={false} />
                        <div className="flex-1">
                          <div className="text-xs md:text-sm text-muted-foreground dark:text-slate-300 mb-1">Celková váha</div>
                          <div className="text-xl md:text-2xl font-bold text-slate-700 dark:text-white" data-testid="text-total-weight">{totalWeight.toFixed(1)} kg</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border border-slate-200 shadow-sm dark:bg-transparent dark:bg-gradient-to-br dark:from-amber-600/20 dark:to-orange-600/20 dark:border-amber-500/30 transition-all duration-200 hover:shadow-md dark:hover:from-amber-600/30 dark:hover:to-orange-600/30 dark:hover:border-amber-400/50 dark:hover:shadow-amber-500/20" data-testid="card-total-average">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-start gap-3 md:gap-4">
                        <TacticalIcon icon={Target} variant="purple" size="sm" showLabel={false} />
                        <div className="flex-1">
                          <div className="text-xs md:text-sm text-muted-foreground dark:text-slate-300 mb-1">Váhový priemer</div>
                          <div className="text-xl md:text-2xl font-bold text-violet-700 dark:text-white" data-testid="text-total-average">{averageWeight.toFixed(2)} kg</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })()}

          {/* Filters */}
          <div className="space-y-4">
            {/* Search, Season and Sort Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-slate-400" />
                <Input
                  type="text"
                  placeholder="Hľadať v úlovkoch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-400"
                  data-testid="input-search"
                />
              </div>
              
              {/* Season Filter */}
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="w-full sm:w-[140px] bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white" data-testid="filter-season">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všetky roky</SelectItem>
                  <SelectItem value="2025">Sezóna 2025</SelectItem>
                  <SelectItem value="2024">Sezóna 2024</SelectItem>
                  <SelectItem value="2023">Sezóna 2023</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[160px] bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white" data-testid="filter-sort">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Najnovšie</SelectItem>
                  <SelectItem value="oldest">Najstaršie</SelectItem>
                  <SelectItem value="heaviest">Najväčšie</SelectItem>
                  <SelectItem value="lightest">Najmenšie</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Mobile Filter Button */}
              <Button 
                variant="outline" 
                className="md:hidden bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white"
                onClick={() => setIsFilterSheetOpen(true)}
                data-testid="button-open-filters"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filtre
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Desktop Filter Controls - Hidden on mobile */}
            <div className="hidden md:flex flex-wrap gap-3">
              <Select value={selectedTechnique} onValueChange={setSelectedTechnique}>
                <SelectTrigger className="w-full sm:w-[180px] bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white" data-testid="filter-technique">
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
                <SelectTrigger className="w-full sm:w-[180px] bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white" data-testid="filter-fish-type">
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
                <SelectTrigger className="w-full sm:w-[180px] bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white" data-testid="filter-spot">
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
                      "w-full sm:w-[240px] justify-start text-left font-normal bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white hover:bg-muted/80 dark:hover:bg-slate-700/70",
                      !dateRange?.from && "text-muted-foreground dark:text-slate-400"
                    )}
                    data-testid="filter-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        dateRange.from.getFullYear() === dateRange.to.getFullYear() 
                          ? `${format(dateRange.from, "dd. MMM", { locale: sk })} - ${format(dateRange.to, "dd. MMM yyyy", { locale: sk })}`
                          : `${format(dateRange.from, "dd. MMM yyyy", { locale: sk })} - ${format(dateRange.to, "dd. MMM yyyy", { locale: sk })}`
                      ) : (
                        format(dateRange.from, "dd. MMM yyyy", { locale: sk })
                      )
                    ) : (
                      "Vybrať obdobie"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <div className="flex gap-2 w-full sm:w-auto">
                <Input
                  type="number"
                  placeholder="Min kg"
                  value={minWeight}
                  onChange={(e) => setMinWeight(e.target.value)}
                  className="w-24 bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-400"
                  step="0.1"
                  min="0"
                  data-testid="input-min-weight"
                />
                <Input
                  type="number"
                  placeholder="Max kg"
                  value={maxWeight}
                  onChange={(e) => setMaxWeight(e.target.value)}
                  className="w-24 bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-400"
                  step="0.1"
                  min="0"
                  data-testid="input-max-weight"
                />
              </div>
            </div>

            {/* Active Filters & Results Counter */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Results counter */}
              <div className="text-sm text-muted-foreground dark:text-slate-400" data-testid="text-results-count">
                Nájdené: <span className="font-semibold text-foreground dark:text-white">{filteredCatches.length}</span> / {seasonFilteredCatches.length}
              </div>

              {/* Active filter badges */}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1" data-testid="badge-search-active">
                  <Search className="w-3 h-3" />
                  {searchQuery}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              {selectedTechnique !== "all" && (
                <Badge variant="secondary" className="gap-1" data-testid="badge-technique-active">
                  {selectedTechnique}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSelectedTechnique("all")}
                  />
                </Badge>
              )}
              {selectedFishType !== "all" && (
                <Badge variant="secondary" className="gap-1" data-testid="badge-fish-type-active">
                  {getFishTypeLabel(selectedFishType)}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSelectedFishType("all")}
                  />
                </Badge>
              )}
              {selectedSpot !== "all" && (
                <Badge variant="secondary" className="gap-1" data-testid="badge-spot-active">
                  <MapPin className="w-3 h-3" />
                  {selectedSpot}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSelectedSpot("all")}
                  />
                </Badge>
              )}
              {dateRange?.from && (
                <Badge variant="secondary" className="gap-1" data-testid="badge-date-active">
                  <CalendarIcon className="w-3 h-3" />
                  {dateRange.to 
                    ? `${format(dateRange.from, "dd.MM", { locale: sk })} - ${format(dateRange.to, "dd.MM.yy", { locale: sk })}`
                    : format(dateRange.from, "dd.MM.yyyy", { locale: sk })
                  }
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setDateRange(undefined)}
                  />
                </Badge>
              )}
              {(minWeight || maxWeight) && (
                <Badge variant="secondary" className="gap-1" data-testid="badge-weight-active">
                  <TacticalIconInline icon={Weight} variant="orange" size="sm" />
                  {minWeight && maxWeight ? `${minWeight}-${maxWeight}kg` : minWeight ? `>${minWeight}kg` : `<${maxWeight}kg`}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-destructive" 
                    onClick={() => {
                      setMinWeight("");
                      setMaxWeight("");
                    }}
                  />
                </Badge>
              )}

              {/* Clear all filters button */}
              {(selectedTechnique !== "all" || selectedFishType !== "all" || selectedSpot !== "all" || dateRange?.from || searchQuery || minWeight || maxWeight) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTechnique("all");
                    setSelectedFishType("all");
                    setSelectedSpot("all");
                    setDateRange(undefined);
                    setSearchQuery("");
                    setMinWeight("");
                    setMaxWeight("");
                  }}
                  className="text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white"
                  data-testid="button-clear-all-filters"
                >
                  <X className="w-4 h-4 mr-2" />
                  Vyčistiť všetky filtre
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Filter Sheet */}
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetContent side="bottom" className="bg-card dark:bg-slate-800 border-t border-border dark:border-slate-700 text-foreground dark:text-white max-h-[80vh] overflow-y-auto">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-foreground dark:text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5" />
                  Filtrovať úlovky
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground dark:text-slate-400 mb-2 block">Technika</label>
                  <Select value={selectedTechnique} onValueChange={setSelectedTechnique}>
                    <SelectTrigger className="w-full bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white">
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
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground dark:text-slate-400 mb-2 block">Druh ryby</label>
                  <Select value={selectedFishType} onValueChange={setSelectedFishType}>
                    <SelectTrigger className="w-full bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white">
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
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground dark:text-slate-400 mb-2 block">Revír</label>
                  <Select value={selectedSpot} onValueChange={setSelectedSpot}>
                    <SelectTrigger className="w-full bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white">
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
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground dark:text-slate-400 mb-2 block">Váhový rozsah</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min kg"
                      value={minWeight}
                      onChange={(e) => setMinWeight(e.target.value)}
                      className="flex-1 bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-400"
                      step="0.1"
                      min="0"
                    />
                    <Input
                      type="number"
                      placeholder="Max kg"
                      value={maxWeight}
                      onChange={(e) => setMaxWeight(e.target.value)}
                      className="flex-1 bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-400"
                      step="0.1"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedTechnique("all");
                      setSelectedFishType("all");
                      setSelectedSpot("all");
                      setMinWeight("");
                      setMaxWeight("");
                    }}
                  >
                    Vyčistiť
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => setIsFilterSheetOpen(false)}
                  >
                    Použiť filtre
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Catches Table */}
          <Card className="bg-card dark:bg-slate-800/50 border overflow-hidden">
            <CardContent className="p-0">
              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-5 gap-4 p-4 border-b text-xs font-semibold text-muted-foreground dark:text-slate-400 uppercase tracking-wider bg-muted dark:bg-slate-700/30">
                <div>DRUH RYBY</div>
                <div>VÁHA / DĹŽKA</div>
                <div>REVÍR</div>
                <div>NÁVNADA/NÁSTRAHA</div>
                <div>DÁTUM</div>
              </div>
              
              {/* Table Rows */}
              {filteredCatches.length > 0 ? (
                filteredCatches.map((catch_: any, index: number) => (
                  <div 
                    key={catch_.id || index} 
                    className="border-b hover:bg-muted dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedCatch(catch_)}
                    data-testid={`catch-row-${catch_.id || index}`}
                  >
                    {/* Desktop Row */}
                    <div className="hidden md:grid grid-cols-5 gap-4 p-4 relative group">
                      <div className="flex items-center gap-3">
                        {catch_.photos && catch_.photos.length > 0 ? (
                          <div className="w-10 h-10 bg-muted dark:bg-slate-600/50 rounded-lg flex items-center justify-center overflow-hidden">
                            <img 
                              src={catch_.photos[0].url || catch_.photos[0]} 
                              alt={catch_.fishType ? getFishTypeLabel(catch_.fishType) : 'Úlovok'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          getFishIcon(catch_.fishType)
                        )}
                        <div className="text-foreground dark:text-white font-medium">
                          {catch_.fishType ? getFishTypeLabel(catch_.fishType) : 'Neznámy druh'}
                        </div>
                      </div>
                      
                      <div className="text-foreground dark:text-white font-bold text-xl">
                        {catch_.weight ? `${catch_.weight} kg` : catch_.lengthCm ? `${catch_.lengthCm} cm` : 'N/A'}
                      </div>
                      
                      <div className="text-muted-foreground dark:text-slate-300">
                        {catch_.spot || 'Neznáme miesto'}
                      </div>
                      
                      <div className="text-muted-foreground dark:text-slate-300">
                        {catch_.bait || 'Neznáma'}
                      </div>
                      
                      <div className="text-muted-foreground dark:text-slate-300 flex items-center justify-between">
                        <span>{catch_.capturedAt ? format(new Date(catch_.capturedAt), "dd. MMM yyyy", { locale: sk }) : 'N/A'}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCatch(catch_);
                          }}
                          className="p-2 rounded-lg bg-muted dark:bg-slate-600/50 hover:bg-primary/20 text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors opacity-30 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-slate-800"
                          title="Upraviť"
                          data-testid={`button-edit-catch-${catch_.id || index}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="md:hidden p-4">
                      <div className="flex items-start gap-3">
                        {catch_.photos && catch_.photos.length > 0 ? (
                          <div className="w-12 h-12 bg-muted dark:bg-slate-600/50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <img 
                              src={catch_.photos[0].url || catch_.photos[0]} 
                              alt={catch_.fishType ? getFishTypeLabel(catch_.fishType) : 'Úlovok'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0">
                            {getFishIcon(catch_.fishType)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="text-foreground dark:text-white font-medium mb-1">
                              {catch_.fishType ? getFishTypeLabel(catch_.fishType) : 'Neznámy druh'}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCatch(catch_);
                              }}
                              className="p-2 rounded-lg bg-muted dark:bg-slate-600/50 hover:bg-primary/20 text-muted-foreground dark:text-slate-400 hover:text-primary transition-colors"
                              title="Upraviť"
                              data-testid={`button-edit-catch-mobile-${catch_.id || index}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-foreground dark:text-white font-bold text-lg mb-2 flex items-center gap-2">
                            {catch_.weight ? (
                              <>
                                <TacticalIconInline icon={Weight} variant="orange" size="sm" />
                                {catch_.weight} kg
                              </>
                            ) : catch_.lengthCm ? (
                              <>
                                <TacticalIconInline icon={Ruler} variant="blue" size="sm" />
                                {catch_.lengthCm} cm
                              </>
                            ) : 'N/A'}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground dark:text-slate-400">
                            <div>
                              <span className="text-muted-foreground/70 dark:text-slate-500">Miesto:</span> {catch_.spot || 'N/A'}
                            </div>
                            <div>
                              <span className="text-muted-foreground/70 dark:text-slate-500">Návnada/Nástraha:</span> {catch_.bait || 'N/A'}
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground/70 dark:text-slate-500">Dátum:</span> {catch_.capturedAt ? format(new Date(catch_.capturedAt), "dd. MMM yyyy", { locale: sk }) : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <TacticalIcon icon={Fish} variant="neutral" size="lg" showLabel={false} />
                  </div>
                  <p className="text-muted-foreground dark:text-slate-400 mb-4">
                    {seasonFilteredCatches.length === 0 
                      ? "Zatiaľ nemáte žiadne úlovky" 
                      : "Žiadne úlovky nevyhovujú zvoleným filtrom"}
                  </p>
                  {seasonFilteredCatches.length === 0 && (
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
            <SheetContent className="w-full sm:max-w-md bg-card dark:bg-slate-800 border text-foreground dark:text-white overflow-y-auto" data-testid="catch-detail-panel">
              <SheetHeader className="pb-6">
                <SheetTitle className="text-foreground dark:text-white flex items-center gap-3">
                  {getFishIcon(selectedCatch?.fishType)}
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
                      <TacticalIconInline icon={Weight} variant="orange" size="md" />
                      <div>
                        <div className="text-sm text-muted-foreground dark:text-slate-400">Váha</div>
                        <div className="font-semibold" data-testid="detail-weight">{selectedCatch.weight ? `${selectedCatch.weight} kg` : 'Neuvedené'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <TacticalIconInline icon={Ruler} variant="orange" size="md" />
                      <div>
                        <div className="text-sm text-muted-foreground dark:text-slate-400">Dĺžka</div>
                        <div className="font-semibold">{selectedCatch.lengthCm ? `${selectedCatch.lengthCm} cm` : 'Neuvedené'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <TacticalIconInline icon={MapPin} variant="emerald" size="md" />
                      <div>
                        <div className="text-sm text-muted-foreground dark:text-slate-400">Revír</div>
                        <div className="font-semibold">{selectedCatch.spot || 'Neuvedené'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <TacticalIconInline icon={Target} variant="purple" size="md" />
                      <div>
                        <div className="text-sm text-muted-foreground dark:text-slate-400">Nástraha</div>
                        <div className="font-semibold">{selectedCatch.bait || 'Neuvedené'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <TacticalIconInline icon={CalendarIcon} variant="indigo" size="md" />
                      <div>
                        <div className="text-sm text-muted-foreground dark:text-slate-400">Dátum úlovku</div>
                        <div className="font-semibold">
                          {selectedCatch.capturedAt ? format(new Date(selectedCatch.capturedAt), "EEEE, d. MMMM yyyy", { locale: sk }) : 'Neuvedené'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedCatch.notes && (
                    <div>
                      <div className="text-sm text-muted-foreground dark:text-slate-400 mb-2">Poznámky</div>
                      <div className="bg-muted dark:bg-slate-700/50 rounded-lg p-3 text-sm">
                        {selectedCatch.notes}
                      </div>
                    </div>
                  )}

                  {/* GPS Coordinates */}
                  {(selectedCatch.latitude || selectedCatch.longitude) && (
                    <div className="bg-muted/50 dark:bg-slate-700/30 rounded-lg p-4 space-y-2">
                      <div className="text-sm font-semibold text-foreground/80 dark:text-slate-300 mb-3">📍 GPS Súradnice</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedCatch.latitude && (
                          <div>
                            <div className="text-muted-foreground dark:text-slate-400">Zem. šírka</div>
                            <div className="font-medium">{Number(selectedCatch.latitude).toFixed(6)}°</div>
                          </div>
                        )}
                        {selectedCatch.longitude && (
                          <div>
                            <div className="text-muted-foreground dark:text-slate-400">Zem. dĺžka</div>
                            <div className="font-medium">{Number(selectedCatch.longitude).toFixed(6)}°</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Weather Conditions */}
                  {(selectedCatch.waterTemp !== null && selectedCatch.waterTemp !== undefined) || 
                   (selectedCatch.airTemp !== null && selectedCatch.airTemp !== undefined) || 
                   (selectedCatch.windSpeed !== null && selectedCatch.windSpeed !== undefined) || 
                   (selectedCatch.airPressure !== null && selectedCatch.airPressure !== undefined) ? (
                    <div className="border-t border-border dark:border-slate-700 pt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Cloud className="w-5 h-5 text-muted-foreground dark:text-slate-400" />
                        <div className="text-sm text-muted-foreground dark:text-slate-400">Podmienky počasia</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(selectedCatch.waterTemp !== null && selectedCatch.waterTemp !== undefined) && (
                          <div className="bg-muted dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-muted-foreground dark:text-slate-400 mb-1">
                              <Thermometer className="w-4 h-4" />
                              <span className="text-xs">Teplota vody</span>
                            </div>
                            <div className="font-semibold" data-testid="detail-water-temp">{selectedCatch.waterTemp}°C</div>
                          </div>
                        )}
                        {(selectedCatch.airTemp !== null && selectedCatch.airTemp !== undefined) && (
                          <div className="bg-muted dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-muted-foreground dark:text-slate-400 mb-1">
                              <Thermometer className="w-4 h-4" />
                              <span className="text-xs">Teplota vzduchu</span>
                            </div>
                            <div className="font-semibold" data-testid="detail-air-temp">{selectedCatch.airTemp}°C</div>
                          </div>
                        )}
                        {(selectedCatch.windSpeed !== null && selectedCatch.windSpeed !== undefined) && (
                          <div className="bg-muted dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-muted-foreground dark:text-slate-400 mb-1">
                              <Wind className="w-4 h-4" />
                              <span className="text-xs">Vietor</span>
                            </div>
                            <div className="font-semibold" data-testid="detail-wind-speed">{selectedCatch.windSpeed} km/h</div>
                          </div>
                        )}
                        {(selectedCatch.airPressure !== null && selectedCatch.airPressure !== undefined) && (
                          <div className="bg-muted dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-muted-foreground dark:text-slate-400 mb-1">
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
                        setEditingCatch(selectedCatch);
                        setSelectedCatch(null);
                      }}
                      data-testid="button-edit-catch"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Upraviť
                    </Button>
                    <div className="pt-4 border-t border-border dark:border-slate-700">
                      <Button 
                        variant="outline"
                        className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => {
                          setDeletingCatch(selectedCatch);
                          setSelectedCatch(null);
                        }}
                        data-testid="button-delete-catch"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Zmazať úlovok
                      </Button>
                    </div>
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
          </Tabs>
      </div>
    </DiaryLayout>
  );
}
