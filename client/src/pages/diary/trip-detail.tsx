import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, isPast, isToday } from "date-fns";
import { sk } from "date-fns/locale";
import { ArrowLeft, MapPin, Calendar as CalendarIcon, Fish, Weight, Trophy, FileText, Medal, Ruler, Target, Cloud, Thermometer, Wind, Gauge, XCircle, Download } from "lucide-react";
import html2canvas from "html2canvas";
import contestioLogo from "@assets/contestio logo_1760283270014.png";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DiaryLayout from "@/components/DiaryLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import type { DiaryTrip, DiaryCatch } from "@shared/schema";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";

// Function to get fish icon color based on fish type
const getFishIconColor = (fishType?: string) => {
  if (!fishType) return "text-blue-400";
  
  if (fishType.includes("kapor")) return "text-yellow-400";
  if (fishType.includes("stuka")) return "text-green-400";
  if (fishType.includes("sumec")) return "text-purple-400";
  if (fishType.includes("amur")) return "text-emerald-400";
  if (fishType.includes("pstruh")) return "text-pink-400";
  if (fishType.includes("zubac")) return "text-orange-400";
  
  return "text-blue-400";
};

export default function TripDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [selectedCatch, setSelectedCatch] = useState<DiaryCatch | null>(null);
  const [showAllCatches, setShowAllCatches] = useState(false);
  const [showEndTripDialog, setShowEndTripDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportCardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch trip detail
  const { data: trip, isLoading: tripLoading } = useQuery<DiaryTrip>({
    queryKey: ["/api/diary/trips", id],
    enabled: !!id
  });

  // Fetch all catches for this trip
  const { data: allCatches = [] } = useQuery<DiaryCatch[]>({
    queryKey: ["/api/diary/catches", "all"],
    enabled: !!id
  });

  // End trip mutation
  const endTripMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/diary/trips/${id}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
      setShowEndTripDialog(false);
      toast({
        title: "Výprava ukončená",
        description: "Výprava bola úspešne ukončená dnešným dátumom.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa ukončiť výpravu",
        variant: "destructive",
      });
    }
  });

  // Export trip as image
  const handleExportTrip = async () => {
    if (!exportCardRef.current || !trip) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportCardRef.current, {
        backgroundColor: '#0c1f28',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `${trip.name.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({
        title: "Export úspešný!",
        description: "Výprava bola exportovaná ako obrázok.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa exportovať výpravu",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Filter catches for this trip
  const tripCatches = allCatches.filter(c => c.tripId === id);

  // Calculate statistics
  const totalCatches = tripCatches.length;
  const totalWeight = tripCatches.reduce((sum, c) => sum + parseFloat(c.weight), 0);
  const biggestCatch = totalCatches > 0 
    ? tripCatches.reduce((max, c) => parseFloat(c.weight) > parseFloat(max.weight) ? c : max)
    : null;

  // Sort catches by weight (descending) and split into TOP 3 and rest
  const sortedCatches = [...tripCatches].sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight));
  const top3Catches = sortedCatches.slice(0, 3);
  const remainingCatches = sortedCatches.slice(3);
  
  // Limit displayed catches to 10 when not expanded
  const displayedCatches = showAllCatches ? remainingCatches : remainingCatches.slice(0, 10);
  const hasMoreCatches = remainingCatches.length > 10;

  if (tripLoading) {
    return (
      <DiaryLayout>
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </DiaryLayout>
    );
  }

  if (!trip) {
    return (
      <DiaryLayout>
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Výprava sa nenašla</p>
            <Button 
              onClick={() => setLocation("/diary/trips")} 
              className="mt-4"
              data-testid="button-back-to-trips"
            >
              Späť na výpravy
            </Button>
          </div>
        </div>
      </DiaryLayout>
    );
  }

  return (
    <DiaryLayout>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6" data-testid="page-trip-detail">
        {/* Hero Section - Back button and Trip Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setLocation("/diary/trips")}
              className="gap-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Späť na výpravy
            </Button>

            <div className="flex gap-2">
              {/* Export Trip Button */}
              <Button
                variant="outline"
                onClick={handleExportTrip}
                disabled={isExporting}
                className="gap-2"
                data-testid="button-export-trip"
              >
                <Download className="w-4 h-4" />
                {isExporting ? "Exportujem..." : "Exportovať ako obrázok"}
              </Button>

              {/* End Trip Button - only show if trip is not ended yet */}
              {trip && !isPast(new Date(trip.endDate)) && !isToday(new Date(trip.endDate)) && (
                <Button
                  variant="outline"
                  onClick={() => setShowEndTripDialog(true)}
                  disabled={endTripMutation.isPending}
                  className="gap-2 text-orange-600 hover:text-orange-700 border-orange-600 hover:border-orange-700"
                  data-testid="button-end-trip"
                >
                  <XCircle className="w-4 h-4" />
                  {endTripMutation.isPending ? "Ukončujem..." : "Ukončiť výpravu"}
                </Button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-trip-name">
                {trip.name}
              </h1>
              {/* Badge for ended trip */}
              {(isPast(new Date(trip.endDate)) || isToday(new Date(trip.endDate))) && (
                <Badge variant="secondary" className="text-xs">
                  Ukončená
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span data-testid="text-trip-dates">
                  {format(new Date(trip.startDate), "d. MMM", { locale: sk })} - {format(new Date(trip.endDate), "d. MMM yyyy", { locale: sk })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span data-testid="text-trip-location">{trip.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Počet úlovkov</CardTitle>
              <Fish className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-catches">{totalCatches}</div>
              <p className="text-xs text-muted-foreground">
                {totalCatches === 0 ? "Zatiaľ žiadne" : totalCatches === 1 ? "1 úlovok" : `${totalCatches} úlovkov`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Celková váha</CardTitle>
              <Weight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-weight">{totalWeight.toFixed(1)} kg</div>
              <p className="text-xs text-muted-foreground">
                Priemerná: {totalCatches > 0 ? (totalWeight / totalCatches).toFixed(1) : "0"} kg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Najväčší úlovok</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-biggest-catch">
                {biggestCatch ? `${parseFloat(biggestCatch.weight).toFixed(1)} kg` : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                {biggestCatch ? getFishTypeLabel(biggestCatch.fishType) : "Žiadny úlovok"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Notes Section */}
        {trip.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Poznámky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap" data-testid="text-trip-notes">
                {trip.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Catches Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fish className="w-5 h-5" />
              Úlovky z výpravy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {totalCatches === 0 ? (
              <div className="text-center py-8" data-testid="empty-catches">
                <Fish className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Zatiaľ tu nie sú žiadne úlovky z tejto výpravy
                </p>
              </div>
            ) : (
              <>
                {/* TOP 3 Catches - Cards */}
                {top3Catches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Medal className="w-5 h-5 text-yellow-500" />
                      <h3 className="font-semibold text-lg">TOP {top3Catches.length} najväčšie úlovky</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {top3Catches.map((catch_, index) => (
                        <Card 
                          key={catch_.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow relative"
                          onClick={() => setSelectedCatch(catch_)}
                          data-testid={`card-top-catch-${catch_.id}`}
                        >
                          {/* Medal Badge */}
                          <div className="absolute top-2 right-2 z-10">
                            <Badge 
                              variant={index === 0 ? "default" : "secondary"}
                              className={index === 0 ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                            >
                              #{index + 1}
                            </Badge>
                          </div>

                          <CardContent className="p-4">
                            {/* Photo if available */}
                            {catch_.photos && catch_.photos.length > 0 && (
                              <div className="mb-3 rounded-lg overflow-hidden bg-muted">
                                <img 
                                  src={typeof catch_.photos[0] === 'string' ? catch_.photos[0] : catch_.photos[0].url}
                                  alt={getFishTypeLabel(catch_.fishType)}
                                  className="w-full h-40 object-cover"
                                />
                              </div>
                            )}

                            {/* Fish Type Badge */}
                            <div className="flex items-center gap-2 mb-2">
                              <Fish className={`w-4 h-4 ${getFishIconColor(catch_.fishType)}`} />
                              <Badge variant="secondary" className="font-medium">
                                {getFishTypeLabel(catch_.fishType)}
                              </Badge>
                            </div>

                            {/* Weight and Length */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Váha:</span>
                                <span className="font-semibold text-lg">{parseFloat(catch_.weight).toFixed(1)} kg</span>
                              </div>
                              {catch_.lengthCm && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Dĺžka:</span>
                                  <span className="font-semibold">{catch_.lengthCm} cm</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Čas:</span>
                                <span className="text-sm">
                                  {format(new Date(catch_.capturedAt), "HH:mm", { locale: sk })}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remaining Catches - Table */}
                {remainingCatches.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Ostatné úlovky ({remainingCatches.length})</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Druh ryby</TableHead>
                            <TableHead className="text-right">Váha</TableHead>
                            <TableHead className="text-right">Dĺžka</TableHead>
                            <TableHead className="text-right">Čas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedCatches.map((catch_, index) => (
                            <TableRow 
                              key={catch_.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedCatch(catch_)}
                              data-testid={`row-catch-${catch_.id}`}
                            >
                              <TableCell className="font-medium text-muted-foreground">
                                {index + 4}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Fish className={`w-4 h-4 ${getFishIconColor(catch_.fishType)}`} />
                                  <span>{getFishTypeLabel(catch_.fishType)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {parseFloat(catch_.weight).toFixed(1)} kg
                              </TableCell>
                              <TableCell className="text-right">
                                {catch_.lengthCm ? `${catch_.lengthCm} cm` : "—"}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {format(new Date(catch_.capturedAt), "HH:mm", { locale: sk })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Show All Button */}
                    {hasMoreCatches && !showAllCatches && (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          onClick={() => setShowAllCatches(true)}
                          data-testid="button-show-all-catches"
                        >
                          Zobraziť všetky úlovky ({remainingCatches.length})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Sheet open={!!selectedCatch} onOpenChange={(open) => !open && setSelectedCatch(null)}>
          <SheetContent className="w-full sm:max-w-md bg-slate-800 border text-white overflow-y-auto" data-testid="catch-detail-panel">
            <SheetHeader className="pb-6">
              <SheetTitle className="text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center">
                  <Fish className={`w-5 h-5 ${getFishIconColor(selectedCatch?.fishType)}`} />
                </div>
                {selectedCatch?.fishType ? getFishTypeLabel(selectedCatch.fishType) : 'Detail úlovku'}
              </SheetTitle>
            </SheetHeader>

            {selectedCatch && (
              <div className="space-y-6">
                {/* Photo Display */}
                {selectedCatch.photos && selectedCatch.photos.length > 0 && (
                  <div className="rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={typeof selectedCatch.photos[0] === 'string' ? selectedCatch.photos[0] : selectedCatch.photos[0].url}
                      alt={getFishTypeLabel(selectedCatch.fishType)}
                      className="w-full h-64 object-cover"
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
                  <div className="border-t border-slate-700 pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Cloud className="w-5 h-5 text-slate-400" />
                      <div className="text-sm text-slate-400">Podmienky počasia</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(selectedCatch.waterTemp !== null && selectedCatch.waterTemp !== undefined) && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Thermometer className="w-4 h-4" />
                            <span className="text-xs">Teplota vody</span>
                          </div>
                          <div className="font-semibold" data-testid="detail-water-temp">{selectedCatch.waterTemp}°C</div>
                        </div>
                      )}
                      {(selectedCatch.airTemp !== null && selectedCatch.airTemp !== undefined) && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Thermometer className="w-4 h-4" />
                            <span className="text-xs">Teplota vzduchu</span>
                          </div>
                          <div className="font-semibold" data-testid="detail-air-temp">{selectedCatch.airTemp}°C</div>
                        </div>
                      )}
                      {(selectedCatch.windSpeed !== null && selectedCatch.windSpeed !== undefined) && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Wind className="w-4 h-4" />
                            <span className="text-xs">Vietor</span>
                          </div>
                          <div className="font-semibold" data-testid="detail-wind-speed">{selectedCatch.windSpeed} km/h</div>
                        </div>
                      )}
                      {(selectedCatch.airPressure !== null && selectedCatch.airPressure !== undefined) && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Gauge className="w-4 h-4" />
                            <span className="text-xs">Tlak vzduchu</span>
                          </div>
                          <div className="font-semibold" data-testid="detail-air-pressure">{selectedCatch.airPressure} hPa</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* End Trip Confirmation Dialog */}
        <AlertDialog open={showEndTripDialog} onOpenChange={setShowEndTripDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ukončiť výpravu?</AlertDialogTitle>
              <AlertDialogDescription>
                Táto akcia nastaví dátum ukončenia výpravy na dnešný deň. Výpravu bude možné neskôr upraviť, ak bude potrebné.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-end-trip">Zrušiť</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => endTripMutation.mutate()}
                disabled={endTripMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="button-confirm-end-trip"
              >
                {endTripMutation.isPending ? "Ukončujem..." : "Ukončiť výpravu"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Hidden Export Card */}
        <div 
          ref={exportCardRef}
          className="absolute left-[-9999px] w-[1200px] bg-[#0c1f28] p-12"
          data-testid="export-card"
        >
          {trip && (
            <div className="space-y-8">
              {/* Header */}
              <div className="text-center space-y-4 border-b border-slate-700 pb-8">
                <h1 className="text-5xl font-bold text-white">
                  {trip.name}
                </h1>
                <div className="flex items-center justify-center gap-6 text-slate-300 text-xl">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-6 h-6" />
                    <span>
                      {format(new Date(trip.startDate), "d. MMM", { locale: sk })} - {format(new Date(trip.endDate), "d. MMM yyyy", { locale: sk })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-6 h-6" />
                    <span>{trip.location}</span>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-slate-800/50 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-white mb-2">{totalCatches}</div>
                  <div className="text-slate-400 text-lg">
                    {totalCatches === 0 ? "Úlovkov" : totalCatches === 1 ? "Úlovok" : "Úlovkov"}
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-white mb-2">{totalWeight.toFixed(1)} kg</div>
                  <div className="text-slate-400 text-lg">Celková váha</div>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {biggestCatch ? parseFloat(biggestCatch.weight).toFixed(1) : "0"} kg
                  </div>
                  <div className="text-slate-400 text-lg">Najväčší úlovok</div>
                </div>
              </div>

              {/* TOP 3 Catches */}
              {top3Catches.length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-white text-center">TOP 3 Úlovky</h2>
                  <div className="grid grid-cols-3 gap-6">
                    {top3Catches.map((catch_, index) => (
                      <div 
                        key={catch_.id}
                        className="bg-slate-800/50 rounded-2xl overflow-hidden"
                      >
                        {/* Photo */}
                        {catch_.photos && catch_.photos.length > 0 ? (
                          <img 
                            src={typeof catch_.photos[0] === 'string' ? catch_.photos[0] : catch_.photos[0].url}
                            alt={getFishTypeLabel(catch_.fishType)}
                            className="w-full aspect-[4/3] object-contain bg-slate-700"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="w-full aspect-[4/3] bg-slate-700 flex items-center justify-center">
                            <Fish className={`w-16 h-16 ${getFishIconColor(catch_.fishType)}`} />
                          </div>
                        )}

                        {/* Info */}
                        <div className="p-6 space-y-3">
                          <div className="text-center">
                            <div className="text-sm text-slate-400 mb-1">
                              {getFishTypeLabel(catch_.fishType)}
                            </div>
                            <div className="text-3xl font-bold text-white">
                              {parseFloat(catch_.weight).toFixed(1)} kg
                            </div>
                            {catch_.lengthCm && (
                              <div className="text-slate-400 mt-1">
                                {catch_.lengthCm} cm
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-center pt-8 border-t border-slate-700">
                <img 
                  src={contestioLogo} 
                  alt="Contestio" 
                  className="h-12 object-contain"
                  crossOrigin="anonymous"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </DiaryLayout>
  );
}
