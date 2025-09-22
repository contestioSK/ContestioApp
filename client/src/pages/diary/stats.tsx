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

  // ===== ADVANCED METRICS CALCULATIONS =====

  // 1. ADVANCED SUCCESS RATE ANALYSIS
  const advancedSuccessRate = {
    // Overall rates
    overallRate: totalTrips > 0 ? totalCatches / totalTrips : 0,
    
    // Time-based success rates
    hourlyRates: Array.from({ length: 24 }, (_, hour) => {
      const hourCatches = catches.filter(c => new Date(c.capturedAt).getHours() === hour);
      const hourTrips = trips.filter(t => {
        const startHour = new Date(t.startDate).getHours();
        const endHour = new Date(t.endDate).getHours();
        return startHour <= hour && hour <= endHour;
      });
      return {
        hour,
        catches: hourCatches.length,
        trips: hourTrips.length,
        rate: hourTrips.length > 0 ? hourCatches.length / hourTrips.length : 0
      };
    }),
    
    // Day of week rates
    weeklyRates: Array.from({ length: 7 }, (_, day) => {
      const dayCatches = catches.filter(c => new Date(c.capturedAt).getDay() === day);
      const dayTrips = trips.filter(t => new Date(t.startDate).getDay() === day);
      const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
      return {
        day: dayNames[day],
        catches: dayCatches.length,
        trips: dayTrips.length,
        rate: dayTrips.length > 0 ? dayCatches.length / dayTrips.length : 0
      };
    }),
    
    // Monthly efficiency trends
    monthlyEfficiency: monthlyStats.map(month => ({
      month: month.month,
      efficiency: month.trips > 0 ? month.catches / month.trips : 0,
      catches: month.catches,
      trips: month.trips
    }))
  };

  // 2. CATCH QUALITY SCORES
  const catchQualityScores = {
    // Weight percentile calculations
    weightPercentiles: (() => {
      const weights = catches.map(c => parseFloat(c.weight)).sort((a, b) => a - b);
      if (weights.length === 0) return { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 };
      
      const percentile = (p: number) => {
        const index = Math.ceil(weights.length * p / 100) - 1;
        return weights[Math.max(0, index)] || 0;
      };
      
      return {
        p25: percentile(25),
        p50: percentile(50),
        p75: percentile(75),
        p90: percentile(90),
        p95: percentile(95)
      };
    })(),
    
    // Quality distribution (based on weight)
    qualityDistribution: (() => {
      const weights = catches.map(c => parseFloat(c.weight));
      const maxWeight = Math.max(...weights, 0);
      const distribution = { poor: 0, average: 0, good: 0, excellent: 0 };
      
      weights.forEach(weight => {
        const score = maxWeight > 0 ? weight / maxWeight : 0;
        if (score >= 0.8) distribution.excellent++;
        else if (score >= 0.6) distribution.good++;
        else if (score >= 0.4) distribution.average++;
        else distribution.poor++;
      });
      
      return [
        { quality: 'Slabé', label: 'Slabé (< 40%)', count: distribution.poor, color: '#ef4444' },
        { quality: 'Priemerné', label: 'Priemerné (40-60%)', count: distribution.average, color: '#f59e0b' },
        { quality: 'Dobré', label: 'Dobré (60-80%)', count: distribution.good, color: '#10b981' },
        { quality: 'Výborné', label: 'Výborné (80%+)', count: distribution.excellent, color: '#3b82f6' }
      ];
    })(),
    
    // Size scoring for each catch
    catchesWithScores: catches.map(catch_ => {
      const weight = parseFloat(catch_.weight);
      const maxWeight = Math.max(...catches.map(c => parseFloat(c.weight)), 0);
      const weightScore = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;
      
      // Length bonus if available
      const lengthBonus = catch_.lengthCm ? Math.min(20, catch_.lengthCm / 5) : 0;
      
      // Type rarity bonus
      const typeBonus = catch_.carpType === 'grass' ? 15 : 
                       catch_.carpType === 'mirror' ? 10 : 
                       catch_.carpType === 'common' ? 5 : 0;
      
      const totalScore = Math.min(100, weightScore + lengthBonus + typeBonus);
      
      return {
        ...catch_,
        weightScore: Math.round(weightScore),
        lengthBonus: Math.round(lengthBonus),
        typeBonus,
        qualityScore: Math.round(totalScore)
      };
    }).sort((a, b) => b.qualityScore - a.qualityScore)
  };

  // 3. ENHANCED LOCATION PERFORMANCE ANALYTICS
  const locationPerformance = {
    // Detailed location stats
    locationStats: (() => {
      const stats: Record<string, {
        location: string;
        catches: number;
        trips: number;
        totalWeight: number;
        averageWeight: number;
        biggestCatch: number;
        successRate: number;
        quality: number;
      }> = {};
      
      trips.forEach(trip => {
        const tripCatches = catches.filter(c => c.tripId === trip.id);
        const weights = tripCatches.map(c => parseFloat(c.weight));
        const avgQuality = catchQualityScores.catchesWithScores
          .filter(c => c.tripId === trip.id)
          .reduce((sum, c) => sum + c.qualityScore, 0) / Math.max(1, tripCatches.length);
        
        if (!stats[trip.location]) {
          stats[trip.location] = {
            location: trip.location,
            catches: 0,
            trips: 0,
            totalWeight: 0,
            averageWeight: 0,
            biggestCatch: 0,
            successRate: 0,
            quality: 0
          };
        }
        
        const stat = stats[trip.location];
        stat.trips++;
        stat.catches += tripCatches.length;
        stat.totalWeight += weights.reduce((sum, w) => sum + w, 0);
        stat.biggestCatch = Math.max(stat.biggestCatch, ...weights, 0);
        stat.quality = (stat.quality * (stat.trips - 1) + avgQuality) / stat.trips;
      });
      
      // Calculate derived metrics
      Object.values(stats).forEach(stat => {
        stat.averageWeight = stat.catches > 0 ? stat.totalWeight / stat.catches : 0;
        stat.successRate = stat.trips > 0 ? stat.catches / stat.trips : 0;
      });
      
      return Object.values(stats).sort((a, b) => b.successRate - a.successRate);
    })(),
    
    // GPS-based hotspots (if coordinates available)
    gpsHotspots: catches
      .filter(c => c.latitude && c.longitude)
      .map(c => ({
        ...c,
        coordinates: [parseFloat(c.longitude!), parseFloat(c.latitude!)]
      }))
  };

  // 4. PERSONAL RECORDS TRACKING
  const personalRecords = {
    // Weight records
    heaviestCatch: catches.reduce((max, catch_) => {
      const weight = parseFloat(catch_.weight);
      return weight > parseFloat(max?.weight || '0') ? catch_ : max;
    }, catches[0] || null),
    
    // Length records (if available)
    longestCatch: catches
      .filter(c => c.lengthCm)
      .reduce((max, catch_) => {
        return (catch_.lengthCm || 0) > (max?.lengthCm || 0) ? catch_ : max;
      }, null as any),
    
    // Most productive sessions
    bestTrip: trips.map(trip => {
      const tripCatches = catches.filter(c => c.tripId === trip.id);
      const totalWeight = tripCatches.reduce((sum, c) => sum + parseFloat(c.weight), 0);
      return {
        ...trip,
        catchCount: tripCatches.length,
        totalWeight,
        averageWeight: tripCatches.length > 0 ? totalWeight / tripCatches.length : 0
      };
    }).sort((a, b) => b.catchCount - a.catchCount)[0] || null,
    
    // Streak tracking
    streaks: (() => {
      const sortedTrips = trips.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      let currentStreak = 0;
      let maxStreak = 0;
      
      sortedTrips.forEach(trip => {
        const tripCatches = catches.filter(c => c.tripId === trip.id);
        if (tripCatches.length > 0) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });
      
      return { current: currentStreak, longest: maxStreak };
    })(),
    
    // Monthly/yearly records
    monthlyRecords: monthlyStats.map(month => ({
      month: month.month,
      bestCatch: (() => {
        const monthStart = new Date(month.monthStart);
        const monthEnd = new Date(month.monthEnd);
        const monthCatches = catches.filter(c => {
          const catchDate = new Date(c.capturedAt);
          return catchDate >= monthStart && catchDate <= monthEnd;
        });
        return monthCatches.reduce((max, catch_) => {
          const weight = parseFloat(catch_.weight);
          return weight > parseFloat(max?.weight || '0') ? catch_ : max;
        }, monthCatches[0] || null);
      })(),
      totalCatches: month.catches,
      totalWeight: month.totalWeight
    })).filter(record => record.bestCatch)
  };

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
            {isPremium ? (
              <>
                {/* Advanced Success Rate Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Hodinová úspešnosť
                      </CardTitle>
                      <CardDescription>
                        Najlepšie hodiny pre rybačku
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {advancedSuccessRate.hourlyRates
                          .filter(h => h.trips > 0)
                          .sort((a, b) => b.rate - a.rate)
                          .slice(0, 5)
                          .map(hour => (
                            <div key={hour.hour} className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {hour.hour}:00 - {hour.hour + 1}:00
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {hour.rate.toFixed(1)} úlovkov/výpravu
                                </span>
                                <Progress value={hour.rate * 20} className="w-16 h-2" />
                              </div>
                            </div>
                          ))}
                        {advancedSuccessRate.hourlyRates.filter(h => h.trips > 0).length === 0 && (
                          <p className="text-muted-foreground text-center py-4">
                            Žiadne dáta o hodinách
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Týždenná úspešnosť
                      </CardTitle>
                      <CardDescription>
                        Najproduktívnejšie dni v týždni
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {advancedSuccessRate.weeklyRates
                          .filter(d => d.trips > 0)
                          .sort((a, b) => b.rate - a.rate)
                          .map(day => (
                            <div key={day.day} className="flex items-center justify-between">
                              <span className="text-sm font-medium">{day.day}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {day.rate.toFixed(1)} úlovkov/výpravu
                                </span>
                                <Progress value={day.rate * 20} className="w-16 h-2" />
                              </div>
                            </div>
                          ))}
                        {advancedSuccessRate.weeklyRates.filter(d => d.trips > 0).length === 0 && (
                          <p className="text-muted-foreground text-center py-4">
                            Žiadne dáta o dňoch
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Catch Quality Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Kvalita úlovkov
                      </CardTitle>
                      <CardDescription>
                        Rozdelenie úlovkov podľa kvality
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {catchQualityScores.qualityDistribution.map(quality => (
                          <div key={quality.quality} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium" style={{ color: quality.color }}>
                                {quality.label}
                              </span>
                              <span className="text-muted-foreground">
                                {quality.count} úlovkov
                              </span>
                            </div>
                            <Progress 
                              value={totalCatches > 0 ? (quality.count / totalCatches) * 100 : 0}
                              className="h-2"
                              style={{ 
                                '--progress-background': quality.color
                              } as any}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Váhové percentily
                      </CardTitle>
                      <CardDescription>
                        Distribúcia váh vašich úlovkov
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>25. percentil:</span>
                          <span className="font-medium">{catchQualityScores.weightPercentiles.p25.toFixed(1)} kg</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Medián (50%):</span>
                          <span className="font-medium">{catchQualityScores.weightPercentiles.p50.toFixed(1)} kg</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>75. percentil:</span>
                          <span className="font-medium">{catchQualityScores.weightPercentiles.p75.toFixed(1)} kg</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>90. percentil:</span>
                          <span className="font-medium">{catchQualityScores.weightPercentiles.p90.toFixed(1)} kg</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>95. percentil:</span>
                          <span className="font-medium text-blue-600">{catchQualityScores.weightPercentiles.p95.toFixed(1)} kg</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Enhanced Location Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Výkonnosť lokalít
                    </CardTitle>
                    <CardDescription>
                      Detailná analýza najlepších rybárskych miest
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {locationPerformance.locationStats.length > 0 ? (
                      <div className="space-y-4">
                        {locationPerformance.locationStats.slice(0, 5).map((location, index) => (
                          <div key={location.location} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                                  index === 1 ? 'bg-gray-100 text-gray-800' : 
                                  index === 2 ? 'bg-orange-100 text-orange-800' : 
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {index + 1}
                                </div>
                                <h4 className="font-medium">{location.location}</h4>
                              </div>
                              <Badge variant={location.successRate >= 2 ? "default" : "secondary"}>
                                {location.successRate.toFixed(1)} úlovkov/výpravu
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Úlovky:</span>
                                <p className="font-medium">{location.catches}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Výpravy:</span>
                                <p className="font-medium">{location.trips}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Priem. váha:</span>
                                <p className="font-medium">{location.averageWeight.toFixed(1)} kg</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Najväčší:</span>
                                <p className="font-medium">{location.biggestCatch.toFixed(1)} kg</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Žiadne dáta o lokalitách
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
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
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            {isPremium ? (
              <>
                {/* Personal Records */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-600" />
                        Najväčší úlovok
                      </CardTitle>
                      <CardDescription>
                        Váhový rekord
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {personalRecords.heaviestCatch ? (
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-yellow-600">
                            {parseFloat(personalRecords.heaviestCatch.weight).toFixed(1)} kg
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>{personalRecords.heaviestCatch.carpType === 'common' ? 'Obyčajný kaprík' :
                                personalRecords.heaviestCatch.carpType === 'mirror' ? 'Zrkadlový kaprík' :
                                personalRecords.heaviestCatch.carpType === 'grass' ? 'Trávojedný kaprík' : 'Iný kaprík'}</div>
                            <div>{format(new Date(personalRecords.heaviestCatch.capturedAt), "d. MMMM yyyy", { locale: sk })}</div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Žiadne úlovky</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        Najdlhší úlovok
                      </CardTitle>
                      <CardDescription>
                        Dĺžkový rekord
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {personalRecords.longestCatch ? (
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-blue-600">
                            {personalRecords.longestCatch.lengthCm} cm
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>Váha: {parseFloat(personalRecords.longestCatch.weight).toFixed(1)} kg</div>
                            <div>{format(new Date(personalRecords.longestCatch.capturedAt), "d. MMMM yyyy", { locale: sk })}</div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Žiadne dáta o dĺžke</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-green-600" />
                        Najlepšia výprava
                      </CardTitle>
                      <CardDescription>
                        Najviac úlovkov za výpravu
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {personalRecords.bestTrip ? (
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-green-600">
                            {personalRecords.bestTrip.catchCount} úlovkov
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div className="font-medium line-clamp-1">{personalRecords.bestTrip.name}</div>
                            <div>Celková váha: {personalRecords.bestTrip.totalWeight.toFixed(1)} kg</div>
                            <div>{format(new Date(personalRecords.bestTrip.startDate), "d. MMMM yyyy", { locale: sk })}</div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Žiadne výpravy</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Streak Tracking */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-orange-600" />
                        Séria úspechov
                      </CardTitle>
                      <CardDescription>
                        Počet po sebe idúcich úspešných výprav
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Aktuálna séria</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {personalRecords.streaks.current}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Najdlhšia séria</div>
                          <div className="text-2xl font-bold">
                            {personalRecords.streaks.longest}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Celkové štatistiky
                      </CardTitle>
                      <CardDescription>
                        Súhrnné údaje o vašich úspechoch
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Celkové úlovky:</span>
                          <span className="font-medium">{totalCatches}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Celkové výpravy:</span>
                          <span className="font-medium">{totalTrips}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Úspešnosť:</span>
                          <span className="font-medium">{successRate} úlovkov/výpravu</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Celková váha:</span>
                          <span className="font-medium">{totalWeight.toFixed(1)} kg</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Records */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Mesačné rekordy
                    </CardTitle>
                    <CardDescription>
                      Najlepšie úlovky v jednotlivých mesiacoch
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {personalRecords.monthlyRecords.length > 0 ? (
                      <div className="space-y-4">
                        {personalRecords.monthlyRecords.slice(0, 6).map((record, index) => (
                          <div key={record.month} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {index + 1}
                                </div>
                                <h4 className="font-medium">{record.month}</h4>
                              </div>
                              <Badge variant="secondary">
                                {parseFloat(record.bestCatch.weight).toFixed(1)} kg
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Typ:</span>
                                <p className="font-medium">
                                  {record.bestCatch.carpType === 'common' ? 'Obyčajný' :
                                   record.bestCatch.carpType === 'mirror' ? 'Zrkadlový' :
                                   record.bestCatch.carpType === 'grass' ? 'Trávojedný' : 'Iný'}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Dátum:</span>
                                <p className="font-medium">
                                  {format(new Date(record.bestCatch.capturedAt), "d.M.", { locale: sk })}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Úlovky:</span>
                                <p className="font-medium">{record.totalCatches}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Váha celkom:</span>
                                <p className="font-medium">{record.totalWeight.toFixed(1)} kg</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Žiadne mesačné rekordy
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}