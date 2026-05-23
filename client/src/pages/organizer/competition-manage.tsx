import { useState, useEffect, useRef, Fragment } from "react";
import QRCodeLib from "qrcode";
import { useRoute, useLocation, useSearch } from "wouter";
import { TeamFlag } from "@/components/team-flag";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserSearchAutocomplete } from "@/components/UserSearchAutocomplete";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  StopCircle,
  Fish,
  UserPlus,
  MessageSquare,
  QrCode,
  Share2,
  Edit,
  Trash2,
  Loader2,
  Shield,
  ClipboardCheck,
  CreditCard,
  ChevronRight,
  Search,
  Copy,
  Check,
  X,
  MoreVertical,
  ExternalLink,
  Settings,
  Megaphone,
  ArrowLeft,
} from "lucide-react";
import type { Competition, Team, Referee, Announcement, Catch } from "@shared/schema";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

const STEPS = [
  { id: 'draft', label: 'Príprava' },
  { id: 'ready', label: 'Pripravená' },
  { id: 'registration', label: 'Registrácia' },
  { id: 'live', label: 'Prebieha' },
  { id: 'finished', label: 'Koniec' },
];

function Stepper({ currentStatus }: { currentStatus: string }) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStatus);
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium">
      {STEPS.map((step, idx) => {
        const isActive = step.id === currentStatus;
        const isPast = currentIndex > idx;
        return (
          <Fragment key={step.id}>
            <span className={`transition-colors ${isActive ? 'text-cyan-500 font-bold' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
              {step.label}
            </span>
            {idx < STEPS.length - 1 && <ChevronRight size={10} className="text-muted-foreground/30" />}
          </Fragment>
        );
      })}
    </div>
  );
}

function Countdown({ targetDate }: { targetDate: Date | string }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
    const update = () => {
      const now = new Date();
      const diff = Math.floor((target.getTime() - now.getTime()) / 1000);
      if (diff <= 0) {
        setTimeLeft("Prebieha");
        return false;
      }
      const d = Math.floor(diff / (3600 * 24));
      const h = Math.floor((diff % (3600 * 24)) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setTimeLeft(`${d}d ${h}h ${m}m`);
      return true;
    };
    if (!update()) return;
    const timer = setInterval(() => {
      if (!update()) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  return <span className="text-2xl font-bold tabular-nums text-foreground">{timeLeft}</span>;
}

export default function CompetitionManage() {
  const [, params] = useRoute("/organizer/competition/:id");
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const competitionId = params?.id || null;

  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showPrepareDialog, setShowPrepareDialog] = useState(false);
  const [showSelectPlanDialog, setShowSelectPlanDialog] = useState(false);
  const [showAddRefereeDialog, setShowAddRefereeDialog] = useState(false);
  const [showAddAnnouncementDialog, setShowAddAnnouncementDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [refereeEmail, setRefereeEmail] = useState("");
  const [selectedRefereeUser, setSelectedRefereeUser] = useState<{ id: string; email: string } | null>(null);
  const [refereeSector, setRefereeSector] = useState("all");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const paymentSuccessHandled = useRef(false);
  const [teamsFilter, setTeamsFilter] = useState<'all' | 'pending'>('all');
  const [teamsSearch, setTeamsSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showRejectTeamDialog, setShowRejectTeamDialog] = useState(false);
  const [rejectingTeamId, setRejectingTeamId] = useState<string | null>(null);
  const [rejectingTeamName, setRejectingTeamName] = useState("");
  const [processingTeamId, setProcessingTeamId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(searchString);
    const paymentStatus = urlParams.get('payment');
    if (paymentStatus === 'success' && !paymentSuccessHandled.current) {
      paymentSuccessHandled.current = true;
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/competitions'] });
      toast({
        title: "Platba úspešná!",
        description: "Vaša súťaž je aktivovaná a pripravená na spustenie.",
      });
      setShowPaymentSuccess(true);
      window.history.replaceState({}, '', `/organizer/competition/${competitionId}`);
    }
  }, [searchString, competitionId, toast]);

  useEffect(() => {
    if (showShareDialog && competitionId) {
      const url = `${window.location.origin}/competition/${competitionId}`;
      QRCodeLib.toDataURL(url, { width: 200, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    }
  }, [showShareDialog, competitionId]);

  const { data: competition, isLoading: competitionLoading } = useQuery<Competition>({
    queryKey: ['/api/competitions', competitionId],
    enabled: !!competitionId,
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['/api/competitions', competitionId, 'teams'],
    enabled: !!competitionId,
  });

  const { data: referees, isLoading: refereesLoading } = useQuery<Referee[]>({
    queryKey: ['/api/competitions', competitionId, 'referees'],
    enabled: !!competitionId,
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements'],
    select: (data) => data?.filter(a => a.competitionId === competitionId) || [],
    enabled: !!competitionId,
  });

  const { data: catches, isLoading: catchesLoading } = useQuery<Catch[]>({
    queryKey: ['/api/competitions', competitionId, 'catches'],
    enabled: !!competitionId && (competition?.status === 'live' || competition?.status === 'finished'),
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest('PATCH', `/api/competitions/${competitionId}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/competitions'] });
      toast({ title: "Stav súťaže bol zmenený", description: "Zmena stavu bola úspešne uložená." });
    },
    onError: (error: any) => {
      toast({ title: "Chyba", description: error.message || "Nepodarilo sa zmeniť stav súťaže.", variant: "destructive" });
    },
  });

  const addRefereeMutation = useMutation({
    mutationFn: async (data: { userId?: string; email?: string; assignedSector?: string }) => {
      return await apiRequest('POST', `/api/competitions/${competitionId}/referees`, data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId, 'referees'] });
      setRefereeEmail("");
      setSelectedRefereeUser(null);
      setRefereeSector("all");
      setShowAddRefereeDialog(false);
      toast({
        title: data?.invitationSent ? "Pozvánka odoslaná" : "Rozhodca pridaný",
        description: data?.invitationSent ? (data.message || "Pozvánka bola odoslaná na zadaný email.") : "Rozhodca bol úspešne pridaný do súťaže.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Chyba", description: error.message || "Nepodarilo sa pridať rozhodcu.", variant: "destructive" });
    },
  });

  const removeRefereeMutation = useMutation({
    mutationFn: async (refereeId: string) => {
      return apiRequest('DELETE', `/api/competitions/${competitionId}/referees/${refereeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId, 'referees'] });
      toast({ title: "Rozhodca odstránený", description: "Rozhodca bol odstránený zo súťaže." });
    },
    onError: (error: any) => {
      toast({ title: "Chyba", description: error.message || "Nepodarilo sa odstrániť rozhodcu.", variant: "destructive" });
    },
  });

  const addAnnouncementMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      return apiRequest('POST', '/api/announcements', {
        title: data.title, content: data.content, competitionId, published: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setShowAddAnnouncementDialog(false);
      toast({ title: "Oznam odoslaný", description: "Oznam bol úspešne zverejnený." });
    },
    onError: (error: any) => {
      toast({ title: "Chyba", description: error.message || "Nepodarilo sa vytvoriť oznam.", variant: "destructive" });
    },
  });

  const updateTeamStatusMutation = useMutation({
    mutationFn: async ({ teamId, status }: { teamId: string; status: string }) => {
      return apiRequest('PATCH', `/api/teams/${teamId}/status`, { status });
    },
    onMutate: ({ teamId }) => {
      setProcessingTeamId(teamId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId, 'teams'] });
      if (variables.status === 'approved') {
        toast({ title: "Tím schválený", description: "Tím môže nastúpiť do súťaže." });
      } else {
        toast({ title: "Tím zamietnutý", description: "Tím bol vyradený z registrácie." });
      }
      setShowRejectTeamDialog(false);
      setRejectingTeamId(null);
      setRejectingTeamName("");
    },
    onSettled: () => {
      setProcessingTeamId(null);
    },
    onError: (error: any) => {
      toast({ title: "Chyba", description: error.message || "Nepodarilo sa zmeniť stav tímu.", variant: "destructive" });
    },
  });

  const validateForReady = () => {
    const errors: string[] = [];
    if (!competition?.name || competition.name.trim() === '') errors.push("Názov súťaže");
    if (!competition?.location || competition.location.trim() === '') errors.push("Miesto konania");
    if (!competition?.startDate) errors.push("Dátum začiatku");
    if (!competition?.endDate) errors.push("Dátum konca");
    if (!competition?.scoringType) errors.push("Typ bodovania");
    if (!competition?.contactEmail || competition.contactEmail.trim() === '') errors.push("Kontaktný email");
    if (!competition?.contactPhone || competition.contactPhone.trim() === '') errors.push("Kontaktný telefón");
    if (competition?.startDate && competition?.endDate) {
      const start = new Date(competition.startDate);
      const end = new Date(competition.endDate);
      if (end < start) errors.push("Dátum konca musí byť po dátume začiatku");
    }
    if (competition?.hasSectors && (!competition?.sectorPlaces || competition.sectorPlaces.length === 0)) {
      errors.push("Definujte aspoň jeden sektor");
    }
    return errors;
  };

  const handlePrepareForLaunch = () => {
    const errors = validateForReady();
    if (errors.length > 0) {
      toast({ title: "Chýbajúce údaje", description: `Vyplňte: ${errors.join(", ")}`, variant: "destructive" });
      return;
    }
    setShowPrepareDialog(true);
  };

  const confirmPrepareForLaunch = () => {
    statusMutation.mutate('ready');
    setShowPrepareDialog(false);
    toast({ title: "Súťaž pripravená", description: "Teraz vyber balík a zaplať pre aktiváciu." });
    setShowSelectPlanDialog(true);
  };

  const handleStartCompetition = () => {
    statusMutation.mutate('live');
    setShowStartDialog(false);
  };

  const handleEndCompetition = () => {
    statusMutation.mutate('finished');
    setShowEndDialog(false);
  };

  const handleAddReferee = () => {
    if (selectedRefereeUser) {
      addRefereeMutation.mutate({ userId: selectedRefereeUser.id, assignedSector: refereeSector });
    } else if (refereeEmail.trim()) {
      addRefereeMutation.mutate({ email: refereeEmail.trim(), assignedSector: refereeSector });
    }
  };

  const handleRefereeSelect = (user: { id: string; email: string } | null, newEmail?: string) => {
    if (user) { setSelectedRefereeUser(user); setRefereeEmail(""); }
    else if (newEmail) { setSelectedRefereeUser(null); setRefereeEmail(newEmail); }
  };

  const handleAddAnnouncement = () => {
    if (announcementTitle.trim() && announcementContent.trim()) {
      addAnnouncementMutation.mutate({ title: announcementTitle.trim(), content: announcementContent.trim() });
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast({ title: "Skopírované do schránky" });
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  if (competitionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1400px] mx-auto px-6 py-20">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground mb-2">Súťaž nenájdená</h2>
          <p className="text-muted-foreground mb-6">Táto súťaž neexistuje alebo k nej nemáte prístup.</p>
          <Button onClick={() => setLocation('/organizer/competitions')} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold w-full h-12 rounded-xl">
            Späť na zoznam súťaží
          </Button>
        </div>
      </div>
    );
  }

  const teamsCount = teams?.length || 0;
  const refereesCount = referees?.length || 0;
  const pendingTeams = teams?.filter(t => t.status === 'pending') || [];
  const allTeams = teams || [];
  const filteredTeams = (teamsFilter === 'pending' ? pendingTeams : allTeams)
    .filter(t => !teamsSearch || t.name.toLowerCase().includes(teamsSearch.toLowerCase()));

  const readinessChecks = [
    { label: 'Názov', ok: !!competition.name },
    { label: 'Miesto', ok: !!competition.location },
    { label: 'Dátum', ok: !!competition.startDate && !!competition.endDate },
    { label: 'Bodovanie', ok: !!competition.scoringType },
    { label: 'Kontakt', ok: !!competition.contactEmail && !!competition.contactPhone },
  ];
  const readinessPct = Math.round((readinessChecks.filter(c => c.ok).length / readinessChecks.length) * 100);
  const missingChecks = readinessChecks.filter(c => !c.ok);

  const getActionState = () => {
    if (competition.status === 'draft') {
      return {
        label: 'Nastaviť súťaž',
        context: 'Chýba setup pravidiel',
        contextColor: 'text-cyan-400',
        variant: 'primary' as const,
        Icon: Settings,
        action: () => setLocation(`/organizer/create?id=${competition.id}`),
      };
    }
    if (competition.status === 'ready' && competition.paymentStatus !== 'paid') {
      return {
        label: 'Vybrať balík a zaplatiť',
        context: 'Čaká na platbu',
        contextColor: 'text-cyan-400',
        variant: 'primary' as const,
        Icon: CreditCard,
        action: () => setLocation(`/organizer/competition/${competition.id}/checkout`),
      };
    }
    if ((competition.status === 'ready' && competition.paymentStatus === 'paid') || competition.status === 'registration') {
      const hasPending = pendingTeams.length > 0;
      return {
        label: 'Spustiť súťaž',
        context: hasPending ? `Čakajú ${pendingTeams.length} tímy` : 'Pripravené na štart',
        contextColor: hasPending ? 'text-cyan-400' : 'text-muted-foreground',
        variant: 'green' as const,
        Icon: Play,
        action: () => setShowStartDialog(true),
      };
    }
    if (competition.status === 'live') {
      return {
        label: 'Ukončiť súťaž',
        context: 'Súťaž prebieha',
        contextColor: 'text-emerald-400',
        variant: 'red' as const,
        Icon: StopCircle,
        action: () => setShowEndDialog(true),
      };
    }
    return null;
  };

  const actionState = getActionState();
  const ActionIcon = actionState?.Icon;
  const locationLine = competition.location ? `\n📍 ${competition.location}` : '';
  const dateLine = `\n📅 ${format(new Date(competition.startDate), "d. MMMM yyyy", { locale: sk })}`;
  const inviteMessage = competition.status === 'live' || competition.status === 'finished'
    ? `${competition.name}${locationLine}${dateLine}\nVýsledky: ${window.location.origin}/competition/${competition.id}`
    : `Ahojte! Registrácia na ${competition.name} je otvorená.${locationLine}${dateLine}\nPrihlásenie: ${window.location.origin}/competition/${competition.id}`;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-20">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border backdrop-blur-sm shadow-2xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => setLocation('/organizer/competitions')} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="w-8 h-8 bg-cyan-600 rounded flex items-center justify-center text-white shadow-lg shadow-orange-900/20 flex-shrink-0">
              <Trophy size={18} />
            </div>
            <div className="leading-tight min-w-0">
              <h1 className="text-sm font-bold text-foreground tracking-tight truncate">{competition.name}</h1>
              <Stepper currentStatus={competition.status} />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {actionState && (
              <div className="hidden lg:flex flex-col items-end leading-none mr-3">
                <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1">Nasledujúci krok</span>
                <span className={`text-[11px] font-semibold ${actionState.contextColor}`}>{actionState.context}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-accent h-9 px-3 sm:px-4 text-xs font-bold transition-all"
              onClick={() => window.open(`/competition/${competition.id}`, '_blank')}
            >
              <ExternalLink size={14} className="mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Verejná stránka</span>
            </Button>
            {actionState && (
              <Button
                onClick={actionState.action}
                disabled={statusMutation.isPending}
                className={`h-9 px-3 sm:px-5 text-xs font-bold uppercase tracking-wider transition-all border
                  ${actionState.variant === 'green'
                    ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : actionState.variant === 'red'
                    ? 'bg-red-600/10 border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : 'bg-cyan-600/10 border-cyan-500/50 text-cyan-500 hover:bg-cyan-600 hover:text-white hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]'}
                `}
              >
                {statusMutation.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : ActionIcon && <ActionIcon size={14} className="mr-1 sm:mr-2" />}
                <span className="hidden sm:inline">{actionState.label}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-muted-foreground/50" />
            <span>{competition.location}</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-muted-foreground">
            <Calendar size={14} className="text-muted-foreground/50" />
            <span>
              {format(new Date(competition.startDate), "d. MMMM yyyy", { locale: sk })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
            onClick={() => setLocation(competition.status === 'draft' ? `/organizer/create?id=${competition.id}` : `/competition/${competition.id}/setup`)}
          >
            <Edit size={12} className="mr-1" />
            Upraviť
          </Button>
        </div>

        {showPaymentSuccess && competition.status === 'ready' && competition.paymentStatus === 'paid' && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-300 text-sm">Platba úspešná</h3>
                <p className="text-xs text-emerald-400/70">Balík: <span className="font-medium capitalize">{competition.planTier || 'Pro'}</span> • Môžeš pozvať tímy a spustiť súťaž</p>
              </div>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold" onClick={() => setShowStartDialog(true)}>
              <Play size={14} className="mr-1" /> Spustiť súťaž
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <Card className="bg-card border-border shadow-none">
            <CardContent className="p-4 sm:p-5">
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-2">
                {competition.status === 'live' ? 'Do konca' : 'Čas do štartu'}
              </p>
              <Countdown targetDate={competition.status === 'live' ? competition.endDate : competition.startDate} />
              <span className="text-[11px] text-muted-foreground/70 mt-1 block">
                {format(new Date(competition.startDate), "d.M.yyyy", { locale: sk })}
              </span>
            </CardContent>
          </Card>

          <Card
            className={`bg-card border-border shadow-none transition-all ${pendingTeams.length > 0 ? 'ring-1 ring-cyan-500/30 cursor-pointer hover:bg-accent/40' : ''}`}
            onClick={() => pendingTeams.length > 0 && setTeamsFilter('pending')}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Tímy</p>
                {pendingTeams.length > 0 && (
                  <Badge className="bg-cyan-600 text-white border-none text-[9px] px-1.5 py-0">
                    {pendingTeams.length} ČAKÁ
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-2 text-2xl font-bold text-foreground">
                {teamsCount} <span className="text-sm font-normal text-muted-foreground/50">/ {competition.maxTeams || '∞'}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-none">
            <CardContent className="p-4 sm:p-5">
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-2">Rozhodcovia</p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-foreground">{refereesCount}</span>
                <button onClick={() => setShowAddRefereeDialog(true)} className="text-cyan-500 text-xs font-bold hover:text-cyan-400">Spravovať</button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-none">
            <CardContent className="p-4 sm:p-5">
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-2">Pripravenosť</p>
              <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden border border-border/50">
                <div className="bg-cyan-600 h-full transition-all duration-500" style={{ width: `${readinessPct}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
                {missingChecks.map(c => (
                  <span key={c.label} className="text-[10px] text-cyan-500 font-bold flex items-center gap-1">
                    <AlertCircle size={10} /> Chýba: {c.label}
                  </span>
                ))}
                {missingChecks.length === 0 && (
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                    <CheckCircle size={10} /> Všetko pripravené
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-start sm:items-center bg-card p-2 rounded-xl border border-border">
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setTeamsFilter('all')}
                  className={`px-4 sm:px-5 py-1.5 text-[11px] font-bold rounded-md transition-all ${teamsFilter === 'all' ? 'bg-accent text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground/80'}`}
                >
                  VŠETKY
                </button>
                <button
                  onClick={() => setTeamsFilter('pending')}
                  className={`px-4 sm:px-5 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-2 ${teamsFilter === 'pending' ? 'bg-cyan-600 text-white shadow-lg shadow-orange-900/20' : 'text-muted-foreground hover:text-foreground/80'}`}
                >
                  ČAKAJÚCE {pendingTeams.length > 0 && <span className="bg-black/20 px-1.5 rounded text-[10px]">{pendingTeams.length}</span>}
                </button>
              </div>
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground/70" />
                <Input
                  placeholder="Hľadať tím..."
                  value={teamsSearch}
                  onChange={(e) => setTeamsSearch(e.target.value)}
                  className="h-9 bg-muted border-border text-xs pl-9 focus:ring-1 focus:ring-cyan-500/50 text-foreground/80 placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <Card className="bg-card border-border shadow-none overflow-hidden rounded-xl">
              <div className="divide-y divide-border">
                {teamsLoading ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : filteredTeams.length > 0 ? filteredTeams.map(team => (
                  <div key={team.id} className="p-4 flex items-center justify-between hover:bg-accent/20 transition-all group">
                    <div className="flex items-center gap-4 cursor-pointer min-w-0" onClick={() => setLocation(`/team/${team.id}`)}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${team.status === 'approved' ? 'bg-emerald-500' : 'bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.4)]'}`} />
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground group-hover:text-foreground truncate flex items-center gap-1.5"><TeamFlag country={team.country} size="xs" />{team.name}</h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                          {team.sector ? `Sektor ${team.sector}` : 'Sektor nepridelený'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-border text-[11px] font-bold px-3 sm:px-4"
                        onClick={() => setLocation(`/team/${team.id}`)}
                      >
                        <Eye size={12} className="mr-1" />
                        <span className="hidden sm:inline">DETAIL</span>
                      </Button>
                      {team.status === 'pending' && (
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                            onClick={(e) => { e.stopPropagation(); updateTeamStatusMutation.mutate({ teamId: team.id, status: 'approved' }); }}
                            disabled={processingTeamId === team.id}
                          >
                            {processingTeamId === team.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground/70 hover:text-red-400 hover:bg-red-400/10"
                            onClick={(e) => { e.stopPropagation(); setRejectingTeamId(team.id); setRejectingTeamName(team.name); setShowRejectTeamDialog(true); }}
                            disabled={processingTeamId === team.id}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="p-16 text-center">
                    <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground/70 text-xs italic tracking-wide">
                      {teamsSearch ? 'Žiadne tímy nevyhovujú hľadaniu.' : teamsFilter === 'pending' ? 'Žiadne čakajúce tímy.' : 'Zatiaľ žiadne registrované tímy.'}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {(competition?.status === 'live' || competition?.status === 'finished') && (
              <Card className="bg-card border-border shadow-none">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Úlovky</h3>
                    <Badge variant="outline" className="bg-transparent border-border text-muted-foreground text-[10px]">
                      {catchesLoading ? '...' : (catches?.length || 0)}
                    </Badge>
                  </div>
                  {catchesLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : !catches || catches.length === 0 ? (
                    <div className="text-center py-6">
                      <Fish size={24} className="mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-xs text-muted-foreground/70">
                        {competition?.status === 'live' ? 'Zatiaľ žiadne úlovky' : 'Žiadne úlovky'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {catches.slice(0, 5).map(c => (
                        <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 border border-border/30">
                          <div className="min-w-0">
                            <span className="text-sm text-foreground font-medium">{c.fishType === 'mirror' ? 'Lysec' : c.fishType === 'scaly' ? 'Šupináč' : (c.fishType || 'Neznámy druh')}</span>
                          </div>
                          <span className="text-sm font-mono font-medium text-cyan-500">{c.weight ? `${parseFloat(c.weight.toString()).toFixed(1)} kg` : '-'}</span>
                        </div>
                      ))}
                      {catches.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setLocation(`/competition/${competitionId}`)}
                        >
                          Zobraziť všetky ({catches.length})
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest px-1">Oznamy</h3>
              {announcementsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !announcements || announcements.length === 0 ? (
                <div className="text-center py-6">
                  <Megaphone size={20} className="mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground/70">Žiadne oznamy</p>
                </div>
              ) : (
                announcements.map(a => (
                  <Card key={a.id} className="bg-card border-border shadow-none">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-foreground">{a.title}</h4>
                        <span className="text-[10px] text-muted-foreground/70">{a.createdAt ? format(new Date(a.createdAt), "d. MMM, HH:mm", { locale: sk }) : ''}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.content}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest px-1">Nástroje organizátora</h3>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="w-full justify-start h-12 bg-card border-border hover:bg-accent hover:border-border text-muted-foreground hover:text-foreground group transition-all" onClick={() => setShowShareDialog(true)}>
                <Share2 size={16} className="mr-3 text-blue-500 group-hover:scale-110 transition-transform" /> Pozvať tímy
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 bg-card border-border hover:bg-accent hover:border-border text-muted-foreground hover:text-foreground group transition-all" onClick={() => setShowAddRefereeDialog(true)}>
                <Shield size={16} className="mr-3 text-purple-500 group-hover:scale-110 transition-transform" /> Rozhodcovia
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 bg-card border-border hover:bg-accent hover:border-border text-muted-foreground hover:text-foreground group transition-all" onClick={() => setShowAddAnnouncementDialog(true)}>
                <Megaphone size={16} className="mr-3 text-muted-foreground group-hover:scale-110 transition-transform" /> Nový oznam
              </Button>
            </div>

            {referees && referees.length > 0 && (
              <Card className="bg-card border-border shadow-none overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                  <h5 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Rozhodcovia ({refereesCount})</h5>
                </div>
                <CardContent className="p-3 space-y-2">
                  {referees.map(referee => (
                    <div key={referee.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/30 group">
                      <div className="flex items-center gap-2 min-w-0">
                        <Shield size={14} className="text-purple-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground/80 truncate">{(referee as any).user?.email || 'Rozhodca'}</p>
                          <p className="text-[10px] text-muted-foreground/70">{referee.assignedSector ? `Sektor ${referee.assignedSector}` : 'Všetky sektory'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeRefereeMutation.mutate(referee.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="bg-card border-border shadow-none overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20">
                <h5 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Verejný odkaz</h5>
              </div>
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/competition/${competition.id}`}
                    readOnly
                    className="h-9 text-[11px] bg-muted border-border text-blue-400/80 font-mono focus:ring-0"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 border-border bg-muted hover:bg-accent flex-shrink-0"
                    onClick={() => copyToClipboard(`${window.location.origin}/competition/${competition.id}`, 'link')}
                  >
                    {copiedKey === 'link' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-muted-foreground" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border text-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Share2 size={20} className="text-blue-500" /> Pozvánka pre tímy
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 gap-6">
            <div className="bg-white p-3 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR kód súťaže" width={140} height={140} className="rounded" />
              ) : (
                <QrCode size={140} className="text-slate-200 animate-pulse" />
              )}
            </div>
            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-widest">Pozývacia správa</Label>
                <div className="relative">
                  <Textarea
                    value={inviteMessage}
                    readOnly
                    className="bg-muted border-border text-muted-foreground text-xs h-28 resize-none pr-10 pt-3 focus:ring-1 focus:ring-blue-500/20"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 text-muted-foreground/70 hover:text-foreground"
                    onClick={() => copyToClipboard(inviteMessage, 'invite')}
                  >
                    {copiedKey === 'invite' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full border-border bg-muted hover:bg-accent text-muted-foreground" onClick={() => setShowShareDialog(false)}>
              Zavrieť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Spustiť súťaž?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Súťaž "{competition.name}" bude spustená. Tímy budú môcť začať zaznamenávať úlovky. Registrácia nových tímov bude uzavretá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground/80 hover:bg-accent">Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartCompetition} className="bg-emerald-600 hover:bg-emerald-700 text-white border-none">
              <Play className="w-4 h-4 mr-1" /> Spustiť súťaž
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Ukončiť súťaž?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Súťaž "{competition.name}" bude ukončená. Zaznamenávanie úlovkov bude zastavené a výsledky budú finálne. Táto akcia sa nedá vrátiť späť.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground/80 hover:bg-accent">Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndCompetition} className="bg-red-600 hover:bg-red-700 text-white border-none">
              <StopCircle className="w-4 h-4 mr-1" /> Ukončiť súťaž
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPrepareDialog} onOpenChange={setShowPrepareDialog}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Pripraviť súťaž na spustenie?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Po potvrdení bude súťaž "{competition.name}" označená ako pripravená. Následne budeš presmerovaný na výber balíka a platbu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground/80 hover:bg-accent">Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPrepareForLaunch} className="bg-cyan-500 hover:bg-cyan-600 text-white border-none">
              <ClipboardCheck className="w-4 h-4 mr-1" /> Pokračovať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSelectPlanDialog} onOpenChange={setShowSelectPlanDialog}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Vyber balík pre svoju súťaž</DialogTitle>
            <DialogDescription className="text-muted-foreground">Vyber si balík podľa veľkosti a potrieb tvojej súťaže.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {[
              { key: 'basic', name: 'Basic', price: '69€', desc: 'Pre menšie súťaže', features: ['Max. 15 tímov', '2 rozhodcovia', 'Live tabuľka výsledkov', 'Základné štatistiky'] },
              { key: 'pro', name: 'Pro', price: '199€', desc: 'Najobľúbenejší pre väčšinu súťaží', features: ['Neobmedzený počet tímov', '5 rozhodcov', 'Sektory a vyhodnotenie', 'Vedľajšie súťaže', 'Email notifikácie'], popular: true },
              { key: 'premium', name: 'Premium', price: '599€', desc: 'Pre veľké podujatia s brandingom', features: ['Neobmedzené tímy a rozhodcovia', 'Branding a logo', 'Prioritná podpora'] },
            ].map(plan => (
              <div
                key={plan.key}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-cyan-500/80 relative ${plan.popular ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-border hover:bg-accent/30'}`}
                onClick={() => setLocation(`/organizer/competition/${competitionId}/checkout?plan=${plan.key}`)}
              >
                {plan.popular && <Badge className="absolute -top-2 right-4 bg-cyan-500 text-white border-none text-[9px]">Najobľúbenejší</Badge>}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  <span className="text-xl font-mono font-medium text-cyan-500">{plan.price}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{plan.desc}</p>
                <ul className="text-xs space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-foreground/80">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border bg-muted hover:bg-accent text-muted-foreground" onClick={() => setShowSelectPlanDialog(false)}>
              Zavrieť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddRefereeDialog} onOpenChange={(open) => {
        setShowAddRefereeDialog(open);
        if (!open) { setSelectedRefereeUser(null); setRefereeEmail(""); setRefereeSector("all"); }
      }}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Pridať rozhodcu</DialogTitle>
            <DialogDescription className="text-muted-foreground">Vyhľadajte existujúceho používateľa alebo pozvite nového rozhodcu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Vyhľadať používateľa</Label>
              <UserSearchAutocomplete
                onSelect={handleRefereeSelect}
                placeholder="Meno alebo email rozhodcu..."
                allowNewEmail={true}
                excludeUserIds={referees?.map(r => (r as any).userId).filter(Boolean) || []}
              />
            </div>
            {(selectedRefereeUser || refereeEmail) && (
              <div className="p-3 bg-muted rounded-lg border border-border space-y-3">
                <p className="text-sm font-medium text-foreground/80">
                  {selectedRefereeUser ? <>Vybraný: <span className="text-cyan-500">{selectedRefereeUser.email}</span></> : <>Pozvánka: <span className="text-cyan-500">{refereeEmail}</span></>}
                </p>
                {selectedRefereeUser && competition?.hasSectors && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Priradený sektor</Label>
                    <select
                      value={refereeSector}
                      onChange={(e) => setRefereeSector(e.target.value)}
                      className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground/80"
                    >
                      <option value="all">Všetky sektory</option>
                      {(competition.sectorPlaces as any[])?.map((s: any) => (
                        <option key={s.sectorName} value={s.sectorName}>Sektor {s.sectorName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border text-muted-foreground hover:bg-accent" onClick={() => setShowAddRefereeDialog(false)}>Zrušiť</Button>
            <Button
              onClick={handleAddReferee}
              disabled={(!selectedRefereeUser && !refereeEmail.trim()) || addRefereeMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {addRefereeMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
              {selectedRefereeUser ? "Pridať rozhodcu" : "Pozvať rozhodcu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddAnnouncementDialog} onOpenChange={setShowAddAnnouncementDialog}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nový oznam</DialogTitle>
            <DialogDescription className="text-muted-foreground">Vytvor oznam pre účastníkov súťaže.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Nadpis</Label>
              <Input
                placeholder="Napr. Zmena pravidiel"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Obsah oznamu</Label>
              <Textarea
                placeholder="Napíšte text oznamu..."
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                rows={4}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border text-muted-foreground hover:bg-accent" onClick={() => setShowAddAnnouncementDialog(false)}>Zrušiť</Button>
            <Button
              onClick={handleAddAnnouncement}
              disabled={!announcementTitle.trim() || !announcementContent.trim() || addAnnouncementMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {addAnnouncementMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-1" />}
              Odoslať oznam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRejectTeamDialog} onOpenChange={(open) => {
        setShowRejectTeamDialog(open);
        if (!open) { setRejectingTeamId(null); setRejectingTeamName(""); }
      }}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Zamietnuť tím?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tím "{rejectingTeamName}" bude zamietnutý a nebude sa môcť zúčastniť súťaže. Túto akciu je možné vrátiť späť schválením tímu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground/80 hover:bg-accent">Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (rejectingTeamId) updateTeamStatusMutation.mutate({ teamId: rejectingTeamId, status: 'rejected' }); }}
              className="bg-red-600 hover:bg-red-700 text-white border-none"
            >
              <X className="w-4 h-4 mr-1" /> Zamietnuť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
