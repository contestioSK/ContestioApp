import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Fish, Calendar, Weight, Clock, User, Camera } from "lucide-react";
import type { Catch, Team, Referee, Competition } from "@shared/schema";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

interface CatchWithDetails extends Catch {
  team?: Team;
  referee?: Referee;
}

export default function CompetitionCatches() {
  const { id } = useParams();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
              onClick={() => window.location.href = `/competition/${id}`}
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

          {/* Catches Grid */}
          {filteredCatches.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredCatches.map((catch_) => (
                <Card key={catch_.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-catch-${catch_.id}`}>
                  
                  {/* Photo */}
                  {catch_.photoUrl && (
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={catch_.photoUrl} 
                        alt="Úlovok" 
                        className="w-full h-full object-cover"
                        data-testid={`img-catch-photo-${catch_.id}`}
                      />
                      <div className="absolute top-2 right-2">
                        <Link href={`/competition/${id}/sector/${catch_.sector}`} data-testid={`link-catch-sector-${catch_.id}`}>
                          <Badge className={`${getSectorBadgeColor(catch_.sector)} font-mono hover:opacity-80 cursor-pointer transition-opacity`}>
                            Sektor {catch_.sector}
                          </Badge>
                        </Link>
                      </div>
                    </div>
                  )}

                  <CardContent className="p-4">
                    
                    {/* Weight and Fish Type */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Weight className="w-5 h-5 text-primary" />
                        <span className="text-2xl font-bold text-primary" data-testid={`text-catch-weight-${catch_.id}`}>
                          {catch_.weight} kg
                        </span>
                      </div>
                      <Badge variant="secondary" data-testid={`badge-fish-type-${catch_.id}`}>
                        {getFishTypeLabel(catch_.fishType)}
                      </Badge>
                    </div>

                    {/* Team Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {catch_.team ? (
                        <Link href={`/team/${catch_.team.id}`} data-testid={`link-catch-team-${catch_.id}`}>
                          <span className="font-medium hover:text-primary cursor-pointer transition-colors">
                            {catch_.team.name}
                          </span>
                        </Link>
                      ) : (
                        <span className="font-medium text-muted-foreground">Neznámy tím</span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span data-testid={`text-catch-time-${catch_.id}`}>
                        {(() => {
                          const submittedDate = catch_.submittedAt ? new Date(catch_.submittedAt) : null;
                          if (!submittedDate || isNaN(submittedDate.getTime())) {
                            return 'Neznámy čas';
                          }
                          return format(submittedDate, 'HH:mm:ss, d. MMMM yyyy', { locale: sk });
                        })()}
                      </span>
                    </div>

                    {/* Verification Status */}
                    <div className="mt-3 flex items-center justify-between">
                      <Badge 
                        variant={catch_.isVerified ? "default" : "secondary"}
                        data-testid={`badge-verification-${catch_.id}`}
                      >
                        {catch_.isVerified ? "Overený" : "Čaká na overenie"}
                      </Badge>
                      
                      {!catch_.photoUrl && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Camera className="w-3 h-3" />
                          <span>Bez fotografie</span>
                        </div>
                      )}
                    </div>

                  </CardContent>
                </Card>
              ))}
            </div>
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
      </div>
    </div>
  );
}