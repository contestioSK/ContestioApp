import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { sk } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { 
  ArrowLeft,
  Fish, 
  Calendar,
  Weight,
  MapPin,
  TrendingUp,
  Award,
  Target,
  Crown,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Clock,
  AlertCircle,
  Lock
} from "lucide-react";

import type { DiaryTrip, DiaryCatch } from "@shared/schema";

// Import new chart components
import { WeightProgressionChart } from "@/components/diary-charts/weight-progression-chart";
import { CatchFrequencyChart } from "@/components/diary-charts/catch-frequency-chart";
import { SeasonalTrendsChart } from "@/components/diary-charts/seasonal-trends-chart";
import { MonthComparisonChart } from "@/components/diary-charts/month-comparison-chart";

// Type for premium check
type PremiumStatus = {
  isPremium: boolean;
};

// Monthly stats type
type MonthlyStats = {
  month: string;
  monthDate: string; // ISO date for calculations
  monthStart: string; // Month start boundary
  monthEnd: string; // Month end boundary
  catches: number;
  totalWeight: number;
  trips: number;
};

// Carp type stats
type CarpTypeStats = {
  type: string;
  count: number;
  totalWeight: number;
  label: string;
};

export default function DiaryStats() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState<"3m" | "6m" | "1y">("6m");

  // Fetch user's trips and catches
  const { data: trips = [] } = useQuery<DiaryTrip[]>({
    queryKey: ["/api/diary/trips"],
    enabled: !!user
  });

  const { data: catches = [] } = useQuery<DiaryCatch[]>({
    queryKey: ["/api/diary/catches", "all"],
    enabled: !!user
  });

  // Check premium status
  const { data: premiumStatus } = useQuery<PremiumStatus>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user
  });

  const isPremium = premiumStatus?.isPremium || false;

  // Calculate basic stats
  const totalCatches = catches.length;
  const totalWeight = catches.reduce((sum, catch_) => sum + parseFloat(catch_.weight), 0);
  const averageWeight = totalCatches > 0 ? totalWeight / totalCatches : 0;
  const biggestCatch = totalCatches > 0 ? Math.max(...catches.map(c => parseFloat(c.weight))) : 0;
  const totalTrips = trips.length;
  const activeTripCount = trips.filter(trip => new Date(trip.endDate) >= new Date()).length;

  // Calculate monthly stats for the selected period
  const getMonthsForPeriod = (period: "3m" | "6m" | "1y") => {
    const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;
    const endDate = new Date();
    const startDate = subMonths(endDate, months - 1);
    return eachMonthOfInterval({ start: startDate, end: endDate });
  };

  const monthlyStats: MonthlyStats[] = getMonthsForPeriod(selectedPeriod).map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthCatches = catches.filter(catch_ => {
      const catchDate = new Date(catch_.capturedAt);
      return catchDate >= monthStart && catchDate <= monthEnd;
    });
    
    const monthTrips = trips.filter(trip => {
      const tripStart = new Date(trip.startDate);
      return tripStart >= monthStart && tripStart <= monthEnd;
    });

    return {
      month: format(month, "MMM yyyy", { locale: sk }),
      monthDate: month.toISOString(), // Add canonical date for calculations
      monthStart: monthStart.toISOString(), // Add month boundaries
      monthEnd: monthEnd.toISOString(),
      catches: monthCatches.length,
      totalWeight: monthCatches.reduce((sum, catch_) => sum + parseFloat(catch_.weight), 0),
      trips: monthTrips.length
    };
  });

  // Calculate carp type distribution
  const carpTypeStats: CarpTypeStats[] = [
    { type: "common", label: "Obyčajný", count: 0, totalWeight: 0 },
    { type: "mirror", label: "Zrkadlový", count: 0, totalWeight: 0 },
    { type: "grass", label: "Trávojedný", count: 0, totalWeight: 0 },
    { type: "other", label: "Iný", count: 0, totalWeight: 0 }
  ];

  catches.forEach(catch_ => {
    const stat = carpTypeStats.find(s => s.type === catch_.carpType);
    if (stat) {
      stat.count++;
      stat.totalWeight += parseFloat(catch_.weight);
    }
  });

  // Calculate success rate (catches per trip)
  const successRate = totalTrips > 0 ? (totalCatches / totalTrips).toFixed(1) : "0";

  // Top locations by catch count
  const locationStats = trips.reduce((acc, trip) => {
    const tripCatches = catches.filter(c => c.tripId === trip.id);
    acc[trip.location] = (acc[trip.location] || 0) + tripCatches.length;
    return acc;
  }, {} as Record<string, number>);

  const topLocations = Object.entries(locationStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([location, count]) => ({ location, count }));

  // Advanced analytics data calculations for trends
  
  // Weight progression data (monthly aggregations with weight trends)
  const weightProgressionData = monthlyStats.map(month => {
    // Use proper date boundaries for filtering
    const monthStart = new Date(month.monthStart);
    const monthEnd = new Date(month.monthEnd);
    
    const monthCatches = catches.filter(catch_ => {
      const catchDate = new Date(catch_.capturedAt);
      return catchDate >= monthStart && catchDate <= monthEnd;
    });

    return {
      date: month.monthDate, // Use canonical date
      dateLabel: month.month, // Keep display label
      averageWeight: month.catches > 0 ? month.totalWeight / month.catches : 0,
      totalWeight: month.totalWeight,
      catchCount: month.catches,
      biggestCatch: monthCatches.length > 0 ? Math.max(...monthCatches.map(c => parseFloat(c.weight))) : 0
    };
  });

  // Catch frequency data (monthly with efficiency metrics)
  const catchFrequencyData = monthlyStats.map(month => ({
    date: month.monthDate, // Use canonical date
    dateLabel: month.month, // Keep display label
    catches: month.catches,
    trips: month.trips,
    efficiency: month.trips > 0 ? month.catches / month.trips : 0
  }));

  // Seasonal trends data
  const seasonalData = [
    { season: 'spring', label: 'Jar', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 },
    { season: 'summer', label: 'Leto', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 },
    { season: 'autumn', label: 'Jeseň', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 },
    { season: 'winter', label: 'Zima', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 }
  ];

  catches.forEach(catch_ => {
    const month = new Date(catch_.capturedAt).getMonth();
    let seasonIndex: number;
    if (month >= 2 && month <= 4) seasonIndex = 0; // spring
    else if (month >= 5 && month <= 7) seasonIndex = 1; // summer
    else if (month >= 8 && month <= 10) seasonIndex = 2; // autumn
    else seasonIndex = 3; // winter

    seasonalData[seasonIndex].catches++;
    seasonalData[seasonIndex].averageWeight += parseFloat(catch_.weight);
  });

  trips.forEach(trip => {
    const month = new Date(trip.startDate).getMonth();
    let seasonIndex: number;
    if (month >= 2 && month <= 4) seasonIndex = 0; // spring
    else if (month >= 5 && month <= 7) seasonIndex = 1; // summer
    else if (month >= 8 && month <= 10) seasonIndex = 2; // autumn
    else seasonIndex = 3; // winter

    seasonalData[seasonIndex].trips++;
  });

  // Calculate averages and efficiency for seasons
  seasonalData.forEach(season => {
    if (season.catches > 0) {
      season.averageWeight = season.averageWeight / season.catches;
    }
    if (season.trips > 0) {
      season.efficiency = season.catches / season.trips;
    }
  });

  // Month comparison data (enhanced version of monthlyStats)
  const monthComparisonData = monthlyStats.map(month => ({
    month: month.month, // Keep display label for X-axis
    catches: month.catches,
    totalWeight: month.totalWeight,
    trips: month.trips,
    averageWeight: month.catches > 0 ? month.totalWeight / month.catches : 0,
    efficiency: month.trips > 0 ? month.catches / month.trips : 0
  }));

  return (
    <div className="min-h-screen bg-background" data-testid="page-diary-stats">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/diary")}
              className="gap-2"
              data-testid="button-back-to-diary"
            >
              <ArrowLeft className="w-4 h-4" />
              Späť do denníka
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                Štatistiky
                {!isPremium && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    <Crown className="w-4 h-4 mr-1" />
                    PREMIUM
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground">Analýzy a štatistiky vašich rybárskych úspechov</p>
            </div>
          </div>

          {!isPremium && (
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" data-testid="button-upgrade-premium">
              <Crown className="w-4 h-4" />
              Prejsť na PREMIUM
            </Button>
          )}
        </div>

        {/* Premium Gate for Advanced Stats */}
        {!isPremium && (
          <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
            <Crown className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              Pokročilé štatistiky a analýzy sú dostupné len v PREMIUM verzii. 
              <Button variant="link" className="p-0 h-auto font-medium text-orange-600 ml-1" data-testid="link-premium-upgrade">
                Zistite viac o PREMIUM
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Prehľad
            </TabsTrigger>
            <TabsTrigger value="trends" disabled={!isPremium} data-testid="tab-trends">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trendy
              {!isPremium && <Lock className="w-3 h-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="analysis" disabled={!isPremium} data-testid="tab-analysis">
              <PieChart className="w-4 h-4 mr-2" />
              Analýzy
              {!isPremium && <Lock className="w-3 h-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="achievements" disabled={!isPremium} data-testid="tab-achievements">
              <Award className="w-4 h-4 mr-2" />
              Úspechy
              {!isPremium && <Lock className="w-3 h-3 ml-1" />}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Available for all users */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Celkové úlovky</CardTitle>
                  <Fish className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCatches}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalWeight.toFixed(1)} kg celkom
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Priemerná váha</CardTitle>
                  <Weight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageWeight.toFixed(1)} kg</div>
                  <p className="text-xs text-muted-foreground">
                    Najväčší: {biggestCatch.toFixed(1)} kg
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Výpravy</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTrips}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeTripCount} aktívnych
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Úspešnosť</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{successRate}</div>
                  <p className="text-xs text-muted-foreground">
                    úlovkov na výpravu
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity and Top Locations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Locations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Najlepšie lokality
                  </CardTitle>
                  <CardDescription>
                    Lokality s najväčším počtom úlovkov
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {topLocations.length > 0 ? (
                    <div className="space-y-4">
                      {topLocations.map((location, index) => (
                        <div key={location.location} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                              index === 1 ? 'bg-gray-100 text-gray-800' : 
                              index === 2 ? 'bg-orange-100 text-orange-800' : 
                              'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium line-clamp-1">{location.location}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{location.count} úlovkov</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Žiadne údaje o lokalitách
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Carp Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fish className="w-5 h-5" />
                    Typy kaprov
                  </CardTitle>
                  <CardDescription>
                    Rozdelenie úlovkov podľa typu kapra
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {carpTypeStats.map(stat => (
                      <div key={stat.type} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{stat.label}</span>
                          <span className="text-muted-foreground">
                            {stat.count} úlovkov ({stat.totalWeight.toFixed(1)} kg)
                          </span>
                        </div>
                        <Progress 
                          value={totalCatches > 0 ? (stat.count / totalCatches) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Basic Monthly Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Posledných {selectedPeriod === "3m" ? "3 mesiace" : selectedPeriod === "6m" ? "6 mesiacov" : "12 mesiacov"}
                </CardTitle>
                <CardDescription>
                  Základný prehľad aktivity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyStats.map(month => (
                    <div key={month.month} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{month.month}</p>
                        <p className="text-sm text-muted-foreground">
                          {month.trips} výprav, {month.catches} úlovkov
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{month.totalWeight.toFixed(1)} kg</p>
                        <p className="text-sm text-muted-foreground">celková váha</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Premium-only tabs */}
          <TabsContent value="trends" className="space-y-6">
            {!isPremium ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Pokročilé trendy</h3>
                  <p className="text-muted-foreground mb-4">
                    Detailné grafy trendov, sezónne analýzy a porovnania sú dostupné v PREMIUM verzii.
                  </p>
                  <Button className="gap-2" data-testid="button-upgrade-trends">
                    <Crown className="w-4 h-4" />
                    Prejsť na PREMIUM
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Period Selector for Trends */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Trendy a pokrok</h2>
                    <p className="text-muted-foreground">Pokročilé analýzy vášho rybárskeho pokroku</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Obdobie:</span>
                    <div className="flex rounded-lg border p-1">
                      {(["3m", "6m", "1y"] as const).map((period) => (
                        <Button
                          key={period}
                          variant={selectedPeriod === period ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedPeriod(period)}
                          className="text-xs"
                          data-testid={`button-period-${period}`}
                        >
                          {period === "3m" ? "3 mes." : period === "6m" ? "6 mes." : "1 rok"}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Weight Progression and Catch Frequency Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <WeightProgressionChart data={weightProgressionData} />
                  <CatchFrequencyChart data={catchFrequencyData} />
                </div>

                {/* Seasonal Trends */}
                <SeasonalTrendsChart data={seasonalData.filter(s => s.catches > 0)} />

                {/* Monthly Comparison - Enhanced */}
                <MonthComparisonChart 
                  data={monthComparisonData} 
                  title="Detailné mesačné porovnania"
                  period={selectedPeriod === "3m" ? "posledných 3 mesiacov" : selectedPeriod === "6m" ? "posledných 6 mesiacov" : "posledného roka"}
                />

                {/* Additional Insights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        Najlepší mesiac
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {monthComparisonData.length > 0 ? (
                        (() => {
                          const bestMonth = monthComparisonData.reduce((best, month) => 
                            month.catches > best.catches ? month : best
                          );
                          return (
                            <div>
                              <p className="text-2xl font-bold">{bestMonth.month}</p>
                              <p className="text-sm text-muted-foreground">
                                {bestMonth.catches} úlovkov • {bestMonth.totalWeight.toFixed(1)} kg
                              </p>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-muted-foreground">Žiadne dáta</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        Najefektívnejšie obdobie
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {seasonalData.some(s => s.efficiency > 0) ? (
                        (() => {
                          const bestSeason = seasonalData.reduce((best, season) => 
                            season.efficiency > best.efficiency ? season : best
                          );
                          return (
                            <div>
                              <p className="text-2xl font-bold">{bestSeason.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {bestSeason.efficiency.toFixed(1)} úlovkov/výpravu
                              </p>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-muted-foreground">Žiadne dáta</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-600" />
                        Trend váhy
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {weightProgressionData.length > 1 ? (
                        (() => {
                          const firstMonth = weightProgressionData[0];
                          const lastMonth = weightProgressionData[weightProgressionData.length - 1];
                          const trend = lastMonth.averageWeight - firstMonth.averageWeight;
                          return (
                            <div>
                              <p className="text-2xl font-bold">
                                {trend > 0 ? '+' : ''}{trend.toFixed(1)} kg
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {trend > 0 ? 'Zlepšenie' : trend < 0 ? 'Pokles' : 'Stabilný'} priemernej váhy
                              </p>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-muted-foreground">Žiadne dáta</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <Card className="text-center py-12">
              <CardContent>
                <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Pokročilé analýzy</h3>
                <p className="text-muted-foreground mb-4">
                  Interaktívne grafy, korelačné analýzy a predikcie sú dostupné v PREMIUM verzii.
                </p>
                <Button className="gap-2" data-testid="button-upgrade-analysis">
                  <Crown className="w-4 h-4" />
                  Prejsť na PREMIUM
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card className="text-center py-12">
              <CardContent>
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Rybárske úspechy</h3>
                <p className="text-muted-foreground mb-4">
                  Systém odznakov, míľnikov a gamifikácie je dostupný v PREMIUM verzii.
                </p>
                <Button className="gap-2" data-testid="button-upgrade-achievements">
                  <Crown className="w-4 h-4" />
                  Prejsť na PREMIUM
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}