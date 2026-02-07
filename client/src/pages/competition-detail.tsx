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
  Heart, QrCode, ChevronLeft, LayoutList, UserPlus, Trash2, FileText,
  MoreVertical, Link2, Camera, Search, Calendar, Check, 
  Sparkles, RotateCcw, Eye, CheckCircle2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatsDashboard from "@/components/stats-dashboard";
import TeamOverviewContent from "@/components/TeamOverviewContent";
import type { Competition, Team, Catch, Referee } from "@shared/schema";
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
        <span className="text-xs font-black uppercase tracking-widest">PRETEK PREBIEHA</span>
      </div>
    );
  }
  if (status === 'registration') {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full">
        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
        <span className="text-xs font-black uppercase tracking-widest">REGISTRÁCIA OTVORENÁ</span>
      </div>
    );
  }
  if (status === 'ended' || status === 'completed' || status === 'finished') {
    return (
      <div className="flex items-center gap-2 bg-muted/50 border border-border text-muted-foreground px-3 py-1 rounded-full">
        <div className="w-2 h-2 bg-muted-foreground rounded-full" />
        <span className="text-xs font-black uppercase tracking-widest">PRETEK UKONČENÝ</span>
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
  const sectorTeams = leaderboard.filter(t => t.sector === sector).sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (b.fish !== a.fish) return b.fish - a.fish;
    return (a.name || '').localeCompare(b.name || '', 'sk');
  });
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

// --- CATCH FEED TYPES & COMPONENTS ---

interface CatchWithDetails extends Catch {
  team?: Team;
  referee?: Referee;
}

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

