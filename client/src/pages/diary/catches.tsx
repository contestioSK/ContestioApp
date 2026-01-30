import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDiaryOffline } from "@/hooks/use-diary-offline";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
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
  SlidersHorizontal,
  Maximize2,
  LayoutGrid,
  List,
  Star,
  Sparkles,
  RotateCcw
} from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryCatch, DiaryTrip } from "@shared/schema";
import { getFishTypeLabel, getFishTypeOptions } from "@/utils/fishTypeMapping";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { SimplePhotoSlider } from "@/components/diary/SimplePhotoSlider";
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

// Function to format bait for mobile view - simplified format: Name (size)
const formatBaitShort = (bait?: string): string => {
  if (!bait) return 'N/A';
  
  // Extract size in parentheses if present (e.g., "(24mm)")
  const sizeMatch = bait.match(/\((\d+mm)\)/i);
  const size = sizeMatch ? sizeMatch[1] : null;
  
  // Try to extract just the product name - remove manufacturer prefixes and product lines
  // Common patterns: "Brand - Product Line - Name (size)" or "Brand Name (size)"
  let name = bait;
  
  // Remove size from the string for processing
  if (sizeMatch) {
    name = name.replace(sizeMatch[0], '').trim();
  }
  
  // If there are dashes, take the last meaningful part (usually the flavor/name)
  const parts = name.split(' - ').map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    // Take the last part as the name (usually the flavor)
    name = parts[parts.length - 1];
  }
  
  // Clean up extra spaces
  name = name.replace(/\s+/g, ' ').trim();
  
  // Reconstruct with size if available
  return size ? `${name} (${size})` : name;
};


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
  const [lightboxState, setLightboxState] = useState<{ photos: string[], currentIndex: number } | null>(null);
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
  const [showCompetitionCatches, setShowCompetitionCatches] = useState<boolean>(false);
  
  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('diaryViewMode');
      return saved === 'list' ? 'list' : 'grid';
    }
    return 'grid';
  });

  // Persist viewMode to localStorage
  useEffect(() => {
    localStorage.setItem('diaryViewMode', viewMode);
  }, [viewMode]);
  
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
      // Filter out competition catches by default (unless showCompetitionCatches is true)
      if (!showCompetitionCatches && catch_.source === 'competition') {
        return false;
      }
      
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

  // Check if any filters are active (for reset button visibility)
  const hasActiveFilters = selectedTechnique !== "all" || selectedFishType !== "all" || 
    selectedSpot !== "all" || dateRange?.from || searchQuery || minWeight || maxWeight;

  // Timeline grouping by month for Gallery view
  const groupedCatches = useMemo(() => {
    const groups: Record<string, DiaryCatch[]> = {};
    filteredCatches.forEach((catch_: any) => {
      const date = catch_.capturedAt ? new Date(catch_.capturedAt) : new Date();
      const key = date.toLocaleString('sk-SK', { month: 'long', year: 'numeric' });
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      if (!groups[capitalizedKey]) groups[capitalizedKey] = [];
      groups[capitalizedKey].push(catch_);
    });
    return groups;
  }, [filteredCatches]);

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
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-px w-16 bg-[#F97316]"></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F97316]">Galéria</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-4">
                  <TacticalIcon icon={Fish} variant="orange" size="lg" showLabel={false} />
                  <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-foreground leading-none">Moje úlovky</h1>
                </div>
                <p className="text-sm font-medium text-muted-foreground italic tracking-tight pl-0.5">
                  Spravujte svoje úlovky a sledujte úspechy
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={limits && !limits.canCreate}
                data-testid="button-add-catch"
              >
                <Plus className="w-4 h-4 mr-2" />
                Pridať úlovok
              </Button>
            </div>
          </header>

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
            const biggestFishCatch = nonHistoricalCatches.length > 0
              ? nonHistoricalCatches.reduce((max: any, c: any) => {
                  const weight = parseFloat(c.weight || '0') || 0;
                  const maxWeight = parseFloat(max?.weight || '0') || 0;
                  return weight > maxWeight ? c : max;
                }, nonHistoricalCatches[0])
              : null;
            const biggestFish = biggestFishCatch ? parseFloat(biggestFishCatch.weight || '0') || 0 : 0;
            const averageWeight = totalCount > 0 ? totalWeight / totalCount : 0;

            return (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-muted-foreground dark:text-slate-400 mb-3">Moja celková štatistika</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card className="bg-card border border-border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80" data-testid="card-total-count">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <TacticalIcon icon={Fish} variant="cyan" size="sm" showLabel={false} />
                        <div className="flex-1">
                          <div className="text-xs md:text-sm text-muted-foreground mb-1">Úlovky</div>
                          <div className="text-xl md:text-2xl font-mono font-medium text-[#F97316]" data-testid="text-total-count">{totalCount} ks</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={cn(
                      "bg-card border border-border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80",
                      biggestFishCatch && "cursor-pointer hover:scale-[1.02]"
                    )}
                    onClick={() => biggestFishCatch && setSelectedCatch(biggestFishCatch)}
                    data-testid="card-total-biggest"
                  >
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <TacticalIcon icon={Trophy} variant="amber" size="sm" showLabel={false} />
                        <div className="flex-1">
                          <div className="text-xs md:text-sm text-muted-foreground mb-1">Najväčšia ryba</div>
                          <div className="text-xl md:text-2xl font-mono font-medium text-[#F97316]" data-testid="text-total-biggest">{biggestFish.toFixed(1)} kg</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border border-border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80" data-testid="card-total-weight">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <TacticalIcon icon={Weight} variant="indigo" size="sm" showLabel={false} />
                        <div className="flex-1">
                          <div className="text-xs md:text-sm text-muted-foreground mb-1">Celková váha</div>
                          <div className="text-xl md:text-2xl font-mono font-medium text-[#F97316]" data-testid="text-total-weight">{totalWeight.toFixed(1)} kg</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card border border-border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80" data-testid="card-total-average">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-start gap-3 md:gap-4">
                        <TacticalIcon icon={Target} variant="purple" size="sm" showLabel={false} />
                        <div className="flex-1">
                          <div className="text-xs md:text-sm text-muted-foreground mb-1">Váhový priemer</div>
                          <div className="text-xl md:text-2xl font-mono font-medium text-[#F97316]" data-testid="text-total-average">{averageWeight.toFixed(2)} kg</div>
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
            {/* Mobile Filter Button - Only visible on mobile */}
            <div className="md:hidden">
              <Button 
                variant="outline" 
                className="w-full bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white justify-between"
                onClick={() => setIsFilterSheetOpen(true)}
                data-testid="button-open-filters"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtre a vyhľadávanie
                </span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-2 flex items-center justify-center text-xs">
                    {activeFilterCount} aktívne
                  </Badge>
                )}
              </Button>
            </div>

            {/* Desktop: Utility Bar with Search, View Toggle, Sort - Hidden on mobile */}
            <div className="hidden md:flex flex-col gap-4">
              {/* Top Row: Search + Utility Bar */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Hľadaj 'kapor 20kg', 'Domaša'..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-400 rounded-xl"
                    data-testid="input-search"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Utility Bar: View Toggle + Sort */}
                <div className="flex items-center gap-2 bg-muted dark:bg-slate-700/30 p-1 rounded-xl">
                  {/* View Toggle */}
                  <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        viewMode === 'list' 
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-600' 
                          : 'text-slate-400 hover:text-slate-600'
                      )}
                      title="Zoznam"
                      data-testid="view-mode-list"
                    >
                      <List size={16} />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        viewMode === 'grid' 
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-600' 
                          : 'text-slate-400 opacity-60 hover:text-slate-600 hover:opacity-100'
                      )}
                      title="Galéria"
                      data-testid="view-mode-grid"
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>

                  {/* Sort Dropdown */}
                  <button
                    onClick={() => setSortBy(sortBy === 'newest' ? 'heaviest' : sortBy === 'heaviest' ? 'oldest' : sortBy === 'oldest' ? 'lightest' : 'newest')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-slate-700 transition-all"
                    data-testid="button-sort-toggle"
                  >
                    <ArrowUpDown size={14} className="text-cyan-600" />
                    <span className="hidden lg:inline">
                      {sortBy === 'newest' ? 'Najnovšie' : sortBy === 'oldest' ? 'Najstaršie' : sortBy === 'heaviest' ? 'Najväčšie' : 'Najmenšie'}
                    </span>
                  </button>
                </div>

                {/* Season Filter */}
                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger className="w-[140px] bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white rounded-xl" data-testid="filter-season">
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
              </div>
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
            <SheetContent side="bottom" className="bg-card dark:bg-slate-800 border-t border-border dark:border-slate-700 text-foreground dark:text-white max-h-[85vh] overflow-y-auto">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-foreground dark:text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5" />
                  Filtre a vyhľadávanie
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 pb-6">
                {/* Search */}
                <div>
                  <label className="text-sm text-muted-foreground dark:text-slate-400 mb-2 block">Vyhľadávanie</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Hľadať v úlovkoch..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-400"
                      data-testid="mobile-input-search"
                    />
                  </div>
                </div>

                {/* Season and Sort Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground dark:text-slate-400 mb-2 block">Sezóna</label>
                    <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                      <SelectTrigger className="w-full bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white" data-testid="mobile-filter-season">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Všetky roky</SelectItem>
                        <SelectItem value="2025">Sezóna 2025</SelectItem>
                        <SelectItem value="2024">Sezóna 2024</SelectItem>
                        <SelectItem value="2023">Sezóna 2023</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-muted-foreground dark:text-slate-400 mb-2 block">Zoradiť</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full bg-muted dark:bg-slate-700/50 border text-foreground dark:text-white" data-testid="mobile-filter-sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Najnovšie</SelectItem>
                        <SelectItem value="oldest">Najstaršie</SelectItem>
                        <SelectItem value="heaviest">Najväčšie</SelectItem>
                        <SelectItem value="lightest">Najmenšie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

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

                {/* Competition catches toggle */}
                <div className="flex items-center justify-between py-3 px-1 border-t border-b">
                  <div>
                    <label className="text-sm font-medium text-foreground dark:text-white">Súťažné úlovky</label>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      Zobraziť úlovky importované zo súťaží
                    </p>
                  </div>
                  <Switch
                    checked={showCompetitionCatches}
                    onCheckedChange={setShowCompetitionCatches}
                    data-testid="switch-competition-catches"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-slate-600"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedSeason("2025");
                      setSortBy("newest");
                      setSelectedTechnique("all");
                      setSelectedFishType("all");
                      setSelectedSpot("all");
                      setMinWeight("");
                      setMaxWeight("");
                      setShowCompetitionCatches(false);
                    }}
                  >
                    Vyčistiť všetko
                  </Button>
                  <Button 
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={() => setIsFilterSheetOpen(false)}
                  >
                    Použiť filtre
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Catches Gallery with Timeline Grouping */}
          {filteredCatches.length > 0 ? (
            <div className="space-y-8">
              <AnimatePresence mode="wait">
                {Object.entries(groupedCatches).map(([dateGroup, items]) => (
                  <motion.div
                    key={dateGroup}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Timeline Header - Ghost style in List mode */}
                    <div className={cn(
                      "flex items-center gap-4",
                      viewMode === 'list' && "opacity-50"
                    )}>
                      <h2 className={cn(
                        "font-black uppercase tracking-widest text-muted-foreground dark:text-slate-500 whitespace-nowrap",
                        viewMode === 'list' ? 'text-[10px]' : 'text-xs'
                      )}>
                        {dateGroup}
                      </h2>
                      <div className="h-px w-full bg-slate-200 dark:bg-slate-700" />
                    </div>

                    {/* Grid View */}
                    {viewMode === 'grid' ? (
                      <motion.div
                        layout
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"
                      >
                        {items.map((catch_: any, index: number) => (
                          <motion.div
                            key={catch_.id || index}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setSelectedCatch(catch_)}
                            className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm hover:shadow-xl transition-shadow"
                            data-testid={`catch-card-${catch_.id || index}`}
                          >
                            {/* Photo */}
                            {catch_.photos && catch_.photos.length > 0 ? (
                              <img
                                src={catch_.photos[0].url || catch_.photos[0]}
                                alt={catch_.fishType ? getFishTypeLabel(catch_.fishType) : 'Úlovok'}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800">
                                <Fish size={48} strokeWidth={1} />
                              </div>
                            )}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                            {/* Top Badge - Weight or Length */}
                            <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-900 dark:text-white font-black px-2 py-1 rounded-lg text-sm shadow-lg">
                                {catch_.weight ? (
                                  <>{catch_.weight} <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase">kg</span></>
                                ) : catch_.lengthCm ? (
                                  <>{catch_.lengthCm} <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase">cm</span></>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                              {catch_.isFavorite && (
                                <div className="bg-amber-400 text-amber-900 p-1.5 rounded-full shadow-sm">
                                  <Star size={10} fill="currentColor" />
                                </div>
                              )}
                            </div>

                            {/* Bottom Content */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                              <h3 className="font-bold text-base truncate mb-0.5">
                                {catch_.fishType ? getFishTypeLabel(catch_.fishType) : 'Neznámy druh'}
                              </h3>
                              {catch_.nickname && (
                                <p className="text-sm text-cyan-200 italic truncate mb-1 leading-none">"{catch_.nickname}"</p>
                              )}
                              <p className="text-[10px] text-white/70 font-medium flex items-center gap-2 mt-1 border-t border-white/10 pt-2 truncate">
                                <span>{catch_.capturedAt ? format(new Date(catch_.capturedAt), "dd. MMM", { locale: sk }) : 'N/A'}</span>
                                <span>·</span>
                                <span className="truncate">{catch_.spot || 'N/A'}</span>
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      /* List View */
                      <motion.div layout className="space-y-2">
                        {items.map((catch_: any, index: number) => (
                          <motion.div
                            key={catch_.id || index}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setSelectedCatch(catch_)}
                            className="group flex items-center gap-3 p-3 bg-card dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-cyan-200 dark:hover:border-cyan-800 hover:shadow-md transition-all cursor-pointer"
                            data-testid={`catch-row-${catch_.id || index}`}
                          >
                            {/* Thumbnail */}
                            <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden relative shadow-inner">
                              {catch_.photos && catch_.photos.length > 0 ? (
                                <img
                                  src={catch_.photos[0].url || catch_.photos[0]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                                  <Fish size={20} />
                                </div>
                              )}
                              {catch_.isFavorite && (
                                <div className="absolute top-1 left-1 bg-amber-400 w-2 h-2 rounded-full ring-2 ring-white" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between">
                                <h3 className="font-bold text-foreground dark:text-white truncate text-sm leading-tight">
                                  {catch_.fishType ? getFishTypeLabel(catch_.fishType) : 'Neznámy druh'}
                                </h3>
                                <span className="font-black font-mono text-[#F97316] text-sm ml-2">
                                  {catch_.weight ? `${catch_.weight} kg` : catch_.lengthCm ? `${catch_.lengthCm} cm` : '—'}
                                </span>
                              </div>
                              {catch_.nickname && (
                                <div className="text-[11px] text-cyan-600 dark:text-cyan-400 italic truncate leading-none mt-0.5">
                                  "{catch_.nickname}"
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground dark:text-slate-400 font-medium">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon size={10} />
                                  {catch_.capturedAt ? format(new Date(catch_.capturedAt), "dd. MMM", { locale: sk }) : 'N/A'}
                                </span>
                                <span className="truncate">· {catch_.spot || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Edit Button - Hover */}
                            <div className="pl-2 border-l border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCatch(catch_);
                                }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Performance HUD - Scroll Indicator */}
              <div className="text-center text-[11px] font-medium text-muted-foreground dark:text-slate-500 py-4">
                Zobrazených <span className="font-bold text-foreground dark:text-white">{filteredCatches.length}</span> z {seasonFilteredCatches.length} úlovkov
              </div>
            </div>
          ) : (
            /* Empty State - Poetic */
            <div className="py-24 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-300 dark:text-slate-600">
                <Fish size={32} strokeWidth={1} />
              </div>
              <h3 className="text-lg font-bold text-foreground dark:text-white tracking-tight mb-2">
                Voda zatiaľ mlčí...
              </h3>
              <p className="text-muted-foreground dark:text-slate-400 text-sm mb-6 max-w-[280px] mx-auto leading-relaxed">
                {seasonFilteredCatches.length === 0 
                  ? "Zatiaľ nemáte v denníku žiadne úlovky. Čas to zmeniť!"
                  : "Pre zadanú kombináciu filtrov sme v denníku nenašli žiadnu jazdu."}
              </p>
              {seasonFilteredCatches.length === 0 ? (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-700 rounded-xl px-6"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Pridať prvý úlovok
                </Button>
              ) : hasActiveFilters && (
                <Button
                  onClick={() => {
                    setSelectedTechnique("all");
                    setSelectedFishType("all");
                    setSelectedSpot("all");
                    setDateRange(undefined);
                    setSearchQuery("");
                    setMinWeight("");
                    setMaxWeight("");
                  }}
                  variant="outline"
                  className="rounded-xl px-6 border-slate-200 dark:border-slate-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Zobraziť všetko
                </Button>
              )}
            </div>
          )}

          {/* Detail Panel - Editorial Design */}
          <Sheet open={!!selectedCatch} onOpenChange={() => setSelectedCatch(null)}>
            <SheetContent className="w-full sm:max-w-md p-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto" data-testid="catch-detail-panel">
              {selectedCatch && (
                <div className="flex flex-col min-h-full">
                  {/* Hero Photo Section */}
                  <div className="relative h-64 bg-slate-900">
                    {selectedCatch.photos && selectedCatch.photos.length > 0 ? (
                      <SimplePhotoSlider 
                        photos={selectedCatch.photos} 
                        onPhotoClick={(photo, index) => {
                          const photoUrls = (selectedCatch.photos || []).map((p: any) => 
                            typeof p === 'string' ? p : (p.variants?.find((v: any) => v.width === 800 && v.format === 'webp')?.url || p.url || p.originalUrl || '')
                          );
                          setLightboxState({ photos: photoUrls, currentIndex: index });
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center">
                        <Fish className="h-20 w-20 text-slate-700" strokeWidth={1} />
                      </div>
                    )}
                  </div>

                  {/* Content Body */}
                  <div className="flex-1 p-5 space-y-5">
                    {/* Weight & Length - Editorial Numbers */}
                    <div className="flex items-end gap-6 py-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Váha</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black font-mono text-[#F97316]" data-testid="detail-weight">
                            {selectedCatch.weight || '—'}
                          </span>
                          {selectedCatch.weight && <span className="text-sm text-muted-foreground">kg</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Dĺžka</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold font-mono text-foreground">
                            {selectedCatch.lengthCm || '—'}
                          </span>
                          {selectedCatch.lengthCm && <span className="text-sm text-muted-foreground">cm</span>}
                        </div>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="space-y-3">
                      {/* Spot */}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <MapPin size={14} strokeWidth={1.75} />
                          <span>Revír</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground text-sm">
                            {(selectedCatch as any).spotName || (selectedCatch as any).tripLocation || selectedCatch.spot || 'Neuvedené'}
                          </p>
                          {selectedCatch.spot && (selectedCatch as any).spotName && (
                            <p className="text-xs text-muted-foreground">{selectedCatch.spot}</p>
                          )}
                        </div>
                      </div>

                      {/* Bait */}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Target size={14} strokeWidth={1.75} />
                          <span>Nástraha</span>
                        </div>
                        <p className="font-semibold text-foreground text-sm">
                          {selectedCatch.bait || 'Neuvedené'}
                        </p>
                      </div>

                      {/* Date */}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <CalendarIcon size={14} strokeWidth={1.75} />
                          <span>Dátum</span>
                        </div>
                        <p className="font-semibold text-foreground text-sm">
                          {selectedCatch.capturedAt 
                            ? format(new Date(selectedCatch.capturedAt), "EEEE, d. MMM", { locale: sk })
                            : 'Neuvedené'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Notes */}
                    {selectedCatch.notes && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Poznámky</p>
                        <p className="text-sm text-foreground leading-relaxed font-serif">
                          {selectedCatch.notes}
                        </p>
                      </div>
                    )}

                    {/* Weather Conditions - Collapsible Style */}
                    {((selectedCatch.waterTemp !== null && selectedCatch.waterTemp !== undefined) || 
                      (selectedCatch.airTemp !== null && selectedCatch.airTemp !== undefined) || 
                      (selectedCatch.windSpeed !== null && selectedCatch.windSpeed !== undefined) || 
                      (selectedCatch.airPressure !== null && selectedCatch.airPressure !== undefined)) && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">Podmienky</p>
                        <div className="grid grid-cols-2 gap-3">
                          {(selectedCatch.waterTemp !== null && selectedCatch.waterTemp !== undefined) && (
                            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Voda</p>
                              <p className="font-mono font-medium text-[#F97316]" data-testid="detail-water-temp">{selectedCatch.waterTemp}°C</p>
                            </div>
                          )}
                          {(selectedCatch.airTemp !== null && selectedCatch.airTemp !== undefined) && (
                            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Vzduch</p>
                              <p className="font-mono font-medium text-[#F97316]" data-testid="detail-air-temp">{selectedCatch.airTemp}°C</p>
                            </div>
                          )}
                          {(selectedCatch.windSpeed !== null && selectedCatch.windSpeed !== undefined) && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Vietor</p>
                              <p className="font-mono font-medium text-foreground" data-testid="detail-wind-speed">{selectedCatch.windSpeed} km/h</p>
                            </div>
                          )}
                          {(selectedCatch.airPressure !== null && selectedCatch.airPressure !== undefined) && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Tlak</p>
                              <p className="font-mono font-medium text-foreground" data-testid="detail-air-pressure">{selectedCatch.airPressure} hPa</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* GPS Coordinates */}
                    {(selectedCatch.latitude || selectedCatch.longitude) && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">GPS Súradnice</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {selectedCatch.latitude && (
                            <div>
                              <p className="text-xs text-muted-foreground">Šírka</p>
                              <p className="font-mono font-medium text-[#F97316]">{Number(selectedCatch.latitude).toFixed(5)}°</p>
                            </div>
                          )}
                          {selectedCatch.longitude && (
                            <div>
                              <p className="text-xs text-muted-foreground">Dĺžka</p>
                              <p className="font-mono font-medium text-[#F97316]">{Number(selectedCatch.longitude).toFixed(5)}°</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-5 mt-auto space-y-3">
                      <Button 
                        variant="outline"
                        className="w-full h-11 border-slate-200 dark:border-slate-700"
                        onClick={() => {
                          setSelectedCatch(null);
                          setLocation(`/diary/catches/${selectedCatch.id}`);
                        }}
                        data-testid="button-view-full-page"
                      >
                        <Maximize2 className="w-4 h-4 mr-2" />
                        Zobraziť celú stránku
                      </Button>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
                        onClick={() => {
                          setEditingCatch(selectedCatch);
                          setSelectedCatch(null);
                        }}
                        data-testid="button-edit-catch"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Upraviť
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 h-11"
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
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Photo Lightbox with Navigation */}
          <Dialog open={!!lightboxState} onOpenChange={() => setLightboxState(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/90 border-0 [&>button]:text-white [&>button]:hover:bg-white/20" data-testid="photo-lightbox">
              <div className="relative flex items-center justify-center h-full">
                {/* Previous button */}
                {lightboxState && lightboxState.photos.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLightboxState(prev => prev ? {
                      ...prev,
                      currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.photos.length - 1
                    } : null)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full w-12 h-12"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
                
                {/* Current photo */}
                {lightboxState && (
                  <img 
                    src={lightboxState.photos[lightboxState.currentIndex]} 
                    alt={`Fotografia úlovku ${lightboxState.currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                )}
                
                {/* Next button */}
                {lightboxState && lightboxState.photos.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLightboxState(prev => prev ? {
                      ...prev,
                      currentIndex: prev.currentIndex < prev.photos.length - 1 ? prev.currentIndex + 1 : 0
                    } : null)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full w-12 h-12"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}
                
                {/* Photo counter */}
                {lightboxState && lightboxState.photos.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                    {lightboxState.currentIndex + 1} / {lightboxState.photos.length}
                  </div>
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
