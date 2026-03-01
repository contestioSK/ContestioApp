import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDiaryOffline } from "@/hooks/use-diary-offline";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorUtils";
import { useConfetti } from "@/hooks/useConfetti";
import { FishingAreaSelect } from "@/components/FishingAreaSelect";
import {
  getPersonalizedFishTypeOptions,
  getAllFishTypeKeys,
  fishPrioritiesByStyle,
} from "@/utils/fishTypeMapping";

import {
  Calendar as CalendarIcon,
  MapPin,
  Camera,
  X,
  Loader2,
  Cloud,
  Thermometer,
  Wind,
  Gauge,
  Trophy,
  Star,
  Lock,
  ChevronDown,
  ImagePlus,
  Fish,
  Scale,
  CloudRain,
  Plus,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { PremiumUpsellModal } from "@/components/PremiumUpsellModal";
import { BadgeCelebrationModal } from "@/components/diary/BadgeCelebrationModal";
import { BadgeTier } from "@shared/badges";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryCatch, DiaryTrip } from "@shared/schema";

// Get all fish type keys for the schema
const allFishTypes = getAllFishTypeKeys();

// Catch form validation schema
const catchFormSchema = z.object({
  capturedAt: z.date({ required_error: "Čas chytenia je povinný" }),
  weight: z
    .string()
    .min(1, "Váha je povinná")
    .transform((val) => {
      const weight = parseFloat(val);
      if (isNaN(weight) || weight < 0) {
        throw new Error("Neplatná váha");
      }
      return weight.toString();
    }),
  lengthCm: z.coerce
    .number()
    .positive("Dĺžka musí byť kladné číslo")
    .optional(),
  fishType: z.string().min(1, "Typ ryby je povinný"),
  bait: z.string().optional(),
  nickname: z.string().max(40, "Maximálne 40 znakov").optional(),
  notes: z.string().optional(),
  spot: z.string().optional(),
  verified: z.boolean().default(false),
  // Weather data (optional)
  waterTemp: z.coerce.number().min(-50).max(50).optional(),
  airTemp: z.coerce.number().min(-50).max(50).optional(),
  windSpeed: z.coerce.number().min(0).max(500).optional(),
  airPressure: z.coerce.number().min(800).max(1200).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

type CatchFormData = z.infer<typeof catchFormSchema>;

type UserBrandWithFlavors = {
  id: number;
  name: string;
  flavors: Array<{ id: number; name: string; diameter: string | null }>;
};

type RecentBaitItem = {
  source: string | null;
  brandId: number | null;
  flavorId: number | null;
  diameterMm: number | null;
  label: string;
};

type PhotoObject = {
  id: string;
  url: string;
  status: "processing" | "ready" | "failed";
  originalUrl?: string;
  variants?: Array<{ width: number; format: string; url: string }>;
  placeholder?: string;
  error?: string;
};

interface CatchFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingCatch: DiaryCatch | null;
  onSuccess?: () => void;
  battleId?: string; // Optional: if opened from a battle page
}

export default function CatchFormDialog({
  isOpen,
  onClose,
  editingCatch,
  onSuccess,
  battleId,
}: CatchFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fireworks, celebrateGoalCompletion } = useConfetti();
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<Array<PhotoObject>>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherDataLoaded, setWeatherDataLoaded] = useState(false);
  const [showGpsPremiumModal, setShowGpsPremiumModal] = useState(false);
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Offline functionality
  const { isOffline, saveCatchDraft } = useDiaryOffline();

  // Fetch user's trips for the trip selector
  const { data: trips = [] } = useQuery<DiaryTrip[]>({
    queryKey: ["/api/diary/trips"],
    enabled: !!user,
  });

  // Fetch active battles to auto-assign catches to ongoing battles
  const { data: activeBattles = [] } = useQuery<any[]>({
    queryKey: ["/api/diary/battles/active"],
    enabled: !!user && isOpen,
  });

  // Check premium status for photo limits
  const { data: premiumStatus } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id,
  });

  const isPremium = premiumStatus?.isPremium || false;
  const maxPhotos = isPremium ? 99 : 1; // Premium: unlimited (99), Free: 1

  // Fetch global bait manufacturers with flavors for combobox
  type ManufacturerWithFlavors = {
    id: number;
    name: string;
    flavors: Array<{ id: number; name: string; productLine: string; productLineId: number | null }>;
  };
  const { data: manufacturers = [] } = useQuery<ManufacturerWithFlavors[]>({
    queryKey: ["/api/baits/manufacturers/search"],
    enabled: !!user && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's own bait brands
  const { data: userBrands = [] } = useQuery<UserBrandWithFlavors[]>({
    queryKey: ["/api/diary/baits/brands"],
    enabled: !!user && isOpen,
    staleTime: 60 * 1000,
  });

  // Fetch recent baits
  const { data: recentBaitsData } = useQuery<{ items: RecentBaitItem[] }>({
    queryKey: ["/api/diary/baits/recent"],
    enabled: !!user && isOpen,
    staleTime: 30 * 1000,
  });
  const recentBaits = recentBaitsData?.items || [];

  type FavoriteBait = {
    id: number;
    diameter: string | null;
    manufacturer: { id: number; name: string };
    productLine: { id: number; name: string } | null;
    flavor: { id: number; name: string };
  };
  const { data: favoriteBaits = [] } = useQuery<FavoriteBait[]>({
    queryKey: ["/api/diary/arsenal/baits/favorites"],
    enabled: !!user && isOpen,
    staleTime: 60 * 1000,
  });

  // State for bait selection (manufacturer → flavor → diameter)
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<number | null>(null);
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(null);
  const [selectedDiameter, setSelectedDiameter] = useState<string>("");
  const [baitSource, setBaitSource] = useState<"user" | "global" | null>(null);
  const [brandSearch, setBrandSearch] = useState("");
  const [flavorSearch, setFlavorSearch] = useState("");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showFlavorDropdown, setShowFlavorDropdown] = useState(false);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const flavorInputRef = useRef<HTMLInputElement>(null);
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const flavorDropdownRef = useRef<HTMLDivElement>(null);

  const commonDiameters = ["10", "12", "14", "16", "18", "20", "24", "26", "28", "30"];

  const selectedManufacturer = baitSource === "global" ? manufacturers.find(m => m.id === selectedManufacturerId) : null;
  const selectedUserBrand = baitSource === "user" ? userBrands.find(b => b.id === selectedManufacturerId) : null;
  const selectedFlavor = selectedManufacturer?.flavors.find(f => f.id === selectedFlavorId);
  const selectedUserFlavor = selectedUserBrand?.flavors.find(f => f.id === selectedFlavorId);

  // Centralized helpers to avoid state drift
  const clearBaitSelection = () => {
    setBaitSource(null);
    setSelectedManufacturerId(null);
    setSelectedFlavorId(null);
    setSelectedDiameter("");
    setFlavorSearch("");
  };

  const selectBrand = (source: "user" | "global", id: number, name: string) => {
    setBaitSource(source);
    setSelectedManufacturerId(id);
    setBrandSearch(name);
    setSelectedFlavorId(null);
    setSelectedDiameter("");
    setFlavorSearch("");
    setShowBrandDropdown(false);
  };

  // Filtered brand suggestions (user brands + global brands, no fishing methods)
  const filteredBrandSuggestions = useMemo(() => {
    const q = brandSearch.toLowerCase().trim();
    const userBrandItems = userBrands
      .filter(b => !q || b.name.toLowerCase().includes(q))
      .map(b => ({ type: "user" as const, id: b.id, name: b.name }));
    const globalBrandItems = manufacturers
      .filter(m => !q || m.name.toLowerCase().includes(q))
      .map(m => ({ type: "global" as const, id: m.id, name: m.name }));
    return { userBrands: userBrandItems, globalBrands: globalBrandItems };
  }, [brandSearch, manufacturers, userBrands]);

  // Filtered flavor suggestions (depends on baitSource)
  const filteredFlavorSuggestions = useMemo(() => {
    const q = flavorSearch.toLowerCase().trim();
    if (baitSource === "global" && selectedManufacturer) {
      return selectedManufacturer.flavors.filter(f => {
        const display = f.productLine ? `${f.productLine} - ${f.name}` : f.name;
        return !q || display.toLowerCase().includes(q) || f.name.toLowerCase().includes(q);
      });
    }
    if (baitSource === "user" && selectedUserBrand) {
      return selectedUserBrand.flavors.filter(f => {
        return !q || f.name.toLowerCase().includes(q);
      });
    }
    return [];
  }, [flavorSearch, selectedManufacturer, selectedUserBrand, baitSource]);

  // Mutation: create user brand inline
  const createUserBrandMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/diary/baits/brands", { name });
      return response.json() as Promise<UserBrandWithFlavors>;
    },
    onSuccess: (brand) => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/baits/brands"] });
      selectBrand("user", brand.id, brand.name);
      setTimeout(() => flavorInputRef.current?.focus(), 50);
    },
  });

  // Mutation: create user flavor inline
  const createUserFlavorMutation = useMutation({
    mutationFn: async ({ brandId, name }: { brandId: number; name: string }) => {
      const response = await apiRequest("POST", "/api/diary/baits/flavors", { brandId, name });
      return response.json() as Promise<{ id: number; name: string; diameter: string | null }>;
    },
    onSuccess: (flavor) => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/baits/brands"] });
      setSelectedFlavorId(flavor.id);
      setFlavorSearch(flavor.name);
      setShowFlavorDropdown(false);
    },
  });

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        brandDropdownRef.current &&
        !brandDropdownRef.current.contains(e.target as Node) &&
        brandInputRef.current &&
        !brandInputRef.current.contains(e.target as Node)
      ) {
        setShowBrandDropdown(false);
      }
      if (
        flavorDropdownRef.current &&
        !flavorDropdownRef.current.contains(e.target as Node) &&
        flavorInputRef.current &&
        !flavorInputRef.current.contains(e.target as Node)
      ) {
        setShowFlavorDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Find active battle (either from battleId prop or first active battle)
  const activeBattle = battleId
    ? activeBattles.find((b) => b.id === battleId)
    : activeBattles[0]; // Use first active battle if any

  // State for tripId (will be auto-set if active battle exists)
  const [selectedTripId, setSelectedTripId] = useState<string | undefined>(
    undefined,
  );

  // State for badge celebration modal
  const [badgeQueue, setBadgeQueue] = useState<
    Array<{
      badgeType: string;
      badgeName: string;
      tier: BadgeTier;
      icon: string;
    }>
  >([]);
  const [currentBadge, setCurrentBadge] = useState<{
    badgeType: string;
    badgeName: string;
    tier: BadgeTier;
    icon: string;
  } | null>(null);

  // Get personalized fish options based on user's fishing style preference
  const userFishingStyle = (user as any)?.preferences?.fishingStyle || null;
  const fishOptions = getPersonalizedFishTypeOptions(userFishingStyle);
  const hasPriorityFish = "priorityOptions" in fishOptions;

  // Get default fish type based on user's fishing style
  const getDefaultFishType = () => {
    if (userFishingStyle && fishPrioritiesByStyle[userFishingStyle]) {
      return fishPrioritiesByStyle[userFishingStyle][0] || "kapor_rybnicny";
    }
    return "kapor_supinac";
  };

  const form = useForm<CatchFormData>({
    resolver: zodResolver(catchFormSchema),
    defaultValues: {
      capturedAt: new Date(),
      weight: "",
      fishType: getDefaultFishType(),
      bait: "",
      nickname: "",
      notes: "",
      spot: "",
      verified: false,
    },
  });

  // Build bait text from current selection
  const buildBaitText = (source: "user" | "global" | null, brandName: string, flavorName: string, diameter: string) => {
    let text = brandName && flavorName ? `${brandName} - ${flavorName}` : brandName || flavorName || "";
    if (diameter) text += ` (${diameter}mm)`;
    return text;
  };

  // Derive stable primitive values for bait text sync
  const selectedBrandName = selectedManufacturer?.name || selectedUserBrand?.name || "";
  const selectedFlavorName = baitSource === "global" && selectedFlavor
    ? (selectedFlavor.productLine ? `${selectedFlavor.productLine} - ${selectedFlavor.name}` : selectedFlavor.name)
    : selectedUserFlavor?.name || "";

  // Sync bait selection to form field (with diameter)
  useEffect(() => {
    if (baitSource && selectedBrandName && selectedFlavorName) {
      form.setValue("bait", buildBaitText(baitSource, selectedBrandName, selectedFlavorName, selectedDiameter));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandName, selectedFlavorName, selectedDiameter, baitSource]);

  // Auto-set tripId when active battle exists
  useEffect(() => {
    if (isOpen && !editingCatch && activeBattle) {
      setSelectedTripId(activeBattle.tripId);
    }
  }, [isOpen, editingCatch, activeBattle]);

  // Update form when editing catch changes
  useEffect(() => {
    if (editingCatch) {
      setExistingPhotos(editingCatch.photos || []);
      setSelectedTripId(editingCatch.tripId || undefined);

      // Parse date safely
      let capturedDate = new Date();
      try {
        capturedDate = new Date(editingCatch.capturedAt);
      } catch (e) {
        console.error("Error parsing capturedAt:", e);
      }

      form.reset({
        capturedAt: capturedDate,
        weight: editingCatch.weight || "",
        lengthCm: editingCatch.lengthCm || undefined,
        fishType: editingCatch.fishType as any,
        bait: editingCatch.bait || "",
        nickname: editingCatch.nickname || "",
        notes: editingCatch.notes || "",
        spot: editingCatch.spot || "",
        verified: editingCatch.verified || false,
        waterTemp: editingCatch.waterTemp
          ? Number(editingCatch.waterTemp)
          : undefined,
        airTemp: editingCatch.airTemp
          ? Number(editingCatch.airTemp)
          : undefined,
        windSpeed: editingCatch.windSpeed
          ? Number(editingCatch.windSpeed)
          : undefined,
        airPressure: editingCatch.airPressure
          ? Number(editingCatch.airPressure)
          : undefined,
        latitude: editingCatch.latitude
          ? Number(editingCatch.latitude)
          : undefined,
        longitude: editingCatch.longitude
          ? Number(editingCatch.longitude)
          : undefined,
      });

      // Restore bait source from stored catch data
      const storedSource = (editingCatch as any).baitBrandSource as string | null;
      const storedBrandId = (editingCatch as any).baitBrandId as number | null;
      const storedFlavorId = (editingCatch as any).baitFlavorId as number | null;
      const storedDiameterMm = (editingCatch as any).baitDiameterMm as number | null;

      const baitText = editingCatch.bait || "";
      const diameterMatch = baitText.match(/\((\d+)mm\)\s*$/);
      const extractedDiameter = storedDiameterMm ? String(storedDiameterMm) : (diameterMatch ? diameterMatch[1] : "");
      let matched = false;

      if (storedSource === "user" && storedBrandId) {
        const userBrand = userBrands.find(b => b.id === storedBrandId);
        if (userBrand) {
          setBaitSource("user");
          setSelectedManufacturerId(storedBrandId);
          setBrandSearch(userBrand.name);
          if (storedFlavorId) {
            const userFl = userBrand.flavors.find(f => f.id === storedFlavorId);
            setSelectedFlavorId(storedFlavorId);
            setFlavorSearch(userFl?.name || "");
          }
          setSelectedDiameter(extractedDiameter);
          matched = true;
        }
      } else if (storedSource === "global" && storedBrandId) {
        const globalBrand = manufacturers.find(m => m.id === storedBrandId);
        if (globalBrand) {
          setBaitSource("global");
          setSelectedManufacturerId(storedBrandId);
          setBrandSearch(globalBrand.name);
          if (storedFlavorId) {
            const globalFl = globalBrand.flavors.find(f => f.id === storedFlavorId);
            setSelectedFlavorId(storedFlavorId);
            const flavorDisplay = globalFl ? (globalFl.productLine ? `${globalFl.productLine} - ${globalFl.name}` : globalFl.name) : "";
            setFlavorSearch(flavorDisplay);
          }
          setSelectedDiameter(extractedDiameter);
          matched = true;
        }
      }

      // Fallback: try matching bait text to global brands
      if (!matched) {
        const baitWithoutDiameter = baitText.replace(/\s*\(\d+mm\)\s*$/, "").trim();
        if (baitWithoutDiameter && manufacturers.length > 0) {
          for (const mfr of manufacturers) {
            for (const flavor of mfr.flavors) {
              const candidates = [
                flavor.productLine ? `${mfr.name} - ${flavor.productLine} - ${flavor.name}` : null,
                `${mfr.name} - ${flavor.name}`,
              ].filter(Boolean) as string[];
              if (candidates.some(c => baitWithoutDiameter === c)) {
                setBaitSource("global");
                setSelectedManufacturerId(mfr.id);
                setSelectedFlavorId(flavor.id);
                setSelectedDiameter(extractedDiameter);
                setBrandSearch(mfr.name);
                const flavorDisplay = flavor.productLine ? `${flavor.productLine} - ${flavor.name}` : flavor.name;
                setFlavorSearch(flavorDisplay);
                matched = true;
                break;
              }
            }
            if (matched) break;
          }
        }
      }

      if (!matched) {
        setBaitSource(null);
        setSelectedManufacturerId(null);
        setSelectedFlavorId(null);
        setSelectedDiameter(extractedDiameter);
        setBrandSearch(baitText);
        setFlavorSearch("");
      }
    } else {
      setExistingPhotos([]);
      setSelectedTripId(activeBattle?.tripId);
      clearBaitSelection();
      setBrandSearch("");
      form.reset({
        capturedAt: new Date(),
        weight: "",
        fishType: "kapor_supinac",
        bait: "",
        nickname: "",
        notes: "",
        spot: "",
        verified: false,
      });
    }
  }, [editingCatch, form, activeBattle, manufacturers, userBrands]);

  // Toggle favorite bait mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ arsenalBaitId }: { arsenalBaitId: number }) => {
      const response = await apiRequest("PATCH", `/api/diary/arsenal/baits/${arsenalBaitId}/favorite`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/arsenal/baits/favorites"] });
    },
  });

  // Add bait to arsenal + mark as favorite
  const addFavoriteMutation = useMutation({
    mutationFn: async ({ manufacturerId, productLineId, flavorId, diameter }: { manufacturerId: number; productLineId: number; flavorId: number; diameter?: string }) => {
      const response = await apiRequest("POST", "/api/diary/arsenal/baits", {
        manufacturerId,
        productLineId,
        flavorId,
        diameter: diameter || null,
        isFavorite: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/arsenal/baits/favorites"] });
    },
  });

  // Check if current selection is a favorite (only for global brands)
  const currentFavorite = useMemo(() => {
    if (!selectedManufacturerId || !selectedFlavorId || baitSource !== "global") return null;
    return favoriteBaits.find(
      f => f.manufacturer.id === selectedManufacturerId
        && f.flavor.id === selectedFlavorId
        && (f.diameter || "") === selectedDiameter
    ) || null;
  }, [selectedManufacturerId, selectedFlavorId, selectedDiameter, favoriteBaits, baitSource]);

  // Handle toggle favorite for current selection
  const handleToggleFavorite = () => {
    if (!selectedManufacturerId || !selectedFlavorId) return;
    if (currentFavorite) {
      toggleFavoriteMutation.mutate({ arsenalBaitId: currentFavorite.id });
    } else {
      const flavorData = selectedManufacturer?.flavors.find(f => f.id === selectedFlavorId);
      if (flavorData) {
        addFavoriteMutation.mutate({
          manufacturerId: selectedManufacturerId,
          productLineId: flavorData.productLineId || 0,
          flavorId: selectedFlavorId,
          diameter: selectedDiameter || undefined,
        });
      }
    }
  };

  // Create catch mutation
  const createCatchMutation = useMutation({
    mutationFn: async (data: CatchFormData) => {
      const response = await apiRequest("POST", "/api/diary/catches", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/badges"] });

      // Check for new badges and show celebration modal
      const newBadges = data?.newBadges || [];
      if (newBadges.length > 0) {
        // Queue all badges for celebration
        const badgesToShow = newBadges.map(
          (badge: {
            badgeType: string;
            badgeName: string;
            tier: string;
            icon: string;
          }) => ({
            badgeType: badge.badgeType,
            badgeName: badge.badgeName,
            tier: badge.tier as BadgeTier,
            icon: badge.icon,
          }),
        );

        // Show first badge immediately, queue the rest
        setCurrentBadge(badgesToShow[0]);
        if (badgesToShow.length > 1) {
          setBadgeQueue(badgesToShow.slice(1));
        }

        // Close form dialog but keep badge modal open
        handleClose();
        onSuccess?.();
      } else {
        // Check if this is the user's first catch (returned from API)
        const isFirstCatch = data?.isFirstCatch;

        toast({
          title: isFirstCatch ? "🎉 Prvý úlovok!" : "✅ Úlovok pridaný!",
          description: isFirstCatch
            ? "Hotovo! Detaily môžeš kedykoľvek doplniť."
            : "Váš úlovok bol úspešne pridaný do denníka.",
          variant: "success" as any,
        });
        handleClose();
        onSuccess?.();
      }
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, "catch");
    },
  });

  // Update catch mutation
  const updateCatchMutation = useMutation({
    mutationFn: async (data: CatchFormData) => {
      const response = await apiRequest(
        "PUT",
        `/api/diary/catches/${editingCatch!.id}`,
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
      handleClose();
      toast({
        title: "✅ Úlovok aktualizovaný!",
        description: "Váš úlovok bol úspešne aktualizovaný.",
        variant: "success" as any,
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, "update");
    },
  });

  const handleSubmit = async (data: CatchFormData) => {
    const processedData = {
      ...data,
      tripId: selectedTripId,
      battleId: activeBattle?.id,
      angler: {
        name: user?.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : "",
        userId: user?.id || "",
      },
      bait: data.bait === "none" ? undefined : data.bait,
      baitBrandSource: baitSource || undefined,
      baitBrandId: selectedManufacturerId || undefined,
      baitFlavorId: selectedFlavorId || undefined,
      baitDiameterMm: selectedDiameter ? parseInt(selectedDiameter) : undefined,
    };

    if (isOffline) {
      // Save as draft when offline (with photos if available)
      try {
        const type = editingCatch ? "update" : "create";
        const originalId = editingCatch?.id;
        const catchDataWithPhoto =
          selectedPhotos.length > 0
            ? { ...processedData, photo: selectedPhotos[0] }
            : processedData;

        await saveCatchDraft(catchDataWithPhoto, type, originalId);

        handleClose();

        toast({
          title: "📤 Uložené offline",
          description:
            selectedPhotos.length > 0
              ? "Úlovok s fotografiou sa odošle automaticky po obnovení pripojenia"
              : "Úlovok sa odošle automaticky po obnovení pripojenia",
          variant: "default",
        });
      } catch (error) {
        console.error("Failed to save catch draft:", error);
        toast({
          title: "❌ Chyba",
          description: "Nepodarilo sa uložiť úlovok offline",
          variant: "destructive",
        });
      }
    } else {
      // Online mode - instant save with background photo upload

      if (editingCatch) {
        // EDITING MODE: Instant save with background photo upload (same as new catch)
        const immediateData =
          existingPhotos.length > 0
            ? { ...processedData, photos: existingPhotos }
            : processedData;

        const photosToUpload = [...selectedPhotos];

        updateCatchMutation.mutate(immediateData, {
          onSuccess: () => {
            if (photosToUpload.length > 0) {
              uploadPhotosInBackground(editingCatch.id, photosToUpload);
            }
          },
        });
      } else {
        // NEW CATCH MODE: Instant save with background photo upload

        // 1. Save catch IMMEDIATELY without photos
        const immediateData =
          existingPhotos.length > 0
            ? { ...processedData, photos: existingPhotos }
            : processedData;

        // Store photos to upload for background processing
        const photosToUpload = [...selectedPhotos];

        // 2. Create catch with immediate success callback
        createCatchMutation.mutate(immediateData, {
          onSuccess: async (newCatch: any) => {
            // 3. If there are photos, upload them in background
            if (photosToUpload.length > 0) {
              toast({
                title: "✅ Úlovok uložený!",
                description: `${photosToUpload.length} ${photosToUpload.length === 1 ? "fotografia sa nahráva" : "fotografie sa nahrávajú"} na pozadí...`,
                variant: "success" as any,
              });

              // Background photo upload (async, non-blocking)
              uploadPhotosInBackground(newCatch.id, photosToUpload);
            }
          },
        });
      }
    }
  };

  // Background photo upload function (runs after catch is saved)
  const uploadPhotosInBackground = async (catchId: string, photos: File[]) => {
    try {
      // Import resize utility
      const { resizeImages } = await import("@/utils/imageResize");

      // Resize images to 2048px max (reduces upload time significantly)
      const resizedPhotos = await resizeImages(photos, {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.85,
      });

      // Upload resized photos in parallel
      const formData = new FormData();
      resizedPhotos.forEach((photo) => {
        formData.append("photos", photo);
      });

      const uploadResponse = await fetch("/api/diary/photos/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload photos");
      }

      const uploadResult = await uploadResponse.json();
      const uploadedPhotos = uploadResult.photos || [];

      // Add photos to catch via PATCH endpoint
      const patchResponse = await fetch(
        `/api/diary/catches/${catchId}/photos`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos: uploadedPhotos }),
          credentials: "include",
        },
      );

      if (!patchResponse.ok) {
        throw new Error("Failed to attach photos to catch");
      }

      // Refresh catch list to show uploaded photos
      queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });

      toast({
        title: "Fotky nahrané!",
        description: "Fotky sa optimalizujú na pozadí a onedlho sa zobrazia.",
      });
    } catch (error) {
      console.error("Background photo upload error:", error);
      toast({
        title: "Chyba pri nahrávaní fotografií",
        description: "Úlovok je uložený, ale fotografie sa nepodarilo nahrať",
        variant: "destructive",
      });
    }
  };

  // Intelligent function: Get GPS location and weather in one step
  const getLocationAndWeather = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS nie je podporované",
        description: "Váš prehliadač nepodporuje získavanie GPS polohy.",
        variant: "destructive",
      });
      return;
    }

    const datetime = form.getValues("capturedAt");
    if (!datetime) {
      toast({
        title: "Chýbajúci dátum",
        description:
          "Prosím, zadajte dátum a čas úlovku pred načítaním počasia.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingWeather(true);
    setWeatherDataLoaded(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Update form with GPS coordinates (stored in background)
        form.setValue("latitude", lat);
        form.setValue("longitude", lon);

        // Immediately fetch weather data
        try {
          const response = await fetch(
            `/api/weather?lat=${lat}&lon=${lon}&datetime=${datetime.toISOString()}`,
            { credentials: "include" },
          );

          if (!response.ok) {
            throw new Error("Failed to fetch weather data");
          }

          const weatherData = await response.json();

          // Update form with weather data (stored in background)
          if (
            weatherData.temperature !== null &&
            weatherData.temperature !== undefined
          ) {
            form.setValue("airTemp", weatherData.temperature);
          }
          if (
            weatherData.windSpeed !== null &&
            weatherData.windSpeed !== undefined
          ) {
            form.setValue("windSpeed", weatherData.windSpeed);
          }
          if (
            weatherData.pressure !== null &&
            weatherData.pressure !== undefined
          ) {
            form.setValue("airPressure", weatherData.pressure);
          }

          setIsLoadingWeather(false);
          setWeatherDataLoaded(true);

          toast({
            title: "Dáta načítané! ✓",
            description: `GPS poloha a počasie boli automaticky uložené pre váš úlovok.`,
          });
        } catch (error) {
          console.error("Weather fetch error:", error);
          setIsLoadingWeather(false);

          toast({
            title: "Chyba pri načítaní počasia",
            description:
              "GPS poloha bola uložená, ale nepodarilo sa načítať počasie.",
            variant: "destructive",
          });
        }
      },
      (error) => {
        setIsLoadingWeather(false);

        let errorMessage = "Nepodarilo sa získať GPS polohu.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Povolenie na prístup k polohe bolo zamietnuté. Prosím povoľte prístup v nastaveniach prehliadača.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Informácie o polohe nie sú dostupné.";
            break;
          case error.TIMEOUT:
            errorMessage = "Požiadavka na získanie polohy vypršala.";
            break;
        }

        toast({
          title: "Chyba GPS",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 300000,
      },
    );
  };

  const handleClose = () => {
    setSelectedPhotos([]);
    setExistingPhotos([]);
    setWeatherDataLoaded(false);
    setIsEditingDateTime(false);
    setIsDetailsOpen(false);
    clearBaitSelection();
    setBrandSearch("");
    form.reset();
    onClose();
  };

  // Handle badge modal close - show next badge in queue or close
  const handleBadgeModalClose = () => {
    if (badgeQueue.length > 0) {
      // Show next badge
      setCurrentBadge(badgeQueue[0]);
      setBadgeQueue(badgeQueue.slice(1));
    } else {
      // No more badges, close modal
      setCurrentBadge(null);
    }
  };

  // Helper function to format date/time display
  const formatDateTimeDisplay = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = format(date, "HH:mm");

    if (isToday) {
      return `Dnes, ${timeStr}`;
    } else if (isYesterday) {
      return `Včera, ${timeStr}`;
    } else {
      return format(date, "d. M. yyyy, HH:mm", { locale: sk });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          {/* Accessibility: Hidden title for screen readers */}
          <VisuallyHidden>
            <DialogTitle>
              {editingCatch ? "Upraviť úlovok" : "Nový úlovok"}
            </DialogTitle>
          </VisuallyHidden>

          {/* Compact Header */}
          <div className="relative bg-slate-100 dark:bg-slate-950 p-5 pt-6 pb-5 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            </button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {editingCatch ? "Upraviť úlovok" : "Nový úlovok"}
            </h2>
            <p className="text-muted-foreground text-xs mt-1 font-medium">
              Stačí fotografia, ryba a váha. Hotovo.
            </p>
            {!editingCatch && activeBattle && (
              <Badge
                variant="secondary"
                className="mt-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 rounded-lg"
              >
                <Trophy className="h-4 w-4 mr-1 text-muted-foreground" strokeWidth={1.75} />
                Battle: {activeBattle.name}
              </Badge>
            )}
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="p-6 space-y-6"
            >
              {/* 1. PHOTO UPLOAD - HERO SECTION */}
              <div className="space-y-3">
                {/* Existing photos (when editing) */}
                {existingPhotos.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Existujúce fotografie:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {existingPhotos.map((photo, index) => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.url || photo.originalUrl}
                            alt={`Existujúca fotografia ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setExistingPhotos((prev) =>
                                prev.filter((_, i) => i !== index),
                              );
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-remove-photo-${index}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload new photos - HERO dropzone */}
                {existingPhotos.length + selectedPhotos.length < maxPhotos && (
                  <div className="relative group h-48 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                    {/* Badge */}
                    <div className="absolute top-3 right-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-bold px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 uppercase tracking-wider">
                      Najdôležitejší krok
                    </div>

                    {/* Premium badge */}
                    {isPremium && (
                      <div className="absolute top-3 left-3 bg-slate-200 dark:bg-slate-700 text-[#F97316] text-[9px] font-bold px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 uppercase tracking-wider">
                        ∞ fotografií
                      </div>
                    )}

                    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <ImagePlus className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      Pridať fotografiu ryby
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Rýchlo, kým je na podložke
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple={isPremium}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const totalPhotos =
                          existingPhotos.length +
                          selectedPhotos.length +
                          files.length;
                        const remainingSlots =
                          maxPhotos -
                          existingPhotos.length -
                          selectedPhotos.length;

                        if (totalPhotos > maxPhotos) {
                          toast({
                            title: "Príliš veľa fotografií",
                            description: `Môžete mať celkovo maximálne ${maxPhotos} ${maxPhotos === 1 ? "fotografiu" : "fotografií"}. Môžete pridať ešte ${remainingSlots}.`,
                            variant: "destructive",
                          });
                          e.target.value = "";
                          return;
                        }
                        setSelectedPhotos([...selectedPhotos, ...files]);
                        e.target.value = "";
                      }}
                      data-testid="input-photos"
                    />
                  </div>
                )}

                {/* Selected photos preview */}
                {selectedPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPhotos.map((photo, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 rounded-lg"
                      >
                        <Camera className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                        {photo.name.length > 15
                          ? photo.name.substring(0, 15) + "..."
                          : photo.name}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPhotos((prev) =>
                              prev.filter((_, i) => i !== index),
                            );
                          }}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {isOffline && selectedPhotos.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Fotky sa uložia lokálne a odošlú po obnovení pripojenia
                  </p>
                )}
              </div>

              {/* 2. CORE STATS - Fish Type + Weight */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fishType"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                        Druh ryby
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger
                            data-testid="select-fish-type"
                            className="font-semibold bg-slate-800/80 border-border/50 text-foreground"
                          >
                            <div className="flex items-center gap-2">
                              <Fish className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                              <SelectValue placeholder="Vyberte" />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {hasPriorityFish ? (
                            <>
                              {(
                                fishOptions as {
                                  priorityOptions: {
                                    value: string;
                                    label: string;
                                  }[];
                                  otherOptions: {
                                    value: string;
                                    label: string;
                                  }[];
                                }
                              ).priorityOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  ⭐ {option.label}
                                </SelectItem>
                              ))}
                              <SelectSeparator />
                              {(
                                fishOptions as {
                                  priorityOptions: {
                                    value: string;
                                    label: string;
                                  }[];
                                  otherOptions: {
                                    value: string;
                                    label: string;
                                  }[];
                                }
                              ).otherOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </>
                          ) : (
                            (
                              fishOptions as { value: string; label: string }[]
                            ).map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                        Váha (kg)
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="7.5"
                            data-testid="input-weight"
                            className="font-bold text-lg pr-10 bg-slate-800/80 border-border/50 text-foreground"
                            {...field}
                          />
                          <Scale className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" strokeWidth={1.75} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 3. PASSIVE DATE/TIME DISPLAY */}
              <FormField
                control={form.control}
                name="capturedAt"
                render={({ field }) => {
                  const currentValue =
                    field.value instanceof Date && !isNaN(field.value.getTime())
                      ? field.value
                      : new Date();

                  if (!isEditingDateTime) {
                    return (
                      <div
                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setIsEditingDateTime(true)}
                      >
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                        <span className="text-sm text-muted-foreground">
                          {formatDateTimeDisplay(currentValue)}
                        </span>
                        <span className="text-xs text-[#F97316] font-medium ml-auto">
                          upraviť
                        </span>
                      </div>
                    );
                  }

                  const dateValue = format(currentValue, "yyyy-MM-dd");
                  const timeValue = format(currentValue, "HH:mm");

                  const handleDateChange = (newDate: string) => {
                    if (!newDate) return;
                    const baseDate = new Date(currentValue);
                    const [year, month, day] = newDate.split("-").map(Number);
                    baseDate.setFullYear(year);
                    baseDate.setMonth(month - 1);
                    baseDate.setDate(day);
                    field.onChange(baseDate);
                  };

                  const handleTimeChange = (newTime: string) => {
                    if (!newTime) return;
                    const baseDate = new Date(currentValue);
                    const [hours, minutes] = newTime.split(":").map(Number);
                    baseDate.setHours(hours);
                    baseDate.setMinutes(minutes);
                    field.onChange(baseDate);
                  };

                  return (
                    <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Dátum a čas úlovku
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingDateTime(false)}
                          className="text-xs text-[#F97316] font-medium hover:underline"
                        >
                          hotovo
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormItem>
                          <FormControl>
                            <Input
                              type="date"
                              value={dateValue}
                              onChange={(e) => handleDateChange(e.target.value)}
                              data-testid="input-capture-date"
                              max={format(new Date(), "yyyy-MM-dd")}
                              className="text-sm bg-slate-800/80 border-border/50 text-foreground"
                            />
                          </FormControl>
                        </FormItem>
                        <FormItem>
                          <FormControl>
                            <Input
                              type="time"
                              value={timeValue}
                              onChange={(e) => handleTimeChange(e.target.value)}
                              data-testid="input-capture-time"
                              className="text-sm bg-slate-800/80 border-border/50 text-foreground"
                            />
                          </FormControl>
                        </FormItem>
                      </div>
                      <FormMessage />
                    </div>
                  );
                }}
              />

              {/* 4. COLLAPSIBLE DETAILS */}
              <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between py-3 border-t border-border/50 text-left group"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                      Ak chceš, doplň detaily
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isDetailsOpen && "rotate-180",
                      )}
                      strokeWidth={1.75}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4 pt-2">
                  {/* Length */}
                  <FormField
                    control={form.control}
                    name="lengthCm"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold text-muted-foreground ml-1">
                          Dĺžka (cm)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="napr. 65"
                            data-testid="input-length"
                            className="bg-slate-800/80 border-border/50 text-foreground"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Bait - Searchable Brand → Flavor combobox */}
                  <FormField
                    control={form.control}
                    name="bait"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold text-muted-foreground ml-1">
                          Nástraha
                        </FormLabel>
                        <div className="space-y-2">
                          {/* Brand Combobox */}
                          <div className="relative">
                            <Input
                              ref={brandInputRef}
                              placeholder="Zadajte značku (napr. Mikbaits, LK Baits...)"
                              value={brandSearch}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBrandSearch(val);
                                setShowBrandDropdown(true);
                                if (selectedManufacturerId) {
                                  clearBaitSelection();
                                }
                                field.onChange("");
                              }}
                              onFocus={() => setShowBrandDropdown(true)}
                              className="bg-slate-800/80 border-border/50 text-foreground placeholder:text-muted-foreground"
                              autoComplete="off"
                            />
                            {brandSearch && (
                              <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  clearBaitSelection();
                                  setBrandSearch("");
                                  field.onChange("");
                                  brandInputRef.current?.focus();
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {showBrandDropdown && (
                              <div
                                ref={brandDropdownRef}
                                className="absolute z-[100] top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
                              >
                                {/* Recent baits section */}
                                {recentBaits.length > 0 && !brandSearch.trim() && (
                                  <>
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                      Naposledy použité
                                    </div>
                                    {recentBaits.map((item, idx) => (
                                      <button
                                        key={`recent-${idx}`}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          if (item.source === "user" && item.brandId) {
                                            const ub = userBrands.find(b => b.id === item.brandId);
                                            if (ub) {
                                              selectBrand("user", item.brandId, ub.name);
                                              if (item.flavorId) {
                                                const uf = ub.flavors.find(f => f.id === item.flavorId);
                                                setSelectedFlavorId(item.flavorId);
                                                setFlavorSearch(uf?.name || "");
                                              }
                                              setSelectedDiameter(item.diameterMm ? String(item.diameterMm) : "");
                                            }
                                          } else if (item.source === "global" && item.brandId) {
                                            const gm = manufacturers.find(m => m.id === item.brandId);
                                            if (gm) {
                                              selectBrand("global", item.brandId, gm.name);
                                              if (item.flavorId) {
                                                const gf = gm.flavors.find(f => f.id === item.flavorId);
                                                setSelectedFlavorId(item.flavorId);
                                                const flavorDisplay = gf ? (gf.productLine ? `${gf.productLine} - ${gf.name}` : gf.name) : "";
                                                setFlavorSearch(flavorDisplay);
                                              }
                                              setSelectedDiameter(item.diameterMm ? String(item.diameterMm) : "");
                                            }
                                          } else {
                                            clearBaitSelection();
                                            setBrandSearch(item.label);
                                            field.onChange(item.label);
                                          }
                                          setShowBrandDropdown(false);
                                        }}
                                      >
                                        {item.label}
                                      </button>
                                    ))}
                                    <div className="border-t border-border my-1" />
                                  </>
                                )}

                                {/* Favorites section */}
                                {favoriteBaits.length > 0 && !brandSearch.trim() && (
                                  <>
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                      Obľúbené
                                    </div>
                                    {favoriteBaits.map((fav) => (
                                      <button
                                        key={`fav-${fav.id}`}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          selectBrand("global", fav.manufacturer.id, fav.manufacturer.name);
                                          setSelectedFlavorId(fav.flavor.id);
                                          const flavorDisplay = fav.productLine?.name
                                            ? `${fav.productLine.name} - ${fav.flavor.name}`
                                            : fav.flavor.name;
                                          setFlavorSearch(flavorDisplay);
                                          setSelectedDiameter(fav.diameter ? fav.diameter.replace(/mm$/i, "") : "");
                                        }}
                                      >
                                        <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />
                                        <span>
                                          <span className="text-muted-foreground">{fav.manufacturer.name}</span>
                                          {" – "}
                                          {fav.productLine?.name && <span className="text-muted-foreground">{fav.productLine.name} – </span>}
                                          {fav.flavor.name}
                                          {fav.diameter && <span className="text-orange-400 font-mono text-xs ml-1">({fav.diameter.replace(/mm$/i, "")}mm)</span>}
                                        </span>
                                      </button>
                                    ))}
                                    <div className="border-t border-border my-1" />
                                  </>
                                )}

                                {/* User brands section */}
                                {filteredBrandSuggestions.userBrands.length > 0 && (
                                  <>
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                      Moje značky
                                    </div>
                                    {filteredBrandSuggestions.userBrands.map((item) => (
                                      <button
                                        key={`user-${item.id}`}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          selectBrand("user", item.id, item.name);
                                          field.onChange("");
                                          setTimeout(() => flavorInputRef.current?.focus(), 50);
                                        }}
                                      >
                                        {item.name}
                                      </button>
                                    ))}
                                  </>
                                )}

                                {/* Global brands section */}
                                {filteredBrandSuggestions.globalBrands.length > 0 && (
                                  <>
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-t border-border mt-1">
                                      Globálne značky
                                    </div>
                                    {filteredBrandSuggestions.globalBrands.map((item) => (
                                      <button
                                        key={`global-${item.id}`}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          selectBrand("global", item.id, item.name);
                                          field.onChange("");
                                          setTimeout(() => flavorInputRef.current?.focus(), 50);
                                        }}
                                      >
                                        {item.name}
                                      </button>
                                    ))}
                                  </>
                                )}

                                {/* CTA: Add to user brands */}
                                {brandSearch.trim() &&
                                  filteredBrandSuggestions.userBrands.length === 0 &&
                                  !userBrands.some(b => b.name.toLowerCase() === brandSearch.toLowerCase().trim()) && (
                                  <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm text-orange-400 hover:bg-muted/50 transition-colors flex items-center gap-2 border-t border-border"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      createUserBrandMutation.mutate(brandSearch.trim());
                                    }}
                                    disabled={createUserBrandMutation.isPending}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    {createUserBrandMutation.isPending
                                      ? "Pridávam..."
                                      : `Pridať „${brandSearch.trim()}" do Mojich značiek`}
                                  </button>
                                )}

                                {/* Fallback: Use as free text */}
                                {brandSearch.trim() &&
                                  filteredBrandSuggestions.userBrands.length === 0 &&
                                  filteredBrandSuggestions.globalBrands.length === 0 && (
                                  <button
                                    type="button"
                                    className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors flex items-center gap-2"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      clearBaitSelection();
                                      setShowBrandDropdown(false);
                                      field.onChange(brandSearch.trim());
                                    }}
                                  >
                                    Použiť „{brandSearch.trim()}" ako text
                                  </button>
                                )}

                                {!brandSearch.trim() &&
                                  filteredBrandSuggestions.userBrands.length === 0 &&
                                  filteredBrandSuggestions.globalBrands.length === 0 &&
                                  favoriteBaits.length === 0 &&
                                  recentBaits.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">
                                    Začnite písať pre vyhľadávanie...
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Flavor Combobox - show when brand is selected (user or global) */}
                          {selectedManufacturerId && (selectedManufacturer || selectedUserBrand) && (
                            <div className="relative">
                              <Input
                                ref={flavorInputRef}
                                placeholder={`Príchuť od ${selectedManufacturer?.name || selectedUserBrand?.name}...`}
                                value={flavorSearch}
                                onChange={(e) => {
                                  setFlavorSearch(e.target.value);
                                  setShowFlavorDropdown(true);
                                  if (selectedFlavorId) {
                                    setSelectedFlavorId(null);
                                  }
                                }}
                                onFocus={() => setShowFlavorDropdown(true)}
                                className="bg-slate-800/80 border-border/50 text-foreground placeholder:text-muted-foreground"
                                autoComplete="off"
                              />
                              {flavorSearch && (
                                <button
                                  type="button"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    setFlavorSearch("");
                                    setSelectedFlavorId(null);
                                    field.onChange("");
                                    flavorInputRef.current?.focus();
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {showFlavorDropdown && (
                                <div
                                  ref={flavorDropdownRef}
                                  className="absolute z-[100] top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
                                >
                                  {filteredFlavorSuggestions.map((flavor: any) => (
                                    <button
                                      key={flavor.id}
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        setSelectedFlavorId(flavor.id);
                                        const displayName = baitSource === "global" && flavor.productLine
                                          ? `${flavor.productLine} - ${flavor.name}`
                                          : flavor.name;
                                        setFlavorSearch(displayName);
                                        setShowFlavorDropdown(false);
                                      }}
                                    >
                                      {baitSource === "global" && flavor.productLine && (
                                        <span className="text-muted-foreground">{flavor.productLine} – </span>
                                      )}
                                      {flavor.name}
                                    </button>
                                  ))}

                                  {/* CTA: Add flavor for user brands */}
                                  {flavorSearch.trim() && filteredFlavorSuggestions.length === 0 && baitSource === "user" && selectedManufacturerId && (
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-sm text-orange-400 hover:bg-muted/50 transition-colors flex items-center gap-2"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        createUserFlavorMutation.mutate({
                                          brandId: selectedManufacturerId,
                                          name: flavorSearch.trim(),
                                        });
                                      }}
                                      disabled={createUserFlavorMutation.isPending}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      {createUserFlavorMutation.isPending
                                        ? "Pridávam..."
                                        : `Pridať príchuť „${flavorSearch.trim()}"`}
                                    </button>
                                  )}

                                  {/* Fallback for global brands: use as free text */}
                                  {flavorSearch.trim() && filteredFlavorSuggestions.length === 0 && baitSource === "global" && selectedManufacturer && (
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-sm text-orange-400 hover:bg-muted/50 transition-colors flex items-center gap-2"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        field.onChange(`${selectedManufacturer.name} - ${flavorSearch.trim()}`);
                                        setShowFlavorDropdown(false);
                                      }}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Použiť „{flavorSearch.trim()}"
                                    </button>
                                  )}

                                  {!flavorSearch.trim() && filteredFlavorSuggestions.length === 0 && (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">
                                      Žiadne príchute. Začnite písať.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Diameter selector + Favorite toggle - show when flavor is selected */}
                          {selectedManufacturerId && selectedFlavorId && (
                            <div className="flex items-center gap-2">
                              <Select
                                value={selectedDiameter}
                                onValueChange={(val) => setSelectedDiameter(val === "none" ? "" : val)}
                              >
                                <SelectTrigger className="bg-slate-800/80 border-border/50 text-foreground flex-1">
                                  <SelectValue placeholder="Priemer (mm)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Bez priemeru</SelectItem>
                                  <SelectSeparator />
                                  {commonDiameters.map((d) => (
                                    <SelectItem key={d} value={d}>{d}mm</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {baitSource === "global" && (
                                <button
                                  type="button"
                                  onClick={handleToggleFavorite}
                                  disabled={toggleFavoriteMutation.isPending || addFavoriteMutation.isPending}
                                  className={cn(
                                    "p-2 rounded-lg border transition-colors shrink-0",
                                    currentFavorite
                                      ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
                                      : "border-border/50 bg-slate-800/80 text-muted-foreground hover:text-amber-500 hover:border-amber-500/30"
                                  )}
                                  title={currentFavorite ? "Odobrať z obľúbených" : "Pridať do obľúbených"}
                                >
                                  <Star className={cn("h-4 w-4", currentFavorite && "fill-amber-500")} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Spot / Revír */}
                  <FormField
                    control={form.control}
                    name="spot"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold text-muted-foreground ml-1">
                          Revír
                        </FormLabel>
                        <FishingAreaSelect
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Nickname */}
                  <FormField
                    control={form.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold text-muted-foreground ml-1">
                          Prezývka ryby
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="napr. Šupináč zo zátoky"
                            className="bg-slate-800/80 border-border/50 text-foreground"
                            maxLength={40}
                            data-testid="input-nickname"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold text-muted-foreground ml-1">
                          Poznámky
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Montáž, teplota vody, hĺbka, postrehy…"
                            className="resize-none bg-slate-800/80 border-border/50 text-foreground min-h-[60px]"
                            rows={2}
                            data-testid="textarea-notes"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* 5. PREMIUM DATA - Subdued Row */}
              <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-border/30 bg-muted/20">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Počasie pri zábere
                  </span>
                  <div className="flex gap-3 mt-1 opacity-60">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3" strokeWidth={1.75} /> GPS
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CloudRain className="h-3 w-3" strokeWidth={1.75} /> Počasie
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={
                    isPremium
                      ? getLocationAndWeather
                      : () => setShowGpsPremiumModal(true)
                  }
                  disabled={
                    isPremium && (isLoadingWeather || weatherDataLoaded)
                  }
                  className="text-[10px] font-bold h-8 px-3"
                  data-testid="button-get-location-weather"
                >
                  {isLoadingWeather ? (
                    <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.75} />
                  ) : weatherDataLoaded ? (
                    "Načítané ✔"
                  ) : isPremium ? (
                    "Načítať"
                  ) : (
                    <>
                      <Lock className="h-3 w-3 mr-1" strokeWidth={1.75} />
                      Premium
                    </>
                  )}
                </Button>
              </div>

              {/* 6. CTA BUTTONS */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 font-bold text-xs uppercase tracking-wide"
                >
                  Zrušiť
                </Button>
                <Button
                  type="submit"
                  className="flex-[2] bg-[#F97316] hover:bg-[#EA580C] font-bold text-xs uppercase tracking-wide"
                  disabled={
                    createCatchMutation.isPending ||
                    updateCatchMutation.isPending
                  }
                  data-testid="button-submit-catch"
                >
                  {createCatchMutation.isPending ||
                  updateCatchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" strokeWidth={1.75} />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" strokeWidth={1.75} />
                  )}
                  {editingCatch ? "Uložiť zmeny" : "Zapísať úlovok"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>

        {/* GPS Premium Upsell Modal */}
        <PremiumUpsellModal
          isOpen={showGpsPremiumModal}
          onClose={() => setShowGpsPremiumModal(false)}
          trigger="gps"
        />
      </Dialog>

      {/* Badge Celebration Modal - Outside Dialog so it persists after form closes */}
      <BadgeCelebrationModal
        badge={currentBadge}
        onClose={handleBadgeModalClose}
      />
    </>
  );
}
