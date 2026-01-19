import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDiaryOffline } from "@/hooks/use-diary-offline";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Fish, Plus, X, MapPin, Target, Ruler, Weight, Swords, Trophy, Crown, Play, Edit2, Trash2, CalendarIcon, CalendarDays, ChevronLeft, ChevronRight, Loader2, AlertCircle, Check, UserPlus, WifiOff, SlidersHorizontal } from "lucide-react";
import { useLocation, Link, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DiaryLayout from "@/components/DiaryLayout";
import CatchFormDialog from "@/components/diary/CatchFormDialog";
import FishingActionCard from "@/components/diary/FishingActionCard";
import SeasonOverviewCard from "@/components/diary/SeasonOverviewCard";
import { LocationSearchField } from "@/components/LocationSearchField";
import { TacticalIcon } from "@/components/ui/tactical-icon";
import { BookOpen } from "lucide-react";
import { getFishTypeLabel, getFishTypeOptions } from "@/utils/fishTypeMapping";
import { useState, useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DiaryCatch, DiaryTrip } from "@shared/schema";
import type { DateRange } from "react-day-picker";

// Function to get fish variant based on fish type - mapped to Contestio palette
const getFishVariant = (fishType?: string): "amber" | "emerald" | "purple" | "cyan" | "rose" | "orange" | "blue" => {
  if (!fishType) return "cyan";
  
  if (fishType.includes("kapor")) return "amber";
  if (fishType.includes("stuka")) return "emerald";
  if (fishType.includes("sumec")) return "purple";
  if (fishType.includes("amur")) return "cyan";
  if (fishType.includes("pstruh")) return "rose";
  if (fishType.includes("zubac")) return "orange";
  
  return "cyan"; // default
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
  let name = bait;
  
  // Remove size from the string for processing
  if (sizeMatch) {
    name = name.replace(sizeMatch[0], '').trim();
  }
  
  // If there are dashes, take the last meaningful part (usually the flavor/name)
  const parts = name.split(' - ').map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    name = parts[parts.length - 1];
  }
  
  // Clean up extra spaces
  name = name.replace(/\s+/g, ' ').trim();
  
  // Reconstruct with size if available
  return size ? `${name} (${size})` : name;
};

// Function to get catch thumbnail - photo or fish icon
const getCatchThumbnail = (catch_: any) => {
  // If catch has photos, show first photo thumbnail
  if (catch_.photos && catch_.photos.length > 0) {
    const firstPhoto = catch_.photos[0];
    
    // Get best thumbnail URL (prefer 400w variant)
    let thumbnailUrl = '';
    if (typeof firstPhoto === 'string') {
      thumbnailUrl = firstPhoto;
    } else {
      const webp400 = firstPhoto.variants?.find((v: any) => v.width === 400 && v.format === 'webp');
      const any400 = firstPhoto.variants?.find((v: any) => v.width === 400);
      thumbnailUrl = webp400?.url || any400?.url || firstPhoto.url;
    }
    
    return (
      <img 
        src={thumbnailUrl} 
        alt="Miniatúra úlovku" 
        className="w-full h-full object-cover rounded-lg"
      />
    );
  }
  
  // Otherwise show fish icon
  return getFishIcon(catch_.fishType);
};

