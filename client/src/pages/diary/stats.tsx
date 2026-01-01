import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

import { 
  Fish, 
  Weight,
  MapPin,
  TrendingUp,
  Target,
  Crown,
  BarChart3,
  PieChart,
  Activity,
  Lock,
  Trophy,
  Star,
  Calendar
} from "lucide-react";

import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { useTheme } from "@/contexts/ThemeContext";
import { BG_CLASSES_DARK, BG_CLASSES_LIGHT, TEXT_CLASSES_DARK, TEXT_CLASSES_LIGHT } from "@/lib/colors";
import { PremiumGate, PremiumTeaserCard } from "@/components/PremiumGate";

import {
  calculateBasicStats,
  calculateMonthlyStats,
  calculateFishTypeStats,
  calculateTopBaits,
  calculateTopLocations
} from "@/lib/stats/basicStats";

import {
  calculateSeasonalData,
  calculateHourlyDistribution,
  calculateWeightProgression,
  calculateCatchFrequency,
  calculateMonthComparison,
  calculateAdvancedSuccessRate,
  calculateCatchQualityScores,
  calculateLocationPerformance,
  calculatePersonalRecords
} from "@/lib/stats/advancedMetrics";

import type { DiaryTrip, DiaryCatch } from "@shared/schema";

import { WeightProgressionChart } from "@/components/diary-charts/weight-progression-chart";
import { CatchFrequencyChart } from "@/components/diary-charts/catch-frequency-chart";
import { MonthComparisonChart } from "@/components/diary-charts/month-comparison-chart";
import { HourlyDistributionChart } from "@/components/stats-dashboard/charts/hourly-distribution-chart";

type PremiumStatus = {
  isPremium: boolean;
};

