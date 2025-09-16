import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Trophy, Fish, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Team, TeamMember, Catch } from "@shared/schema";
import { formatSectorPlace, getSectorLetter } from "@/lib/utils";

type TeamWithDetails = Team & {
  members?: TeamMember[];
  catches?: Catch[];
};

export default function TeamDetail() {
  const { teamId } = useParams();

  const { data: teamData, isLoading } = useQuery<TeamWithDetails>({
    queryKey: ["/api/teams", teamId],
    enabled: !!teamId,
  });

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
    const colors = {
      'A': 'bg-primary/10 text-primary border-primary',
      'B': 'bg-secondary/10 text-secondary border-secondary',
      'C': 'bg-accent/10 text-accent border-accent',
    };
    
    return (
      <Badge className={`text-sm font-medium ${colors[sectorLetter as keyof typeof colors] || 'bg-muted/50'}`}>
        {sectorPlace}
      </Badge>
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
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">Členovia tímu:</h4>
                  <div className="space-y-2">
                    {teamData.members?.map((member: any, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2 bg-muted/20 rounded-lg"
                        data-testid={`member-${index}`}
                      >
                        <div>
                          <div className="font-medium text-foreground">{member.name}</div>
                          {member.email && (
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          )}
                        </div>
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
                  <span className="font-mono font-bold text-lg text-foreground" data-testid="stat-total-weight">
                    {totalWeight.toFixed(2)} kg
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Počet rýb:</span>
                  <span className="font-mono font-medium text-foreground" data-testid="stat-fish-count">
                    {catchCount}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Priemerná váha:</span>
                  <span className="font-mono font-medium text-foreground" data-testid="stat-average-weight">
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
                                <Badge className="text-sm font-medium bg-muted/50">
                                  {formatSectorPlace(teamData) || `Sektor ${catch_.sector}`}
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {catch_.photoUrl ? (
                                <Button variant="ghost" size="sm" data-testid={`button-view-photo-${index}`}>
                                  📸
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
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
    </div>
  );
}