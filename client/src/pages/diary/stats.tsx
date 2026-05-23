import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { 
  Fish, 
  Clock,
  Calendar,
  ArrowUpRight,
  Info,
  Crown,
  Lock,
  Trophy,
  BarChart3,
  Weight,
  Map,
  Target,
  ChevronDown,
  ChevronRight,
  Loader2
} from "lucide-react";

const getFishDeclension = (count: number): string => {
  if (count === 1) return "rybu";
  if (count >= 2 && count <= 4) return "ryby";
  return "rýb";
};

import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon } from "@/components/ui/tactical-icon";
import { useTheme } from "@/contexts/ThemeContext";

import {
  calculateBasicStats,
  calculateMonthlyStats,
  calculateFishTypeStats,
} from "@/lib/stats/basicStats";

import {
  calculateHourlyDistribution,
  calculateAdvancedSuccessRate,
  calculatePersonalRecords,
} from "@/lib/stats/advancedMetrics";

import type { DiaryTrip, DiaryCatch } from "@shared/schema";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";

type PremiumStatus = {
  isPremium: boolean;
};

type BaitStat = {
  bait: string;
  catchCount: number;
  totalWeight: number;
  averageWeight: number;
  maxWeight: number;
  maxWeightFish: string | null;
  maxWeightDate: string | null;
  maxWeightNickname: string | null;
  topFishType: { fishType: string; count: number } | null;
  lastUsed: string | null;
  catches: Array<{
    id: string;
    weight: number;
    fishType: string;
    capturedAt: string;
    nickname: string | null;
  }>;
  monthlyUsage: Record<number, number>;
};

