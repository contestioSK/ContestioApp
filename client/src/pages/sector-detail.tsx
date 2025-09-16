import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Trophy, Fish, MapPin, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Team, TeamMember, Catch } from "@shared/schema";
import { formatSectorPlace, getSectorLetter } from "@/lib/utils";

type SectorStatistics = {
  teams: (Team & { members: TeamMember[] })[];
  biggestFish: Catch | null;
  biggestScalyCarp: Catch | null;
  biggestMirrorCarp: Catch | null;
  averageWeight: number;
};

export default function SectorDetail() {
  const { competitionId, sector } = useParams();

  const { data: sectorStats, isLoading } = useQuery<SectorStatistics>({
    queryKey: ["/api/competitions", competitionId, "sectors", sector, "statistics"],
    enabled: !!competitionId && !!sector,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Skeleton className="h-10 w-40 mb-4" />
            <Skeleton className="h-8 w-60" />
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!sectorStats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Sektor nebol nájdený</h2>
          <p className="text-muted-foreground mb-4">Zadaný sektor neexistuje.</p>
          <Link href={`/competition/${competitionId}`}>
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Späť na súťaž
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const sectorName = `Sektor ${sector?.toUpperCase()}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/competition/${competitionId}`}>
            <Button variant="ghost" className="mb-4" data-testid="button-back-to-competition">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Späť na súťaž
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-sector-title">
            {sectorName}
          </h1>
          <p className="text-muted-foreground">Výsledky a štatistiky sektora</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Teams in Sector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Tímy v sektore
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sectorStats.teams.length === 0 ? (
                <p className="text-muted-foreground text-sm">Žiadne tímy v tomto sektore</p>
              ) : (
                <div className="space-y-3">
                  {sectorStats.teams.map((team) => (
                    <Link href={`/team/${team.id}`} key={team.id}>
                      <div 
                        className="p-3 border rounded-lg hover:bg-muted/20 transition-colors cursor-pointer"
                        data-testid={`card-sector-team-${team.id}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm" data-testid={`text-sector-team-name-${team.id}`}>
                            {team.name}
                          </h4>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getSectorLetter(team) === sector?.toUpperCase() ? 'bg-primary/10 text-primary' : ''}`}
                          >
                            {formatSectorPlace(team) || `Sektor ${team.sector}`}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {(team.members || []).slice(0, 2).map(m => m.name).join(', ')}
                          {(team.members || []).length > 2 && ` +${(team.members || []).length - 2} ďalších`}
                        </div>
                        <div className="text-xs font-mono font-bold text-accent">
                          {parseFloat(team.totalWeight || '0').toFixed(2)} kg
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Biggest Fish Overall */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Najväčšia ryba
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!sectorStats.biggestFish ? (
                <p className="text-muted-foreground text-sm">Žiadne úlovky v tomto sektore</p>
              ) : (
                <div className="space-y-2" data-testid="card-biggest-fish">
                  <div className="text-2xl font-bold text-primary">
                    {Number(sectorStats.biggestFish.weight).toFixed(2)} kg
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Typ: {sectorStats.biggestFish.fishType === 'scaly' ? 'Šupinkatý kapor' : 'Zrkadlový kapor'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sectorStats.biggestFish.submittedAt ? new Date(sectorStats.biggestFish.submittedAt).toLocaleString('sk-SK') : 'Neznámy čas'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Biggest Scaly Carp */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Fish className="w-5 h-5 mr-2" />
                Najväčší šupinkatý kapor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!sectorStats.biggestScalyCarp ? (
                <p className="text-muted-foreground text-sm">Žiadne šupinkaté kapry v tomto sektore</p>
              ) : (
                <div className="space-y-2" data-testid="card-biggest-scaly">
                  <div className="text-2xl font-bold text-green-600">
                    {Number(sectorStats.biggestScalyCarp.weight).toFixed(2)} kg
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sectorStats.biggestScalyCarp.submittedAt ? new Date(sectorStats.biggestScalyCarp.submittedAt).toLocaleString('sk-SK') : 'Neznámy čas'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Biggest Mirror Carp */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Fish className="w-5 h-5 mr-2" />
                Najväčší zrkadlový kapor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!sectorStats.biggestMirrorCarp ? (
                <p className="text-muted-foreground text-sm">Žiadne zrkadlové kapry v tomto sektore</p>
              ) : (
                <div className="space-y-2" data-testid="card-biggest-mirror">
                  <div className="text-2xl font-bold text-blue-600">
                    {Number(sectorStats.biggestMirrorCarp.weight).toFixed(2)} kg
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sectorStats.biggestMirrorCarp.submittedAt ? new Date(sectorStats.biggestMirrorCarp.submittedAt).toLocaleString('sk-SK') : 'Neznámy čas'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Average Weight */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Priemerná hmotnosť
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2" data-testid="card-average-weight">
                <div className="text-2xl font-bold text-accent">
                  {sectorStats.averageWeight.toFixed(2)} kg
                </div>
                <div className="text-sm text-muted-foreground">
                  Za všetky úlovky v sektore
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Súhrn sektora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3" data-testid="card-sector-summary">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Počet tímov:</span>
                  <span className="font-medium">{sectorStats.teams.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Celková hmotnosť:</span>
                  <span className="font-medium">
                    {sectorStats.teams.reduce((sum, team) => sum + parseFloat(team.totalWeight || '0'), 0).toFixed(2)} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Celkový počet rýb:</span>
                  <span className="font-medium">
                    {sectorStats.teams.reduce((sum, team) => sum + (team.fishCount || 0), 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}