// Photo type for carousel
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
    
    // Use main URL, fallback to originalUrl if url is empty or undefined
    return photo.url || photo.originalUrl || '';
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
                {photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt={`Fotografia úlovku ${index + 1}`}
                    className="w-full h-48 sm:h-64 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => status !== 'processing' && onPhotoClick(photoUrl)}
                    data-testid={`catch-photo-${index}`}
                  />
                ) : (
                  <div className="w-full h-48 sm:h-64 bg-muted flex items-center justify-center">
                    <Fish className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                )}
                {status === 'processing' && photoUrl && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Optimalizujem...</span>
                  </div>
                )}
                {status === 'processing' && !photoUrl && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                {status === 'failed' && (
                  <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-white" />
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

// Quick start fishing form schema
const quickStartSchema = z.object({
  location: z.string().min(1, "Lokalita je povinná"),
  notes: z.string().optional(),
});

type QuickStartFormData = z.infer<typeof quickStartSchema>;

// Type for freemium limits response
type FreemiumLimits = {
  canCreate: boolean;
  currentCount: number;
  limit: number;
};

export default function DiaryIndex() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [selectedCatch, setSelectedCatch] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isStartFishingOpen, setIsStartFishingOpen] = useState(false);
  const [isCreateCatchOpen, setIsCreateCatchOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<DiaryCatch | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [catchToDelete, setCatchToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const subscriptionSuccessHandled = useRef(false);

  // Handle Stripe subscription success redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(searchString);
    const subscriptionStatus = urlParams.get('subscription');
    
    if (subscriptionStatus === 'success' && !subscriptionSuccessHandled.current) {
      subscriptionSuccessHandled.current = true;
      
      // Immediately invalidate cache and refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/premium-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/subscription'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Show success toast
      toast({
        title: "🎉 Vitaj v Premium!",
        description: "Tvoje predplatné je aktívne. Užívaj si neobmedzený denník!",
      });
      
      // Clean URL (remove query param) without page reload
      window.history.replaceState({}, '', '/diary');
    }
  }, [searchString, toast]);

  // Sync status indicator
  const { isOffline, pendingTrips, pendingCatches } = useDiaryOffline();
  const hasPendingSync = pendingTrips.length > 0 || pendingCatches.length > 0;
  const pendingCount = pendingTrips.length + pendingCatches.length;

  // WebSocket connection for battle invitations
  useWebSocket((message) => {
    if (message.type === 'battle_invitation') {
      console.log('[Diary] Received battle invitation:', message);
      
      // Invalidate invitations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      
      // Show toast notification
      toast({
        title: "🎣 Nová výzva!",
        description: `${message.inviterName} vás pozval do battle: ${message.battleName}`,
      });
    }
  });

  // Filters state
  const [selectedTechnique, setSelectedTechnique] = useState<string>("all");
  const [selectedFishType, setSelectedFishType] = useState<string>("all");
  const [selectedSpot, setSelectedSpot] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

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
  const maxPhotos = isPremium ? 99 : 1; // Premium: unlimited (99), Free: 1

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

  // Fetch pending battle invitations
  interface BattleInvitation {
    id: string;
    battleId: string;
    invitedUserId: string;
    invitedByUserId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
    battle?: {
      name: string;
      type: 'tournament' | 'location' | 'trip';
      tripDate?: string;
    };
    invitedBy?: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  }

  const { data: invitations = [] } = useQuery<BattleInvitation[]>({
    queryKey: ['/api/diary/battles/invitations'],
    enabled: !!user
  });

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest('POST', `/api/diary/battles/invitations/${invitationId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles'] });
      toast({
        title: "Pozvánka prijatá",
        description: "Úspešne ste sa pridali do battle",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa prijať pozvánku",
        variant: "destructive",
      });
    },
  });

  // Reject invitation mutation
  const rejectInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest('POST', `/api/diary/battles/invitations/${invitationId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      toast({
        title: "Pozvánka odmietnutá",
        description: "Pozvánka bola odmietnutá",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odmietnuť pozvánku",
        variant: "destructive",
      });
    },
  });

  // Get current year for dynamic season
  const currentYear = new Date().getFullYear();

  // Filter catches for stats - exclude historical catches (they are just for archive/gallery)
  const nonHistoricalCatches = Array.isArray(allCatches) 
    ? allCatches.filter((catch_: any) => !catch_.isHistorical) 
    : [];

  // Filter catches for current season (January 15 of current year onwards)
  const seasonCatches = nonHistoricalCatches.filter((catch_: any) => {
    if (!catch_.capturedAt) return false;
    const catchDate = new Date(catch_.capturedAt);
    const seasonStart = new Date(`${currentYear}-01-15`);
    return catchDate >= seasonStart;
  });

  // Apply filters to ALL catches (table shows all, not just season)
  const allCatchesList = Array.isArray(allCatches) ? allCatches : [];
  const filteredCatches = allCatchesList.filter((catch_: any) => {
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
    
    return true;
  });

  // Check if any filters are active
  const hasActiveFilters = selectedTechnique !== "all" || selectedFishType !== "all" || selectedSpot !== "all" || dateRange?.from !== undefined;

  // Display catches: show top 5 when no filters are active, otherwise show all filtered results
  const displayedCatches = hasActiveFilters ? filteredCatches : filteredCatches.slice(0, 5);

  // Get unique techniques and spots for filter dropdowns (from all catches)
  const uniqueTechniques = Array.from(new Set(allCatchesList.map((c: any) => c.bait).filter(Boolean)));
  const uniqueSpots = Array.from(new Set(allCatchesList.map((c: any) => c.spot).filter(Boolean)));

  // Calculate statistics from current season catches
  const biggestCatchObject = seasonCatches.length > 0
    ? seasonCatches.reduce((max: any, current: any) => {
        const currentWeight = parseFloat(current.weight || '0');
        const maxWeight = parseFloat(max.weight || '0');
        return (isNaN(currentWeight) ? 0 : currentWeight) > (isNaN(maxWeight) ? 0 : maxWeight) ? current : max;
      })
    : null;

  // Calculate total weight for season
  const seasonTotalWeight = seasonCatches.reduce((sum: number, catch_: any) => {
    const weight = parseFloat(catch_.weight || '0');
    return sum + (isNaN(weight) ? 0 : weight);
  }, 0);

  const diaryStats = {
    totalCatches: seasonCatches.length,
    biggestFish: biggestCatchObject ? parseFloat(biggestCatchObject.weight || '0') : 0,
    biggestCatchId: biggestCatchObject?.id || null,
    totalWeight: seasonTotalWeight,
    averageWeight: seasonCatches.length > 0 ? seasonTotalWeight / seasonCatches.length : 0,
    daysAtWater: (() => {
      if (seasonCatches.length === 0) return 0;
      
      // Get unique dates (days) with catches
      const uniqueDates = new Set(
        seasonCatches.map((catch_: any) => {
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
    setEditingCatch(null);
  };

  const openEditDialog = (catch_: DiaryCatch) => {
    setEditingCatch(catch_);
    setSelectedCatch(null);
    setIsCreateCatchOpen(true);
  };

  return (
    <DiaryLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <TacticalIcon icon={BookOpen} variant="active" size="lg" showLabel={false} />
          <h1 className="text-xl md:text-3xl font-bold text-foreground dark:text-white">
            Môj rybársky denník
          </h1>
        </div>

        {/* Primary Action Card */}
        <div className="mb-6">
          <FishingActionCard
            onStartFishing={() => setIsStartFishingOpen(true)}
            onAddCatch={() => setIsCreateCatchOpen(true)}
            canAddCatch={!limits || limits.canCreate}
          />
        </div>

        {/* Gentle Premium Upgrade Banner for FREE users */}
        {!isPremium && !premiumLoading && (
          <Link href="/pricing" data-testid="link-premium-upgrade-banner">
            <div className="mb-6 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200/50 dark:border-amber-500/30 cursor-pointer hover:from-amber-100 hover:to-yellow-100 dark:hover:from-amber-900/30 dark:hover:to-yellow-900/30 transition-colors">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <span className="font-medium">Chceš plný prístup bez limitov?</span>
                  <span className="text-amber-600 dark:text-amber-400 ml-1">Aktivuj PREMIUM</span>
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* Season Overview Card */}
        <div className="mb-8">
          <SeasonOverviewCard
            year={currentYear}
            totalCatches={diaryStats.totalCatches}
            maxWeight={diaryStats.biggestFish}
            daysAtWater={diaryStats.daysAtWater}
          />
        </div>

        {/* Pending Battle Invitations */}
        {pendingInvitations.length > 0 && (
          <Card className="bg-[hsl(192,40%,14%)] border-[hsl(186,100%,45%)]/30 mb-8" data-testid="card-pending-invitations">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="w-5 h-5 text-[hsl(186,100%,45%)]" />
                <h3 className="text-lg font-bold text-foreground">
                  Čakajúce Battle pozvánky ({pendingInvitations.length})
                </h3>
              </div>
              
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => {
                  const getBattleTypeLabel = (type: string) => {
                    switch (type) {
                      case 'tournament':
                        return 'Turnaj';
                      case 'location':
                        return 'Lokalita';
                      case 'trip':
                        return 'Výlet';
                      default:
                        return type;
                    }
                  };

                  const getInviterName = (invitedBy?: { firstName: string | null; lastName: string | null; email: string }) => {
                    if (!invitedBy) return 'Používateľ';
                    if (invitedBy.firstName || invitedBy.lastName) {
                      return `${invitedBy.firstName || ''} ${invitedBy.lastName || ''}`.trim();
                    }
                    return invitedBy.email;
                  };

                  return (
                    <div
                      key={invitation.id}
                      className="p-4 rounded-lg bg-[hsl(192,52%,11%)] border border-[hsl(192,30%,20%)] hover:border-[hsl(186,100%,45%)]/50 transition-colors"
                      data-testid={`invitation-card-${invitation.id}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-foreground" data-testid={`invitation-sender-${invitation.id}`}>
                              {getInviterName(invitation.invitedBy)}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(186,100%,45%)]/20 text-[hsl(186,100%,45%)]" data-testid={`invitation-type-${invitation.id}`}>
                              {invitation.battle ? getBattleTypeLabel(invitation.battle.type) : 'Battle'}
                            </span>
                          </div>
                          <p className="text-foreground font-medium mb-1" data-testid={`invitation-name-${invitation.id}`}>
                            {invitation.battle?.name || 'Názov battle'}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`invitation-time-${invitation.id}`}>
                            {format(new Date(invitation.createdAt), "dd. MMM yyyy 'o' HH:mm", { locale: sk })}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,30%)] text-white"
                            onClick={() => acceptInvitationMutation.mutate(invitation.id)}
                            disabled={acceptInvitationMutation.isPending}
                            data-testid={`button-accept-invitation-${invitation.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Prijať
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[hsl(192,30%,20%)] hover:bg-[hsl(192,40%,14%)]"
                            onClick={() => rejectInvitationMutation.mutate(invitation.id)}
                            disabled={rejectInvitationMutation.isPending}
                            data-testid={`button-reject-invitation-${invitation.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Odmietnuť
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Catches Section */}
        <h2 className="text-sm font-medium text-slate-400 mb-3">Moje posledné úlovky</h2>
        
        {/* Mobile Filter Toggle Button */}
        <div className="md:hidden mb-4">
          <Button
            variant="outline"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="w-full bg-slate-700/50 border text-white hover:bg-slate-700/70 justify-between"
            data-testid="button-mobile-filters"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtre
            </span>
            {hasActiveFilters && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                Aktívne
              </span>
            )}
          </Button>
        </div>

        {/* Mobile Filters Sheet */}
        <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
          <SheetContent side="bottom" className="bg-slate-800 border-t border-slate-700 text-white h-auto max-h-[80vh] overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Filtre úlovkov
              </SheetTitle>
            </SheetHeader>
            
            <div className="space-y-4 pb-6">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Technika</label>
                <Select value={selectedTechnique} onValueChange={setSelectedTechnique}>
                  <SelectTrigger className="w-full bg-slate-700/50 border text-white" data-testid="mobile-filter-technique">
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
                <label className="text-sm text-slate-400 mb-2 block">Druh ryby</label>
                <Select value={selectedFishType} onValueChange={setSelectedFishType}>
                  <SelectTrigger className="w-full bg-slate-700/50 border text-white" data-testid="mobile-filter-fish-type">
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
                <label className="text-sm text-slate-400 mb-2 block">Revír</label>
                <Select value={selectedSpot} onValueChange={setSelectedSpot}>
                  <SelectTrigger className="w-full bg-slate-700/50 border text-white" data-testid="mobile-filter-spot">
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
                <label className="text-sm text-slate-400 mb-2 block">Obdobie</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-slate-700/50 border text-white hover:bg-slate-700/70",
                        !dateRange?.from && "text-slate-400"
                      )}
                      data-testid="mobile-filter-date"
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
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-3 pt-4">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedTechnique("all");
                      setSelectedFishType("all");
                      setSelectedSpot("all");
                      setDateRange(undefined);
                    }}
                    className="flex-1 text-slate-400 hover:text-white border-slate-600"
                    data-testid="mobile-button-clear-filters"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Zrušiť filtre
                  </Button>
                )}
                <Button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  data-testid="mobile-button-apply-filters"
                >
                  Použiť filtre
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Filters - Hidden on Mobile */}
        <div className="hidden md:flex flex-wrap gap-3 mb-4">
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
                  "w-[240px] justify-start text-left font-normal bg-slate-700/50 border text-white hover:bg-slate-700/70",
                  !dateRange?.from && "text-slate-400"
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

          {(selectedTechnique !== "all" || selectedFishType !== "all" || selectedSpot !== "all" || dateRange?.from) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedTechnique("all");
                setSelectedFishType("all");
                setSelectedSpot("all");
                setDateRange(undefined);
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
        <Card className="bg-white dark:bg-slate-800/50 border overflow-hidden">
          <CardContent className="p-0">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-5 gap-4 p-4 border-b text-xs font-semibold text-muted-foreground dark:text-slate-400 uppercase tracking-wider bg-muted/50 dark:bg-slate-700/30">
              <div>DRUH RYBY</div>
              <div>VÁHA / DĹŽKA</div>
              <div>REVÍR</div>
              <div>NÁVNADA/NÁSTRAHA</div>
              <div>DÁTUM</div>
            </div>
            
            {/* Table Rows */}
            {displayedCatches.length > 0 ? (
              displayedCatches.map((catch_: any, index: number) => (
                <div 
                  key={catch_.id || index} 
                  className="border-b hover:bg-muted/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedCatch(catch_)}
                  data-testid={`catch-row-${catch_.id || index}`}
                >
                  {/* Desktop Row */}
                  <div className="hidden md:grid grid-cols-5 gap-4 p-4 relative group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                        {getCatchThumbnail(catch_)}
                      </div>
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
                      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {getCatchThumbnail(catch_)}
                      </div>
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
                        <div className="text-foreground dark:text-white font-bold text-lg mb-2">
                          {catch_.weight ? `${catch_.weight} kg` : catch_.lengthCm ? `${catch_.lengthCm} cm` : 'N/A'}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground dark:text-slate-400">
                          <div>
                            <span className="text-muted-foreground/70 dark:text-slate-500">Revír:</span> {catch_.spotName || catch_.tripLocation || catch_.spot || 'N/A'}
                          </div>
                          <div>
                            <span className="text-muted-foreground/70 dark:text-slate-500">Nástraha:</span> {formatBaitShort(catch_.bait)}
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
                  {allCatchesList.length === 0 
                    ? "Zatiaľ nemáte žiadne úlovky" 
                    : "Žiadne úlovky nevyhovujú zvoleným filtrom"}
                </p>
                {allCatchesList.length === 0 && (
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
        {allCatchesList.length > 5 && (
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => setLocation("/diary/catches")}
              variant="outline"
              className="border text-muted-foreground dark:text-slate-300 hover:bg-muted dark:hover:bg-slate-700 hover:text-foreground dark:hover:text-white"
              data-testid="button-view-all-catches"
            >
              Zobraziť všetky úlovky ({allCatchesList.length})
            </Button>
          </div>
        )}

        {/* Detail Panel */}
        <Sheet open={!!selectedCatch} onOpenChange={() => setSelectedCatch(null)}>
          <SheetContent className="w-full sm:max-w-md bg-slate-800 border text-white overflow-y-auto" data-testid="catch-detail-panel">
            <SheetHeader className="pb-6">
              <SheetTitle className="text-white flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
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

                {/* GPS Coordinates */}
                {(selectedCatch.latitude || selectedCatch.longitude) && (
                  <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                    <div className="text-sm font-semibold text-slate-300 mb-3">📍 GPS Súradnice</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedCatch.latitude && (
                        <div>
                          <div className="text-slate-400">Zem. šírka</div>
                          <div className="font-medium">{Number(selectedCatch.latitude).toFixed(6)}°</div>
                        </div>
                      )}
                      {selectedCatch.longitude && (
                        <div>
                          <div className="text-slate-400">Zem. dĺžka</div>
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
                  <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                    <div className="text-sm font-semibold text-slate-300 mb-3">🌤️ Podmienky počasia</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {(selectedCatch.waterTemp !== null && selectedCatch.waterTemp !== undefined) && (
                        <div>
                          <div className="text-slate-400">Teplota vody</div>
                          <div className="font-medium">{selectedCatch.waterTemp}°C</div>
                        </div>
                      )}
                      {(selectedCatch.airTemp !== null && selectedCatch.airTemp !== undefined) && (
                        <div>
                          <div className="text-slate-400">Teplota vzduchu</div>
                          <div className="font-medium">{selectedCatch.airTemp}°C</div>
                        </div>
                      )}
                      {(selectedCatch.windSpeed !== null && selectedCatch.windSpeed !== undefined) && (
                        <div>
                          <div className="text-slate-400">Rýchlosť vetra</div>
                          <div className="font-medium">{selectedCatch.windSpeed} km/h</div>
                        </div>
                      )}
                      {(selectedCatch.airPressure !== null && selectedCatch.airPressure !== undefined) && (
                        <div>
                          <div className="text-slate-400">Tlak vzduchu</div>
                          <div className="font-medium">{selectedCatch.airPressure} hPa</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

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
                    onClick={() => openEditDialog(selectedCatch)}
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

        {/* Create/Edit Catch Dialog */}
        <CatchFormDialog
          isOpen={isCreateCatchOpen || !!editingCatch}
          onClose={closeCreateCatchDialog}
          editingCatch={editingCatch}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
            queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
          }}
        />

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
                        <LocationSearchField
                          value={field.value}
                          onChange={field.onChange}
                          testId="input-quick-location"
                        />
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
