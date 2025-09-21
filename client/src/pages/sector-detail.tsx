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

        {/* Sector Leaderboard */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Priebežné poradie v sektore {sector?.toUpperCase()}
              </CardTitle>
              <p className="text-sm text-muted-foreground">Tímy zoradené podľa celkovej váhy úlovkov</p>
            </CardHeader>
            <CardContent className="p-0">
              {sectorStats.teams.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <p className="text-muted-foreground text-lg">Žiadne tímy v tomto sektore</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/20">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Poradie</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tím</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Členovia</th>
                        <th className="text-right p-4 text-sm font-medium text-muted-foreground">Celková váha</th>
                        <th className="text-right p-4 text-sm font-medium text-muted-foreground">Počet rýb</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectorStats.teams
                        .sort((a, b) => parseFloat(b.totalWeight || '0') - parseFloat(a.totalWeight || '0'))
                        .map((team, index) => {
                          const getRankRowStyle = (rank: number) => {
                            if (rank === 1) return "border-b border-border hover:bg-amber-50 dark:hover:bg-amber-900/20 bg-gradient-to-r from-amber-50/30 to-amber-100/30 dark:from-amber-900/10 dark:to-amber-800/10 transition-colors cursor-pointer group";
                            if (rank === 2) return "border-b border-border hover:bg-slate-50 dark:hover:bg-slate-900/20 bg-gradient-to-r from-slate-50/30 to-slate-100/30 dark:from-slate-900/10 dark:to-slate-800/10 transition-colors cursor-pointer group";
                            if (rank === 3) return "border-b border-border hover:bg-orange-50 dark:hover:bg-orange-900/20 bg-gradient-to-r from-orange-50/30 to-orange-100/30 dark:from-orange-900/10 dark:to-orange-800/10 transition-colors cursor-pointer group";
                            return "border-b border-border hover:bg-muted/20 transition-colors cursor-pointer group";
                          };

                          const getRankBadge = (rank: number) => {
                            if (rank === 1) {
                              return (
                                <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-amber-300">
                                  🥇
                                </div>
                              );
                            }
                            if (rank === 2) {
                              return (
                                <div className="w-7 h-7 bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-slate-200">
                                  🥈
                                </div>
                              );
                            }
                            if (rank === 3) {
                              return (
                                <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-orange-600 text-orange-950 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-orange-300">
                                  🥉
                                </div>
                              );
                            }
                            return (
                              <div className="w-6 h-6 bg-muted/50 text-muted-foreground rounded-full flex items-center justify-center text-xs font-bold">
                                {rank}
                              </div>
                            );
                          };

                          return (
                            <tr 
                              key={team.id}
                              className={getRankRowStyle(index + 1)}
                              data-testid={`row-sector-leaderboard-${team.id}`}
                            >
                              <td className="p-4">
                                {getRankBadge(index + 1)}
                              </td>
                              <td className="p-4">
                                <Link href={`/team/${team.id}`}>
                                  <div className="font-medium text-foreground group-hover:text-primary transition-colors" data-testid={`text-sector-team-name-${team.id}`}>
                                    {team.name}
                                  </div>
                                </Link>
                              </td>
                              <td className="p-4">
                                <div className="text-sm text-muted-foreground">
                                  {(team.members || []).slice(0, 2).map(m => m.name).join(', ')}
                                  {(team.members || []).length > 2 && ` +${(team.members || []).length - 2} ďalších`}
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="font-mono font-bold text-foreground" data-testid={`text-sector-weight-${team.id}`}>
                                  {parseFloat(team.totalWeight || '0').toFixed(2)} kg
                                </div>
                                {index === 0 && parseFloat(team.totalWeight || '0') > 0 && (
                                  <div className="text-xs text-secondary">Vedie sektor</div>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <span className="font-mono font-medium text-foreground" data-testid={`text-sector-fish-count-${team.id}`}>
                                  {team.fishCount || 0}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

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