import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Team, TeamMember } from "@shared/schema";
import { formatSectorPlace, getSectorLetter } from "@/lib/utils";

interface LiveLeaderboardProps {
  teams: (Team & { members: TeamMember[] })[];
  isLoading: boolean;
}

export default function LiveLeaderboard({ teams, isLoading }: LiveLeaderboardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rebríček naživo</CardTitle>
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
    const colors = {
      'A': 'bg-primary/10 text-primary',
      'B': 'bg-secondary/10 text-secondary',
      'C': 'bg-accent/10 text-accent',
    };
    
    return (
      <Badge className={`text-sm font-medium ${colors[sectorLetter as keyof typeof colors] || 'bg-muted/50'}`}>
        {sectorPlace}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Rebríček naživo</CardTitle>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <RotateCcw className="w-4 h-4" />
            <span>Automaticky aktualizované</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
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
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Celková hmotnosť</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Počet rýb</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team, index) => (
                  <Link href={`/team/${team.id}`} key={team.id}>
                    <tr 
                      className="border-b border-border hover:bg-muted/20 transition-colors cursor-pointer group"
                      data-testid={`row-leaderboard-${team.id}`}
                    >
                      <td className="p-4">
                        {getRankBadge(index + 1)}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors" data-testid={`text-team-name-${team.id}`}>
                          {team.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {team.members.slice(0, 2).map(m => m.name).join(', ')}
                          {team.members.length > 2 && ` +${team.members.length - 2} ďalších`}
                        </div>
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
                  </Link>
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
