import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Fish, Calendar, Clock, Camera, X, Search, 
  MapPin, CheckCircle2, Timer, ChevronDown, Check, 
  Sparkles, RotateCcw, Crown, Eye
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Catch, Team, Referee, Competition } from "@shared/schema";

interface CatchWithDetails extends Catch {
  team?: Team;
  referee?: Referee;
}

const safeWeight = (w: any): number => {
  if (w === null || w === undefined) return 0;
  const parsed = parseFloat(String(w).replace(',', '.'));
  return isFinite(parsed) ? parsed : 0;
};

const safeTimestamp = (d: any): number => {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return isFinite(t) ? t : 0;
};

const getRelativeTime = (dateString: any) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = Date.now();
  const diffInSeconds = Math.floor((now - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Práve teraz';
  if (diffInSeconds < 3600) return `pred ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `pred ${Math.floor(diffInSeconds / 3600)} hod`;
  return date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' });
};

const getTimeString = (dateString: any) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
};

const getFishTypeLabel = (fishType: string) => {
  switch (fishType) {
    case 'scaly': return 'Šupináč';
    case 'mirror': return 'Lysec';
    default: return fishType;
  }
};

const FishBadge = ({ type }: { type: string }) => {
  const isMirror = type === 'mirror';
  return (
    <span className={`px-1.5 py-px rounded text-[10px] font-bold uppercase tracking-wide border ${
      isMirror 
        ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    }`}>
      {isMirror ? 'Lysec' : 'Šupináč'}
    </span>
  );
};

function CatchRow({ 
  data, isTopToday, isRecent, isBigFish, onClick, userRole 
}: { 
  data: CatchWithDetails; 
  isTopToday: boolean; 
  isRecent: boolean; 
  isBigFish: boolean;
  onClick: () => void; 
  userRole: string;
}) {
  const weight = safeWeight(data.weight);
  
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:bg-muted/30 group
        ${isBigFish ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card/50'}
      `}
    >
      {data.photoUrl ? (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden shrink-0 bg-muted border border-border">
          <img src={data.photoUrl} className="w-full h-full object-cover" alt="" />
        </div>
      ) : (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted/50 border border-border flex items-center justify-center shrink-0">
          <Camera size={18} className="text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-foreground text-sm truncate">
            {data.team?.name || 'Neznámy tím'}
          </span>
          {isTopToday && <Crown size={14} className="text-amber-500 fill-amber-500 shrink-0" />}
          {isRecent && !isTopToday && <Sparkles size={14} className="text-blue-400 fill-blue-400 shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">Sektor {data.sector?.trim()}</span>
          <span className="w-1 h-1 bg-border rounded-full" />
          <FishBadge type={data.fishType} />
          {['admin', 'referee'].includes(userRole) && data.referee && (
            <>
              <span className="w-1 h-1 bg-border rounded-full" />
              <span className="text-muted-foreground truncate">Rozhodca S.{data.referee.assignedSector}</span>
            </>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className={`font-mono font-medium text-base ${isBigFish ? 'text-amber-500' : 'text-[#F97316]'}`}>
          {weight.toFixed(2)}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {getRelativeTime(data.submittedAt)}
        </div>
        {['admin', 'referee', 'organizer'].includes(userRole) && data.isVerified === false && (
          <span className="text-[9px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-1 inline-block">
            Neoverené
          </span>
        )}
      </div>
    </div>
  );
}

function CatchDetailModal({ 
  data, onClose, userRole, isTopToday, isBigFish 
}: { 
  data: CatchWithDetails; 
  onClose: () => void; 
  userRole: string;
  isTopToday: boolean;
  isBigFish: boolean;
}) {
  const weight = safeWeight(data.weight);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto z-10">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-card/95 backdrop-blur-sm border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            {isBigFish ? <Crown className="text-amber-500" size={20} /> : <Fish className="text-cyan-500" size={20} />}
            Detail úlovku
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {data.photoUrl && (
          <div className="aspect-video bg-muted border-b border-border overflow-hidden">
            <img src={data.photoUrl} className="w-full h-full object-cover" alt="Úlovok" />
          </div>
        )}

        <div className="p-5 space-y-5">
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-black italic tracking-tighter tabular-nums ${isBigFish ? 'text-amber-500' : 'text-foreground'}`}>
              {weight.toFixed(2)}
            </span>
            <span className="text-xl font-bold text-muted-foreground">kg</span>
          </div>

          {isTopToday && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Crown size={12} className="text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Najväčšia</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Fish size={16} className="text-muted-foreground" />
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Druh ryby</div>
                <div className="font-medium text-foreground">{getFishTypeLabel(data.fishType)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <MapPin size={16} className="text-muted-foreground" />
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Tím • Sektor</div>
                <div className="font-medium text-foreground">
                  {data.team?.name || 'Neznámy tím'} <span className="text-muted-foreground">•</span> Sektor {data.sector?.trim()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Clock size={16} className="text-muted-foreground" />
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Čas nahlásenia</div>
                <div className="font-medium text-foreground">
                  {data.submittedAt ? new Date(data.submittedAt).toLocaleString('sk-SK', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  }) : 'Neznámy'}
                </div>
              </div>
            </div>

            {['admin', 'referee'].includes(userRole) && data.referee && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Eye size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Rozhodca</div>
                  <div className="font-medium text-foreground">Sektor {data.referee.assignedSector}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompetitionCatches() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const userRole = user?.role || 'user';

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCatch, setSelectedCatch] = useState<CatchWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: competition } = useQuery<Competition>({
    queryKey: ['/api/competitions', id],
    enabled: !!id,
  });

  const { data: catches, isLoading } = useQuery<CatchWithDetails[]>({
    queryKey: ['/api/competitions', id, 'catches'],
    enabled: !!id,
    refetchInterval: competition?.status === 'live' ? 10000 : false,
  });

  const bigFishThreshold = competition?.bigFishThreshold ? parseFloat(String(competition.bigFishThreshold)) : 10;

  const competitionDays = useMemo(() => {
    if (!competition?.startDate || !competition?.endDate) return [];
    const days: { key: string; label: string }[] = [];
    const start = new Date(competition.startDate);
    const end = new Date(competition.endDate);
    let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    while (d <= last) {
      const key = d.toISOString().slice(0, 10);
      const raw = d.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'numeric' });
      const label = raw.charAt(0).toUpperCase() + raw.slice(1);
      days.push({ key, label });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [competition?.startDate, competition?.endDate]);

  const viewableCatches = useMemo(() => {
    if (!catches) return [];
    const sorted = [...catches].sort((a, b) => safeTimestamp(b.submittedAt) - safeTimestamp(a.submittedAt));
    if (userRole === 'admin' || userRole === 'referee' || userRole === 'organizer') return sorted;
    return sorted.filter(c => c.isVerified !== false);
  }, [catches, userRole]);

  const topCatchOverallId = useMemo(() => {
    if (viewableCatches.length === 0) return null;
    return viewableCatches.reduce((prev, curr) => (safeWeight(prev.weight) > safeWeight(curr.weight) ? prev : curr)).id;
  }, [viewableCatches]);

  const recentCatchIds = useMemo(() => {
    const threshold = Date.now() - (5 * 60 * 1000);
    return viewableCatches
      .filter(c => safeTimestamp(c.submittedAt) > threshold)
      .map(c => c.id);
  }, [viewableCatches]);

  const getCatchDateKey = (c: CatchWithDetails): string => {
    if (!c.submittedAt) return '';
    return new Date(c.submittedAt).toISOString().slice(0, 10);
  };

  const { processedCatches, groupedByDay } = useMemo(() => {
    const filtered = viewableCatches.filter(c => {
      const dateKey = getCatchDateKey(c);
      const matchesDate = selectedFilter === 'all' ? true : dateKey === selectedFilter;

      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        (c.team?.name || '').toLowerCase().includes(q) || 
        (c.sector || '').toLowerCase().includes(q) ||
        String(c.weight).includes(q) ||
        getFishTypeLabel(c.fishType).toLowerCase().includes(q);
      
      return matchesDate && matchesSearch;
    });

    const dayMap: Record<string, CatchWithDetails[]> = {};
    filtered.forEach(c => {
      const key = getCatchDateKey(c);
      if (!dayMap[key]) dayMap[key] = [];
      dayMap[key].push(c);
    });

    const orderedDays = Object.keys(dayMap).sort((a, b) => b.localeCompare(a));

    return { processedCatches: filtered, groupedByDay: orderedDays.map(key => ({ key, catches: dayMap[key] })) };
  }, [viewableCatches, selectedFilter, searchQuery]);

  const heroCatch = useMemo(() => {
    if (selectedFilter !== 'all' || searchQuery !== '') return null;
    if (processedCatches.length === 0) return null;

    const newest = processedCatches[0];
    const isNew = (Date.now() - safeTimestamp(newest.submittedAt)) < (2 * 60 * 1000);
    if (isNew) return newest;
    if (topCatchOverallId) {
      const top = processedCatches.find(c => c.id === topCatchOverallId);
      if (top) return top;
    }
    return newest;
  }, [processedCatches, topCatchOverallId, selectedFilter, searchQuery]);

  const isHeroVeryRecent = useMemo(() => {
    if (!heroCatch) return false;
    return (Date.now() - safeTimestamp(heroCatch.submittedAt)) < (2 * 60 * 1000);
  }, [heroCatch]);

  const getDayLabel = (dateKey: string): string => {
    const found = competitionDays.find(d => d.key === dateKey);
    if (found) return found.label;
    const d = new Date(dateKey + 'T00:00:00');
    if (isNaN(d.getTime())) return dateKey;
    const raw = d.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const getFilterLabel = () => {
    if (selectedFilter === 'all') return 'Všetky dni';
    return getDayLabel(selectedFilter);
  };

  const handleResetFilters = () => {
    setSelectedFilter('all');
    setSearchQuery("");
    setIsFilterOpen(false);
  };

  const getListWithoutHero = (list: CatchWithDetails[]) => {
    return heroCatch ? list.filter(c => c.id !== heroCatch.id) : list;
  };

  const headerStatsText = useMemo(() => {
    if (searchQuery) return `Nájdené: ${processedCatches.length}`;
    if (selectedFilter !== 'all') return `${getDayLabel(selectedFilter)}: ${processedCatches.length}`;
    return `Spolu: ${viewableCatches.length}`;
  }, [selectedFilter, searchQuery, processedCatches.length, viewableCatches.length, competitionDays]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/4" />
            <div className="h-48 bg-muted rounded-xl" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      
      <header className="bg-background/80 border-b border-border pt-6 pb-4 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground group transition-colors"
              onClick={() => navigate(`/competition/${id}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Späť
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-black italic text-foreground tracking-tighter uppercase">
                  Úlovky
                </h1>
                {competition?.status === 'live' && (
                  <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                    LIVE
                  </span>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                <span className="font-medium text-muted-foreground/70">{competition?.name}</span>
                <span className="text-muted-foreground">
                  · {headerStatsText}
                </span>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input 
                  type="text"
                  placeholder="Hľadať tím, sektor, váhu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg py-2.5 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-[#F97316] focus:border-[#F97316] transition-all outline-none"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="h-full gap-2 border-border bg-card text-muted-foreground px-3 py-0 min-w-[130px] justify-between hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <Calendar size={14} /> 
                    {getFilterLabel()}
                  </span>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                </Button>

                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl z-20 py-1 overflow-hidden max-h-[300px] overflow-y-auto">
                      <button
                        onClick={() => { setSelectedFilter('all'); setIsFilterOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted flex items-center justify-between transition-colors border-b border-border/50"
                      >
                        Všetky dni
                        {selectedFilter === 'all' && <Check size={14} className="text-[#F97316]" />}
                      </button>
                      {competitionDays.map((day) => (
                        <button
                          key={day.key}
                          onClick={() => { setSelectedFilter(day.key); setIsFilterOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted flex items-center justify-between transition-colors border-b border-border/50 last:border-0"
                        >
                          {day.label}
                          {selectedFilter === day.key && <Check size={14} className="text-[#F97316]" />}
                        </button>
                      ))}
                      {selectedFilter !== 'all' && (
                        <div className="bg-muted/30 p-1">
                          <button 
                            onClick={handleResetFilters}
                            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-[#F97316] font-medium flex items-center gap-2 hover:bg-muted rounded transition-colors"
                          >
                            <RotateCcw size={12} />
                            Resetovať filtre
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        
        {heroCatch && (
          <div 
            onClick={() => setSelectedCatch(heroCatch)}
            className={`mb-8 relative w-full overflow-hidden rounded-xl border bg-card shadow-lg cursor-pointer group hover:border-[#F97316]/50 transition-all
              ${safeWeight(heroCatch.weight) >= bigFishThreshold ? 'border-amber-500/30' : 'border-border'}
            `}
          >
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-5/12 aspect-video relative overflow-hidden bg-muted border-b md:border-b-0 md:border-r border-border">
                {heroCatch.photoUrl ? (
                  <img src={heroCatch.photoUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Camera size={48} /></div>
                )}
                <div className="absolute top-3 left-3">
                  {isHeroVeryRecent ? (
                    <span className="bg-[#F97316] text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg flex items-center gap-1">
                      Nový úlovok
                    </span>
                  ) : heroCatch.id === topCatchOverallId ? (
                    <span className="bg-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg flex items-center gap-1">
                      <Crown size={12} fill="currentColor" /> Najväčšia
                    </span>
                  ) : (
                    <span className="bg-card border border-border text-foreground text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg">
                      Najnovšie
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 p-5 md:p-6 flex flex-col justify-center relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-muted-foreground uppercase">
                    {getRelativeTime(heroCatch.submittedAt)}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-5xl font-black italic text-foreground tracking-tighter tabular-nums leading-none">
                      {safeWeight(heroCatch.weight).toFixed(2)}
                    </h2>
                    <span className="text-xl font-bold text-muted-foreground">kg</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-[#F97316] transition-colors flex items-center gap-2">
                    {heroCatch.team?.name || 'Neznámy tím'}
                    {heroCatch.id === topCatchOverallId && <Crown size={18} className="text-amber-500 fill-amber-500" />}
                    {recentCatchIds.includes(heroCatch.id) && heroCatch.id !== topCatchOverallId && <Sparkles size={18} className="text-blue-400 fill-blue-400" />}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 text-foreground/70 font-medium">Sektor {heroCatch.sector?.trim()}</span>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <FishBadge type={heroCatch.fishType} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {processedCatches.length > 0 ? (
          <div className="space-y-8">
            {groupedByDay.map(({ key: dayKey, catches: dayCatches }) => {
              const displayList = getListWithoutHero(dayCatches);
              if (displayList.length === 0) return null;
              return (
                <section key={dayKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{getDayLabel(dayKey)}</span>
                    <span className="h-px flex-1 bg-border/50" />
                  </div>
                  <div className="space-y-2">
                    {displayList.map(c => (
                      <CatchRow 
                        key={c.id} 
                        data={c} 
                        isTopToday={c.id === topCatchOverallId}
                        isRecent={recentCatchIds.includes(c.id)}
                        isBigFish={safeWeight(c.weight) >= bigFishThreshold}
                        onClick={() => setSelectedCatch(c)} 
                        userRole={userRole}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center border border-dashed border-border rounded-xl bg-card/20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground mb-4">
              <Fish size={24} />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {searchQuery || selectedFilter !== 'all' ? 'Žiadne úlovky pre tento filter' : 'Zatiaľ žiadne úlovky'}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              {searchQuery || selectedFilter !== 'all' 
                ? 'Skús zmeniť deň alebo vymazať vyhľadávanie.' 
                : 'Počkajte na prvé úlovky od účastníkov súťaže.'}
            </p>
            {(searchQuery || selectedFilter !== 'all') && (
              <Button variant="outline" className="mt-4" onClick={handleResetFilters}>
                Vymazať filter
              </Button>
            )}
          </div>
        )}
      </main>

      {selectedCatch && (
        <CatchDetailModal 
          data={selectedCatch} 
          onClose={() => setSelectedCatch(null)} 
          userRole={userRole}
          isTopToday={selectedCatch.id === topCatchOverallId}
          isBigFish={safeWeight(selectedCatch.weight) >= bigFishThreshold}
        />
      )}
    </div>
  );
}
