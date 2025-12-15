import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Users, Trophy, Fish, MapPin, Camera, X, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Team, TeamMember, Catch } from "@shared/schema";
import { formatSectorPlace, getSectorLetter } from "@/lib/utils";
import { useFavoriteTeams, useToggleFavoriteTeam } from "@/hooks/useFavorites";

type TeamWithDetails = Team & {
  members?: TeamMember[];
  catches?: Catch[];
};

export default function TeamDetail() {
  const { teamId } = useParams();
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; teamName: string; weight: string; fishType: string } | null>(null);

  const { data: teamData, isLoading } = useQuery<TeamWithDetails>({
    queryKey: ["/api/teams", teamId],
    enabled: !!teamId,
  });
  
  // Favorite teams (only for authenticated users)
  const { data: favoriteTeams } = useFavoriteTeams();
  const { addFavorite, removeFavorite, isAdding, isRemoving } = useToggleFavoriteTeam();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const isFavorite = isAuthenticated && favoriteTeams?.some(fav => fav.teamId === teamId);
  
  const handleToggleFavorite = () => {
    if (!isAuthenticated || !teamId) return;
    if (isFavorite) {
      removeFavorite(teamId);
    } else {
      addFavorite(teamId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Skeleton className="h-10 w-40 mb-4" />
            <Skeleton className="h-8 w-60" />
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Tím nebol nájdený</h2>
          <p className="text-muted-foreground mb-4">Zadaný tím neexistuje alebo bol odstránený.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Späť na hlavnú stránku
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getSectorBadge = (team: Team) => {
    const sectorPlace = formatSectorPlace(team);
    if (!sectorPlace) return null;
    
    const sectorLetter = getSectorLetter(team);
    if (!sectorLetter || !team.competitionId) {
      return (
        <Badge className={`text-sm font-medium bg-muted/50`}>
          {sectorPlace}
        </Badge>
      );
    }
    
    const colors = {
      'A': 'bg-primary/10 text-primary border-primary',
      'B': 'bg-secondary/10 text-secondary border-secondary',
      'C': 'bg-accent/10 text-accent border-accent',
    };
    
    return (
      <Link href={`/competition/${team.competitionId}/sector/${sectorLetter}`} data-testid={`link-team-sector-${sectorLetter}`}>
        <Badge className={`text-sm font-medium cursor-pointer hover:bg-primary/20 transition-colors ${colors[sectorLetter as keyof typeof colors] || 'bg-muted/50'}`}>
          {sectorPlace}
        </Badge>
      </Link>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      'approved': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    };
    
    const labels = {
      'pending': 'Čaká na schválenie',
      'approved': 'Schválený',
      'rejected': 'Zamietnutý',
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('sk-SK') + ' ' + date.toLocaleTimeString('sk-SK', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getFishTypeLabel = (fishType: string) => {
    return fishType === 'scaly' ? 'Šupináč' : 'Lysec';
  };

  // Calculate team statistics
  const totalWeight = teamData.catches?.reduce((sum: number, catch_: any) => sum + parseFloat(catch_.weight), 0) || 0;
  const catchCount = teamData.catches?.length || 0;
  const averageWeight = catchCount > 0 ? totalWeight / catchCount : 0;
  const biggestCatch = teamData.catches?.reduce((max: any, current: any) => 
    parseFloat(current.weight) > parseFloat(max?.weight || '0') ? current : max, null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href={teamData.competitionId ? `/competition/${teamData.competitionId}` : '/'}>
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Späť na súťaž
            </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-team-name">
                {teamData.name}
              </h1>
              <div className="flex items-center space-x-3">
                {getSectorBadge(teamData)}
                {getStatusBadge(teamData.status)}
              </div>
            </div>
            
            {/* Favorite Button */}
            {isAuthenticated && !authLoading && (
              <Button 
                variant={isFavorite ? "default" : "outline"}
                onClick={handleToggleFavorite}
                disabled={isAdding || isRemoving}
                data-testid="button-toggle-favorite-team"
                className={isFavorite ? "bg-red-500 hover:bg-red-600 text-white" : ""}
              >
                <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-current" : ""}`} />
                {isFavorite ? "Obľúbené" : "Pridať do obľúbených"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column: Team Info */}
          <div className="md:col-span-1 space-y-6">
            
            {/* Team Information */}
            <Card data-testid="card-team-info">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Informácie o tíme</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Team Photo/Logo */}
                {teamData.photoUrl && (
                  <div className="mb-4">
                    <h4 className="font-medium text-foreground mb-2">Logo tímu:</h4>
                    <div className="flex justify-center">
                      <img 
                        src={teamData.photoUrl} 
                        alt={`Logo tímu ${teamData.name}`}
                        className="w-32 h-32 object-cover rounded-lg border-2 border-muted"
                        data-testid="img-team-logo"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-foreground mb-2">Členovia tímu:</h4>
                  <div className="space-y-3">
                    {teamData.members?.map((member: any, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg"
                        data-testid={`member-${index}`}
                      >
                        {/* Member Photo */}
                        <div className="flex-shrink-0">
                          {member.photoUrl ? (
                            <img 
                              src={member.photoUrl} 
                              alt={`Fotka ${member.name}`}
                              className="w-12 h-12 object-cover rounded-full border-2 border-muted"
                              data-testid={`img-member-${index}`}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                              <Users className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        {/* Member Info */}
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{member.name}</div>
                          {member.email && (
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          )}
                        </div>
                        
                        {/* Role Badge */}
                        {member.role === 'captain' && (
                          <Badge variant="secondary" className="text-xs">Kapitán</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <div>Registrovaný: {teamData.createdAt ? formatDateTime(teamData.createdAt) : 'Neznámy dátum'}</div>
                </div>
              </CardContent>
            </Card>

            {/* Team Statistics */}
            <Card data-testid="card-team-stats">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5" />
                  <span>Štatistiky</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Celková váha:</span>
                  <span className="font-bold text-lg text-foreground" data-testid="stat-total-weight">
                    {totalWeight.toFixed(2)} kg
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Počet rýb:</span>
                  <span className="font-medium text-foreground" data-testid="stat-fish-count">
                    {catchCount}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Priemerná váha:</span>
                  <span className="font-medium text-foreground" data-testid="stat-average-weight">
                    {averageWeight.toFixed(2)} kg
                  </span>
                </div>
                
                {biggestCatch && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Najväčší úlovok:</span>
                      <span className="font-mono font-bold text-accent" data-testid="stat-biggest-catch">
                        {parseFloat(biggestCatch.weight).toFixed(2)} kg
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getFishTypeLabel(biggestCatch.fishType)} • {formatDateTime(biggestCatch.submittedAt)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Catches Table */}
          <div className="md:col-span-2">
            <Card data-testid="card-catches-table">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Fish className="w-5 h-5" />
                  <span>Všetky úlovky ({catchCount})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {catchCount === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Fish className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Tento tím zatiaľ nemá žiadne úlovky.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Čas</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Typ</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Váha</th>
                          <th className="text-center p-3 font-medium text-muted-foreground">Sektor</th>
                          <th className="text-center p-3 font-medium text-muted-foreground">Foto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamData.catches?.map((catch_: any, index: number) => (
                          <tr 
                            key={catch_.id} 
                            className="border-b border-border hover:bg-muted/20 transition-colors"
                            data-testid={`catch-row-${index}`}
                          >
                            <td className="p-3">
                              <div className="w-6 h-6 bg-muted/50 text-muted-foreground rounded-full flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-foreground">
                                {formatDateTime(catch_.submittedAt)}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs">
                                {getFishTypeLabel(catch_.fishType)}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <span className="font-mono font-bold text-foreground">
                                {parseFloat(catch_.weight).toFixed(2)} kg
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {(formatSectorPlace(teamData) || (catch_.sector && `Sektor ${catch_.sector}`)) && (
                                (() => {
                                  const sectorLetter = getSectorLetter(teamData);
                                  const displayText = formatSectorPlace(teamData) || `Sektor ${catch_.sector}`;
                                  
                                  if (sectorLetter && teamData.competitionId) {
                                    return (
                                      <Link href={`/competition/${teamData.competitionId}/sector/${sectorLetter}`} data-testid={`link-catch-sector-${index}`}>
                                        <Badge className="text-sm font-medium bg-muted/50 cursor-pointer hover:bg-primary/20 transition-colors">
                                          {displayText}
                                        </Badge>
                                      </Link>
                                    );
                                  } else {
                                    return (
                                      <Badge className="text-sm font-medium bg-muted/50">
                                        {displayText}
                                      </Badge>
                                    );
                                  }
                                })()
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {catch_.photoUrl ? (
                                <div className="flex items-center justify-center">
                                  <div
                                    className="w-8 h-8 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all transform hover:scale-110"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedPhoto({
                                        url: catch_.photoUrl!,
                                        teamName: teamData.name,
                                        weight: `${parseFloat(catch_.weight).toFixed(2)} kg`,
                                        fishType: getFishTypeLabel(catch_.fishType)
                                      });
                                    }}
                                    data-testid={`img-catch-photo-${index}`}
                                  >
                                    <img 
                                      src={catch_.photoUrl} 
                                      alt="Úlovok" 
                                      className="w-full h-full object-cover pointer-events-none"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <Camera className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground ml-1">Bez fotky</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
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
                      Váha: {selectedPhoto.weight} • Typ: {selectedPhoto.fishType}
                    </p>
                  </DialogHeader>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}