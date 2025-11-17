import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Grid3x3, ChevronLeft, ChevronRight, X, Search, Fish, Calendar } from "lucide-react";
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
    <DiaryLayout>
      <div className="p-3 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/diary/trips/${id}`)}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Späť
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                  <Grid3x3 className="w-6 h-6 md:w-8 md:h-8" />
                  Galéria fotiek
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {trip?.name} • {filteredPhotos.length} fotiek
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Hľadať podľa druhu alebo rybára..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-photos"
                  />
                </div>

                {/* Fish Type Filter */}
                <Select value={filterFishType} onValueChange={setFilterFishType}>
                  <SelectTrigger data-testid="select-fish-type-filter">
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

                {/* Stats */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {catches.length} úlovkov • {allPhotos.length} celkovo fotiek
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo Grid */}
          {filteredPhotos.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Fish className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg">
                  {searchTerm || filterFishType !== "all" 
                    ? "Žiadne fotky nezodpovedajú filtrom"
                    : "V tejto výprave zatiaľ nie sú žiadne fotky"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filteredPhotos.map((photo, index) => (
                <Card
                  key={`${photo.catchId}-${index}`}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                  onClick={() => setSelectedPhotoIndex(index)}
                  data-testid={`photo-card-${index}`}
                >
                  <div className="aspect-square relative">
                    <img
                      src={photo.url}
                      alt={getFishTypeLabel(photo.fishType)}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay with info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <p className="font-semibold text-sm truncate">
                          {getFishTypeLabel(photo.fishType)}
                        </p>
                        <p className="text-xs opacity-90">
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

      {/* Lightbox Slideshow */}
      <Dialog open={selectedPhotoIndex !== null} onOpenChange={() => setSelectedPhotoIndex(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-0">
          {selectedPhotoIndex !== null && filteredPhotos[selectedPhotoIndex] && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedPhotoIndex(null)}
                className="absolute top-4 right-4 z-20 text-white hover:bg-white/10"
                data-testid="button-close-lightbox"
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Navigation buttons */}
              {filteredPhotos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevPhoto();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/10 h-12 w-12"
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/10 h-12 w-12"
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
                className="max-w-full max-h-full object-contain"
                data-testid="lightbox-image"
              />

              {/* Photo info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                <div className="max-w-4xl mx-auto">
                  <h3 className="text-xl md:text-2xl font-bold mb-2">
                    {getFishTypeLabel(filteredPhotos[selectedPhotoIndex].fishType)}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm md:text-base opacity-90">
                    <span>{filteredPhotos[selectedPhotoIndex].weight} kg</span>
                    <span>•</span>
                    <span>{filteredPhotos[selectedPhotoIndex].angler.name}</span>
                    <span>•</span>
                    <span>
                      {format(filteredPhotos[selectedPhotoIndex].capturedAt, "d. MMMM yyyy, HH:mm", { locale: sk })}
                    </span>
                    <span>•</span>
                    <span className="opacity-60">
                      {selectedPhotoIndex + 1} / {filteredPhotos.length}
                    </span>
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
