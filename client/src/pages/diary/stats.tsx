import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { 
  getPeriodComparison, 
  formatTrendIndicator, 
  formatWeightTrendIndicator, 
  formatSuccessRateTrendIndicator,
  getMonthsForPeriod,
  filterCatchesByMonths,
  filterTripsByMonths,
  getBiggestCatch,
  getBestCatch
} from "@/lib/periodComparison";
import { sk } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { 
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
  Lock,
  Trophy,
  Star,
  Zap
} from "lucide-react";

import DiaryLayout from "@/components/DiaryLayout";

import type { DiaryTrip, DiaryCatch } from "@shared/schema";

// Import new chart components
import { WeightProgressionChart } from "@/components/diary-charts/weight-progression-chart";
import { CatchFrequencyChart } from "@/components/diary-charts/catch-frequency-chart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MonthComparisonChart } from "@/components/diary-charts/month-comparison-chart";
import { HourlyDistributionChart } from "@/components/stats-dashboard/charts/hourly-distribution-chart";

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

// Fish type stats
type FishTypeStats = {
  type: string;
  count: number;
  totalWeight: number;
  label: string;
};

export default function DiaryStats() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPeriodMonths, setSelectedPeriodMonths] = useState<3 | 6 | 12 | 24>(6);

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

  // ===== MEMOIZED CALCULATIONS FOR PERFORMANCE =====
  
  // Basic stats (memoized) - note: activeTripCount computed separately due to time dependency
  const basicStats = useMemo(() => {
    const totalCatches = catches.length;
    const totalWeight = catches.reduce((sum, catch_) => sum + parseFloat(catch_.weight), 0);
    const averageWeight = totalCatches > 0 ? totalWeight / totalCatches : 0;
    const biggestCatch = totalCatches > 0 ? Math.max(...catches.map(c => parseFloat(c.weight))) : 0;
    const totalTrips = trips.length;
    
    return { totalCatches, totalWeight, averageWeight, biggestCatch, totalTrips };
  }, [catches, trips]);
  
  const { totalCatches, totalWeight, averageWeight, biggestCatch, totalTrips } = basicStats;
  
  // Active trip count - computed outside useMemo since it depends on current time
  const activeTripCount = trips.filter(trip => new Date(trip.endDate) >= new Date()).length;

  // Monthly stats (memoized)
  const monthlyStats: MonthlyStats[] = useMemo(() => {
    return getMonthsForPeriod(selectedPeriodMonths).map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthCatches = filterCatchesByMonths(catches, [month]);
      const monthTrips = filterTripsByMonths(trips, [month]);

      return {
        month: format(month, "MMM yyyy", { locale: sk }),
        monthDate: month.toISOString(),
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        catches: monthCatches.length,
        totalWeight: monthCatches.reduce((sum, catch_) => sum + parseFloat(catch_.weight), 0),
        trips: monthTrips.length
      };
    });
  }, [catches, trips, selectedPeriodMonths]);

  // Fish type stats (memoized)
  const fishTypeStats: FishTypeStats[] = useMemo(() => {
    const fishTypeCounts = catches.reduce((acc, catch_) => {
      const fishType = catch_.fishType;
      if (!acc[fishType]) {
        acc[fishType] = { count: 0, totalWeight: 0 };
      }
      acc[fishType].count++;
      acc[fishType].totalWeight += parseFloat(catch_.weight);
      return acc;
    }, {} as Record<string, { count: number; totalWeight: number }>);
    
    return Object.entries(fishTypeCounts)
      .map(([type, stats]) => ({
        type,
        label: getFishTypeLabel(type),
        count: stats.count,
        totalWeight: stats.totalWeight
      }))
      .sort((a, b) => b.count - a.count);
  }, [catches]);

  // Top baits (memoized)
  type BaitStats = {
    bait: string;
    count: number;
    totalWeight: number;
    averageWeight: number;
  };

  const topBaits: BaitStats[] = useMemo(() => {
    const baitCounts = catches.reduce((acc, catch_) => {
      const bait = catch_.bait?.trim();
      if (!bait) return acc;
      if (!acc[bait]) {
        acc[bait] = { count: 0, totalWeight: 0 };
      }
      acc[bait].count++;
      acc[bait].totalWeight += parseFloat(catch_.weight);
      return acc;
    }, {} as Record<string, { count: number; totalWeight: number }>);

    return Object.entries(baitCounts)
      .map(([bait, stats]) => ({
        bait,
        count: stats.count,
        totalWeight: stats.totalWeight,
        averageWeight: stats.count > 0 ? stats.totalWeight / stats.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [catches]);

  // Success rate (memoized)
  const successRate = useMemo(() => 
    totalTrips > 0 ? (totalCatches / totalTrips).toFixed(1) : "0"
  , [totalCatches, totalTrips]);

  // Top locations (memoized)
  const topLocations = useMemo(() => {
    const locationStats = trips.reduce((acc, trip) => {
      const tripCatches = catches.filter(c => c.tripId === trip.id);
      acc[trip.location] = (acc[trip.location] || 0) + tripCatches.length;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(locationStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }));
  }, [trips, catches]);

  // Chart data (memoized)
  const weightProgressionData = useMemo(() => monthlyStats.map(month => {
    const monthCatches = filterCatchesByMonths(catches, [new Date(month.monthDate)]);
    return {
      date: month.monthDate,
      dateLabel: month.month,
      averageWeight: month.catches > 0 ? month.totalWeight / month.catches : 0,
      totalWeight: month.totalWeight,
      catchCount: month.catches,
      biggestCatch: getBiggestCatch(monthCatches)
    };
  }), [monthlyStats, catches]);

  const catchFrequencyData = useMemo(() => monthlyStats.map(month => ({
    date: month.monthDate,
    dateLabel: month.month,
    catches: month.catches,
    trips: month.trips,
    efficiency: month.trips > 0 ? month.catches / month.trips : 0
  })), [monthlyStats]);

  // Seasonal trends data (memoized)
  const seasonalData = useMemo(() => {
    const data = [
      { season: 'spring', label: 'Jar', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 },
      { season: 'summer', label: 'Leto', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 },
      { season: 'autumn', label: 'Jeseň', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 },
      { season: 'winter', label: 'Zima', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 }
    ];

    catches.forEach(catch_ => {
      const month = new Date(catch_.capturedAt).getMonth();
      let seasonIndex: number;
      if (month >= 2 && month <= 4) seasonIndex = 0;
      else if (month >= 5 && month <= 7) seasonIndex = 1;
      else if (month >= 8 && month <= 10) seasonIndex = 2;
      else seasonIndex = 3;
      data[seasonIndex].catches++;
      data[seasonIndex].averageWeight += parseFloat(catch_.weight);
    });

    trips.forEach(trip => {
      const month = new Date(trip.startDate).getMonth();
      let seasonIndex: number;
      if (month >= 2 && month <= 4) seasonIndex = 0;
      else if (month >= 5 && month <= 7) seasonIndex = 1;
      else if (month >= 8 && month <= 10) seasonIndex = 2;
      else seasonIndex = 3;
      data[seasonIndex].trips++;
    });

    data.forEach(season => {
      if (season.catches > 0) season.averageWeight = season.averageWeight / season.catches;
      if (season.trips > 0) season.efficiency = season.catches / season.trips;
    });

    return data;
  }, [catches, trips]);

  const monthComparisonData = useMemo(() => monthlyStats.map(month => ({
    month: month.month,
    catches: month.catches,
    totalWeight: month.totalWeight,
    trips: month.trips,
    averageWeight: month.catches > 0 ? month.totalWeight / month.catches : 0,
    efficiency: month.trips > 0 ? month.catches / month.trips : 0
  })), [monthlyStats]);

  const hourlyDistributionData = useMemo(() => Array.from({ length: 24 }, (_, hour) => {
    const hourCatches = catches.filter(c => new Date(c.capturedAt).getHours() === hour);
    const totalWeightVal = hourCatches.reduce((sum, c) => sum + parseFloat(c.weight), 0);
    return {
      hour,
      hourLabel: String(hour).padStart(2, '0') + ':00',
      count: hourCatches.length,
      totalWeight: parseFloat(totalWeightVal.toFixed(2))
    };
  }), [catches]);

  // ===== ADVANCED METRICS CALCULATIONS (memoized) =====

  // 1. ADVANCED SUCCESS RATE ANALYSIS
  const advancedSuccessRate = useMemo(() => ({
    overallRate: totalTrips > 0 ? totalCatches / totalTrips : 0,
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
    monthlyEfficiency: monthlyStats.map(month => ({
      month: month.month,
      efficiency: month.trips > 0 ? month.catches / month.trips : 0,
      catches: month.catches,
      trips: month.trips
    }))
  }), [catches, trips, totalCatches, totalTrips, monthlyStats]);

  // 2. CATCH QUALITY SCORES (memoized)
  const catchQualityScores = useMemo(() => {
    const weights = catches.map(c => parseFloat(c.weight)).sort((a, b) => a - b);
    const maxWeight = Math.max(...catches.map(c => parseFloat(c.weight)), 0);
    
    const weightPercentiles = (() => {
      if (weights.length === 0) return { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 };
      const percentile = (p: number) => {
        const index = Math.ceil(weights.length * p / 100) - 1;
        return weights[Math.max(0, index)] || 0;
      };
      return { p25: percentile(25), p50: percentile(50), p75: percentile(75), p90: percentile(90), p95: percentile(95) };
    })();
    
    const distribution = { poor: 0, average: 0, good: 0, excellent: 0 };
    weights.forEach(weight => {
      const score = maxWeight > 0 ? weight / maxWeight : 0;
      if (score >= 0.8) distribution.excellent++;
      else if (score >= 0.6) distribution.good++;
      else if (score >= 0.4) distribution.average++;
      else distribution.poor++;
    });
    
    const qualityDistribution = [
      { quality: 'Slabé', label: 'Slabé (< 40%)', count: distribution.poor, color: 'hsl(var(--destructive))' },
      { quality: 'Priemerné', label: 'Priemerné (40-60%)', count: distribution.average, color: 'hsl(var(--accent))' },
      { quality: 'Dobré', label: 'Dobré (60-80%)', count: distribution.good, color: 'hsl(var(--chart-2))' },
      { quality: 'Výborné', label: 'Výborné (80%+)', count: distribution.excellent, color: 'hsl(var(--primary))' }
    ];
    
    const catchesWithScores = catches.map(catch_ => {
      const weight = parseFloat(catch_.weight);
      const weightScore = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;
      const lengthBonus = catch_.lengthCm ? Math.min(20, catch_.lengthCm / 5) : 0;
      const typeBonus = catch_.fishType === 'sumec' ? 15 : catch_.fishType === 'stuka' ? 12 : catch_.fishType === 'amur' ? 10 : catch_.fishType === 'kapor_lysec' ? 8 : 5;
      const totalScore = Math.min(100, weightScore + lengthBonus + typeBonus);
      return { ...catch_, weightScore: Math.round(weightScore), lengthBonus: Math.round(lengthBonus), typeBonus, qualityScore: Math.round(totalScore) };
    }).sort((a, b) => b.qualityScore - a.qualityScore);
    
    return { weightPercentiles, qualityDistribution, catchesWithScores };
  }, [catches]);

  // 3. ENHANCED LOCATION PERFORMANCE ANALYTICS (memoized)
  const locationPerformance = useMemo(() => {
    const stats: Record<string, { location: string; catches: number; trips: number; totalWeight: number; averageWeight: number; biggestCatch: number; successRate: number; quality: number; }> = {};
    
    trips.forEach(trip => {
      const tripCatches = catches.filter(c => c.tripId === trip.id);
      const weights = tripCatches.map(c => parseFloat(c.weight));
      const avgQuality = catchQualityScores.catchesWithScores.filter(c => c.tripId === trip.id).reduce((sum, c) => sum + c.qualityScore, 0) / Math.max(1, tripCatches.length);
      
      if (!stats[trip.location]) {
        stats[trip.location] = { location: trip.location, catches: 0, trips: 0, totalWeight: 0, averageWeight: 0, biggestCatch: 0, successRate: 0, quality: 0 };
      }
      
      const stat = stats[trip.location];
      stat.trips++;
      stat.catches += tripCatches.length;
      stat.totalWeight += weights.reduce((sum, w) => sum + w, 0);
      stat.biggestCatch = Math.max(stat.biggestCatch, ...weights, 0);
      stat.quality = (stat.quality * (stat.trips - 1) + avgQuality) / stat.trips;
    });
    
    Object.values(stats).forEach(stat => {
      stat.averageWeight = stat.catches > 0 ? stat.totalWeight / stat.catches : 0;
      stat.successRate = stat.trips > 0 ? stat.catches / stat.trips : 0;
    });
    
    const gpsHotspots = catches.filter(c => c.latitude && c.longitude).map(c => ({ ...c, coordinates: [parseFloat(c.longitude!), parseFloat(c.latitude!)] }));
    
    return { locationStats: Object.values(stats).sort((a, b) => b.successRate - a.successRate), gpsHotspots };
  }, [trips, catches, catchQualityScores]);

  // 4. PERSONAL RECORDS TRACKING (memoized)
  const personalRecords = useMemo(() => {
    const heaviestCatch = catches.reduce((max, catch_) => parseFloat(catch_.weight) > parseFloat(max?.weight || '0') ? catch_ : max, catches[0] || null);
    const longestCatch = catches.filter(c => c.lengthCm).reduce((max, catch_) => (catch_.lengthCm || 0) > (max?.lengthCm || 0) ? catch_ : max, null as any);
    
    const bestTrip = trips.map(trip => {
      const tripCatches = catches.filter(c => c.tripId === trip.id);
      const tripTotalWeight = tripCatches.reduce((sum, c) => sum + parseFloat(c.weight), 0);
      return { ...trip, catchCount: tripCatches.length, totalWeight: tripTotalWeight, averageWeight: tripCatches.length > 0 ? tripTotalWeight / tripCatches.length : 0 };
    }).sort((a, b) => b.catchCount - a.catchCount)[0] || null;
    
    const streaks = (() => {
      const sortedTrips = [...trips].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      let currentStreak = 0, maxStreak = 0;
      sortedTrips.forEach(trip => {
        if (catches.some(c => c.tripId === trip.id)) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); } else { currentStreak = 0; }
      });
      return { current: currentStreak, longest: maxStreak };
    })();
    
    const monthlyRecords = monthlyStats.map(month => ({
      month: month.month,
      bestCatch: getBestCatch(filterCatchesByMonths(catches, [new Date(month.monthDate)])),
      totalCatches: month.catches,
      totalWeight: month.totalWeight
    })).filter(record => record.bestCatch);
    
    return { heaviestCatch, longestCatch, bestTrip, streaks, monthlyRecords };
  }, [catches, trips, monthlyStats]);

  return (
    <DiaryLayout>
      <div className="p-6 space-y-6" data-testid="page-diary-stats">
        <Tabs defaultValue="overview" className="space-y-6">
        {/* Header with Title + Tabs inline */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <BarChart3 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Analýza Sezóny</h1>
              <p className="text-sm text-muted-foreground">Tvoje úspechy premenené na dáta</p>
            </div>
          </div>
          
          <TabsList className="grid grid-cols-4 bg-muted/50 border border-border p-1 rounded-xl">
            <TabsTrigger value="overview" className="text-xs font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary" data-testid="tab-overview">
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prehľad</span>
            </TabsTrigger>
            <TabsTrigger value="trends" disabled={!isPremium} className="text-xs font-medium gap-1.5" data-testid="tab-trends">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trendy</span>
              {!isPremium && <Lock className="w-3 h-3" />}
            </TabsTrigger>
            <TabsTrigger value="analysis" disabled={!isPremium} className="text-xs font-medium gap-1.5" data-testid="tab-analysis">
              <PieChart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analýzy</span>
              {!isPremium && <Lock className="w-3 h-3" />}
            </TabsTrigger>
            <TabsTrigger value="achievements" disabled={!isPremium} className="text-xs font-medium gap-1.5" data-testid="tab-achievements">
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Úspechy</span>
              {!isPremium && <Lock className="w-3 h-3" />}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="space-y-6 mt-0">
        {/* 4 Metric Cards with colored left borders */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary transition-colors hover:bg-muted/30">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Celkové úlovky</p>
                <Fish className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{totalCatches}</span>
                {catches.length > 0 && (
                  <span className="text-xs font-medium text-primary/70">+{Math.round((catches.length / Math.max(1, totalTrips)) * 10)}%</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{totalWeight.toFixed(1)} kg celkom</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 transition-colors hover:bg-muted/30">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Celková váha</p>
                <Weight className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{totalWeight.toFixed(1)}</span>
                <span className="text-sm font-medium text-muted-foreground">kg</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Priemer {averageWeight.toFixed(1)} kg / úlovok</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 transition-colors hover:bg-muted/30">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Výpravy</p>
                <MapPin className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{totalTrips}</span>
                <span className="text-xs font-medium text-amber-500/70">{activeTripCount} aktívne</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Celkom {totalTrips * 6} hodín pri vode</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 transition-colors hover:bg-muted/30">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Úspešnosť</p>
                <Target className="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{successRate}</span>
                <span className="text-sm font-medium text-muted-foreground">ryby/deň</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Najväčší: {biggestCatch.toFixed(1)} kg</p>
            </CardContent>
          </Card>
        </div>

        {/* Premium Upsell Banner - only for FREE users */}
        {!isPremium && (
          <Card className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-background to-background border-amber-500/10">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Crown className="w-24 h-24 -rotate-12" />
            </div>
            <CardContent className="p-5 md:p-6 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 text-center md:text-left relative z-10">
                <Badge className="mb-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20">PREMIUM</Badge>
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">Odomkni svoj plný potenciál</h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Získaj prístup k hodinovej úspešnosti, analýze tlaku vzduchu a porovnaniu s ostatnými rybármi.
                </p>
              </div>
              <Button 
                variant="outline"
                className="relative z-10 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 font-medium px-6"
                onClick={() => setLocation('/diary/premium')}
                data-testid="button-get-premium"
              >
                Získať PREMIUM
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Two Column Layout: Fish Composition + Right Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Fish Composition (wider) */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Zloženie úlovkov</CardTitle>
                  <CardDescription>Prehľad podľa druhov a váhy</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-xs h-8 px-3 text-muted-foreground">Váha</Button>
                  <Button variant="secondary" size="sm" className="text-xs h-8 px-3">Počet</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {fishTypeStats.length > 0 ? (
                fishTypeStats.slice(0, 5).map((stat, index) => {
                  const percentage = totalCatches > 0 ? (stat.count / totalCatches) * 100 : 0;
                  const colors = ['bg-primary', 'bg-blue-500', 'bg-muted-foreground', 'bg-amber-500', 'bg-purple-500'];
                  return (
                    <div key={stat.type} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{stat.label}</span>
                          <Badge variant="secondary" className="text-xs">{stat.count} ks</Badge>
                        </div>
                        <span className="text-lg font-bold" style={{ color: index === 0 ? 'hsl(var(--primary))' : index === 1 ? '#3b82f6' : 'hsl(var(--muted-foreground))' }}>
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={percentage} className={`h-2 ${colors[index] || 'bg-muted'}`} />
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Žiadne dáta o úlovkoch
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Stacked Cards */}
          <div className="space-y-4">
            {/* Top Bait Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 fill-current" /> Top Nástraha
                </h4>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                    🎣
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground text-lg leading-tight">
                      {topBaits[0]?.bait || 'Žiadne dáta'}
                    </h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {topBaits[0] ? `${topBaits[0].count} úlovkov` : 'Pridaj úlovky s nástrahou'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Best Location Card */}
            <Card>
              <CardContent className="p-5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Najlepšia lokalita
                </h4>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground text-lg leading-tight">
                      {topLocations[0]?.location || 'Žiadne dáta'}
                    </h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {topLocations[0] ? `${topLocations[0].count} úlovkov` : 'Pridaj výpravy s lokalitou'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Milestone Card - Locked for FREE */}
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <Lock className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">Ďalší míľnik</p>
                </div>
                <div className="opacity-40 grayscale">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-bold text-foreground text-lg leading-tight">50 úlovkov</h5>
                      <p className="text-xs text-muted-foreground mt-0.5">{totalCatches}/50 splnených</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeightProgressionChart data={weightProgressionData} />
          <CatchFrequencyChart data={catchFrequencyData} />
          <MonthComparisonChart data={monthComparisonData} />
          <HourlyDistributionChart data={hourlyDistributionData} />
        </div>

        {/* Footer Note */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border">
          <Activity className="w-3.5 h-3.5" />
          <p>Štatistiky sú aktualizované v reálnom čase po každom schválenom úlovku.</p>
        </div>
        </TabsContent>

        {/* Trends Tab - Premium Only */}
        <TabsContent value="trends" className="space-y-6">
          <Card className="text-center py-12">
            <CardContent>
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Pokročilé trendy</h3>
              <p className="text-muted-foreground mb-4">
                Detailné grafy trendov, sezónne analýzy a porovnania sú dostupné v PREMIUM verzii.
              </p>
              <Button className="gap-2" onClick={() => setLocation('/diary/premium')} data-testid="button-upgrade-trends">
                <Crown className="w-4 h-4" />
                Prejsť na PREMIUM
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab - Premium Only */}
        <TabsContent value="analysis" className="space-y-6">
          <Card className="text-center py-12">
            <CardContent>
              <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Pokročilé analýzy</h3>
              <p className="text-muted-foreground mb-4">
                Detailné analýzy kvality úlovkov, lokácií a nástrah sú dostupné v PREMIUM verzii.
              </p>
              <Button className="gap-2" onClick={() => setLocation('/diary/premium')} data-testid="button-upgrade-analysis">
                <Crown className="w-4 h-4" />
                Prejsť na PREMIUM
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab - Premium Only */}
        <TabsContent value="achievements" className="space-y-6">
          <Card className="text-center py-12">
            <CardContent>
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Rybárske úspechy</h3>
              <p className="text-muted-foreground mb-4">
                Systém odznakov, míľnikov a gamifikácie je dostupný v PREMIUM verzii.
              </p>
              <Button className="gap-2" onClick={() => setLocation('/diary/premium')} data-testid="button-upgrade-achievements">
                <Crown className="w-4 h-4" />
                Prejsť na PREMIUM
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </DiaryLayout>
  );
}
