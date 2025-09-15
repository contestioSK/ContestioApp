import { useParams } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import NavigationHeader from "@/components/navigation-header";
import LiveLeaderboard from "@/components/live-leaderboard";
import CatchTimeline from "@/components/catch-timeline";
import CompetitionMap from "@/components/competition-map";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Competition, Team, Catch } from "@shared/schema";

export default function CompetitionDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: competition, isLoading: competitionLoading, error } = useQuery<Competition>({
    queryKey: ["/api/competitions", id],
    enabled: isAuthenticated && !!id,
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<(Team & { members?: any[] })[]>({
    queryKey: ["/api/competitions", id, "teams"],
    enabled: isAuthenticated && !!id,
  });

  const { data: catches, isLoading: catchesLoading } = useQuery<(Catch & { team?: Team; referee?: any })[]>({
    queryKey: ["/api/competitions", id, "catches"],
    enabled: isAuthenticated && !!id,
  });

  // WebSocket for real-time updates
  useWebSocket((data) => {
    if (data.type === 'new_catch' && data.competitionId === id) {
      // Invalidate and refetch relevant queries
      // This would typically be handled by the WebSocket hook
    }
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (isLoading || competitionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Competition Not Found</h1>
            <p className="text-muted-foreground">The competition you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <Badge className="bg-secondary text-secondary-foreground">
            <span className="w-2 h-2 bg-secondary-foreground rounded-full mr-2 animate-pulse"></span>
            LIVE
          </Badge>
        );
      case 'registration':
        return <Badge className="bg-accent text-accent-foreground">REGISTRATION OPEN</Badge>;
      case 'finished':
        return <Badge className="bg-muted text-muted-foreground">FINISHED</Badge>;
      default:
        return <Badge>{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />

      {/* Competition Header */}
      <section className="py-16 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="mb-4">
              {getStatusBadge(competition.status)}
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-competition-name">
              {competition.name}
            </h1>
            <p className="text-muted-foreground" data-testid="text-competition-location">
              {competition.location}
            </p>
            {competition.description && (
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                {competition.description}
              </p>
            )}
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Left Column: Interactive Map & Leaderboard */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Interactive Map */}
              <CompetitionMap competitionId={id!} teams={(teams || []).map(team => ({ ...team, members: team.members || [] }))} />
              
              {/* Live Leaderboard */}
              <LiveLeaderboard teams={(teams || []).map(team => ({ ...team, members: team.members || [] }))} isLoading={teamsLoading} />
              
            </div>
            
            {/* Right Column: Live Catch Timeline & Special Contests */}
            <div className="space-y-6">
              
              {/* Special Contests */}
              <Card>
                <CardHeader>
                  <CardTitle>Special Contests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {catches && catches.length > 0 ? (
                      <>
                        {/* Biggest Fish */}
                        {(() => {
                          const biggestCatch = catches.reduce((max: any, current: any) => 
                            parseFloat(current.weight) > parseFloat(max.weight) ? current : max
                          );
                          return (
                            <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg" data-testid="special-contest-biggest">
                              <div>
                                <div className="font-medium text-foreground">Biggest Catch</div>
                                <div className="text-sm text-muted-foreground">{biggestCatch.team?.name}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-bold text-accent">{biggestCatch.weight} kg</div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Most Fish */}
                        {(() => {
                          const teamCatchCounts = teams?.map((team: any) => ({
                            team,
                            count: catches.filter((c: any) => c.teamId === team.id).length
                          })) || [];
                          const mostFishTeam = teamCatchCounts.reduce((max, current) => 
                            current.count > max.count ? current : max, { team: null, count: 0 }
                          );
                          
                          return mostFishTeam.team ? (
                            <div className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg" data-testid="special-contest-most-fish">
                              <div>
                                <div className="font-medium text-foreground">Most Fish</div>
                                <div className="text-sm text-muted-foreground">{mostFishTeam.team.name}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-bold text-secondary">{mostFishTeam.count}</div>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No catches yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Live Catch Timeline */}
              <CatchTimeline catches={(catches || []).map(c => ({ ...c, team: c.team || { id: '', name: 'Unknown Team', status: '', createdAt: null, updatedAt: null, competitionId: '', sector: null, position: null, totalWeight: null, fishCount: null }, referee: c.referee || { id: '', userId: '', competitionId: '', assignedSector: '', isActive: true, createdAt: null } }))} isLoading={catchesLoading} />
              
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
