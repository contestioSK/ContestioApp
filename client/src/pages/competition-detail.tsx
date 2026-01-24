import { useParams, useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Trophy, Users, MapPin, Clock, Fish, TrendingUp, Activity, 
  ChevronRight, Target, Crown, Share2, AlertCircle, Timer, 
  BarChart3, X, PieChart, ChevronDown, ChevronUp, Mic, 
  Heart, QrCode, ChevronLeft, LayoutList, UserPlus, Trash2, FileText
} from "lucide-react";
import StatsDashboard from "@/components/stats-dashboard";
import type { Competition, Team, Catch } from "@shared/schema";
import { useFavoriteCompetitions, useToggleFavoriteCompetition } from "@/hooks/useFavorites";
import { QRShareDialog } from "@/components/QRShareDialog";
import { useVisibilityAwarePolling, POLLING_INTERVALS, STALE_TIMES } from "@/hooks/usePolling";

// --- INLINE COMPONENTS ---

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'live') {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-1 rounded-full animate-pulse">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="text-xs font-black uppercase tracking-widest">IDE SA NAPLNO</span>
      </div>
    );
  }
  if (status === 'registration') {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full">
        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
        <span className="text-xs font-black uppercase tracking-widest">REGISTRÁCIA</span>
      </div>
    );
  }
  if (status === 'ended' || status === 'completed' || status === 'finished') {
    return (
      <div className="flex items-center gap-2 bg-muted/50 border border-border text-muted-foreground px-3 py-1 rounded-full">
        <div className="w-2 h-2 bg-muted-foreground rounded-full" />
        <span className="text-xs font-black uppercase tracking-widest">UKONČENÉ</span>
      </div>
    );
  }
  // Fallback for unknown statuses (draft, cancelled, etc.)
  return (
    <div className="flex items-center gap-2 bg-muted/50 border border-border text-muted-foreground px-3 py-1 rounded-full">
      <span className="text-xs font-black uppercase tracking-widest">{status?.toUpperCase() || 'NEZNÁMY'}</span>
    </div>
  );
};

const HorizontalBarChart = ({ data }: { data: { name: string; weight: number; color: string }[] }) => {
  const max = Math.max(...data.map(d => d.weight), 1);
  return (
    <div className="space-y-4">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-foreground font-bold">{d.name}</span>
            <span className="text-muted-foreground">{d.weight.toFixed(1)} kg</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${d.color}`} style={{ width: `${(d.weight / max) * 100}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

const VerticalBarChart = ({ data }: { data: { hour: string; val: number }[] }) => {
  const max = Math.max(...data.map(d => d.val), 1);
  return (
    <div className="h-40 flex items-end justify-between gap-2 mt-4">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
          <div className="relative w-full h-full flex items-end">
            <div 
              className={`w-full rounded-t-sm transition-all duration-500 ${d.val === max ? 'bg-amber-500' : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'}`}
              style={{ height: `${(d.val / max) * 100}%` }}
            />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-border">
              {d.val} ks
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground mt-2 font-mono">{d.hour}</span>
        </div>
      ))}
    </div>
  );
};

const SectorTable = ({ sector, leaderboard }: { sector: string; leaderboard: any[] }) => {
  const sectorTeams = leaderboard.filter(t => t.sector === sector).sort((a, b) => b.weight - a.weight);
  return (
    <div className="bg-card/50 rounded-xl border border-border overflow-hidden mb-4">
      <div className="p-3 bg-muted/50 font-bold text-foreground text-sm flex justify-between">
        <span>Sektor {sector}</span>
        <span className="text-muted-foreground text-xs font-normal">Top 5 tímov</span>
      </div>
      <table className="w-full text-xs text-left">
        <thead className="text-muted-foreground uppercase bg-muted/30">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Tím</th>
            <th className="px-4 py-2 text-right">Váha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sectorTeams.slice(0, 5).map((t, i) => (
            <tr key={i} className="hover:bg-muted/30">
              <td className="px-4 py-2 font-mono text-muted-foreground">{i + 1}.</td>
              <td className="px-4 py-2 text-foreground font-medium">{t.name}</td>
              <td className="px-4 py-2 text-right text-foreground font-bold">{t.weight.toFixed(1)}</td>
            </tr>
          ))}
          {sectorTeams.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">Žiadne tímy v tomto sektore</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// --- HELPER FUNCTIONS ---

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: false, locale: sk });
  } catch {
    return '';
  }
}

