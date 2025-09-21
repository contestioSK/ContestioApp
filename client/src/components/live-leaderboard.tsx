import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw, ArrowRight, Trophy } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Team, TeamMember, Competition } from "@shared/schema";
import { formatSectorPlace, getSectorLetter } from "@/lib/utils";
import { getCountryFlag } from "@/lib/countries";

interface LiveLeaderboardProps {
  teams: (Team & { members: TeamMember[] })[];
  isLoading: boolean;
  competitionId: string;
}

export default function LiveLeaderboard({ teams, isLoading, competitionId }: LiveLeaderboardProps) {
  // Fetch competition data to get scoring type
  const { data: competition, isLoading: competitionLoading } = useQuery<Competition>({
    queryKey: ["/api/competitions", competitionId],
    queryFn: async () => {
      const response = await fetch(`/api/competitions/${competitionId}`);
      if (!response.ok) throw new Error('Failed to fetch competition');
      return response.json();
    },
  });

  const getScoringTypeLabel = (scoringType: string | undefined) => {
    switch (scoringType) {
      case "avg3": return "Priemerná hmotnosť top 3 rýb";
      case "avg5": return "Priemerná hmotnosť top 5 rýb";
      case "total":
      default: return "Celková hmotnosť";
    }
  };

  const getScoringTypeBadge = (scoringType: string | undefined) => {
    const variants = {
      "avg3": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      "avg5": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      "total": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    };
    const variant = variants[scoringType as keyof typeof variants] || variants.total;
    
    return (
      <Badge className={`${variant} text-xs font-medium`} data-testid="badge-scoring-type">
        <Trophy className="w-3 h-3 mr-1" />
        {getScoringTypeLabel(scoringType)}
      </Badge>
    );
  };
  if (isLoading || competitionLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Aktuálna tabuľka</CardTitle>
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 border border-border rounded-lg">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort teams by total weight (descending)
  const sortedTeams = [...teams]
    .filter(team => team.status === 'approved')
    .sort((a, b) => parseFloat(b.totalWeight || '0') - parseFloat(a.totalWeight || '0'));

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-xs font-bold">
          {rank}
        </div>
      );
    }
    return (
      <div className="w-6 h-6 bg-muted/50 text-muted-foreground rounded-full flex items-center justify-center text-xs font-bold">
        {rank}
      </div>
    );
  };

  const getSectorBadge = (team: Team) => {
    const sectorPlace = formatSectorPlace(team);
    if (!sectorPlace) return null;
    
    const sectorLetter = getSectorLetter(team);
    if (!sectorLetter || !competitionId) {
      return (
        <Badge className={`text-sm font-medium bg-muted/50`}>
          {sectorPlace}
        </Badge>
      );
    }
    
    const colors = {
      'A': 'bg-primary/10 text-primary',
      'B': 'bg-secondary/10 text-secondary',
      'C': 'bg-accent/10 text-accent',
    };
    
    return (
      <Link href={`/competition/${competitionId}/sector/${sectorLetter}`} data-testid={`link-leaderboard-sector-${team.id}`}>
        <Badge className={`text-sm font-medium cursor-pointer hover:bg-primary/20 transition-colors ${colors[sectorLetter as keyof typeof colors] || 'bg-muted/50'}`}>
          {sectorPlace}
        </Badge>
      </Link>
    );
  };

  return (
    <Card className="min-h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle>Aktuálna tabuľka</CardTitle>
              {sortedTeams.length > 10 && (
                <Badge variant="secondary" className="text-xs">
                  Top 10 z {sortedTeams.length}
                </Badge>
              )}
            </div>
            {competition && getScoringTypeBadge(competition.scoringType)}
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <RotateCcw className="w-4 h-4" />
            <span>Automaticky aktualizované</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 flex flex-col">
        {sortedTeams.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-muted-foreground text-lg">Zatiaľ žiadne schválené tímy</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/20">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Poradie</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tím</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sektor</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                      {getScoringTypeLabel(competition?.scoringType)}
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Počet rýb</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeams.slice(0, 10).map((team, index) => (
                  <tr 
                    key={team.id}
                    className="border-b border-border hover:bg-muted/20 transition-colors cursor-pointer group"
                    data-testid={`row-leaderboard-${team.id}`}
                  >
                    <td className="p-4">
                      {getRankBadge(index + 1)}
                    </td>
                    <td className="p-4">
                      <Link href={`/team/${team.id}`}>
                        <div className="flex items-center gap-2 font-medium text-foreground group-hover:text-primary transition-colors" data-testid={`text-team-name-${team.id}`}>
                          <img 
                            src={getCountryFlag(team.country || 'SK')} 
                            alt={`Vlajka ${team.country || 'SK'}`}
                            className="w-5 h-4 object-cover rounded-sm border border-gray-200"
                            title={`Krajina: ${team.country || 'SK'}`}
                            onError={(e) => {
                              // Fallback to emoji if image fails to load
                              e.currentTarget.style.display = 'none';
                              const span = document.createElement('span');
                              span.textContent = '🏳️';
                              span.className = 'text-sm';
                              e.currentTarget.parentNode?.insertBefore(span, e.currentTarget);
                            }}
                          />
                          {team.name}
                        </div>
                      </Link>
                    </td>
                    <td className="p-4">
                      {getSectorBadge(team)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono font-bold text-foreground" data-testid={`text-weight-${team.id}`}>
                        {parseFloat(team.totalWeight || '0').toFixed(2)} kg
                      </div>
                      {index === 0 && parseFloat(team.totalWeight || '0') > 0 && (
                        <div className="text-xs text-secondary">Vedú</div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-mono font-medium text-foreground" data-testid={`text-fish-count-${team.id}`}>
                        {team.fishCount || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {sortedTeams.length > 0 && (
          <div className="p-4 border-t border-border">
            <Button variant="ghost" className="text-primary hover:text-primary/80" data-testid="button-view-full-leaderboard">
              Zobraziť celý rebríček <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
