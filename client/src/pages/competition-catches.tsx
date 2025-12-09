import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";
import { ArrowLeft, Fish, Calendar, Weight, Clock, User, Camera, X } from "lucide-react";
import type { Catch, Team, Referee, Competition } from "@shared/schema";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { getCountryFlag } from "@/lib/countries";

interface CatchWithDetails extends Catch {
  team?: Team;
  referee?: Referee;
}

export default function CompetitionCatches() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; teamName: string; weight: string; fishType: string } | null>(null);

  // Fetch competition details
  const { data: competition, isLoading: competitionLoading } = useQuery<Competition>({
    queryKey: ['/api/competitions', id],
    enabled: !!id,
  });

  // Fetch all catches for the competition
  const { data: catches, isLoading: catchesLoading } = useQuery<CatchWithDetails[]>({
    queryKey: ['/api/competitions', id, 'catches'],
    enabled: !!id,
  });

  // Group catches by date
  const groupedCatches = catches?.reduce((groups, catch_) => {
    const submittedDate = catch_.submittedAt ? new Date(catch_.submittedAt) : null;
    if (!submittedDate || isNaN(submittedDate.getTime())) {
      // Skip catches with invalid dates
      return groups;
    }
    const date = format(submittedDate, 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(catch_);
    return groups;
  }, {} as Record<string, CatchWithDetails[]>) || {};

  // Get unique dates sorted by most recent first
  const availableDates = Object.keys(groupedCatches).sort((a, b) => b.localeCompare(a));

  // Filter catches by selected date or show all
  const filteredCatches = selectedDate 
    ? groupedCatches[selectedDate] || []
    : catches || [];

  const getFishTypeLabel = (fishType: string) => {
    switch (fishType) {
      case 'scaly': return 'Šupináč';
      case 'mirror': return 'Lysec';
      default: return fishType;
    }
  };

  const getSectorBadgeColor = (sector: string) => {
    const colors = {
      'A': 'bg-primary/10 text-primary',
      'B': 'bg-secondary/10 text-secondary', 
      'C': 'bg-accent/10 text-accent',
    };
    return colors[sector as keyof typeof colors] || 'bg-muted/50';
  };

  const getFishTypeBadgeColor = (fishType: string) => {
    const colors = {
      'scaly': 'bg-emerald-500 text-white', // Šupináč - zelená
      'mirror': 'bg-blue-500 text-white',   // Lysec - modrá
    };
    return colors[fishType as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  if (competitionLoading || catchesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-blue-950 dark:via-gray-900 dark:to-green-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              className="mb-4 hover:bg-primary/10"
              onClick={() => navigate(`/competition/${id}`)}
              data-testid="button-back-to-competition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Späť na súťaž
            </Button>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
                Všetky úlovky
              </h1>
              {competition && (
                <p className="text-xl text-muted-foreground" data-testid="text-competition-name">
                  {competition.name}
                </p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Fish className="w-4 h-4" />
                <span data-testid="text-total-catches">
                  Celkom úlovkov: {catches?.length || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Date Filter Buttons */}
          {availableDates.length > 1 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Filtrovať podľa dňa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedDate === null ? "default" : "outline"}
                    onClick={() => setSelectedDate(null)}
                    data-testid="button-filter-all"
                  >
                    Všetky dni ({catches?.length || 0})
                  </Button>
                  {availableDates.map(date => (
                    <Button
                      key={date}
                      variant={selectedDate === date ? "default" : "outline"}
                      onClick={() => setSelectedDate(date)}
                      data-testid={`button-filter-date-${date}`}
                    >
                      {format(new Date(date), 'd. MMMM yyyy', { locale: sk })} ({groupedCatches[date].length})
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Catches Table */}
          {filteredCatches.length > 0 ? (
            <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-background via-background to-muted/20">
              <Table data-testid="table-catches">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-b-2 border-primary/10">
                    <TableHead className="w-[140px] font-bold text-foreground py-4">Hmotnosť</TableHead>
                    <TableHead className="font-bold text-foreground py-4">Druh</TableHead>
                    <TableHead className="font-bold text-foreground py-4">Tím</TableHead>
                    <TableHead className="font-bold text-foreground py-4">Sektor</TableHead>
                    <TableHead className="font-bold text-foreground py-4">Čas úlovku</TableHead>
                    <TableHead className="font-bold text-foreground py-4">Fotografia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCatches.map((catch_, index) => (
                    <TableRow 
                      key={catch_.id} 
                      className={`
                        ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                        hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5
                        transition-all duration-300 ease-in-out
                        hover:shadow-lg hover:scale-[1.01]
                        border-b border-border/50
                      `}
                      data-testid={`row-catch-${catch_.id}`}
                    >
                      <TableCell className="font-bold text-primary py-4">
                        <div className="flex items-center gap-1">
                          <Weight className="w-4 h-4 text-primary" />
                          <span data-testid={`text-catch-weight-${catch_.id}`} className="font-bold">
                            {catch_.weight} kg
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge 
                          className={`${getFishTypeBadgeColor(catch_.fishType)} font-semibold px-3 py-1 rounded-full shadow-sm hover:shadow-md transition-shadow`}
                          data-testid={`badge-fish-type-${catch_.id}`}
                        >
                          {getFishTypeLabel(catch_.fishType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        {catch_.team ? (
                          <Link href={`/team/${catch_.team.id}`} data-testid={`link-catch-team-${catch_.id}`}>
                            <div className="group flex items-center gap-2 p-2 rounded-lg hover:bg-accent/10 transition-all duration-200">
                              <img 
                                src={getCountryFlag(catch_.team.country || 'SK')} 
                                alt={`Vlajka ${catch_.team.country || 'SK'}`}
                                className="w-6 h-4 object-cover rounded-sm border border-gray-200"
                                title={`Krajina: ${catch_.team.country || 'SK'}`}
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  const span = document.createElement('span');
                                  span.textContent = '🏳️';
                                  span.className = 'text-lg';
                                  e.currentTarget.parentNode?.insertBefore(span, e.currentTarget);
                                }}
                              />
                              <span className="font-semibold group-hover:text-accent cursor-pointer transition-colors">
                                {catch_.team.name}
                              </span>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic">Neznámy tím</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <Link href={`/competition/${id}/sector/${catch_.sector}`} data-testid={`link-catch-sector-${catch_.id}`}>
                          <Badge className={`${getSectorBadgeColor(catch_.sector)} hover:scale-105 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md font-bold px-4 py-2 rounded-full border-2 border-current/20`}>
                            Sektor {catch_.sector}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span data-testid={`text-catch-time-${catch_.id}`} className="text-sm font-medium">
                            {(() => {
                              const submittedDate = catch_.submittedAt ? new Date(catch_.submittedAt) : null;
                              if (!submittedDate || isNaN(submittedDate.getTime())) {
                                return 'Neznámy čas';
                              }
                              return format(submittedDate, 'HH:mm:ss, d.M.yyyy', { locale: sk });
                            })()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {catch_.photoUrl ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="relative w-12 h-12 rounded-xl overflow-hidden cursor-pointer hover:ring-4 hover:ring-primary/30 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl group"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedPhoto({
                                  url: catch_.photoUrl!,
                                  teamName: catch_.team?.name || 'Neznámy tím',
                                  weight: `${catch_.weight} kg`,
                                  fishType: getFishTypeLabel(catch_.fishType)
                                });
                              }}
                              data-testid={`img-catch-photo-${catch_.id}`}
                            >
                              <img 
                                src={catch_.photoUrl} 
                                alt="Úlovok" 
                                className="w-full h-full object-cover pointer-events-none group-hover:scale-110 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                            <Camera className="w-5 h-5 text-emerald-500 drop-shadow-sm" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                            <Camera className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Bez fotografie</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Fish className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {selectedDate ? "Žiadne úlovky v tento deň" : "Zatiaľ žiadne úlovky"}
                </h3>
                <p className="text-muted-foreground">
                  {selectedDate 
                    ? `V dňoch ${format(new Date(selectedDate), 'd. MMMM yyyy', { locale: sk })} neboli zaznamenané žiadne úlovky.`
                    : "Počkajte na prvé úlovky od účastníkov súťaže."
                  }
                </p>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Photo Modal */}
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0" aria-describedby="catch-photo-description">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-50 bg-black/20 text-white hover:bg-black/40"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              
              {selectedPhoto && (
                <div className="flex flex-col">
                  <div className="relative">
                    <img 
                      src={selectedPhoto.url}
                      alt="Zväčšená fotka úlovku"
                      className="w-full h-auto max-h-[70vh] object-contain"
                    />
                  </div>
                  
                  <div className="p-6 bg-background border-t">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-foreground">
                        {selectedPhoto.teamName}
                      </DialogTitle>
                      <p id="catch-photo-description" className="text-sm text-muted-foreground mb-2">
                        Detail úlovku s váhou a typom ryby
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="font-mono text-2xl text-accent font-bold">
                          {selectedPhoto.weight}
                        </div>
                        <Badge variant="outline" className="text-base px-3 py-1">
                          {selectedPhoto.fishType}
                        </Badge>
                      </div>
                    </DialogHeader>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}