const TrendChart = ({ data }: { data: { label: string; val: number }[] }) => {
  const max = Math.max(...data.map(d => d.val), 1);
  return (
    <div className="mt-6">
      <div className="flex items-end justify-between h-24 gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
            <div 
              className={`w-full max-w-[12px] rounded-full transition-all duration-500 ${d.val > 0 ? 'bg-primary' : 'bg-muted'}`}
              style={{ height: d.val > 0 ? `${(d.val / max) * 100}%` : '4px' }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3 px-1">
        {data.filter((_, i) => i % 3 === 0).map((d, i) => (
          <span key={i} className="text-[10px] text-muted-foreground font-mono uppercase">{d.label}</span>
        ))}
      </div>
    </div>
  );
};

export default function DiaryStats() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [, setLocation] = useLocation();
  const [expandedBait, setExpandedBait] = useState<string | null>(null);
  const [baitSortBy, setBaitSortBy] = useState<"catchCount" | "averageWeight" | "maxWeight" | "totalWeight">("catchCount");
  const selectedPeriodMonths: 3 | 6 | 12 | 24 = 12;
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data: allTrips = [] } = useQuery<DiaryTrip[]>({
    queryKey: ["/api/diary/trips"],
    enabled: !!user
  });

  const { data: allCatches = [] } = useQuery<DiaryCatch[]>({
    queryKey: ["/api/diary/catches", "all"],
    enabled: !!user
  });

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    allCatches.forEach(c => {
      if (c.capturedAt) {
        years.add(new Date(c.capturedAt).getFullYear());
      }
    });
    allTrips.forEach(t => {
      if (t.startDate) {
        years.add(new Date(t.startDate).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allCatches, allTrips, currentYear]);

  const catches = useMemo(() => allCatches.filter(c => {
    if (!c.capturedAt) return false;
    return new Date(c.capturedAt).getFullYear() === selectedYear;
  }), [allCatches, selectedYear]);

  const trips = useMemo(() => allTrips.filter(t => {
    if (!t.startDate) return false;
    return new Date(t.startDate).getFullYear() === selectedYear;
  }), [allTrips, selectedYear]);

  const { data: premiumStatus } = useQuery<PremiumStatus>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user
  });

  const isPremium = premiumStatus?.isPremium || false;

  const { data: baitStats = [], isLoading: isLoadingBaitStats, isError: isBaitStatsError } = useQuery<BaitStat[]>({
    queryKey: [`/api/diary/bait-stats?year=${selectedYear}`],
    enabled: !!user,
    retry: 1,
  });

  const sortedBaitStats = useMemo(() => {
    return [...baitStats].sort((a, b) => {
      switch (baitSortBy) {
        case "averageWeight": return b.averageWeight - a.averageWeight;
        case "maxWeight": return b.maxWeight - a.maxWeight;
        case "totalWeight": return b.totalWeight - a.totalWeight;
        default: return b.catchCount - a.catchCount;
      }
    });
  }, [baitStats, baitSortBy]);

  const basicStats = useMemo(() => calculateBasicStats(catches, trips), [catches, trips]);
  const monthlyStats = useMemo(() => calculateMonthlyStats(catches, trips, selectedPeriodMonths), [catches, trips, selectedPeriodMonths]);
  const fishTypeStats = useMemo(() => calculateFishTypeStats(catches), [catches]);
  
  const advancedSuccessRate = useMemo(() => calculateAdvancedSuccessRate(catches, trips, monthlyStats), [catches, trips, monthlyStats]);
  const hourlyDistributionData = useMemo(() => calculateHourlyDistribution(catches), [catches]);
  const personalRecords = useMemo(() => calculatePersonalRecords(catches, trips, monthlyStats), [catches, trips, monthlyStats]);

  const heroCatch = useMemo(() => {
    const catchesWithPhotos = catches.filter(c => c.photos && c.photos.length > 0);
    if (catchesWithPhotos.length === 0) return null;
    
    const biggest = catchesWithPhotos.reduce((max, c) => 
      parseFloat(c.weight) > parseFloat(max.weight) ? c : max
    , catchesWithPhotos[0]);
    
    const trip = trips.find(t => t.id === biggest.tripId);
    const photoUrl = typeof biggest.photos![0] === 'string' 
      ? biggest.photos![0] 
      : biggest.photos![0].url;
    
    return {
      id: biggest.id,
      photo: photoUrl,
      weight: parseFloat(biggest.weight),
      species: getFishTypeLabel(biggest.fishType),
      location: trip?.location || 'Neznáma lokalita',
      date: biggest.capturedAt ? new Date(biggest.capturedAt).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' }) : ''
    };
  }, [catches, trips]);

  const monthlyTrendData = useMemo(() => {
    return monthlyStats.map(stat => ({
      label: stat.month.split(' ')[0],
      val: stat.catches
    }));
  }, [monthlyStats]);

  const topHourlyWindows = useMemo(() => {
    if (!hourlyDistributionData || hourlyDistributionData.length === 0) return [];
    
    const sorted = [...hourlyDistributionData].sort((a, b) => b.count - a.count);
    return sorted.slice(0, 3).map(h => `${String(h.hour).padStart(2, '0')}:00 – ${String(h.hour + 1).padStart(2, '0')}:00`);
  }, [hourlyDistributionData]);

  const topSpecies = useMemo(() => {
    return fishTypeStats.slice(0, 3).map(f => ({
      name: f.label,
      count: f.count
    }));
  }, [fishTypeStats]);

  const hasEnoughData = basicStats.totalCatches >= 10;

  return (
    <DiaryLayout>
      <div className="space-y-6 pb-12" data-testid="page-diary-stats">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-px w-16 bg-[#28C6CE]"></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#28C6CE]">Štatistiky</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <TacticalIcon icon={BarChart3} variant="orange" size="lg" showLabel={false} />
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-foreground leading-none">Sezóna {selectedYear} v číslach</h1>
              </div>
              <p className="text-sm font-medium text-muted-foreground italic tracking-tight pl-0.5">Tvoje ryby premenené na prehľad</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[120px] bg-card dark:bg-slate-900 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          
          {/* ĽAVÝ STĹPEC (8/12) */}
          <div className="md:col-span-8 space-y-8">

            {/* Sezónny prehľad - 4 karty */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="bg-card dark:bg-slate-900 border border-border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <TacticalIcon icon={Fish} variant="cyan" size="sm" showLabel={false} />
                    <div className="flex-1">
                      <div className="text-xs md:text-sm text-muted-foreground mb-1">Ulovil si</div>
                      <div className="text-xl md:text-2xl font-mono font-medium text-[#28C6CE]">{basicStats.totalCatches} {getFishDeclension(basicStats.totalCatches)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`bg-card dark:bg-slate-900 border border-border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80 ${
                  personalRecords.heaviestCatch ? 'cursor-pointer hover:scale-[1.02]' : ''
                }`}
                onClick={() => personalRecords.heaviestCatch && setLocation(`/diary/catches/${personalRecords.heaviestCatch.id}`)}
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <TacticalIcon icon={Trophy} variant="amber" size="sm" showLabel={false} />
                    <div className="flex-1">
                      <div className="text-xs md:text-sm text-muted-foreground mb-1">Najväčšia ryba</div>
                      <div className="text-xl md:text-2xl font-mono font-medium text-[#28C6CE]">
                        {personalRecords.heaviestCatch ? parseFloat(personalRecords.heaviestCatch.weight).toFixed(2) : basicStats.biggestCatch.toFixed(2)} kg
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card dark:bg-slate-900 border border-border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <TacticalIcon icon={Map} variant="indigo" size="sm" showLabel={false} />
                    <div className="flex-1">
                      <div className="text-xs md:text-sm text-muted-foreground mb-1">Výpravy</div>
                      <div className="text-xl md:text-2xl font-mono font-medium text-[#28C6CE]">{basicStats.totalTrips}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card dark:bg-slate-900 border border-border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <TacticalIcon icon={Weight} variant="purple" size="sm" showLabel={false} />
                    <div className="flex-1">
                      <div className="text-xs md:text-sm text-muted-foreground mb-1">Priemer / Lov</div>
                      <div className="text-xl md:text-2xl font-mono font-medium text-[#28C6CE]">{basicStats.successRate.toFixed(1)} kg</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Hero Catch - len ak má fotku */}
            {heroCatch && (
              <section 
                className="relative aspect-[4/5] md:aspect-[21/9] rounded-xl overflow-hidden border border-border/50 shadow-2xl group cursor-pointer hover:border-amber-500/50 transition-all"
                onClick={() => setLocation(`/diary/catches/${heroCatch.id}`)}
              >
                <img 
                  src={heroCatch.photo} 
                  alt={heroCatch.species}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                
                <div className="absolute top-6 right-6">
                  <div className="bg-amber-500/90 backdrop-blur-sm text-black text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
                    <ArrowUpRight size={12} strokeWidth={3} /> TOP ÚLOVOK
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6 md:p-10">
                  <div className="flex flex-col gap-1 max-w-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    <p className="text-white/80 text-sm font-medium mb-2 flex items-center gap-2">
                      <Calendar size={14} /> {heroCatch.date} · {heroCatch.location}
                    </p>
                    <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter leading-none mb-2">
                      {heroCatch.weight.toFixed(2)}<span className="text-3xl text-white/70 font-bold ml-1">kg</span>
                    </h2>
                    <p className="text-amber-500 font-bold text-xl uppercase tracking-wide">{heroCatch.species}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Mesačný progres */}
            <section className="bg-card dark:bg-slate-900 border border-border/50 rounded-xl p-6 md:p-8">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-bold text-foreground">Ako sa ti darilo počas sezóny</h3>
                {monthlyTrendData.some(d => d.val > 0) && (
                  <span className="hidden md:inline-flex items-center gap-1 text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">
                    <ArrowUpRight size={12} /> Trend
                  </span>
                )}
              </div>
              <TrendChart data={monthlyTrendData} />
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <Info size={12} />
                Graf zobrazuje počet úlovkov za posledných 12 mesiacov.
              </div>
            </section>

            {/* Moje nástrahy - Bait Statistics */}
            <section className="bg-card dark:bg-slate-900 border border-border/50 rounded-xl p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                  <h3 className="text-lg font-bold text-foreground">Moje nástrahy</h3>
                  {baitStats.length > 0 && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {baitStats.length}
                    </Badge>
                  )}
                </div>
                {baitStats.length > 1 && (
                  <Select value={baitSortBy} onValueChange={(v) => setBaitSortBy(v as typeof baitSortBy)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs bg-slate-800/80 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="catchCount">Počet úlovkov</SelectItem>
                      <SelectItem value="averageWeight">Priemerná váha</SelectItem>
                      <SelectItem value="maxWeight">Najväčší úlovok</SelectItem>
                      <SelectItem value="totalWeight">Celková váha</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {isLoadingBaitStats ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sortedBaitStats.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" strokeWidth={1.75} />
                  <p className="text-muted-foreground text-sm">Zatiaľ nemáš žiadne úlovky s nástrahami.</p>
                  <p className="text-xs text-muted-foreground mt-1">Pri zápise úlovku vyplň pole „Nástraha".</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedBaitStats.map((bait, index) => {
                    const isExpanded = expandedBait === bait.bait;
                    const maxCatchCount = sortedBaitStats[0]?.catchCount || 1;
                    const barWidth = (bait.catchCount / maxCatchCount) * 100;
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

                    return (
                      <div key={bait.bait} className="rounded-xl border border-border/50 overflow-hidden transition-all duration-200 hover:border-border">
                        <button
                          type="button"
                          className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedBait(isExpanded ? null : bait.bait)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              index === 0 ? 'bg-amber-500/20 text-amber-500' :
                              index === 1 ? 'bg-zinc-400/20 text-zinc-400' :
                              index === 2 ? 'bg-cyan-700/20 text-cyan-600' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-foreground text-sm truncate">{bait.bait}</span>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                                <span className="text-xs text-muted-foreground">
                                  <span className="font-mono font-medium text-[#28C6CE]">{bait.catchCount}</span> úlovkov
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Ø <span className="font-mono font-medium text-[#28C6CE]">{bait.averageWeight.toFixed(2)}</span> kg
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  PB <span className="font-mono font-medium text-[#28C6CE]">{bait.maxWeight.toFixed(2)}</span> kg
                                </span>
                              </div>
                              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#28C6CE]/70 transition-all duration-500"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-border/30 space-y-4">
                            {/* Summary stats grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                              <div className="p-3 rounded-lg bg-muted/30">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Celková váha</div>
                                <div className="text-sm font-mono font-medium text-[#28C6CE]">{bait.totalWeight.toFixed(2)} kg</div>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/30">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Priemerná váha</div>
                                <div className="text-sm font-mono font-medium text-[#28C6CE]">{bait.averageWeight.toFixed(2)} kg</div>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/30">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">PB úlovok</div>
                                <div className="text-sm font-mono font-medium text-[#28C6CE]">{bait.maxWeight.toFixed(2)} kg</div>
                                {bait.maxWeightFish && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5">{getFishTypeLabel(bait.maxWeightFish)}</div>
                                )}
                              </div>
                              <div className="p-3 rounded-lg bg-muted/30">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Najčastejší druh</div>
                                {bait.topFishType ? (
                                  <>
                                    <div className="text-sm font-medium text-foreground">{getFishTypeLabel(bait.topFishType.fishType)}</div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{bait.topFishType.count}× z {bait.catchCount}</div>
                                  </>
                                ) : (
                                  <div className="text-sm text-muted-foreground">–</div>
                                )}
                              </div>
                            </div>

                            {/* Monthly usage mini chart */}
                            {Object.keys(bait.monthlyUsage).length > 0 && (
                              <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Sezónny prehľad</div>
                                <div className="flex items-end gap-1 h-12">
                                  {monthNames.map((name, i) => {
                                    const count = bait.monthlyUsage[i] || 0;
                                    const maxMonth = Math.max(...Object.values(bait.monthlyUsage), 1);
                                    return (
                                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                        <div
                                          className={`w-full rounded-sm transition-all ${count > 0 ? 'bg-[#28C6CE]/60' : 'bg-muted/50'}`}
                                          style={{ height: count > 0 ? `${Math.max((count / maxMonth) * 100, 10)}%` : '4px' }}
                                          title={`${name}: ${count}`}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex justify-between mt-1">
                                  {monthNames.map((name, i) => (
                                    <span key={i} className="text-[8px] text-muted-foreground flex-1 text-center">{name}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Catch history */}
                            <div>
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Posledné úlovky ({Math.min(bait.catches.length, 5)} z {bait.catches.length})
                              </div>
                              <div className="space-y-1.5">
                                {bait.catches.slice(0, 5).map((c) => (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => setLocation(`/diary/catches/${c.id}`)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Fish className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                                      <span className="text-sm text-foreground">{getFishTypeLabel(c.fishType)}</span>
                                      {c.nickname && <span className="text-xs text-muted-foreground italic">„{c.nickname}"</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-mono font-medium text-[#28C6CE]">{c.weight.toFixed(2)} kg</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {new Date(c.capturedAt).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {bait.lastUsed && (
                              <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/30">
                                Posledné použitie: {new Date(bait.lastUsed).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>

          {/* PRAVÝ STĹPEC (4/12) */}
          <div className="md:col-span-4 space-y-6">

            {/* Hodinový insight */}
            <section className="bg-card dark:bg-slate-900 border border-border/50 rounded-xl p-6 relative overflow-hidden">
              <h3 className="text-lg font-bold text-foreground mb-4">Kedy sa ti darí najviac</h3>
              
              {hasEnoughData && topHourlyWindows.length > 0 ? (
                <>
                  <div className="mb-6">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-4">Najčastejšie zábery</span>
                    <ul className="space-y-3">
                      {topHourlyWindows.map((time, i) => (
                        <li key={i} className="flex items-center gap-3 text-foreground font-medium p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <Clock className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                          {time}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-4">
                    Založené na tvojich {basicStats.totalCatches} úlovkoch.
                  </div>

                  {!isPremium && (
                    <div 
                      className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50 relative group cursor-pointer hover:border-primary/30 transition-colors" 
                      onClick={() => setLocation('/pricing?tab=diary')}
                    >
                      <div className="absolute inset-0 backdrop-blur-[2px] bg-card/60 z-10 flex items-center justify-center rounded-xl">
                        <div className="flex items-center gap-2 text-amber-500 font-medium text-sm">
                          <Lock size={14} />
                          Detailná analýza
                        </div>
                      </div>
                      <div className="flex items-end gap-1 h-12 opacity-30">
                        {[40, 60, 30, 80, 50, 90, 20].map((h, i) => (
                          <div key={i} className="flex-1 bg-primary rounded-sm" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Fish className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    Potrebuješ aspoň 10 úlovkov pre analýzu.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Zatiaľ máš {basicStats.totalCatches} úlovkov.
                  </p>
                </div>
              )}
            </section>

            {/* Top druhy */}
            <section className="bg-card dark:bg-slate-900 border border-border/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Top druhy</h3>
              {topSpecies.length > 0 ? (
                <ul className="space-y-3">
                  {topSpecies.map((species, i) => (
                    <li key={species.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          i === 0 ? 'bg-amber-500/20 text-amber-500' : 
                          i === 1 ? 'bg-zinc-400/20 text-zinc-400' : 
                          'bg-cyan-700/20 text-cyan-600'
                        }`}>
                          {i + 1}
                        </div>
                        <span className="font-medium text-foreground">{species.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs font-mono font-medium text-[#28C6CE]">
                        {species.count} ks
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">Žiadne úlovky</p>
              )}
            </section>

            {/* Míľniky */}
            {(personalRecords.heaviestCatch || personalRecords.bestTrip || personalRecords.streaks.longest > 0) && (
              <section className="bg-card dark:bg-slate-900 border border-border/50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                  Míľniky
                </h3>
                <ul className="space-y-3">
                  {personalRecords.heaviestCatch && (
                    <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Osobný rekord</p>
                        <p className="text-xs text-muted-foreground"><span className="font-mono font-medium text-[#28C6CE]">{parseFloat(personalRecords.heaviestCatch.weight).toFixed(2)} kg</span> - {getFishTypeLabel(personalRecords.heaviestCatch.fishType)}</p>
                      </div>
                    </li>
                  )}
                  {personalRecords.bestTrip && (
                    <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Najlepšia výprava</p>
                        <p className="text-xs text-muted-foreground"><span className="font-mono font-medium text-[#28C6CE]">{personalRecords.bestTrip.catchCount}</span> úlovkov, <span className="font-mono font-medium text-[#28C6CE]">{personalRecords.bestTrip.totalWeight.toFixed(2)} kg</span></p>
                      </div>
                    </li>
                  )}
                  {personalRecords.streaks.longest > 0 && (
                    <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Najdlhšia séria</p>
                        <p className="text-xs text-muted-foreground"><span className="font-mono font-medium text-[#28C6CE]">{personalRecords.streaks.longest}</span> úspešných výprav za sebou</p>
                      </div>
                    </li>
                  )}
                </ul>
              </section>
            )}

            {/* Premium CTA */}
            {!isPremium && (
              <section className="bg-card border border-amber-500/20 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Crown className="h-10 w-10 -rotate-12" strokeWidth={1.75} />
                </div>
                <Badge className="mb-3 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  PREMIUM
                </Badge>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Zisti, kedy ryby berú najčastejšie
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Získaj prístup k pokročilým analýzam, trendom a porovnaniu lokalít.
                </p>
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10 font-medium"
                  onClick={() => setLocation('/pricing?tab=diary')}
                  data-testid="button-get-premium"
                >
                  <Crown className="h-4 w-4 mr-2" strokeWidth={1.75} />
                  Získať PREMIUM
                </Button>
              </section>
            )}

            {/* Best time info for premium */}
            {isPremium && advancedSuccessRate.bestHour && (
              <section className="bg-card border border-primary/20 rounded-xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-2">Najlepší čas lovu</h3>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-mono font-medium text-[#28C6CE]">
                    {String(advancedSuccessRate.bestHour.hour).padStart(2, '0')}:00
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono font-medium text-[#28C6CE]">{advancedSuccessRate.bestHour.rate.toFixed(1)}</span> úlovkov/hod
                  </div>
                </div>
              </section>
            )}

          </div>
        </main>
      </div>
    </DiaryLayout>
  );
}