export default function DiaryStats() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [, setLocation] = useLocation();
  const selectedPeriodMonths: 3 | 6 | 12 | 24 = 6;
  const [compositionView, setCompositionView] = useState<'count' | 'weight'>('count');
  const [activeTab, setActiveTab] = useState('overview');
  
  const bgColors = isDark ? BG_CLASSES_DARK : BG_CLASSES_LIGHT;
  const textColors = isDark ? TEXT_CLASSES_DARK : TEXT_CLASSES_LIGHT;

  const { data: trips = [] } = useQuery<DiaryTrip[]>({
    queryKey: ["/api/diary/trips"],
    enabled: !!user
  });

  const { data: catches = [] } = useQuery<DiaryCatch[]>({
    queryKey: ["/api/diary/catches", "all"],
    enabled: !!user
  });

  const { data: premiumStatus } = useQuery<PremiumStatus>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user
  });

  const isPremium = premiumStatus?.isPremium || false;

  const basicStats = useMemo(() => calculateBasicStats(catches, trips), [catches, trips]);
  const monthlyStats = useMemo(() => calculateMonthlyStats(catches, trips, selectedPeriodMonths), [catches, trips, selectedPeriodMonths]);
  const fishTypeStats = useMemo(() => calculateFishTypeStats(catches), [catches]);
  const topBaits = useMemo(() => calculateTopBaits(catches), [catches]);
  const topLocations = useMemo(() => calculateTopLocations(trips, catches), [trips, catches]);

  const advancedSuccessRate = useMemo(() => calculateAdvancedSuccessRate(catches, trips, monthlyStats), [catches, trips, monthlyStats]);
  const catchQualityScores = useMemo(() => calculateCatchQualityScores(catches), [catches]);
  const locationPerformance = useMemo(() => calculateLocationPerformance(trips, catches, catchQualityScores), [trips, catches, catchQualityScores]);
  const personalRecords = useMemo(() => calculatePersonalRecords(catches, trips, monthlyStats), [catches, trips, monthlyStats]);
  
  const seasonalData = useMemo(() => calculateSeasonalData(catches, trips), [catches, trips]);
  const hourlyDistributionData = useMemo(() => calculateHourlyDistribution(catches), [catches]);
  const weightProgressionData = useMemo(() => calculateWeightProgression(monthlyStats, catches), [monthlyStats, catches]);
  const catchFrequencyData = useMemo(() => calculateCatchFrequency(monthlyStats), [monthlyStats]);
  const monthComparisonData = useMemo(() => calculateMonthComparison(monthlyStats), [monthlyStats]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <DiaryLayout>
      <div className="p-6 space-y-6" data-testid="page-diary-stats">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <TacticalIcon icon={BarChart3} variant="purple" size="lg" showLabel={false} />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Analýza Sezóny</h1>
                <p className="text-sm text-muted-foreground">Tvoje úspechy premenené na dáta</p>
              </div>
            </div>
            
            <TabsList className="grid grid-cols-4 bg-muted/50 border border-border p-1 rounded-xl h-auto">
              <TabsTrigger 
                value="overview" 
                className="flex flex-col items-center gap-1 py-2 px-1 sm:flex-row sm:gap-1.5 sm:py-1.5 sm:px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-primary" 
                data-testid="tab-overview"
              >
                <TacticalIconInline icon={Activity} variant="orange" size="sm" />
                <span className="text-[10px] sm:text-xs leading-tight">Prehľad</span>
              </TabsTrigger>
              <TabsTrigger 
                value="trends" 
                className={`flex flex-col items-center gap-1 py-2 px-1 sm:flex-row sm:gap-1.5 sm:py-1.5 sm:px-3 text-xs font-medium ${!isPremium ? 'opacity-70' : ''}`}
                data-testid="tab-trends"
              >
                <TacticalIconInline icon={TrendingUp} variant="blue" size="sm" />
                <span className="flex items-center gap-0.5 text-[10px] sm:text-xs leading-tight">
                  Trendy
                  {!isPremium && <Lock className="w-2.5 h-2.5 text-amber-500" />}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                className={`flex flex-col items-center gap-1 py-2 px-1 sm:flex-row sm:gap-1.5 sm:py-1.5 sm:px-3 text-xs font-medium ${!isPremium ? 'opacity-70' : ''}`}
                data-testid="tab-analysis"
              >
                <TacticalIconInline icon={PieChart} variant="purple" size="sm" />
                <span className="flex items-center gap-0.5 text-[10px] sm:text-xs leading-tight">
                  Analýzy
                  {!isPremium && <Lock className="w-2.5 h-2.5 text-amber-500" />}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="achievements" 
                className={`flex flex-col items-center gap-1 py-2 px-1 sm:flex-row sm:gap-1.5 sm:py-1.5 sm:px-3 text-xs font-medium ${!isPremium ? 'opacity-70' : ''}`}
                data-testid="tab-achievements"
              >
                <TacticalIconInline icon={Trophy} variant="amber" size="sm" />
                <span className="flex items-center gap-0.5 text-[10px] sm:text-xs leading-tight">
                  Úspechy
                  {!isPremium && <Lock className="w-2.5 h-2.5 text-amber-500" />}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className={`border-l-4 ${isDark ? 'border-l-orange-500' : 'border-l-orange-600'} transition-colors hover:bg-muted/30`}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Celkové úlovky</p>
                    <TacticalIcon icon={Fish} variant="cyan" size="sm" showLabel={false} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">{basicStats.totalCatches}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{basicStats.totalWeight.toFixed(1)} kg celkom</p>
                </CardContent>
              </Card>

              <Card className={`border-l-4 ${isDark ? 'border-l-blue-500' : 'border-l-blue-600'} transition-colors hover:bg-muted/30`}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Najväčšia ryba</p>
                    <TacticalIcon icon={Weight} variant="orange" size="sm" showLabel={false} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">{basicStats.biggestCatch.toFixed(1)}</span>
                    <span className="text-sm font-medium text-muted-foreground">kg</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Priemer {basicStats.averageWeight.toFixed(1)} kg</p>
                </CardContent>
              </Card>

              <Card className={`border-l-4 ${isDark ? 'border-l-amber-500' : 'border-l-amber-600'} transition-colors hover:bg-muted/30`}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Výpravy</p>
                    <TacticalIcon icon={MapPin} variant="emerald" size="sm" showLabel={false} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">{basicStats.totalTrips}</span>
                    <span className={`text-xs font-medium ${isDark ? 'text-amber-500/70' : 'text-amber-600/70'}`}>{basicStats.activeTripCount} aktívne</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Posledná rybačka</p>
                </CardContent>
              </Card>

              <Card className={`border-l-4 ${isDark ? 'border-l-purple-500' : 'border-l-purple-600'} transition-colors hover:bg-muted/30`}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Úspešnosť</p>
                    <TacticalIcon icon={Target} variant="purple" size="sm" showLabel={false} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">{basicStats.successRate.toFixed(1)}</span>
                    <span className="text-sm font-medium text-muted-foreground">ryby/výpravu</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">Zloženie úlovkov</CardTitle>
                      <CardDescription>Prehľad podľa druhov</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant={compositionView === 'weight' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={`text-xs h-8 px-3 ${compositionView === 'weight' ? '' : 'text-muted-foreground'}`}
                        onClick={() => setCompositionView('weight')}
                        data-testid="button-composition-weight"
                      >
                        Váha
                      </Button>
                      <Button 
                        variant={compositionView === 'count' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={`text-xs h-8 px-3 ${compositionView === 'count' ? '' : 'text-muted-foreground'}`}
                        onClick={() => setCompositionView('count')}
                        data-testid="button-composition-count"
                      >
                        Počet
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {fishTypeStats.length > 0 ? (
                    fishTypeStats.slice(0, 5).map((stat, index) => {
                      const percentage = compositionView === 'count' 
                        ? (basicStats.totalCatches > 0 ? (stat.count / basicStats.totalCatches) * 100 : 0)
                        : (basicStats.totalWeight > 0 ? (stat.totalWeight / basicStats.totalWeight) * 100 : 0);
                      return (
                        <div key={stat.type} className="space-y-2">
                          <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{stat.label}</span>
                              <Badge variant="secondary" className="text-xs">
                                {compositionView === 'count' ? `${stat.count} ks` : `${stat.totalWeight.toFixed(1)} kg`}
                              </Badge>
                            </div>
                            <span className={`text-lg font-bold ${textColors[index % textColors.length]}`}>
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                          <Progress 
                            value={percentage} 
                            className="h-2 bg-muted overflow-hidden" 
                            indicatorClassName={bgColors[index % bgColors.length]}
                          />
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

              <div className="space-y-4">
                <Card className={`${isDark ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-600/5 border-orange-600/20'}`}>
                  <CardContent className="p-5">
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-orange-500' : 'text-orange-600'} mb-4 flex items-center gap-2`}>
                      <TacticalIcon icon={Star} variant="amber" size="sm" showLabel={false} /> Top Nástraha
                    </h4>
                    <div className="flex items-center gap-4">
                      <TacticalIcon icon={Fish} variant="cyan" size="sm" showLabel={false} />
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

                {!isPremium && (
                  <PremiumTeaserCard 
                    type="trends" 
                    previewLabel="Najlepší čas lovu:"
                  />
                )}

                {isPremium && topLocations[0] && (
                  <Card className={`${isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-600/5 border-blue-600/20'}`}>
                    <CardContent className="p-5">
                      <h4 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-blue-500' : 'text-blue-600'} mb-4 flex items-center gap-2`}>
                        <TacticalIcon icon={Trophy} variant="amber" size="sm" showLabel={false} /> Najlepšia lokalita
                      </h4>
                      <div className="flex items-center gap-4">
                        <TacticalIcon icon={MapPin} variant="emerald" size="sm" showLabel={false} />
                        <div>
                          <h5 className="font-bold text-foreground text-lg leading-tight">
                            {topLocations[0].location}
                          </h5>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {topLocations[0].count} úlovkov
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {!isPremium && (
              <Card className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-background to-background border-amber-500/20">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Crown className="w-24 h-24 -rotate-12" />
                </div>
                <CardContent className="p-5 md:p-6 flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 text-center md:text-left relative z-10">
                    <Badge className="mb-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20">PREMIUM</Badge>
                    <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">Zisti, kedy ryby berú najčastejšie</h3>
                    <p className="text-xs text-muted-foreground max-w-md">
                      TOP rybári už tieto dáta používajú. Získaj prístup k hodinovej analýze, trendov a porovnaniu lokalít.
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    className="relative z-10 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 font-medium px-6"
                    onClick={() => setLocation('/diary/premium')}
                    data-testid="button-get-premium"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Získať PREMIUM
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border">
              <TacticalIconInline icon={Activity} variant="orange" size="sm" />
              <p>Štatistiky sú aktualizované v reálnom čase po každom schválenom úlovku.</p>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {isPremium ? (
              <div className="grid grid-cols-1 gap-6">
                <MonthComparisonChart data={monthComparisonData} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <HourlyDistributionChart data={hourlyDistributionData} />
                  <div className="space-y-6">
                    {advancedSuccessRate.bestHour && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Najlepší čas lovu</CardTitle>
                          <CardDescription>Na základe tvojich dát</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4">
                            <div className="text-4xl font-bold text-primary">
                              {String(advancedSuccessRate.bestHour.hour).padStart(2, '0')}:00
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {advancedSuccessRate.bestHour.rate.toFixed(1)} ryby/výpravu v tejto hodine
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {advancedSuccessRate.bestDay && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Najlepší deň</CardTitle>
                          <CardDescription>Kedy máš najväčšiu úspešnosť</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4">
                            <div className="text-4xl font-bold text-primary">
                              {advancedSuccessRate.bestDay.day}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {advancedSuccessRate.bestDay.rate.toFixed(1)} ryby/výpravu
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <PremiumGate type="trends" showPreview>
                <div className="grid grid-cols-1 gap-6">
                  <MonthComparisonChart data={monthComparisonData} />
                </div>
              </PremiumGate>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {isPremium ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locationPerformance.locationStats.slice(0, 6).map((loc, index) => (
                    <Card key={loc.location} className="hover:bg-muted/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TacticalIconInline icon={MapPin} variant="emerald" size="sm" />
                            <span className="font-medium text-sm truncate max-w-[150px]">{loc.location}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {loc.catches} úlovkov
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>Úspešnosť: <span className="text-foreground font-medium">{loc.successRate.toFixed(1)}/výpravu</span></div>
                          <div>Priemer: <span className="text-foreground font-medium">{loc.averageWeight.toFixed(1)} kg</span></div>
                          <div>Maximum: <span className="text-foreground font-medium">{loc.biggestCatch.toFixed(1)} kg</span></div>
                          <div>Výpravy: <span className="text-foreground font-medium">{loc.trips}x</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Kvalita úlovkov</CardTitle>
                    <CardDescription>Rozdelenie podľa váhy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      {catchQualityScores.qualityDistribution.map((dist, index) => (
                        <div key={dist.quality} className="text-center">
                          <div className="text-2xl font-bold" style={{ color: dist.color }}>{dist.count}</div>
                          <div className="text-xs text-muted-foreground">{dist.quality}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="text-sm text-muted-foreground mb-2">Percentily váhy:</div>
                      <div className="flex gap-4 text-xs">
                        <span>25%: <strong>{catchQualityScores.weightPercentiles.p25.toFixed(1)} kg</strong></span>
                        <span>50%: <strong>{catchQualityScores.weightPercentiles.p50.toFixed(1)} kg</strong></span>
                        <span>75%: <strong>{catchQualityScores.weightPercentiles.p75.toFixed(1)} kg</strong></span>
                        <span>90%: <strong>{catchQualityScores.weightPercentiles.p90.toFixed(1)} kg</strong></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sezónna analýza</CardTitle>
                    <CardDescription>Porovnanie výkonnosti podľa ročných období</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      {seasonalData.map((season, index) => (
                        <div key={season.season} className="text-center p-4 bg-muted/30 rounded-lg">
                          <div className="text-lg font-bold text-foreground">{season.label}</div>
                          <div className="text-2xl font-bold text-primary mt-2">{season.catches}</div>
                          <div className="text-xs text-muted-foreground">úlovkov</div>
                          <div className="text-sm text-muted-foreground mt-2">
                            {season.efficiency.toFixed(1)} ryby/výpravu
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <PremiumGate type="analysis" showPreview>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-50">
                  {[1, 2, 3].map(i => (
                    <Card key={i}>
                      <CardContent className="p-4 h-32 bg-muted/20" />
                    </Card>
                  ))}
                </div>
              </PremiumGate>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            {isPremium ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {personalRecords.heaviestCatch && (
                    <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 text-amber-500 mb-3">
                          <TacticalIconInline icon={Trophy} variant="amber" size="md" />
                          <span className="text-xs font-bold uppercase tracking-widest">Najťažší úlovok</span>
                        </div>
                        <div className="text-3xl font-bold text-foreground">
                          {parseFloat(personalRecords.heaviestCatch.weight).toFixed(1)} kg
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {personalRecords.heaviestCatch.fishType}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {personalRecords.longestCatch && (
                    <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 text-blue-500 mb-3">
                          <TacticalIconInline icon={Trophy} variant="blue" size="md" />
                          <span className="text-xs font-bold uppercase tracking-widest">Najdlhší úlovok</span>
                        </div>
                        <div className="text-3xl font-bold text-foreground">
                          {personalRecords.longestCatch.lengthCm} cm
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {personalRecords.longestCatch.fishType}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {personalRecords.bestTrip && (
                    <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 text-orange-500 mb-3">
                          <TacticalIconInline icon={Star} variant="orange" size="md" />
                          <span className="text-xs font-bold uppercase tracking-widest">Najlepšia výprava</span>
                        </div>
                        <div className="text-3xl font-bold text-foreground">
                          {personalRecords.bestTrip.catchCount} úlovkov
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {personalRecords.bestTrip.totalWeight.toFixed(1)} kg celkom
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Séria úspešných výprav
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-8">
                      <div>
                        <div className="text-4xl font-bold text-primary">{personalRecords.streaks.current}</div>
                        <div className="text-sm text-muted-foreground">Aktuálna séria</div>
                      </div>
                      <div>
                        <div className="text-4xl font-bold text-muted-foreground">{personalRecords.streaks.longest}</div>
                        <div className="text-sm text-muted-foreground">Najlepšia séria</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {personalRecords.monthlyRecords.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Mesačné rekordy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {personalRecords.monthlyRecords.slice(0, 8).map(record => (
                          <div key={record.month} className="text-center p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground">{record.month}</div>
                            <div className="text-lg font-bold text-foreground">{record.totalCatches} úlovkov</div>
                            <div className="text-xs text-muted-foreground">{record.totalWeight.toFixed(1)} kg</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <PremiumGate type="achievements" showPreview>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-50">
                  {[1, 2, 3].map(i => (
                    <Card key={i}>
                      <CardContent className="p-4 h-32 bg-muted/20" />
                    </Card>
                  ))}
                </div>
              </PremiumGate>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DiaryLayout>
  );
}
