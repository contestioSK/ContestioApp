import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
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
import { Fish, Plus, X, MapPin, Target, Ruler, Weight, Swords, Trophy, Crown, Play, Edit2, Trash2, CalendarIcon, CalendarDays, ChevronLeft, ChevronRight, Loader2, AlertCircle, Check, UserPlus } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DiaryLayout from "@/components/DiaryLayout";
import CatchFormDialog from "@/components/diary/CatchFormDialog";
import { getFishTypeLabel, getFishTypeOptions } from "@/utils/fishTypeMapping";
import { useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            aria-label="Predchádzajúca fotka"
            data-testid="button-prev-photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            aria-label="Ďalšia fotka"
            data-testid="button-next-photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
      
      {/* Dots Indicator (only show if more than 1 photo) */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === selectedIndex 
                  ? "bg-white w-6" 
                  : "bg-white/50 hover:bg-white/70"
              )}
              aria-label={`Zobraziť fotku ${index + 1}`}
              data-testid={`dot-${index}`}
            />
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
  const [selectedCatch, setSelectedCatch] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isStartFishingOpen, setIsStartFishingOpen] = useState(false);
  const [isCreateCatchOpen, setIsCreateCatchOpen] = useState(false);
  const [editingCatch, setEditingCatch] = useState<DiaryCatch | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [catchToDelete, setCatchToDelete] = useState<string | null>(null);
  const { toast } = useToast();

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
                      <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center overflow-hidden">
                        {getCatchThumbnail(catch_)}
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
                      <div className="w-12 h-12 bg-slate-600/50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {getCatchThumbnail(catch_)}
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
