import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Grid3x3, ChevronLeft, ChevronRight, X, Search, Fish, Calendar, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import DiaryLayout from "@/components/DiaryLayout";
import type { DiaryCatch, DiaryTrip } from "@shared/schema";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

interface PhotoWithCatch {
  url: string;
  catchId: string;
  fishType: string;
  weight: string;
  capturedAt: Date;
  angler: { name: string };
}

export default function TripGallery() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFishType, setFilterFishType] = useState<string>("all");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  
  // Count active filters for mobile badge
  const activeFilterCount = filterFishType !== "all" ? 1 : 0;

  // Fetch trip data
  const { data: trip } = useQuery<DiaryTrip>({
    queryKey: ['/api/diary/trips', id],
    enabled: !!id && !!user,
  });

  // Fetch all catches and filter for this trip
  const { data: allCatches = [] } = useQuery<DiaryCatch[]>({
    queryKey: ['/api/diary/catches/all'],
    enabled: !!id && !!user,
  });

  // Filter catches for this trip
  const catches = useMemo(() => {
    return allCatches.filter(c => c.tripId === id);
  }, [allCatches, id]);

  // Extract all photos with their catch data
  const allPhotos = useMemo(() => {
    const photos: PhotoWithCatch[] = [];
    catches.forEach(catch_ => {
      if (catch_.photos && catch_.photos.length > 0) {
        catch_.photos.forEach(photo => {
          photos.push({
            url: typeof photo === 'string' ? photo : photo.url,
            catchId: catch_.id,
            fishType: catch_.fishType,
            weight: catch_.weight,
            capturedAt: new Date(catch_.capturedAt),
            angler: catch_.angler,
          });
        });
      }
    });
    return photos;
  }, [catches]);

  // Get unique fish types for filter
  const fishTypes = useMemo(() => {
    const types = new Set(catches.map(c => c.fishType));
    return Array.from(types);
  }, [catches]);

  // Filter photos
  const filteredPhotos = useMemo(() => {
    return allPhotos.filter(photo => {
      const matchesSearch = getFishTypeLabel(photo.fishType).toLowerCase().includes(searchTerm.toLowerCase()) ||
                           photo.angler.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFishType = filterFishType === "all" || photo.fishType === filterFishType;
      
      return matchesSearch && matchesFishType;
    });
  }, [allPhotos, searchTerm, filterFishType]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedPhotoIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setSelectedPhotoIndex(prev => 
          prev === 0 ? filteredPhotos.length - 1 : (prev ?? 0) - 1
        );
      } else if (e.key === "ArrowRight") {
        setSelectedPhotoIndex(prev => 
          (prev ?? 0) === filteredPhotos.length - 1 ? 0 : (prev ?? 0) + 1
        );
      } else if (e.key === "Escape") {
        setSelectedPhotoIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, filteredPhotos.length]);

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex(prev => 
      prev === 0 ? filteredPhotos.length - 1 : (prev ?? 0) - 1
    );
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex(prev => 
      (prev ?? 0) === filteredPhotos.length - 1 ? 0 : (prev ?? 0) + 1
    );
  };

  return (
    <DiaryLayout fullBleed={true}>
      <div className="p-3 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Compact Sticky Header with Filters */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-3 md:-mx-6 px-3 md:px-6 py-3 border-b">
            <div className="flex flex-col gap-3">
              {/* Top row: Back button, title, stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation(`/diary/trips/${id}`)}
                    className="h-9 px-2 md:px-3"
                    aria-label="Späť na detail výpravy"
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Späť</span>
                    <span className="sr-only md:hidden">Späť</span>
                  </Button>
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                    <div>
                      <h1 className="text-lg md:text-2xl font-bold text-foreground">
                        Galéria fotiek
                      </h1>
                      <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                        {trip?.name}
                      </p>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filteredPhotos.length} fotiek
                </Badge>
              </div>
              
              {/* Bottom row: Search and filters */}
              <div className="flex gap-2 md:gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Hľadať..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm"
                    data-testid="input-search-photos"
                  />
                </div>

                {/* Mobile Filter Button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="md:hidden h-9 px-3"
                  onClick={() => setIsFilterSheetOpen(true)}
                  aria-label="Otvoriť filtre"
                  data-testid="button-open-filters"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                  <span className="text-sm">Filtre</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>

                {/* Desktop Fish Type Filter */}
                <div className="hidden md:block w-48">
                  <Select value={filterFishType} onValueChange={setFilterFishType}>
                    <SelectTrigger className="h-9" data-testid="select-fish-type-filter">
                      <Fish className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Všetky druhy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všetky druhy</SelectItem>
                      {fishTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {getFishTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile Filter Sheet */}
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5" />
                  Filtrovať fotky
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Druh ryby</label>
                  <Select value={filterFishType} onValueChange={setFilterFishType}>
                    <SelectTrigger className="w-full">
                      <Fish className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Všetky druhy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všetky druhy</SelectItem>
                      {fishTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {getFishTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Mobile Stats */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {catches.length} úlovkov • {allPhotos.length} celkovo fotiek
                  </span>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setFilterFishType("all")}
                    data-testid="button-clear-filters"
                  >
                    Vyčistiť
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => setIsFilterSheetOpen(false)}
                    data-testid="button-apply-filters"
                  >
                    Použiť filtre
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Photo Grid */}
          {filteredPhotos.length === 0 ? (
            <Card className="mt-8">
              <CardContent className="p-8 md:p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Fish className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchTerm || filterFishType !== "all" 
                    ? "Žiadne fotky nezodpovedajú filtrom"
                    : "Zatiaľ žiadne fotky"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  {searchTerm || filterFishType !== "all" 
                    ? "Skúste upraviť vyhľadávanie alebo zrušiť filtre."
                    : "Pridajte úlovky s fotkami do tejto výpravy a zobrazia sa tu."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              {filteredPhotos.map((photo, index) => (
                <Card
                  key={`${photo.catchId}-${index}`}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-in fade-in-50 fill-mode-both"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setSelectedPhotoIndex(index)}
                  data-testid={`photo-card-${index}`}
                >
                  <div className="aspect-square relative group">
                    <img
                      src={photo.url}
                      alt={getFishTypeLabel(photo.fishType)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Always visible overlay with stronger gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 text-white">
                        <p className="font-semibold text-xs md:text-sm truncate drop-shadow-lg">
                          {getFishTypeLabel(photo.fishType)}
                        </p>
                        <p className="text-[10px] md:text-xs opacity-90 drop-shadow-lg">
                          {photo.weight} kg • {photo.angler.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Slideshow with Backdrop Blur */}
      <Dialog open={selectedPhotoIndex !== null} onOpenChange={() => setSelectedPhotoIndex(null)}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 bg-black/90 backdrop-blur-xl border-0">
          {selectedPhotoIndex !== null && filteredPhotos[selectedPhotoIndex] && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button - larger touch target */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedPhotoIndex(null)}
                className="absolute top-3 right-3 md:top-4 md:right-4 z-20 text-white hover:bg-white/20 h-12 w-12 md:h-10 md:w-10 rounded-full bg-black/30"
                aria-label="Zavrieť galériu"
                data-testid="button-close-lightbox"
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Desktop Navigation buttons - sides */}
              {filteredPhotos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevPhoto();
                    }}
                    className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 h-14 w-14 rounded-full bg-black/30"
                    aria-label="Predchádzajúca fotka"
                    data-testid="button-prev-photo"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextPhoto();
                    }}
                    className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 h-14 w-14 rounded-full bg-black/30"
                    aria-label="Nasledujúca fotka"
                    data-testid="button-next-photo"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              {/* Photo */}
              <img
                src={filteredPhotos[selectedPhotoIndex].url}
                alt={getFishTypeLabel(filteredPhotos[selectedPhotoIndex].fishType)}
                className="max-w-full max-h-[calc(100vh-180px)] md:max-h-[calc(100vh-140px)] object-contain"
                data-testid="lightbox-image"
              />

              {/* Mobile bottom navigation - thumb-friendly */}
              {filteredPhotos.length > 1 && (
                <div className="md:hidden absolute bottom-28 left-0 right-0 flex justify-center gap-4 z-20">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevPhoto();
                    }}
                    className="text-white hover:bg-white/20 h-14 w-14 rounded-full bg-black/50"
                    aria-label="Predchádzajúca fotka"
                    data-testid="button-prev-photo-mobile"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextPhoto();
                    }}
                    className="text-white hover:bg-white/20 h-14 w-14 rounded-full bg-black/50"
                    aria-label="Nasledujúca fotka"
                    data-testid="button-next-photo-mobile"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </div>
              )}

              {/* Photo info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 md:p-6 text-white">
                <div className="max-w-4xl mx-auto">
                  <h3 className="text-lg md:text-2xl font-bold mb-1 md:mb-2 drop-shadow-lg">
                    {getFishTypeLabel(filteredPhotos[selectedPhotoIndex].fishType)}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-base opacity-90">
                    <span className="font-semibold">{filteredPhotos[selectedPhotoIndex].weight} kg</span>
                    <span className="hidden md:inline">•</span>
                    <span>{filteredPhotos[selectedPhotoIndex].angler.name}</span>
                    <span className="hidden md:inline">•</span>
                    <span className="text-white/70">
                      {format(filteredPhotos[selectedPhotoIndex].capturedAt, "EEEE, d. MMM yyyy 'o' HH:mm", { locale: sk })}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-white/50">
                    {selectedPhotoIndex + 1} / {filteredPhotos.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DiaryLayout>
  );
}
