import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { ArrowLeft, MapPin, Calendar as CalendarIcon, Fish, Weight, Trophy, FileText, Medal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DiaryLayout from "@/components/DiaryLayout";

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
          <Button
            variant="ghost"
            onClick={() => setLocation("/diary/trips")}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Späť na výpravy
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-trip-name">
              {trip.name}
            </h1>
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
                          onClick={() => setLocation(`/diary/catches/${catch_.id}`)}
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
                          {remainingCatches.map((catch_, index) => (
                            <TableRow 
                              key={catch_.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setLocation(`/diary/catches/${catch_.id}`)}
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
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DiaryLayout>
  );
}
