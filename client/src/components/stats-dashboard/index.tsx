import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Award, Fish, Target, Trophy, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Chart components
import { TimelineWeightChart } from "./charts/timeline-weight-chart";
import { TimelineCountChart } from "./charts/timeline-count-chart";
import { WeightCategoryChart } from "./charts/weight-category-chart";
import { TopFishChart } from "./charts/top-fish-chart";
import { TeamAverageChart } from "./charts/team-average-chart";
import { FishTypeDistributionChart } from "./charts/fish-type-distribution-chart";
import { SectorWeightTimelineChart } from "./charts/sector-weight-timeline-chart";
import { SectorCountTimelineChart } from "./charts/sector-count-timeline-chart";
import { SectorFishTypeChart } from "./charts/sector-fish-type-chart";
import { SectorAverageWeightChart } from "./charts/sector-average-weight-chart";
import { SectorActivityChart } from "./charts/sector-activity-chart";
import { SectorPerformanceChart } from "./charts/sector-performance-chart";
import { HourlyDistributionChart } from "./charts/hourly-distribution-chart";
import { TeamPerformanceChart } from "./charts/team-performance-chart";

// Hook
import { useCompetitionStats } from "./hooks/use-competition-stats";

// Types
import type { Competition } from "@shared/schema";

interface StatsDashboardProps {
  competitionId: string;
}

export default function StatsDashboard({ competitionId }: StatsDashboardProps) {
  const { data: stats, isLoading, error } = useCompetitionStats(competitionId, true);
  
  // Get competition details for side competitions info
  const { data: competition } = useQuery<Competition>({
    queryKey: ["/api/competitions", competitionId],
    enabled: !!competitionId,
  });
  
  // Check which special contests are enabled
  const hasTop3Contest = competition?.sideCompetitions?.includes("best-3-fish") ?? false;
  const hasTop5Contest = competition?.sideCompetitions?.includes("best-5-fish") ?? false;
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nie je možné načítať štatistiky súťaže</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Štatistiky súťaže</h2>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Prehľad
          </TabsTrigger>
          <TabsTrigger value="sectors" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Štatistika sektorov
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Analýzy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Nove grafy vedľa seba - váha a počet */}
            <TimelineWeightChart data={stats.timeline} />
            <TimelineCountChart data={stats.timeline} />
            
            <WeightCategoryChart data={stats.weightCategories} />
            <FishTypeDistributionChart data={stats.fishTypeDistribution} />
            
            {/* Conditionally show team average charts based on side competitions - moved down */}
            {hasTop5Contest && (
              <TeamAverageChart 
                data={stats.teamTop5Average} 
                title="Váhový priemer top 5 úlovkov"
                description="TOP 5 tímov s najlepším priemernom váhy ich 5 najťažších úlovkov"
                competitionId={competitionId}
              />
            )}
            
            {hasTop3Contest && (
              <TeamAverageChart 
                data={stats.teamTop3Average} 
                title="Váhový priemer top 3 úlovkov"
                description="TOP 5 tímov s najlepším priemernom váhy ich 3 najťažších úlovkov"
                competitionId={competitionId}
              />
            )}
            
            {/* Show original top fish chart if no special contests are enabled */}
            {!hasTop5Contest && !hasTop3Contest && (
              <TopFishChart data={stats.topFish} />
            )}
            
            {/* Team performance scatter plot */}
            <TeamPerformanceChart 
              data={stats.teamPerformance || []} 
              competitionId={competitionId} 
            />
            
            {/* Hodinový graf na celú šírku - umiestnený úplne dole */}
            <div className="lg:col-span-2">
              <HourlyDistributionChart data={stats.hourlyDistribution || []} />
            </div>
          </div>
        </TabsContent>


        <TabsContent value="sectors" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prvý riadok - Vývoj váhy a počtu */}
            <SectorWeightTimelineChart data={stats.sectorTimeline || {}} />
            <SectorCountTimelineChart data={stats.sectorTimeline || {}} />
            
            {/* Druhý riadok - Druh ryby a Top sektory */}
            <SectorFishTypeChart data={stats.sectorFishTypes || []} />
            <SectorPerformanceChart data={stats.sectorPerformance || []} competitionId={competitionId} />
            
            {/* Tretí riadok - Priemerná váha a Aktivita */}
            <SectorAverageWeightChart data={stats.sectorPerformance || []} />
            <SectorActivityChart data={stats.sectorTimeline || {}} />
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Kľúčové poznatky
                </CardTitle>
                <CardDescription>
                  Automaticky generované poznatky z analytických dát súťaže
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-muted/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Fish className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-sm">Najaktívnejší sektor</span>
                    </div>
                    <p className="text-lg font-bold">
                      {stats.sectorPerformance.length > 0 
                        ? stats.sectorPerformance.reduce((max, sector) => 
                            sector.totalCount > max.totalCount ? sector : max
                          ).sector
                        : 'N/A'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.sectorPerformance.length > 0 
                        ? `${stats.sectorPerformance.reduce((max, sector) => 
                            sector.totalCount > max.totalCount ? sector : max
                          ).totalCount} úlovkov`
                        : 'Žiadne dáta'
                      }
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-sm">Najefektívnejší tím</span>
                    </div>
                    <p className="text-lg font-bold">
                      {stats.teamEfficiency.length > 0 
                        ? stats.teamEfficiency.reduce((max, team) => 
                            team.efficiency > max.efficiency ? team : max
                          ).teamName
                        : 'N/A'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.teamEfficiency.length > 0 
                        ? `${stats.teamEfficiency.reduce((max, team) => 
                            team.efficiency > max.efficiency ? team : max
                          ).efficiency.toFixed(1)} kg/h`
                        : 'Žiadne dáta'
                      }
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-sm">Priemerná váha</span>
                    </div>
                    <p className="text-lg font-bold">
                      {stats.timeline.length > 0 
                        ? (stats.timeline[stats.timeline.length - 1]?.totalWeight / 
                           stats.timeline[stats.timeline.length - 1]?.totalCount || 0).toFixed(1)
                        : '0.0'
                      } kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Na úlovok
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}