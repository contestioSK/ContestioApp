import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Trophy } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Team, TeamMember } from "@shared/schema";
import { getCountryFlag } from "@/lib/countries";

interface SectorLeaderboardsProps {
  competitionId: string;
}

interface SectorLeaderboard {
  sector: string;
  teamCount: number;
  topTeams: (Team & { members: TeamMember[] })[];
}

export default function SectorLeaderboards({ competitionId }: SectorLeaderboardsProps) {
  const { data: leaderboards, isLoading } = useQuery<SectorLeaderboard[]>({
    queryKey: ['/api/competitions', competitionId, 'sectors', 'leaderboards', 3],
    queryFn: async () => {
      const response = await fetch(`/api/competitions/${competitionId}/sectors/leaderboards?limit=3`);
      if (!response.ok) throw new Error('Failed to fetch sector leaderboards');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Priebežné poradie v sektoroch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-24" />
                <div className="border rounded-lg">
                  <div className="p-3 bg-muted/20 border-b">
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="p-3 border-b last:border-b-0">
                      <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leaderboards || leaderboards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Priebežné poradie v sektoroch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Žiadne tímy zatiaľ nie sú priradené do sektorov.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    const colors = {
      1: "text-yellow-600 dark:text-yellow-400", // Gold
      2: "text-gray-500 dark:text-gray-400",     // Silver
      3: "text-amber-600 dark:text-amber-500"    // Bronze
    };
    return colors[rank as keyof typeof colors] || "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" data-testid="title-sector-leaderboards">
          <Trophy className="w-5 h-5" />
          Priebežné poradie v sektoroch
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {leaderboards.map((sectorData) => (
            <div key={sectorData.sector} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground" data-testid={`heading-sector-${sectorData.sector}`}>
                  Sektor {sectorData.sector}
                </h3>
                <span className="text-sm text-muted-foreground" data-testid={`text-team-count-${sectorData.sector}`}>
                  {sectorData.teamCount} tím{sectorData.teamCount === 1 ? '' : sectorData.teamCount < 5 ? 'y' : 'ov'}
                </span>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table data-testid={`table-sector-${sectorData.sector}`}>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Tím</TableHead>
                      <TableHead className="text-right">Váha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectorData.topTeams.length > 0 ? (
                      sectorData.topTeams.map((team, index) => (
                        <TableRow 
                          key={team.id} 
                          className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-muted/50 transition-colors`}
                          data-testid={`row-team-${team.id}`}
                        >
                          <TableCell className="text-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankIcon(index + 1)}`}>
                              {index + 1}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg" data-testid={`flag-${team.id}`}>
                                {getCountryFlag(team.country || 'SK')}
                              </span>
                              <span className="font-medium text-foreground" data-testid={`text-team-name-${team.id}`}>
                                {team.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono font-bold text-foreground" data-testid={`text-team-weight-${team.id}`}>
                              {parseFloat(team.totalWeight || '0').toFixed(1)} kg
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          Žiadne tímy v tomto sektore
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {sectorData.teamCount > 3 && (
                <div className="flex justify-center">
                  <Link 
                    href={`/competition/${competitionId}/sector/${sectorData.sector}`}
                    data-testid={`link-sector-all-${sectorData.sector}`}
                  >
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-2"
                      data-testid={`button-show-all-${sectorData.sector}`}
                    >
                      Zobraziť všetky ({sectorData.teamCount})
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}