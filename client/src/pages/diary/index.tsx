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
import { Fish, Plus, X, MapPin, Target, Ruler, Weight, Swords, Trophy, Crown, Play, Edit2, Trash2, CalendarIcon, CalendarDays, ChevronLeft, ChevronRight, Loader2, AlertCircle, Check, UserPlus, WifiOff, SlidersHorizontal, Star, Maximize2 } from "lucide-react";
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
import { SimplePhotoSlider } from "@/components/diary/SimplePhotoSlider";
import { PhotoLightbox } from "@/components/diary/PhotoLightbox";
import { CatchDetailSheet } from "@/components/diary/CatchDetailSheet";
import { LocationSearchField } from "@/components/LocationSearchField";
import { TacticalIcon } from "@/components/ui/tactical-icon";
import { BookOpen } from "lucide-react";
import { getFishTypeLabel, getFishTypeOptions } from "@/utils/fishTypeMapping";
import { useState, useCallback, useEffect, useRef } from "react";
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
  const [lightboxState, setLightboxState] = useState<{ photos: string[], currentIndex: number } | null>(null);
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
        description: `${message.inviterName} ťa pozval do battle: ${message.battleName}`,
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

  // Filter catches for current season (January 1 of current year onwards)
  const seasonCatches = nonHistoricalCatches.filter((catch_: any) => {
    if (!catch_.capturedAt) return false;
    const catchDate = new Date(catch_.capturedAt);
    const seasonStart = new Date(`${currentYear}-01-01`);
    return catchDate >= seasonStart;
  });

  // Calculate year-to-date comparison with same period last year
  const today = new Date();
  const lastYear = currentYear - 1;
  
  // Same period last year: Jan 1 to same day/month last year
  const lastYearStart = new Date(`${lastYear}-01-01`);
  const lastYearSameDate = new Date(lastYear, today.getMonth(), today.getDate(), 23, 59, 59);
  
  const lastYearSamePeriodCatches = nonHistoricalCatches.filter((catch_: any) => {
    if (!catch_.capturedAt) return false;
    const catchDate = new Date(catch_.capturedAt);
    return catchDate >= lastYearStart && catchDate <= lastYearSameDate;
  });

  // Calculate percentage change (only if we have last year data to compare)
  const lastYearCount = lastYearSamePeriodCatches.length;
  const currentCount = seasonCatches.length;
  // Only show trend if we have data from last year to compare
  const trendPercentage = lastYearCount > 0 
    ? Math.round(((currentCount - lastYearCount) / lastYearCount) * 100)
    : null; // null = no comparison data available

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
  const displayedCatches = hasActiveFilters ? filteredCatches : filteredCatches.slice(0, 4);

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
        description: "Teraz môžeš pridávať úlovky.",
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
        {/* Header with personalized greeting */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-px w-16 bg-[#F97316]"></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F97316]">Rybársky denník</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <TacticalIcon icon={BookOpen} variant="orange" size="lg" showLabel={false} />
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-foreground leading-none">
                  {(() => {
                    const onboardingCompleted = user?.preferences?.onboardingCompleted;
                    const hasCatches = diaryStats.totalCatches > 0;
                    const displayName = user?.firstName || user?.lastName || '';
                    
                    if (!onboardingCompleted) {
                      return "Vitaj";
                    } else if (!hasCatches) {
                      return "Vitaj";
                    } else {
                      return displayName ? `Vitaj, ${displayName}` : "Vitaj";
                    }
                  })()}
                </h1>
              </div>
              <p className="text-sm font-medium text-muted-foreground italic tracking-tight pl-0.5">
                Tvoj rybársky denník • Sezóna {currentYear}
              </p>
            </div>
          </div>
        </header>

        {/* Primary Actions Row: Action Card (2/3) + Season Overview (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Fishing Action Card - Takes 2/3 on desktop */}
          <div className="lg:col-span-2">
            <FishingActionCard
              onStartFishing={() => setIsStartFishingOpen(true)}
              onAddCatch={() => setIsCreateCatchOpen(true)}
              canAddCatch={!limits || limits.canCreate}
            />
          </div>
          
          {/* Season Overview Card - Takes 1/3 on desktop */}
          <SeasonOverviewCard
            year={currentYear}
            totalCatches={diaryStats.totalCatches}
            maxWeight={diaryStats.biggestFish}
            daysAtWater={diaryStats.daysAtWater}
            trendPercentage={trendPercentage}
            biggestCatchId={diaryStats.biggestCatchId}
          />
        </div>

        {/* Gentle Premium Upgrade Banner for FREE users */}
        {!isPremium && !premiumLoading && (
          <Link href="/pricing" data-testid="link-premium-upgrade-banner">
            <div className="mb-6 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-500/30 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
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

        {/* Catches Grid Gallery */}
        {displayedCatches.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {displayedCatches.map((catch_: any, index: number) => (
              <div
                key={catch_.id || index}
                onClick={() => setSelectedCatch(catch_)}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
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
              </div>
            ))}
          </div>
        ) : (
          /* Empty State - Poetic */
          <div className="py-16 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-300 dark:text-slate-600">
              <Fish size={32} strokeWidth={1} />
            </div>
            <h3 className="text-lg font-bold text-foreground dark:text-white tracking-tight mb-2">
              Voda zatiaľ mlčí...
            </h3>
            <p className="text-muted-foreground dark:text-slate-400 text-sm mb-6 max-w-[280px] mx-auto leading-relaxed">
              {allCatchesList.length === 0 
                ? "Zatiaľ nemáte v denníku žiadne úlovky. Čas to zmeniť!"
                : "Pre zadanú kombináciu filtrov sme nenašli žiadne úlovky."}
            </p>
            {allCatchesList.length === 0 && (
              <Button 
                onClick={() => setLocation("/diary/catches")}
                className="bg-cyan-600 hover:bg-cyan-700 rounded-xl px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                Pridať prvý úlovok
              </Button>
            )}
          </div>
        )}

        {/* View All Button - show when there are more than 4 catches total, regardless of filters */}
        {allCatchesList.length > 4 && (
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
        {selectedCatch && (
          <CatchDetailSheet
            catchData={selectedCatch}
            onClose={() => setSelectedCatch(null)}
            onEdit={(catch_) => {
              openEditDialog(catch_);
              setSelectedCatch(null);
            }}
            onDelete={(catch_) => {
              openDeleteDialog(catch_.id);
              setSelectedCatch(null);
            }}
            onOpenFullPage={(catchId) => {
              setSelectedCatch(null);
              setLocation(`/diary/catches/${catchId}`);
            }}
            onOpenLightbox={(photos, index) => {
              setLightboxState({ photos, currentIndex: index });
            }}
          />
        )}

        {/* Photo Lightbox - Portal renders to document.body */}
        {lightboxState && (
          <PhotoLightbox
            photos={lightboxState.photos}
            currentIndex={lightboxState.currentIndex}
            onClose={() => setLightboxState(null)}
            onNavigate={(newIndex) => setLightboxState(prev => prev ? { ...prev, currentIndex: newIndex } : null)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Naozaj chceš zmazať tento úlovok?</AlertDialogTitle>
              <AlertDialogDescription>
                Táto akcia je nenávratná. Úlovok bude trvalo odstránený z tvojho denníka.
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
          <DialogContent className="sm:max-w-[500px] p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            {/* Header with slate-950 background */}
            <div className="bg-slate-100 dark:bg-slate-950 p-5 rounded-t-lg border-b border-slate-200 dark:border-slate-800">
              <DialogHeader className="space-y-1">
                <DialogTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-500" />
                  Začať rybačku
                </DialogTitle>
                <DialogDescription>
                  Rýchlo spusti jednodňovú rybačku. Stačí zadať lokalitu a môžeš pridávať úlovky.
                </DialogDescription>
              </DialogHeader>
            </div>
            <Form {...quickStartForm}>
              <form onSubmit={quickStartForm.handleSubmit(handleQuickStart)} className="space-y-4 p-5">
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