function getRemainingTime(endDate: Date | string | null): string {
  if (!endDate) return '';
  try {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Ukončené';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days} ${days === 1 ? 'deň' : days < 5 ? 'dni' : 'dní'}`;
    return `${hours} ${hours === 1 ? 'hodina' : hours < 5 ? 'hodiny' : 'hodín'}`;
  } catch {
    return '';
  }
}

// Team registration form schema
const teamRegistrationSchema = z.object({
  name: z.string().min(1, "Názov tímu je povinný").max(100, "Názov tímu je príliš dlhý"),
  description: z.string().optional(),
  members: z.array(z.object({
    name: z.string().min(1, "Meno člena je povinné"),
    role: z.enum(["captain", "member"]),
    email: z.string().optional().refine((val) => !val || z.string().email().safeParse(val).success, "Zadajte platný e-mail"),
    phone: z.string().optional(),
  })).min(1, "Aspoň jeden člen tímu je povinný").max(6, "Maximálne 6 členov je povolených"),
});

type TeamRegistrationForm = z.infer<typeof teamRegistrationSchema>;

// --- MAIN COMPONENT ---

export default function CompetitionDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [showStatsOverlay, setShowStatsOverlay] = useState(false);
  const [showRulesOverlay, setShowRulesOverlay] = useState(false);
  const [showMyTeamOverlay, setShowMyTeamOverlay] = useState(false);
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);
  const [statsTab, setStatsTab] = useState<'overview' | 'sectors' | 'analytics'>('overview');
  
  // Favorite competitions
  const { data: favoriteCompetitions } = useFavoriteCompetitions();
  const { addFavorite, removeFavorite, isAdding, isRemoving } = useToggleFavoriteCompetition();
  
  const isFavorite = isAuthenticated && favoriteCompetitions?.some(fav => fav.competitionId === id);
  
  const handleToggleFavorite = () => {
    if (!isAuthenticated || !id) return;
    if (isFavorite) {
      removeFavorite(id);
    } else {
      addFavorite(id);
    }
  };

  // Team registration form
  const form = useForm<TeamRegistrationForm>({
    resolver: zodResolver(teamRegistrationSchema),
    defaultValues: {
      name: "",
      description: "",
      members: [
        { name: user?.firstName + " " + user?.lastName || "", role: "captain", email: user?.email || "", phone: "" }
      ],
    },
  });

  // Team registration mutation
  const registerTeamMutation = useMutation({
    mutationFn: async (data: TeamRegistrationForm) => {
      return apiRequest("POST", `/api/competitions/${id}/teams`, data);
    },
    onSuccess: () => {
      toast({
        title: "Tím bol úspešne zaregistrovaný!",
        description: "Registrácia vášho tímu čaká na schválenie organizátorom.",
      });
      setIsRegistrationDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", id, "teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Registrácia zlyhala",
        description: error.message || "Nepodarilo sa zaregistrovať tím. Prosím, skúste to znovu.",
        variant: "destructive",
      });
    },
  });

  const addMember = () => {
    const currentMembers = form.getValues("members");
    if (currentMembers.length < 6) {
      form.setValue("members", [...currentMembers, { name: "", role: "member", email: "", phone: "" }]);
    }
  };

  const removeMember = (index: number) => {
    const currentMembers = form.getValues("members");
    if (currentMembers.length > 1) {
      form.setValue("members", currentMembers.filter((_, i) => i !== index));
    }
  };

  const onSubmitRegistration = (data: TeamRegistrationForm) => {
    registerTeamMutation.mutate(data);
  };

  const { data: competition, isLoading: competitionLoading, error } = useQuery<Competition>({
    queryKey: ["/api/competitions", id],
    enabled: !!id,
  });

  const isLive = competition?.status === 'live';
  const isEnded = competition?.status === 'ended';
  const livePollingInterval = useVisibilityAwarePolling(POLLING_INTERVALS.COMPETITION_LIVE);

  const { data: teams, isLoading: teamsLoading } = useQuery<(Team & { members?: any[] })[]>({
    queryKey: ["/api/competitions", id, "teams"],
    enabled: !!id,
    refetchInterval: isLive ? livePollingInterval : false,
    staleTime: isLive ? STALE_TIMES.LIVE : STALE_TIMES.STATIC,
  });

  const { data: catches, isLoading: catchesLoading } = useQuery<(Catch & { team?: Team; referee?: any })[]>({
    queryKey: ["/api/competitions", id, "catches"],
    enabled: !!id,
    refetchInterval: isLive ? livePollingInterval : false,
    staleTime: isLive ? STALE_TIMES.LIVE : STALE_TIMES.STATIC,
  });

  // WebSocket for real-time updates
  useWebSocket((data) => {
    if (data.type === 'new_catch' && data.competitionId === id) {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", id, "catches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", id, "teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", id, "sectors", "leaderboards"] });
    }
  });

  // --- useMemo AGGREGATIONS ---

  const liveStats = useMemo(() => {
    if (!catches || catches.length === 0) {
      return { totalFish: 0, totalWeight: 0, biggestFish: 0, avgWeight: 0 };
    }
    const totalFish = catches.length;
    const totalWeight = catches.reduce((sum, c) => sum + (parseFloat(String(c.weight)) || 0), 0);
    const biggestFish = Math.max(...catches.map(c => parseFloat(String(c.weight)) || 0));
    const avgWeight = totalFish > 0 ? totalWeight / totalFish : 0;
    return { totalFish, totalWeight, biggestFish, avgWeight };
  }, [catches]);

  const sortedLeaderboard = useMemo(() => {
    if (!teams) return [];
    return teams
      .filter(t => t.status === 'approved')
      .map(team => {
        const teamCatches = catches?.filter(c => c.teamId === team.id) || [];
        const weight = teamCatches.reduce((sum, c) => sum + (parseFloat(String(c.weight)) || 0), 0);
        const fish = teamCatches.length;
        return {
          ...team,
          weight,
          fish,
          sector: team.sector || '-',
        };
      })
      .sort((a, b) => b.weight - a.weight)
      .map((t, i) => ({ ...t, rank: i + 1 }));
  }, [teams, catches]);

  const liveFeed = useMemo(() => {
    if (!catches) return [];
    return [...catches]
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        team: c.team?.name || 'Neznámy tím',
        action: parseFloat(String(c.weight)) >= 10 ? 'big_fish' : 'catch',
        weight: parseFloat(String(c.weight)) || 0,
        fish: c.fishType || 'Ryba',
        time: c.submittedAt ? `Pred ${formatTimeAgo(c.submittedAt)}` : '',
        sector: c.team?.sector || '-',
      }));
  }, [catches]);

  const sectorStats = useMemo(() => {
    if (!catches || !teams) return [];
    const sectors = Array.from(new Set(teams.filter(t => t.sector).map(t => t.sector))).filter(Boolean) as string[];
    const sectorColors = ['bg-cyan-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
    
    return sectors.map((sector, i) => {
      const sectorTeamIds = teams.filter(t => t.sector === sector).map(t => t.id);
      const weight = catches
        .filter(c => sectorTeamIds.includes(c.teamId || ''))
        .reduce((sum, c) => sum + (parseFloat(String(c.weight)) || 0), 0);
      return {
        name: `Sektor ${sector}`,
        weight,
        color: sectorColors[i % sectorColors.length],
      };
    }).sort((a, b) => b.weight - a.weight);
  }, [catches, teams]);

  const hourlyActivity = useMemo(() => {
    if (!catches) return [];
    const hours: { [key: string]: number } = {};
    const hourSlots = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '00:00', '03:00'];
    hourSlots.forEach(h => hours[h] = 0);
    
    catches.forEach(c => {
      if (!c.submittedAt) return;
      const hour = new Date(c.submittedAt).getHours();
      if (hour >= 6 && hour < 9) hours['06:00']++;
      else if (hour >= 9 && hour < 12) hours['09:00']++;
      else if (hour >= 12 && hour < 15) hours['12:00']++;
      else if (hour >= 15 && hour < 18) hours['15:00']++;
      else if (hour >= 18 && hour < 21) hours['18:00']++;
      else if (hour >= 21 && hour < 24) hours['21:00']++;
      else if (hour >= 0 && hour < 3) hours['00:00']++;
      else hours['03:00']++;
    });
    
    return hourSlots.map(hour => ({ hour, val: hours[hour] }));
  }, [catches]);

  // --- DYNAMIC COMMENTARY ---

  const getCommentary = useMemo(() => {
    return (type: 'short' | 'full') => {
      if (!sectorStats.length && !hourlyActivity.length) {
        return type === 'short' ? 'Zatiaľ žiadne dáta.' : 'Čakáme na prvé úlovky...';
      }

      const peakHour = hourlyActivity.reduce((max, h) => h.val > max.val ? h : max, { hour: '', val: 0 });
      const topSector = sectorStats[0];
      
      let timeComment = '';
      if (peakHour.hour) {
        const hourNum = parseInt(peakHour.hour);
        if (hourNum >= 18 || hourNum < 6) {
          timeComment = 'Ryby sa ozývajú hlavne večer a v noci.';
        } else if (hourNum >= 6 && hourNum < 12) {
          timeComment = 'Najlepšie zábery prichádzajú ráno.';
        } else {
          timeComment = 'Zábery prichádzajú rovnomerne počas dňa.';
        }
      }

      if (type === 'short') {
        return timeComment || 'Sledujte vývoj preteku.';
      }

      let fullComment = '';
      if (topSector && topSector.weight > 0) {
        fullComment = `Najviac záberov je v ${topSector.name.toLowerCase()} s celkovou váhou ${topSector.weight.toFixed(1)} kg. `;
      }
      if (peakHour.hour && peakHour.val > 0) {
        fullComment += `Najaktívnejšie obdobie je okolo ${peakHour.hour}.`;
      }
      
      return fullComment || 'Pretek práve prebieha, sledujte aktuálne výsledky.';
    };
  }, [sectorStats, hourlyActivity]);

  const isRegistration = competition?.status === 'registration';
  const visibleLeaderboard = leaderboardExpanded ? sortedLeaderboard : sortedLeaderboard.slice(0, 10);
  const uniqueSectors = Array.from(new Set(sortedLeaderboard.map(t => t.sector).filter(s => s !== '-')));

  // Find user's team in this competition
  const userTeam = useMemo(() => {
    if (!teams || !user?.id) return null;
    return teams.find(team => 
      team.members?.some(member => member.userId === user.id)
    ) || null;
  }, [teams, user?.id]);

  // --- LOADING STATE ---

  if (authLoading || competitionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Súťaž nebola nájdená</h1>
          <p className="text-muted-foreground mb-6">Súťaž, ktorú hľadáte, neexistuje.</p>
          <Button onClick={() => navigate('/')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Späť na hlavnú stránku
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      
      {/* 1. ATMOSPHERIC HEADER */}
      <header className="relative overflow-hidden border-b border-border bg-card">
        {/* Blur Background */}
        {competition.imageUrl && (
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <img src={competition.imageUrl} className="w-full h-full object-cover blur-3xl scale-110" alt="" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-6">
          {/* Nav Row */}
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              <ChevronLeft size={16} /> Späť
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <StatusBadge status={competition.status} />
                {competition.endDate && competition.status === 'live' && (
                  <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                    <Clock size={12} /> Do konca zostávajú {getRemainingTime(competition.endDate)} lovu
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-4 mb-2">
                {/* Logo Integration */}
                {competition.imageUrl && (
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-background/50 rounded-full p-2 backdrop-blur-sm border border-border shrink-0">
                    <img src={competition.imageUrl} alt="Logo" className="w-full h-full object-contain opacity-90" />
                  </div>
                )}
                <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight leading-none">
                  {competition.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pl-1">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-cyan-500" /> {competition.location}</span>
                <span className="flex items-center gap-1.5"><Users size={14} className="text-emerald-500" /> Na štarte {teams?.filter(t => t.status === 'approved').length || 0} tímov</span>
              </div>
            </div>

            <div className="flex gap-3">
              {/* Action Buttons Group */}
              <div className="flex gap-2 mr-2">
                {isAuthenticated && (
                  <button 
                    onClick={handleToggleFavorite}
                    disabled={isAdding || isRemoving}
                    className={`bg-card/50 hover:bg-card text-muted-foreground hover:text-red-500 p-3 rounded-xl border border-border transition-colors ${isFavorite ? 'text-red-500 bg-red-500/10' : ''}`} 
                    title="Pridať k obľúbeným"
                  >
                    <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
                  </button>
                )}
                {isRegistration && (
                  <QRShareDialog 
                    type="competition" 
                    id={id || ""} 
                    name={competition.name}
                    trigger={
                      <button className="bg-card/50 hover:bg-card text-muted-foreground hover:text-foreground p-3 rounded-xl border border-border transition-colors" title="Zobraziť QR kód">
                        <QrCode size={20} />
                      </button>
                    }
                  />
                )}
                <button className="bg-card/50 hover:bg-card text-muted-foreground hover:text-foreground p-3 rounded-xl border border-border transition-colors" title="Zdieľať">
                  <Share2 size={20} />
                </button>
              </div>

              {/* My Team Button - show when user has a team */}
              {userTeam && (
                <button 
                  onClick={() => setShowMyTeamOverlay(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Users size={20} />
                  <span>Môj tím</span>
                </button>
              )}

              {/* Registration Button - show only during registration when user doesn't have a team */}
              {isRegistration && !userTeam ? (
                <Dialog open={isRegistrationDialogOpen} onOpenChange={setIsRegistrationDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all hover:scale-105">
                      <Users size={20} />
                      <span>Registrovať Tím</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Registrovať tím pre {competition.name}</DialogTitle>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmitRegistration)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Názov tímu</FormLabel>
                              <FormControl>
                                <Input placeholder="Zadajte názov vášho tímu" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Popis tímu (voliteľné)</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Krátky popis vášho tímu" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <FormLabel>Členovia tímu</FormLabel>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={addMember}
                              disabled={form.watch("members").length >= 6}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Pridať člena
                            </Button>
                          </div>

                          {form.watch("members").map((member, index) => (
                            <div key={index} className="space-y-4 p-4 border border-border rounded-lg mb-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">
                                  {index === 0 ? "Kapitán tímu" : `Člen ${index + 1}`}
                                </h4>
                                {index > 0 && (
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeMember(index)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`members.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Celé meno</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Meno člena" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name={`members.${index}.email`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Email (voliteľné)</FormLabel>
                                      <FormControl>
                                        <Input type="email" placeholder="clen@email.com" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <FormField
                                control={form.control}
                                name={`members.${index}.phone`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Telefón (voliteľné)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Telefónne číslo" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="bg-muted/20 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Informácie o registrácii</h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {competition.registrationFee && (
                              <p>Štartovné na tím: ${parseFloat(competition.registrationFee)}</p>
                            )}
                            {competition.maxTeams && (
                              <p>Maximálny počet tímov: {competition.maxTeams}</p>
                            )}
                            <p>Registrácia vášho tímu bude čakať na schválenie organizátorom.</p>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setIsRegistrationDialogOpen(false)}>
                            Zrušiť
                          </Button>
                          <Button type="submit" disabled={registerTeamMutation.isPending}>
                            {registerTeamMutation.isPending ? "Registrujem..." : "Registrovať tím"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* 2. STICKY STATS BAR */}
      {!isRegistration && (
        <div className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-3 overflow-x-auto">
            <div className="flex gap-6 min-w-max md:w-full md:grid md:grid-cols-4 md:gap-0">
              <div className="flex items-center gap-3 px-2">
                <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-500"><Fish size={16} /></div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Spolu chytených</div>
                  <div className="text-lg font-black text-foreground leading-none">{liveStats.totalFish} <span className="text-xs font-normal text-muted-foreground">ks</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-2 md:border-l border-border">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500"><Activity size={16} /></div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Celková váha</div>
                  <div className="text-lg font-black text-foreground leading-none">{liveStats.totalWeight.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-2 md:border-l border-border">
                <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500"><Trophy size={16} /></div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">TOP ryba preteku</div>
                  <div className="text-lg font-black text-foreground leading-none">{liveStats.biggestFish.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-2 md:border-l border-border">
                <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500"><TrendingUp size={16} /></div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold">Priemer na rybu</div>
                  <div className="text-lg font-black text-foreground leading-none">{liveStats.avgWeight.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT GRID */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {isRegistration ? (
          /* REGISTRATION MODE */
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="p-8 rounded-3xl bg-card border border-border relative overflow-hidden">
              <Timer className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-foreground mb-2">Registrácia Otvorená</h2>
              <p className="text-muted-foreground mb-6">{competition.description}</p>
              <button 
                onClick={() => setIsRegistrationDialogOpen(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-emerald-900/20 transition-all"
              >
                Vyplniť Prihlášku
              </button>
            </div>
          </div>
        ) : (
          /* LIVE MATCH CENTER MODE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* --- LEFT COLUMN: LEADERBOARD & PODIUM (8/12) --- */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* PODIUM */}
              {sortedLeaderboard.length >= 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* 2nd Place */}
                  <div className="order-2 md:order-1 bg-card border border-border rounded-2xl p-4 flex flex-col items-center justify-end h-40 md:h-48 relative mt-4 md:mt-0">
                    <div className="absolute -top-4 w-10 h-10 bg-muted-foreground rounded-full flex items-center justify-center font-bold text-background border-4 border-background shadow-lg">2</div>
                    <div className="text-center w-full">
                      <div className="font-bold text-foreground mb-1 truncate px-2">{sortedLeaderboard[1]?.name}</div>
                      <div className="text-2xl font-black text-muted-foreground">{sortedLeaderboard[1]?.weight.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground font-mono">{sortedLeaderboard[1]?.fish} rýb</div>
                    </div>
                  </div>

                  {/* Winner */}
                  <div className="order-1 md:order-2 bg-gradient-to-b from-card to-background border border-amber-500/30 rounded-2xl p-4 flex flex-col items-center justify-end h-48 md:h-56 relative shadow-[0_0_30px_rgba(245,158,11,0.1)] z-10">
                    <div className="absolute -top-6 w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center font-black text-black text-xl border-4 border-background shadow-lg shadow-amber-500/20">
                      <Crown size={24} />
                    </div>
                    <div className="text-center w-full mb-2">
                      <div className="font-bold text-amber-500 mb-1 text-lg px-2 truncate">{sortedLeaderboard[0]?.name}</div>
                      <div className="text-4xl font-black text-foreground">{sortedLeaderboard[0]?.weight.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground font-mono">{sortedLeaderboard[0]?.fish} rýb</div>
                    </div>
                    <div className="w-full bg-muted/50 rounded-lg py-1 text-center text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      Lovia v sektore {sortedLeaderboard[0]?.sector}
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="order-3 md:order-3 bg-card border border-border rounded-2xl p-4 flex flex-col items-center justify-end h-40 md:h-48 relative mt-4 md:mt-0">
                    <div className="absolute -top-4 w-10 h-10 bg-orange-800 rounded-full flex items-center justify-center font-bold text-white border-4 border-background shadow-lg">3</div>
                    <div className="text-center w-full">
                      <div className="font-bold text-foreground mb-1 truncate px-2">{sortedLeaderboard[2]?.name}</div>
                      <div className="text-2xl font-black text-orange-200/60">{sortedLeaderboard[2]?.weight.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground font-mono">{sortedLeaderboard[2]?.fish} rýb</div>
                    </div>
                  </div>
                </div>
              )}

              {/* LEADERBOARD TABLE */}
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Trophy size={16} className="text-muted-foreground" />
                    Aktuálne poradie tímov
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/20 font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-4 w-16">#</th>
                        <th className="px-6 py-4">Tím</th>
                        <th className="px-6 py-4 text-center">Sektor</th>
                        <th className="px-6 py-4 text-right">Ryby</th>
                        <th className="px-6 py-4 text-right">Celková váha (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibleLeaderboard.map((team, index) => (
                        <tr key={team.id} className={`hover:bg-muted/30 transition-colors ${index < 3 ? 'bg-muted/10' : ''}`}>
                          <td className={`px-6 py-4 font-mono font-bold ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-muted-foreground' : index === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                            {team.rank}.
                          </td>
                          <td className="px-6 py-4 font-bold text-foreground">{team.name}</td>
                          <td className="px-6 py-4 text-center text-muted-foreground">{team.sector}</td>
                          <td className="px-6 py-4 text-right text-muted-foreground font-mono">{team.fish}</td>
                          <td className="px-6 py-4 text-right font-black text-foreground text-base">{team.weight.toFixed(1)}</td>
                        </tr>
                      ))}
                      {sortedLeaderboard.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                            Zatiaľ sa ešte nič nezapísalo
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {sortedLeaderboard.length > 10 && (
                  <div className="p-2 bg-muted/30 border-t border-border">
                    <button 
                      onClick={() => setLeaderboardExpanded(!leaderboardExpanded)}
                      className="w-full py-3 flex items-center justify-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest hover:text-foreground transition-colors"
                    >
                      {leaderboardExpanded ? (
                        <>Menej <ChevronUp size={14} /></>
                      ) : (
                        <>Celá Tabuľka ({sortedLeaderboard.length} tímov) <ChevronDown size={14} /></>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* --- RIGHT COLUMN: FEED & INFO (4/12) --- */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* COMMENTATOR TEASER */}
              <div className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                <div className="absolute top-0 right-0 p-20 bg-blue-500/10 blur-3xl rounded-full group-hover:bg-blue-500/20 transition-colors pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3 text-amber-500">
                    <Mic size={14} className="animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Čo hovoria čísla</span>
                  </div>
                  <p className="text-foreground font-bold text-lg leading-tight mb-6">
                    "{getCommentary('short')}"
                  </p>
                  <button 
                    onClick={() => setShowStatsOverlay(true)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    <PieChart size={16} />
                    Kde a kedy berú
                  </button>
                </div>
              </div>

              {/* LIVE FEED */}
              <div className="bg-card border border-border rounded-3xl overflow-hidden flex flex-col max-h-[600px]">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between sticky top-0 z-10">
                  <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Dianie pri vode</h3>
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase bg-emerald-500/10 px-2 py-1 rounded-full">
                    Online
                  </span>
                </div>
                <div className="p-4 space-y-6 overflow-y-auto">
                  {liveFeed.map((item) => (
                    <div key={item.id} className="relative pl-4">
                      <div className="absolute left-0 top-3 bottom-[-24px] w-[2px] bg-border last:hidden"></div>
                      <div className={`absolute left-[-3px] top-3 w-2 h-2 rounded-full border border-card ${item.action === 'big_fish' ? 'bg-amber-500' : 'bg-cyan-500'}`}></div>
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-foreground truncate max-w-[140px]">{item.team}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{item.time}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border">
                          {item.action === 'big_fish' ? (
                            <div className="flex items-center gap-2 w-full">
                              <Crown size={14} className="text-amber-500 shrink-0" />
                              <span className="text-sm text-amber-500 font-bold">Padla veľká ryba! <span className="text-foreground font-black ml-1">{item.weight.toFixed(1)} kg</span></span>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground w-full flex justify-between items-center">
                              <span>{item.fish}</span>
                              <span className="text-foreground font-black">{item.weight.toFixed(1)} kg</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {liveFeed.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      Zatiaľ sa ešte nič nechytilo
                    </div>
                  )}
                </div>
              </div>

              {/* MAP & RULES BUTTONS */}
              <div className="grid grid-cols-2 gap-3">
                <button className="p-4 rounded-2xl bg-card border border-border hover:bg-muted/30 transition-colors text-left group">
                  <MapPin size={20} className="text-muted-foreground group-hover:text-cyan-500 mb-2 transition-colors" />
                  <div className="text-sm font-bold text-foreground">Kde kto loví</div>
                  <div className="text-[10px] text-muted-foreground">Mapa sektorov</div>
                </button>
                <button 
                  onClick={() => setShowRulesOverlay(true)}
                  className="p-4 rounded-2xl bg-card border border-border hover:bg-muted/30 transition-colors text-left group"
                >
                  <FileText size={20} className="text-muted-foreground group-hover:text-cyan-500 mb-2 transition-colors" />
                  <div className="text-sm font-bold text-foreground">Pravidlá</div>
                  <div className="text-[10px] text-muted-foreground">Čo platí na tomto preteku</div>
                </button>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* --- STATS OVERLAY (MODAL) WITH TABS --- */}
      {showStatsOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <div 
            className="absolute inset-0 bg-background/95 backdrop-blur-sm"
            onClick={() => setShowStatsOverlay(false)}
          ></div>

          <div className="relative z-10 bg-card border border-border w-full max-w-5xl max-h-[90vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-3">
                  <PieChart className="text-blue-500" />
                  Ako ryby berú
                </h2>
                <p className="text-muted-foreground text-sm mt-1">Len fakty, žiadne reči</p>
              </div>
              
              {/* TABS SWITCHER */}
              <div className="flex p-1 bg-muted/50 rounded-xl border border-border">
                <button 
                  onClick={() => setStatsTab('overview')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${statsTab === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Prehľad
                </button>
                <button 
                  onClick={() => setStatsTab('sectors')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${statsTab === 'sectors' ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutList size={14} /> Sektory
                </button>
                <button 
                  onClick={() => setStatsTab('analytics')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${statsTab === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <BarChart3 size={14} /> Tvrdé dáta
                </button>
              </div>

              <button 
                onClick={() => setShowStatsOverlay(false)}
                className="absolute top-4 right-4 md:static p-3 bg-muted/50 hover:bg-muted rounded-full transition-colors text-foreground"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
              
              {/* TAB 1: OVERVIEW */}
              {statsTab === 'overview' && (
                <div className="space-y-8">
                  {/* Full Commentator Block */}
                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 md:p-6 rounded-2xl flex gap-4 items-start">
                    <div className="shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mt-1">
                      <Mic size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Komentár k preteku</h4>
                      <p className="text-foreground text-lg md:text-xl font-medium leading-relaxed">
                        "{getCommentary('full')}"
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-card p-6 rounded-3xl border border-border">
                      <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                        <MapPin size={18} className="text-emerald-500" />
                        Kde to momentálne chodí
                      </h3>
                      <HorizontalBarChart data={sectorStats} />
                      {sectorStats.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-6 leading-relaxed bg-muted/30 p-3 rounded-lg">
                          {sectorStats[0]?.name} vedie s váhou {sectorStats[0]?.weight.toFixed(1)} kg.
                        </p>
                      )}
                    </div>

                    <div className="bg-card p-6 rounded-3xl border border-border">
                      <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                        <Clock size={18} className="text-amber-500" />
                        Kedy ryby berú
                      </h3>
                      <p className="text-xs text-muted-foreground mb-6">Časy, kedy sa ryby najčastejšie hlásia</p>
                      <VerticalBarChart data={hourlyActivity} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card p-4 rounded-2xl text-center border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">Priemerná veľkosť úlovku</div>
                      <div className="text-2xl font-black text-foreground">{liveStats.avgWeight.toFixed(1)} kg</div>
                    </div>
                    <div className="bg-card p-4 rounded-2xl text-center border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">Celkový počet úlovkov</div>
                      <div className="text-2xl font-black text-foreground">{liveStats.totalFish}</div>
                    </div>
                    <div className="bg-card p-4 rounded-2xl text-center border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">TOP ryba preteku</div>
                      <div className="text-2xl font-black text-foreground">{liveStats.biggestFish.toFixed(1)} kg</div>
                    </div>
                    <div className="bg-card p-4 rounded-2xl text-center border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">Celková váha</div>
                      <div className="text-2xl font-black text-foreground">{liveStats.totalWeight.toFixed(1)} kg</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SECTORS */}
              {statsTab === 'sectors' && (
                <div className="space-y-6">
                  <h3 className="text-foreground font-bold text-lg mb-4">Detailné poradie v sektoroch</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {uniqueSectors.map(sector => (
                      <SectorTable key={sector} sector={sector} leaderboard={sortedLeaderboard} />
                    ))}
                    {uniqueSectors.length === 0 && (
                      <div className="col-span-full text-center text-muted-foreground py-8">
                        Žiadne sektory nie sú definované
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: ANALYTICS */}
              {statsTab === 'analytics' && (
                <div className="space-y-6">
                  <StatsDashboard competitionId={id!} />
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- RULES OVERLAY (MODAL) --- */}
      {showRulesOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <div 
            className="absolute inset-0 bg-background/95 backdrop-blur-sm"
            onClick={() => setShowRulesOverlay(false)}
          ></div>

          <div className="relative z-10 bg-card border border-border w-full max-w-3xl max-h-[90vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-3">
                  <FileText className="text-cyan-500" />
                  Pravidlá súťaže
                </h2>
                <p className="text-muted-foreground text-sm mt-1">{competition.name}</p>
              </div>

              <button 
                onClick={() => setShowRulesOverlay(false)}
                className="p-3 bg-muted/50 hover:bg-muted rounded-full transition-colors text-foreground"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
              {competition.rules ? (
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-foreground">
                  {competition.rules}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Pre túto súťaž nie sú zadefinované žiadne pravidlá.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MY TEAM OVERLAY (MODAL) --- */}
      {showMyTeamOverlay && userTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <div 
            className="absolute inset-0 bg-background/95 backdrop-blur-sm"
            onClick={() => setShowMyTeamOverlay(false)}
          ></div>

          <div className="relative z-10 bg-card border border-border w-full max-w-2xl max-h-[90vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-3">
                  <Users className="text-blue-500" />
                  {userTeam.name}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    userTeam.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                    userTeam.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {userTeam.status === 'approved' ? 'Tím je v hre' : 
                     userTeam.status === 'pending' ? 'Čaká na schválenie' : 'Zamietnutý'}
                  </span>
                  {userTeam.sector && (
                    <span className="text-muted-foreground text-sm">Sektor {userTeam.sector}</span>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setShowMyTeamOverlay(false)}
                className="p-3 bg-muted/50 hover:bg-muted rounded-full transition-colors text-foreground"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background space-y-6">
              
              {/* Team Stats */}
              {userTeam.status === 'approved' && (isLive || isEnded) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-foreground">{userTeam.fishCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Úlovkov</div>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-foreground">{parseFloat(String(userTeam.totalWeight || 0)).toFixed(2)} kg</div>
                    <div className="text-xs text-muted-foreground">Celková váha</div>
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div>
                <h3 className="text-foreground font-bold text-lg mb-4 flex items-center gap-2">
                  <Users size={18} className="text-blue-500" />
                  Členovia tímu
                </h3>
                <div className="space-y-3">
                  {userTeam.members?.map((member) => (
                    <div key={member.id} className="bg-muted/30 border border-border rounded-xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-foreground">{member.name}</div>
                        {member.email && (
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        )}
                      </div>
                      {member.role === 'captain' && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full">
                          Kapitán
                        </span>
                      )}
                    </div>
                  ))}
                  {(!userTeam.members || userTeam.members.length === 0) && (
                    <div className="text-center py-6 text-muted-foreground">
                      Žiadni členovia tímu
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