function FeedCatchRow({ 
  data, isTopToday, isRecent, isBigFish, onClick, userRole 
}: { 
  data: CatchWithDetails; 
  isTopToday: boolean; 
  isRecent: boolean; 
  isBigFish: boolean;
  onClick: () => void; 
  userRole: string;
}) {
  const weight = parseFloat(String(data.weight ?? '0').replace(',', '.')) || 0;
  
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

function FeedCatchDetailModal({ 
  data, onClose, userRole, isTopToday, isBigFish 
}: { 
  data: CatchWithDetails; 
  onClose: () => void; 
  userRole: string;
  isTopToday: boolean;
  isBigFish: boolean;
}) {
  const weight = parseFloat(String(data.weight ?? '0').replace(',', '.')) || 0;

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
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Top dnes</span>
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
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) {
      const dayStr = `${days} ${days === 1 ? 'deň' : days < 5 ? 'dni' : 'dní'}`;
      if (hours > 0) return `${dayStr} ${hours}h`;
      return dayStr;
    }
    if (hours > 0) {
      const hourStr = `${hours} ${hours === 1 ? 'hodina' : hours < 5 ? 'hodiny' : 'hodín'}`;
      if (minutes > 0) return `${hourStr} ${minutes}min`;
      return hourStr;
    }
    return `${minutes} ${minutes === 1 ? 'minúta' : minutes < 5 ? 'minúty' : 'minút'}`;
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
  const [entityModal, setEntityModal] = useState<{
    view: 'team' | 'catch' | 'catches-list' | null;
    team: (Team & { members?: any[] }) | null;
    catch_: (Catch & { team?: Team }) | null;
    previousView?: 'team' | 'catch' | 'catches-list' | null;
  }>({ view: null, team: null, catch_: null, previousView: null });
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);
  const [statsTab, setStatsTab] = useState<'overview' | 'sectors' | 'analytics'>('overview');
  const [feedSearchQuery, setFeedSearchQuery] = useState("");
  const [feedSelectedFilter, setFeedSelectedFilter] = useState('all');
  const [feedFilterOpen, setFeedFilterOpen] = useState(false);
  const [selectedCatchDetail, setSelectedCatchDetail] = useState<CatchWithDetails | null>(null);
  
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

  useEffect(() => {
    if (!user) return;
    const currentName = (form.getValues("members.0.name") || "").trim();
    const currentEmail = (form.getValues("members.0.email") || "").trim();
    const suggestedName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const suggestedEmail = (user.email || "").trim();
    if (!currentName && suggestedName) form.setValue("members.0.name", suggestedName, { shouldDirty: true });
    if (!currentEmail && suggestedEmail) form.setValue("members.0.email", suggestedEmail, { shouldDirty: true });
  }, [user?.id]);

  // Team registration mutation
  const registerTeamMutation = useMutation({
    mutationFn: async (data: TeamRegistrationForm) => {
      return apiRequest("POST", `/api/competitions/${id}/teams`, data);
    },
    onSuccess: () => {
      toast({
        title: "Tím bol úspešne zaregistrovaný!",
        description: "Registrácia tvojho tímu čaká na schválenie organizátorom.",
      });
      setIsRegistrationDialogOpen(false);
      form.reset({
        name: "",
        description: "",
        members: [
          {
            name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
            role: "captain",
            email: user?.email || "",
            phone: "",
          },
        ],
      });
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

  const status = competition?.status;
  const isLive = status === 'live';
  const isEnded = ['ended', 'completed', 'finished'].includes(status || '');
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

  // --- HELPERS ---

  const safeWeight = (w: unknown): number => {
    const s = String(w ?? '0').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const safeTimestamp = (ts: unknown): number => {
    if (!ts) return 0;
    const d = new Date(ts as string);
    const t = d.getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const bigFishThreshold = competition?.bigFishThreshold ? parseFloat(String(competition.bigFishThreshold)) : 10;

  // --- useMemo AGGREGATIONS ---

  const liveStats = useMemo(() => {
    if (!catches || catches.length === 0) {
      return { totalFish: 0, totalWeight: 0, biggestFish: 0, avgWeight: 0 };
    }
    const totalFish = catches.length;
    const totalWeight = catches.reduce((sum, c) => sum + safeWeight(c.weight), 0);
    const biggestFish = Math.max(...catches.map(c => safeWeight(c.weight)));
    const avgWeight = totalFish > 0 ? totalWeight / totalFish : 0;
    return { totalFish, totalWeight, biggestFish, avgWeight };
  }, [catches]);

  const biggestCatchObj = useMemo(() => {
    if (!catches || catches.length === 0) return null;
    return catches.reduce((max, c) => {
      return safeWeight(c.weight) > safeWeight(max?.weight) ? c : max;
    }, catches[0]);
  }, [catches]);

  const sortedLeaderboard = useMemo(() => {
    if (!teams) return [];
    const statsMap: Record<string, { weight: number; fish: number }> = {};
    if (catches) {
      for (const c of catches) {
        const tid = c.teamId || '';
        if (!statsMap[tid]) statsMap[tid] = { weight: 0, fish: 0 };
        statsMap[tid].weight += safeWeight(c.weight);
        statsMap[tid].fish += 1;
      }
    }
    return teams
      .filter(t => t.status === 'approved')
      .map(team => ({
        ...team,
        weight: statsMap[team.id]?.weight || 0,
        fish: statsMap[team.id]?.fish || 0,
        sector: (team.sector || '-').trim(),
      }))
      .sort((a, b) => {
        if (b.weight !== a.weight) return b.weight - a.weight;
        if (b.fish !== a.fish) return b.fish - a.fish;
        return (a.name || '').localeCompare(b.name || '', 'sk');
      })
      .map((t, i) => ({ ...t, rank: i + 1 }));
  }, [teams, catches]);

  const liveFeed = useMemo(() => {
    if (!catches) return [];
    return [...catches]
      .sort((a, b) => safeTimestamp(b.submittedAt) - safeTimestamp(a.submittedAt))
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        team: c.team?.name || 'Neznámy tím',
        action: safeWeight(c.weight) >= bigFishThreshold ? 'big_fish' : 'catch',
        weight: safeWeight(c.weight),
        fish: c.fishType || 'Ryba',
        time: c.submittedAt ? `Pred ${formatTimeAgo(c.submittedAt)}` : '',
        sector: c.team?.sector || '-',
        catchObj: c,
      }));
  }, [catches, bigFishThreshold]);

  const allCatchesSorted = useMemo(() => {
    if (!catches) return [];
    return [...catches]
      .sort((a, b) => safeTimestamp(b.submittedAt) - safeTimestamp(a.submittedAt));
  }, [catches]);

  const userRole = user?.role || 'user';

  const NOW_STR = new Date().toISOString().split('T')[0];
  const YESTERDAY_STR = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const feedViewableCatches = useMemo(() => {
    if (!catches) return [];
    const sorted = [...catches].sort((a, b) => safeTimestamp(b.submittedAt) - safeTimestamp(a.submittedAt));
    if (userRole === 'admin' || userRole === 'referee' || userRole === 'organizer') return sorted;
    return sorted.filter(c => c.isVerified !== false);
  }, [catches, userRole]);

  const feedTopCatchTodayId = useMemo(() => {
    const todays = feedViewableCatches.filter(c => {
      const d = c.submittedAt ? new Date(c.submittedAt).toISOString().split('T')[0] : '';
      return d === NOW_STR;
    });
    if (todays.length === 0) return null;
    return todays.reduce((prev, curr) => (safeWeight(prev.weight) > safeWeight(curr.weight) ? prev : curr)).id;
  }, [feedViewableCatches, NOW_STR]);

  const feedRecentCatchIds = useMemo(() => {
    const threshold = Date.now() - (5 * 60 * 1000);
    return feedViewableCatches
      .filter(c => safeTimestamp(c.submittedAt) > threshold)
      .map(c => c.id);
  }, [feedViewableCatches]);

  const { feedProcessedCatches, feedGroupedCatches } = useMemo(() => {
    const filtered = feedViewableCatches.filter(c => {
      const date = c.submittedAt ? new Date(c.submittedAt).toISOString().split('T')[0] : '';
      const matchesDate = 
        feedSelectedFilter === 'all' ? true :
        feedSelectedFilter === 'today' ? date === NOW_STR :
        feedSelectedFilter === 'yesterday' ? date === YESTERDAY_STR : true;

      const q = feedSearchQuery.toLowerCase();
      const matchesSearch = !q || 
        (c.team?.name || '').toLowerCase().includes(q) || 
        (c.sector || '').toLowerCase().includes(q) ||
        String(c.weight).includes(q) ||
        getFishTypeLabel(c.fishType).toLowerCase().includes(q);
      
      return matchesDate && matchesSearch;
    });

    const groups: { today: CatchWithDetails[]; yesterday: CatchWithDetails[]; older: CatchWithDetails[] } = { today: [], yesterday: [], older: [] };
    filtered.forEach(c => {
      const d = c.submittedAt ? new Date(c.submittedAt).toISOString().split('T')[0] : '';
      if (d === NOW_STR) groups.today.push(c);
      else if (d === YESTERDAY_STR) groups.yesterday.push(c);
      else groups.older.push(c);
    });

    return { feedProcessedCatches: filtered, feedGroupedCatches: groups };
  }, [feedViewableCatches, feedSelectedFilter, feedSearchQuery, NOW_STR, YESTERDAY_STR]);

  const feedHeroCatch = useMemo(() => {
    if (feedSelectedFilter !== 'all' || feedSearchQuery !== '') return null;
    if (feedProcessedCatches.length === 0) return null;

    const newest = feedProcessedCatches[0];
    const isNew = (Date.now() - safeTimestamp(newest.submittedAt)) < (2 * 60 * 1000);
    if (isNew) return newest;
    if (feedTopCatchTodayId) {
      const top = feedProcessedCatches.find(c => c.id === feedTopCatchTodayId);
      if (top) return top;
    }
    return newest;
  }, [feedProcessedCatches, feedTopCatchTodayId, feedSelectedFilter, feedSearchQuery]);

  const feedIsHeroVeryRecent = useMemo(() => {
    if (!feedHeroCatch) return false;
    return (Date.now() - safeTimestamp(feedHeroCatch.submittedAt)) < (2 * 60 * 1000);
  }, [feedHeroCatch]);

  const feedGetListWithoutHero = (list: CatchWithDetails[]) => {
    return feedHeroCatch ? list.filter(c => c.id !== feedHeroCatch.id) : list;
  };

  const feedTodayTotalCount = useMemo(() => {
    return feedViewableCatches.filter(c => {
      const d = c.submittedAt ? new Date(c.submittedAt).toISOString().split('T')[0] : '';
      return d === NOW_STR;
    }).length;
  }, [feedViewableCatches, NOW_STR]);

  const feedHeaderStatsText = useMemo(() => {
    if (feedSearchQuery) return `Nájdené: ${feedProcessedCatches.length}`;
    if (feedSelectedFilter === 'today') return `Dnes: ${feedProcessedCatches.length}`;
    if (feedSelectedFilter === 'yesterday') return `Včera: ${feedProcessedCatches.length}`;
    return feedTodayTotalCount > 0 
      ? `Dnes: ${feedTodayTotalCount} · Spolu: ${feedViewableCatches.length}`
      : `Spolu: ${feedViewableCatches.length}`;
  }, [feedSelectedFilter, feedSearchQuery, feedProcessedCatches.length, feedTodayTotalCount, feedViewableCatches.length]);

  const feedGetFilterLabel = () => {
    switch (feedSelectedFilter) {
      case 'today': return 'Dnes';
      case 'yesterday': return 'Včera';
      default: return 'Všetky dni';
    }
  };

  const feedHandleResetFilters = () => {
    setFeedSelectedFilter('all');
    setFeedSearchQuery("");
    setFeedFilterOpen(false);
  };

  const sectorStats = useMemo(() => {
    if (!catches || !teams) return [];
    const sectors = Array.from(new Set(teams.filter(t => t.sector).map(t => t.sector))).filter(Boolean) as string[];
    const sectorColors = ['bg-cyan-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
    
    return sectors.map((sector, i) => {
      const sectorTeamIds = teams.filter(t => t.sector === sector).map(t => t.id);
      const weight = catches
        .filter(c => sectorTeamIds.includes(c.teamId || ''))
        .reduce((sum, c) => sum + safeWeight(c.weight), 0);
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
      if (competition?.status === 'registration' || competition?.status === 'setup') {
        return 'Pretek nám ešte nezačal.';
      }

      const hasAnyCatches = (liveStats.totalFish ?? 0) > 0;
      if (!hasAnyCatches) {
        return type === 'short' ? 'Čakáme na prvý záber…' : 'Zatiaľ nepadol žiadny úlovok. Prvé dáta sa objavia hneď po overení úlovku.';
      }

      const peakHour = hourlyActivity.reduce((max, h) => h.val > max.val ? h : max, { hour: '', val: 0 });
      const topSector = sectorStats[0];
      
      let timeComment = '';
      if (peakHour.hour) {
        const hourNum = Number((peakHour.hour || "0").split(":")[0]);
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
  }, [competition?.status, sectorStats, hourlyActivity, liveStats.totalFish]);

  const isRegistration = competition?.status === 'registration';

  const openRegistration = () => {
    if (!isAuthenticated) {
      toast({ title: "Najprv sa prihlás", description: "Registrácia tímu je dostupná len pre prihlásených." });
      localStorage.setItem('contestio_returnTo', `/competitions/${id}?openReg=1`);
      navigate('/auth/login');
      return;
    }
    setIsRegistrationDialogOpen(true);
  };

  const visibleLeaderboard = leaderboardExpanded ? sortedLeaderboard : sortedLeaderboard.slice(0, 10);
  const uniqueSectors = Array.from(new Set(sortedLeaderboard.map(t => t.sector).filter(s => s !== '-')));

  // Find user's team in this competition
  const userTeam = useMemo(() => {
    if (!teams || !user?.id) return null;
    return teams.find(team => 
      team.members?.some(member => member.userId === user.id)
    ) || null;
  }, [teams, user?.id]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const shouldOpen = url.searchParams.get("openReg") === "1";
    if (!shouldOpen) return;
    if (!isAuthenticated) return;
    if (teamsLoading) return;
    if (userTeam) {
      url.searchParams.delete("openReg");
      window.history.replaceState({}, "", url.toString());
      return;
    }
    setIsRegistrationDialogOpen(true);
    url.searchParams.delete("openReg");
    window.history.replaceState({}, "", url.toString());
  }, [isAuthenticated, teamsLoading, userTeam]);

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
      <header className="relative overflow-hidden border-b border-border/50 bg-card/80 backdrop-blur-xl header-glow">
        {/* Blur Background */}
        {competition.imageUrl && (
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <img src={competition.imageUrl} className="w-full h-full object-cover blur-3xl scale-125" alt="" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-card/40 via-card/60 to-background"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-6">
          {/* MOBILE: Nav Row with Back + Overflow */}
          <div className="md:hidden flex justify-between items-center mb-4">
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              <ChevronLeft size={16} /> Späť
            </button>
            
            {/* Mobile Overflow Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Viac akcií">
                  <MoreVertical size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {isAuthenticated && (
                  <DropdownMenuItem 
                    onClick={handleToggleFavorite}
                    disabled={isAdding || isRemoving}
                    className="gap-2"
                  >
                    <Heart size={16} className={isFavorite ? 'fill-current text-red-500' : ''} />
                    {isFavorite ? 'Odstrániť z obľúbených' : 'Pridať k obľúbeným'}
                  </DropdownMenuItem>
                )}
                {isRegistration && (
                  <QRShareDialog 
                    type="competition" 
                    id={id || ""} 
                    name={competition.name}
                    trigger={
                      <button className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-default">
                        <QrCode size={16} />
                        QR kód registrácie
                      </button>
                    }
                  />
                )}
                <DropdownMenuItem 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: competition.name, url: window.location.href });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Odkaz skopírovaný", description: "Odkaz na súťaž bol skopírovaný do schránky" });
                    }
                  }}
                  className="gap-2"
                >
                  <Share2 size={16} />
                  Zdieľať súťaž
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast({ title: "Odkaz skopírovaný", description: "Odkaz na súťaž bol skopírovaný do schránky" });
                  }}
                  className="gap-2"
                >
                  <Link2 size={16} />
                  Kopírovať odkaz
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* DESKTOP: Nav Row */}
          <div className="hidden md:flex justify-between items-center mb-6">
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              <ChevronLeft size={16} /> Späť
            </button>
          </div>

          {/* MOBILE: Identity Section (status → name → meta) - ends with border */}
          <div className="md:hidden space-y-2 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <StatusBadge status={competition.status} />
              {competition.endDate && competition.status === 'live' && (
                <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                  <Clock size={12} /> {getRemainingTime(competition.endDate)}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {competition.imageUrl && (
                <div className="w-10 h-10 bg-background/50 rounded-full p-1.5 backdrop-blur-sm border border-border shrink-0">
                  <img src={competition.imageUrl} alt="Logo" className="w-full h-full object-contain opacity-90" />
                </div>
              )}
              <h1 className="text-2xl font-black text-foreground tracking-tight leading-none">
                {competition.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin size={12} className="text-cyan-500" /> {competition.location}</span>
              <span className="flex items-center gap-1"><Users size={12} className="text-emerald-500" /> {teams?.filter(t => t.status === 'approved').length || 0} tímov</span>
            </div>
          </div>

          {/* DESKTOP: Header Content */}
          <div className="hidden md:flex md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <StatusBadge status={competition.status} />
                {competition.endDate && competition.status === 'live' && (
                  <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                    <Clock size={12} /> Do konca lovu zostáva {getRemainingTime(competition.endDate)}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-4 mb-2">
                {competition.imageUrl && (
                  <div className="w-16 h-16 bg-background/50 rounded-full p-2 backdrop-blur-sm border border-border shrink-0">
                    <img src={competition.imageUrl} alt="Logo" className="w-full h-full object-contain opacity-90" />
                  </div>
                )}
                <h1 className="text-5xl font-black text-foreground tracking-tight leading-none">
                  {competition.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pl-1">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-cyan-500" /> {competition.location}</span>
                <span className="flex items-center gap-1.5"><Users size={14} className="text-emerald-500" /> Na štarte: {teams?.filter(t => t.status === 'approved').length || 0} tímov</span>
              </div>
            </div>

            {/* Desktop Action Buttons */}
            <div className="flex gap-3">
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
                      <button className="bg-card/50 hover:bg-card text-muted-foreground hover:text-foreground p-3 rounded-xl border border-border transition-colors" title="Registrácia cez QR kód">
                        <QrCode size={20} />
                      </button>
                    }
                  />
                )}
                <button 
                  className="bg-card/50 hover:bg-card text-muted-foreground hover:text-foreground p-3 rounded-xl border border-border transition-colors" 
                  title="Zdieľať"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: competition.name, url: window.location.href });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Odkaz skopírovaný", description: "Odkaz na súťaž bol skopírovaný do schránky" });
                    }
                  }}
                >
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
              {isRegistration && !userTeam && (
                <button 
                  onClick={openRegistration}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all hover:scale-105"
                >
                  <UserPlus size={20} />
                  <span>{isAuthenticated ? 'Registrovať tím' : 'Prihlásiť sa a registrovať'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE CTA - Samostatná sekcia mimo header */}
      {(userTeam || (isRegistration && !userTeam)) && (
        <div className="md:hidden max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-3">
            {userTeam && (
              <button 
                onClick={() => setShowMyTeamOverlay(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all"
              >
                <Users size={18} />
                <span>Môj tím</span>
              </button>
            )}
            {isRegistration && !userTeam && (
              <button 
                onClick={openRegistration}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all"
              >
                <UserPlus size={18} />
                <span>{isAuthenticated ? 'Registrovať tím' : 'Prihlásiť sa a registrovať'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Registration Dialog - rendered outside header for mobile access */}
      <Dialog open={isRegistrationDialogOpen} onOpenChange={setIsRegistrationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrácia tímu</DialogTitle>
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
                      <Input placeholder="Napr. Rybári z Liptova" {...field} />
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
                      <Textarea placeholder="Krátky popis tímu" {...field} />
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
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {index === 0 ? "Kapitán tímu" : `Člen ${index + 1}`}
                        </h4>
                        {index === 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[11px] font-bold">
                            <Crown size={12} />
                            Kapitán
                          </span>
                        )}
                      </div>
                      {index > 0 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeMember(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {index === 0 && (
                      <p className="text-xs text-muted-foreground -mt-2">Tento člen komunikuje s organizátorom</p>
                    )}
                    
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
                    <p>Štartovné na tím: {parseFloat(competition.registrationFee)}€</p>
                  )}
                  {competition.maxTeams && (
                    <p>Maximálny počet tímov: {competition.maxTeams}</p>
                  )}
                  <p>Registrácia čaká na schválenie organizátorom</p>
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

      {/* 2. STATS CARDS GRID (2x2 mobile, 4 cols desktop) - overlaps header */}
      {!isRegistration && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-4 md:-mt-6 relative z-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="bg-card border border-border rounded-xl p-3 md:p-5 flex flex-col items-center text-center hover:border-cyan-500/30 transition-all group">
              <div className="p-2 md:p-3 bg-cyan-500/10 rounded-xl text-cyan-500 mb-2 md:mb-3 group-hover:scale-110 transition-transform"><Fish size={18} className="md:hidden" /><Fish size={22} className="hidden md:block" /></div>
              <div className="text-xl md:text-3xl font-mono font-medium text-[#F97316]">{liveStats.totalFish} <span className="text-xs md:text-sm font-normal text-muted-foreground">ks</span></div>
              <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Úlovky spolu</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 md:p-5 flex flex-col items-center text-center hover:border-emerald-500/30 transition-all group">
              <div className="p-2 md:p-3 bg-emerald-500/10 rounded-xl text-emerald-500 mb-2 md:mb-3 group-hover:scale-110 transition-transform"><Activity size={18} className="md:hidden" /><Activity size={22} className="hidden md:block" /></div>
              <div className="text-xl md:text-3xl font-mono font-medium text-[#F97316]">{liveStats.totalWeight.toFixed(1)} <span className="text-xs md:text-sm font-normal text-muted-foreground">kg</span></div>
              <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Celková váha</div>
            </div>
            <div 
              className={`bg-card border border-border rounded-xl p-3 md:p-5 flex flex-col items-center text-center transition-all group ${biggestCatchObj ? 'cursor-pointer hover:border-amber-500/30' : ''}`}
              onClick={() => biggestCatchObj && setSelectedCatchDetail(biggestCatchObj as CatchWithDetails)}
            >
              <div className="p-2 md:p-3 bg-amber-500/10 rounded-xl text-amber-500 mb-2 md:mb-3 group-hover:scale-110 transition-transform"><Trophy size={18} className="md:hidden" /><Trophy size={22} className="hidden md:block" /></div>
              <div className="text-xl md:text-3xl font-mono font-medium text-[#F97316]">{liveStats.biggestFish.toFixed(1)} <span className="text-xs md:text-sm font-normal text-muted-foreground">kg</span></div>
              <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Najväčšia ryba</div>
              {biggestCatchObj && <div className="text-[8px] md:text-[9px] text-amber-500/70 mt-1">Klikni pre detail</div>}
            </div>
            <div className="bg-card border border-border rounded-xl p-3 md:p-5 flex flex-col items-center text-center hover:border-purple-500/30 transition-all group">
              <div className="p-2 md:p-3 bg-purple-500/10 rounded-xl text-purple-500 mb-2 md:mb-3 group-hover:scale-110 transition-transform"><TrendingUp size={18} className="md:hidden" /><TrendingUp size={22} className="hidden md:block" /></div>
              <div className="text-xl md:text-3xl font-mono font-medium text-[#F97316]">{liveStats.avgWeight.toFixed(1)} <span className="text-xs md:text-sm font-normal text-muted-foreground">kg</span></div>
              <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Priemerná váha</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT GRID */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {isRegistration ? (
          /* REGISTRATION MODE */
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="p-8 rounded-xl bg-card border border-border relative overflow-hidden">
              <Timer className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-foreground mb-2">Registrácia otvorená</h2>
              <p className="text-muted-foreground mb-6">{competition.description}</p>
              <button 
                onClick={openRegistration}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-emerald-900/20 transition-all"
              >
                {isAuthenticated ? 'Vyplniť Prihlášku' : 'Prihlásiť sa a registrovať'}
              </button>
            </div>
          </div>
        ) : (
          /* LIVE MATCH CENTER MODE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* --- LEFT COLUMN: LEADERBOARD & PODIUM (8/12) --- */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* PODIUM - MOBILE COMPACT (jedna karta, 3 stĺpce: 2-1-3) */}
              {sortedLeaderboard.length >= 3 && (
                <div className="md:hidden bg-card border border-border rounded-xl p-4">
                  <div className="text-xs font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                    <Trophy size={14} className="text-amber-500" />
                    Pódium preteku
                  </div>
                  <div className="grid grid-cols-3 items-end gap-2">
                    {/* 2nd Place - left */}
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 bg-slate-500 rounded-full flex items-center justify-center font-bold text-white text-sm mb-2 border-2 border-slate-400/30">2</div>
                      <div className="text-center w-full">
                        <button
                          className="font-bold text-foreground text-xs truncate px-1 hover:text-cyan-500 transition-colors"
                          onClick={() => {
                            const fullTeam = teams?.find(t => t.id === sortedLeaderboard[1]?.id);
                            if (fullTeam) setEntityModal({ view: 'team', team: fullTeam, catch_: null, previousView: null });
                          }}
                        >{sortedLeaderboard[1]?.name}</button>
                        <div className="text-lg font-mono font-medium text-[#F97316]">{sortedLeaderboard[1]?.weight?.toFixed(1) ?? '-'}</div>
                        <div className="text-[10px] text-muted-foreground">{sortedLeaderboard[1]?.fish ?? 0} rýb</div>
                      </div>
                    </div>

                    {/* Winner - center, taller */}
                    <div className="flex flex-col items-center -mt-4">
                      <div className="w-11 h-11 bg-amber-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-amber-500/40 animate-crown-bounce border-2 border-amber-400/50">
                        <Crown size={20} className="text-black" />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full mb-1">LÍDER</span>
                      <div className="text-center w-full">
                        <button
                          className="font-bold text-amber-500 text-sm truncate px-1 hover:underline"
                          onClick={() => {
                            const fullTeam = teams?.find(t => t.id === sortedLeaderboard[0]?.id);
                            if (fullTeam) setEntityModal({ view: 'team', team: fullTeam, catch_: null, previousView: null });
                          }}
                        >{sortedLeaderboard[0]?.name}</button>
                        <div className="text-2xl font-mono font-medium text-[#F97316]">{sortedLeaderboard[0]?.weight?.toFixed(1) ?? '-'}</div>
                        <div className="text-xs text-muted-foreground">{sortedLeaderboard[0]?.fish ?? 0} rýb</div>
                      </div>
                    </div>

                    {/* 3rd Place - right */}
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 bg-orange-800 rounded-full flex items-center justify-center font-bold text-white text-sm mb-2 border-2 border-orange-700/50">3</div>
                      <div className="text-center w-full">
                        <button
                          className="font-bold text-foreground text-xs truncate px-1 hover:text-cyan-500 transition-colors"
                          onClick={() => {
                            const fullTeam = teams?.find(t => t.id === sortedLeaderboard[2]?.id);
                            if (fullTeam) setEntityModal({ view: 'team', team: fullTeam, catch_: null, previousView: null });
                          }}
                        >{sortedLeaderboard[2]?.name}</button>
                        <div className="text-lg font-mono font-medium text-[#F97316]/60">{sortedLeaderboard[2]?.weight?.toFixed(1) ?? '-'}</div>
                        <div className="text-[10px] text-muted-foreground">{sortedLeaderboard[2]?.fish ?? 0} rýb</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PODIUM - DESKTOP (3 karty) */}
              {sortedLeaderboard.length >= 3 && (
                <div className="hidden md:grid md:grid-cols-3 gap-4 items-end">
                  {/* 2nd Place */}
                  <div className="bg-card border border-border hover:border-slate-500/40 rounded-xl p-4 flex flex-col items-center justify-end h-48 relative transition-all">
                    <div className="absolute -top-4 w-11 h-11 bg-slate-500 rounded-full flex items-center justify-center font-bold text-white text-lg border-4 border-background shadow-lg">2</div>
                    <div className="text-center w-full">
                      <button
                        className="font-bold text-foreground mb-1 truncate px-2 hover:text-cyan-500 transition-colors"
                        onClick={() => {
                          const fullTeam = teams?.find(t => t.id === sortedLeaderboard[1]?.id);
                          if (fullTeam) setEntityModal({ view: 'team', team: fullTeam, catch_: null, previousView: null });
                        }}
                      >{sortedLeaderboard[1]?.name}</button>
                      <div className="text-2xl font-mono font-medium text-[#F97316]">{sortedLeaderboard[1]?.weight?.toFixed(1) ?? '-'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{sortedLeaderboard[1]?.fish ?? 0} rýb</div>
                    </div>
                  </div>

                  {/* Winner */}
                  <div className="bg-card border border-amber-500/30 rounded-xl p-4 flex flex-col items-center justify-end h-56 relative amber-glow z-10">
                    <div className="absolute -top-10 w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center font-black text-black text-xl border-4 border-background shadow-lg shadow-amber-500/30 animate-crown-bounce">
                      <Crown size={24} />
                    </div>
                    <div className="absolute top-2 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">LÍDER PRETEKU</span>
                    </div>
                    <div className="text-center w-full mb-2">
                      <button
                        className="font-bold text-amber-500 mb-1 text-lg px-2 truncate hover:underline"
                        onClick={() => {
                          const fullTeam = teams?.find(t => t.id === sortedLeaderboard[0]?.id);
                          if (fullTeam) setEntityModal({ view: 'team', team: fullTeam, catch_: null, previousView: null });
                        }}
                      >{sortedLeaderboard[0]?.name}</button>
                      <div className="text-4xl font-mono font-medium text-[#F97316]">{sortedLeaderboard[0]?.weight?.toFixed(1) ?? '-'}</div>
                      <div className="text-sm text-muted-foreground font-mono">{sortedLeaderboard[0]?.fish ?? 0} rýb</div>
                    </div>
                    <div className="w-full bg-amber-500/5 border border-amber-500/10 rounded-lg py-1 text-center text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      Lovia v sektore {sortedLeaderboard[0]?.sector}
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="bg-card border border-border hover:border-orange-800/40 rounded-xl p-4 flex flex-col items-center justify-end h-48 relative transition-all">
                    <div className="absolute -top-4 w-11 h-11 bg-orange-800 rounded-full flex items-center justify-center font-bold text-white text-lg border-4 border-background shadow-lg">3</div>
                    <div className="text-center w-full">
                      <button
                        className="font-bold text-foreground mb-1 truncate px-2 hover:text-cyan-500 transition-colors"
                        onClick={() => {
                          const fullTeam = teams?.find(t => t.id === sortedLeaderboard[2]?.id);
                          if (fullTeam) setEntityModal({ view: 'team', team: fullTeam, catch_: null, previousView: null });
                        }}
                      >{sortedLeaderboard[2]?.name}</button>
                      <div className="text-2xl font-mono font-medium text-[#F97316]">{sortedLeaderboard[2]?.weight?.toFixed(1) ?? '-'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{sortedLeaderboard[2]?.fish ?? 0} rýb</div>
                    </div>
                  </div>
                </div>
              )}

              {/* LEADERBOARD TABLE */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-5 border-b border-border flex justify-between items-center bg-muted/50">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Trophy size={16} strokeWidth={1.75} className="text-muted-foreground" />
                    Aktuálne poradie tímov
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">{sortedLeaderboard.length} tímov</span>
                </div>
                <div className="md:overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/40 font-bold tracking-wider">
                      <tr>
                        <th className="px-3 md:px-6 py-3 md:py-4 w-10 md:w-16">#</th>
                        <th className="px-3 md:px-6 py-3 md:py-4">Tím</th>
                        <th className="hidden md:table-cell px-6 py-4 text-center">Sektor</th>
                        <th className="hidden md:table-cell px-6 py-4 text-right">Ryby</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-right">kg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {visibleLeaderboard.map((team, index) => (
                        <tr key={team.id} className={`hover:bg-muted/20 transition-colors ${index < 3 ? 'bg-muted/10' : ''}`}>
                          <td className={`px-3 md:px-6 py-3 md:py-4 font-mono font-bold ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-orange-700' : 'text-muted-foreground'}`}>
                            {team.rank}.
                          </td>
                          <td className="px-3 md:px-6 py-3 md:py-4">
                            <button
                              className="font-bold text-foreground hover:text-cyan-500 transition-colors text-left text-sm md:text-base"
                              onClick={() => {
                                const fullTeam = teams?.find(t => t.id === team.id);
                                if (fullTeam) {
                                  setEntityModal({ view: 'team', team: fullTeam, catch_: null, previousView: null });
                                }
                              }}
                            >
                              {team.name}
                            </button>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 text-center text-muted-foreground">{team.sector}</td>
                          <td className="hidden md:table-cell px-6 py-4 text-right text-muted-foreground font-mono">{team.fish}</td>
                          <td className="px-3 md:px-6 py-3 md:py-4 text-right font-mono font-medium text-[#F97316] text-base">{team.weight.toFixed(1)}</td>
                        </tr>
                      ))}
                      {teamsLoading && sortedLeaderboard.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 md:px-6 py-8 text-center text-muted-foreground">
                            Načítavam tímy...
                          </td>
                        </tr>
                      )}
                      {!teamsLoading && sortedLeaderboard.length === 0 && (teams?.length ?? 0) === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 md:px-6 py-8 text-center text-muted-foreground">
                            Zatiaľ nie sú prihlásené žiadne tímy
                          </td>
                        </tr>
                      )}
                      {!teamsLoading && sortedLeaderboard.length === 0 && (teams?.filter(t => t.status === 'pending')?.length ?? 0) > 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 md:px-6 py-8 text-center text-muted-foreground">
                            Tímy čakajú na schválenie organizátorom
                          </td>
                        </tr>
                      )}
                      {sortedLeaderboard.length > 0 && liveStats.totalFish === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 md:px-6 py-4 text-center text-muted-foreground text-sm">
                            Zatiaľ nebol zaznamenaný žiadny úlovok
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {sortedLeaderboard.length > 10 && (
                  <div className="p-2 bg-muted/40 border-t border-border">
                    <button 
                      onClick={() => setLeaderboardExpanded(!leaderboardExpanded)}
                      className="w-full py-3 flex items-center justify-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest hover:text-foreground transition-colors"
                    >
                      {leaderboardExpanded ? (
                        <>Zbaliť tabuľku <ChevronUp size={14} /></>
                      ) : (
                        <>Zobraziť celé poradie ({sortedLeaderboard.length} tímov) <ChevronDown size={14} /></>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* --- RIGHT COLUMN: FEED & INFO (4/12) --- */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* COMMENTATOR TEASER */}
              <div className="bg-card border border-blue-500/20 rounded-xl p-6 relative overflow-hidden group hover:border-blue-500/40 transition-all blue-glow-card">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full group-hover:bg-blue-500/15 transition-colors pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3 text-amber-500">
                    <Mic size={14} className="animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Správy od vody</span>
                  </div>
                  <p className="text-foreground font-bold text-lg leading-tight mb-6">
                    "{getCommentary('short')}"
                  </p>
                  <button 
                    onClick={() => setShowStatsOverlay(true)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex flex-col items-center justify-center gap-1 hover:shadow-blue-600/30"
                  >
                    <span className="flex items-center gap-2">
                      <PieChart size={16} />
                      Kde a kedy berú
                    </span>
                    <span className="text-[10px] font-normal text-blue-200">Analýza úlovkov a štatistík súťaže</span>
                  </button>
                </div>
              </div>

              {/* LIVE FEED - New Design */}
              <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border bg-muted/30 sticky top-0 z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Úlovky</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-medium">{feedHeaderStatsText}</span>
                      <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-full ${isLive ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400 bg-slate-500/10'}`}>
                        {isLive ? 'Live' : 'Archív'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                      <input 
                        type="text"
                        placeholder="Hľadať tím, váhu..."
                        value={feedSearchQuery}
                        onChange={(e) => setFeedSearchQuery(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-[#F97316] focus:border-[#F97316] transition-all outline-none"
                      />
                      {feedSearchQuery && (
                        <button 
                          onClick={() => setFeedSearchQuery("")}
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
                        onClick={() => setFeedFilterOpen(!feedFilterOpen)}
                        className="h-full gap-1 border-border bg-background text-muted-foreground px-2.5 py-0 justify-between hover:bg-muted"
                      >
                        <Calendar size={14} /> 
                        <span className="text-xs hidden sm:inline">{feedGetFilterLabel()}</span>
                        <ChevronDown size={12} className={`text-muted-foreground transition-transform ${feedFilterOpen ? 'rotate-180' : ''}`} />
                      </Button>
                      {feedFilterOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setFeedFilterOpen(false)} />
                          <div className="absolute top-full right-0 mt-2 w-44 bg-card border border-border rounded-lg shadow-xl z-20 py-1 overflow-hidden">
                            {[
                              { id: 'all', label: 'Všetky dni' },
                              { id: 'today', label: 'Dnes' },
                              { id: 'yesterday', label: 'Včera' }
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => { setFeedSelectedFilter(opt.id); setFeedFilterOpen(false); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted flex items-center justify-between transition-colors border-b border-border/50 last:border-0"
                              >
                                {opt.label}
                                {feedSelectedFilter === opt.id && <Check size={14} className="text-[#F97316]" />}
                              </button>
                            ))}
                            <div className="bg-muted/30 p-1">
                              <button 
                                onClick={feedHandleResetFilters}
                                className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-[#F97316] font-medium flex items-center gap-2 hover:bg-muted rounded transition-colors"
                              >
                                <RotateCcw size={12} />
                                Resetovať filtre
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto max-h-[700px]">
                  {feedHeroCatch && (
                    <div 
                      onClick={() => setSelectedCatchDetail(feedHeroCatch as CatchWithDetails)}
                      className={`relative w-full overflow-hidden rounded-xl border bg-card/80 shadow-lg cursor-pointer group hover:border-[#F97316]/50 transition-all
                        ${safeWeight(feedHeroCatch.weight) >= bigFishThreshold ? 'border-amber-500/30' : 'border-border'}
                      `}
                    >
                      <div className="relative aspect-video overflow-hidden bg-muted">
                        {feedHeroCatch.photoUrl ? (
                          <img src={feedHeroCatch.photoUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Camera size={40} /></div>
                        )}
                        <div className="absolute top-3 left-3">
                          {feedIsHeroVeryRecent ? (
                            <span className="bg-[#F97316] text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg flex items-center gap-1">
                              Nový úlovok
                            </span>
                          ) : feedHeroCatch.id === feedTopCatchTodayId ? (
                            <span className="bg-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg flex items-center gap-1">
                              <Crown size={12} fill="currentColor" /> Top dnes
                            </span>
                          ) : (
                            <span className="bg-card border border-border text-foreground text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg">
                              Najnovšie
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-black italic text-foreground tracking-tighter tabular-nums">
                            {safeWeight(feedHeroCatch.weight).toFixed(2)}
                          </span>
                          <span className="text-base font-bold text-muted-foreground">kg</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{feedHeroCatch.team?.name || 'Neznámy tím'}</span>
                          <span className="w-1 h-1 bg-border rounded-full" />
                          <span className="text-xs text-muted-foreground">Sektor {feedHeroCatch.sector?.trim()}</span>
                          <span className="w-1 h-1 bg-border rounded-full" />
                          <FishBadge type={feedHeroCatch.fishType} />
                        </div>
                      </div>
                    </div>
                  )}

                  {feedProcessedCatches.length > 0 ? (
                    <div className="space-y-5">
                      {feedGetListWithoutHero(feedGroupedCatches.today).length > 0 && (
                        <section>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Dnes</span>
                            <span className="h-px flex-1 bg-border/50" />
                          </div>
                          <div className="space-y-2">
                            {feedGetListWithoutHero(feedGroupedCatches.today).map(c => (
                              <FeedCatchRow 
                                key={c.id} 
                                data={c as CatchWithDetails} 
                                isTopToday={c.id === feedTopCatchTodayId}
                                isRecent={feedRecentCatchIds.includes(c.id)}
                                isBigFish={safeWeight(c.weight) >= bigFishThreshold}
                                onClick={() => setSelectedCatchDetail(c as CatchWithDetails)} 
                                userRole={userRole}
                              />
                            ))}
                          </div>
                        </section>
                      )}

                      {feedGetListWithoutHero(feedGroupedCatches.yesterday).length > 0 && (
                        <section>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Včera</span>
                            <span className="h-px flex-1 bg-border/50" />
                          </div>
                          <div className="space-y-2">
                            {feedGetListWithoutHero(feedGroupedCatches.yesterday).map(c => (
                              <FeedCatchRow 
                                key={c.id} 
                                data={c as CatchWithDetails} 
                                isTopToday={false}
                                isRecent={false}
                                isBigFish={safeWeight(c.weight) >= bigFishThreshold}
                                onClick={() => setSelectedCatchDetail(c as CatchWithDetails)} 
                                userRole={userRole}
                              />
                            ))}
                          </div>
                        </section>
                      )}

                      {feedGetListWithoutHero(feedGroupedCatches.older).length > 0 && (
                        <section>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Staršie</span>
                            <span className="h-px flex-1 bg-border/50" />
                          </div>
                          <div className="space-y-2">
                            {feedGetListWithoutHero(feedGroupedCatches.older).map(c => (
                              <FeedCatchRow 
                                key={c.id} 
                                data={c as CatchWithDetails} 
                                isTopToday={false}
                                isRecent={false}
                                isBigFish={safeWeight(c.weight) >= bigFishThreshold}
                                onClick={() => setSelectedCatchDetail(c as CatchWithDetails)} 
                                userRole={userRole}
                              />
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground mb-3">
                        <Fish size={20} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {feedSearchQuery || feedSelectedFilter !== 'all' ? 'Žiadne úlovky pre tento filter' : 'Čakáme na prvý záber…'}
                      </p>
                      {(feedSearchQuery || feedSelectedFilter !== 'all') && (
                        <button 
                          onClick={feedHandleResetFilters}
                          className="mt-2 text-xs text-[#F97316] hover:underline font-medium"
                        >
                          Vymazať filter
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RULES BUTTON */}
              <div>
                <button 
                  onClick={() => setShowRulesOverlay(true)}
                  className="w-full p-4 rounded-xl bg-card border border-border hover:border-cyan-500/30 hover:bg-muted/20 transition-all text-left group"
                >
                  <div className="p-2 bg-cyan-500/10 rounded-lg w-fit mb-2 group-hover:scale-110 transition-transform">
                    <FileText size={18} strokeWidth={1.75} className="text-cyan-500" />
                  </div>
                  <div className="text-sm font-bold text-foreground">Pravidlá preteku</div>
                  <div className="text-[10px] text-muted-foreground">Čo platí na tomto preteku</div>
                </button>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* --- STATS OVERLAY (MODAL) WITH TABS --- */}
      {showStatsOverlay && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          onKeyDown={(e) => e.key === 'Escape' && setShowStatsOverlay(false)}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div 
            className="absolute inset-0 bg-background/90 backdrop-blur-md"
            onClick={() => setShowStatsOverlay(false)}
          ></div>

          <div className="relative z-10 bg-card border border-blue-500/20 w-full max-w-5xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col shadow-2xl blue-glow-card">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-3">
                  <PieChart className="text-blue-500" />
                  Ako ryby berú počas preteku
                </h2>
                <p className="text-muted-foreground text-sm mt-1">Dáta priamo z vody</p>
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
                  <BarChart3 size={14} /> Detailné štatistiky
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
                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 md:p-6 rounded-xl flex gap-4 items-start">
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
                    <div className="bg-card p-6 rounded-xl border border-border">
                      <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                        <MapPin size={18} strokeWidth={1.75} className="text-muted-foreground" />
                        Kde ryby berú najviac
                      </h3>
                      <HorizontalBarChart data={sectorStats} />
                      {sectorStats.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-6 leading-relaxed bg-muted/30 p-3 rounded-lg">
                          {sectorStats[0]?.name} vedie s váhou {sectorStats[0]?.weight.toFixed(1)} kg.
                        </p>
                      )}
                    </div>

                    <div className="bg-card p-6 rounded-xl border border-border">
                      <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                        <Clock size={18} strokeWidth={1.75} className="text-muted-foreground" />
                        Kedy ryby berú najviac
                      </h3>
                      <p className="text-xs text-muted-foreground mb-6">Časy, kedy sa ryby najčastejšie hlásia</p>
                      <VerticalBarChart data={hourlyActivity} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card p-4 rounded-xl text-center border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">Priemerná váha úlovku</div>
                      <div className="text-2xl font-mono font-medium text-[#F97316]">{liveStats.avgWeight.toFixed(1)} kg</div>
                    </div>
                    <div className="bg-card p-4 rounded-xl text-center border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">Počet úlovkov</div>
                      <div className="text-2xl font-mono font-medium text-[#F97316]">{liveStats.totalFish}</div>
                    </div>
                    <div className="bg-card p-4 rounded-xl text-center border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">TOP ryba preteku</div>
                      <div className="text-2xl font-mono font-medium text-[#F97316]">{liveStats.biggestFish.toFixed(1)} kg</div>
                    </div>
                    <div className="bg-card p-4 rounded-xl text-center border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">Celková váha</div>
                      <div className="text-2xl font-mono font-medium text-[#F97316]">{liveStats.totalWeight.toFixed(1)} kg</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SECTORS */}
              {statsTab === 'sectors' && (
                <div className="space-y-6">
                  <h3 className="text-foreground font-bold text-lg mb-4">Poradie v sektoroch</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {uniqueSectors.map(sector => (
                      <SectorTable key={sector} sector={sector} leaderboard={sortedLeaderboard} />
                    ))}
                    {uniqueSectors.length === 0 && (
                      <div className="col-span-full text-center text-muted-foreground py-8">
                        Sektory ešte nie sú rozdelené
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: ANALYTICS */}
              {statsTab === 'analytics' && id && (
                <div className="space-y-6">
                  <StatsDashboard competitionId={id} />
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- RULES OVERLAY (MODAL) --- */}
      {showRulesOverlay && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          onKeyDown={(e) => e.key === 'Escape' && setShowRulesOverlay(false)}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div 
            className="absolute inset-0 bg-background/90 backdrop-blur-md"
            onClick={() => setShowRulesOverlay(false)}
          ></div>

          <div className="relative z-10 bg-card border border-cyan-500/20 w-full max-w-3xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-3">
                  <FileText className="text-cyan-500" />
                  Pravidlá preteku
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          onKeyDown={(e) => e.key === 'Escape' && setShowMyTeamOverlay(false)}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div 
            className="absolute inset-0 bg-background/90 backdrop-blur-md"
            onClick={() => setShowMyTeamOverlay(false)}
          ></div>

          <div className="relative z-10 bg-card border border-blue-500/20 w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col shadow-2xl">
            
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
                     userTeam.status === 'pending' ? 'Čaká na schválenie' : 'Registrácia zamietnutá'}
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
              
              {/* Team Stats - from leaderboard (single source of truth) */}
              {userTeam.status === 'approved' && (isLive || isEnded) && (() => {
                const lb = sortedLeaderboard.find(t => t.id === userTeam.id);
                return (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="text-2xl font-black text-foreground">{lb?.fish ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Úlovkov</div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="text-2xl font-black text-foreground">{(lb?.weight ?? 0).toFixed(1)} kg</div>
                      <div className="text-xs text-muted-foreground">Celková váha</div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="text-2xl font-black text-[#F97316]">{lb?.rank ? `#${lb.rank}` : '-'}</div>
                      <div className="text-xs text-muted-foreground">Poradie</div>
                    </div>
                  </div>
                );
              })()}

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

      {/* --- UNIFIED ENTITY MODAL --- */}
      {entityModal.view && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEntityModal({ view: null, team: null, catch_: null, previousView: null });
            }
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div 
            className="absolute inset-0 bg-background/90 backdrop-blur-md" 
            onClick={() => setEntityModal({ view: null, team: null, catch_: null, previousView: null })} 
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border/50 rounded-xl shadow-2xl flex flex-col overflow-hidden z-10">
            
            {/* TEAM VIEW */}
            {entityModal.view === 'team' && entityModal.team && (
              <TeamOverviewContent
                team={entityModal.team}
                catches={catches || []}
                rank={sortedLeaderboard.find(t => t.id === entityModal.team?.id)?.rank}
                onCatchClick={(c) => {
                  setEntityModal({ view: null, team: null, catch_: null, previousView: null });
                  setSelectedCatchDetail({ ...c, team: entityModal.team! } as CatchWithDetails);
                }}
                onClose={() => {
                  if (entityModal.previousView) {
                    setEntityModal({ view: entityModal.previousView, team: null, catch_: null, previousView: null });
                  } else {
                    setEntityModal({ view: null, team: null, catch_: null, previousView: null });
                  }
                }}
              />
            )}
          </div>
        </div>
      )}

      {selectedCatchDetail && (
        <FeedCatchDetailModal 
          data={selectedCatchDetail} 
          onClose={() => setSelectedCatchDetail(null)} 
          userRole={userRole}
          isTopToday={selectedCatchDetail.id === feedTopCatchTodayId}
          isBigFish={safeWeight(selectedCatchDetail.weight) >= bigFishThreshold}
        />
      )}

    </div>
  );
}
