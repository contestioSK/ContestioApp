import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Trophy, Plus, Swords, Users, Clock, Crown, Check, X, ChevronRight, ChevronDown, Lock, History, type LucideIcon } from "lucide-react";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon } from "@/components/ui/tactical-icon";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DiaryBattle } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface BattleInvitation {
  id: string;
  battleId: string;
  invitedByUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  invitedByUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  battle?: {
    id: string;
    name: string;
    startAt: string;
    endAt: string;
  };
}

interface ArchivedBattle {
  id: string;
  name: string;
  mode: string;
  status: "finished";
  startAt: Date | string;
  endAt: Date | string;
  participantCount: number;
  winner: string;
  userPosition: number | null;
  userScore: number;
  totalScore: number;
  participants: string[];
}

const getTimeRemaining = (endDate: Date | string | null | undefined): string => {
  if (!endDate) return 'Neznámy koniec';
  const end = new Date(endDate);
  if (isNaN(end.getTime())) return 'Neznámy koniec';
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return 'Skončený';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

const getUserInitials = (firstName?: string | null, lastName?: string | null, email?: string): string => {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.substring(0, 2).toUpperCase();
  if (email) return email.substring(0, 2).toUpperCase();
  return 'U';
};

const getUserDisplayName = (firstName?: string | null, lastName?: string | null, email?: string): string => {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return email || 'Používateľ';
};

const getBattleProgress = (startDate: Date | string | null | undefined, endDate: Date | string | null | undefined): number => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 0;
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
};

function CountdownTimer({ endDate }: { endDate: Date | string }) {
  const [display, setDisplay] = useState<{ type: 'countdown' | 'ended' | 'hidden'; hours?: number; minutes?: number; seconds?: number }>({ type: 'hidden' });
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endDate).getTime();
      const now = Date.now();
      const diff = end - now;
      
      if (diff <= 0) {
        setDisplay({ type: 'ended' });
        return;
      }
      
      if (diff > 24 * 60 * 60 * 1000) {
        setDisplay({ type: 'hidden' });
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setDisplay({ type: 'countdown', hours, minutes, seconds });
    };
    
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [endDate]);
  
  if (display.type === 'hidden') return null;
  
  if (display.type === 'ended') {
    return (
      <Badge variant="outline" className="text-xs bg-gray-500/10 border-gray-500/50 text-gray-500">
        Skončený
      </Badge>
    );
  }
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return (
    <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/50 text-red-500 font-mono animate-pulse">
      <Clock className="w-3 h-3 mr-1" />
      {pad(display.hours!)}:{pad(display.minutes!)}:{pad(display.seconds!)}
    </Badge>
  );
}

function HeroBattleCard({ battle, onEnter }: { battle: DiaryBattle; onEnter: () => void }) {
  const end = new Date(battle.endAt).getTime();
  const now = Date.now();
  const diff = end - now;
  const isEndingSoon = diff > 0 && diff < 24 * 60 * 60 * 1000;
  const [timeLeft, setTimeLeft] = useState("--:--:--");

  useEffect(() => {
    const timer = setInterval(() => {
      const d = end - Date.now();
      if (d <= 0) {
        setTimeLeft("KONIEC");
        clearInterval(timer);
      } else {
        const h = Math.floor(d / (1000 * 60 * 60));
        const m = Math.floor((d % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((d % (1000 * 60)) / 1000);
        setTimeLeft(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [end]);

  const displayTime = isEndingSoon ? timeLeft : getTimeRemaining(battle.endAt);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-xl mb-8">
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="relative z-10 p-6 md:p-10 flex flex-col items-center text-center">
        {isEndingSoon && (
          <Badge className="mb-4 bg-red-500/10 text-red-500 border border-red-500/20">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Súboj vrcholí
          </Badge>
        )}

        <h2 className="text-2xl md:text-4xl font-black text-foreground uppercase tracking-tight mb-6 italic">
          {battle.name}
        </h2>

        <div className="w-full max-w-xs bg-background/30 rounded-2xl p-4 border border-border/50 mb-6">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Zostáva</div>
          <div className={cn(
            "font-mono font-bold tabular-nums tracking-tighter leading-none",
            isEndingSoon ? "text-3xl md:text-5xl text-foreground" : "text-2xl md:text-3xl text-muted-foreground"
          )}>
            {displayTime}
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-6 mb-8 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-2">
            <Users size={14} className="text-muted-foreground" /> 
            {battle.participants.length} Účastníci
          </span>
          <div className="w-1 h-1 rounded-full bg-border"></div>
          <span className="flex items-center gap-2">
            <Trophy size={14} className="text-emerald-500" /> 
            Pozícia: <span className="text-foreground">---</span>
          </span>
        </div>

        <Button 
          onClick={onEnter}
          className="w-full md:w-auto min-w-[220px] rounded-xl bg-[#F97316] hover:bg-orange-600 text-white shadow-lg border border-orange-400/10"
        >
          Vstúpiť do Arény
        </Button>
      </div>
    </div>
  );
}

function BattleRow({ battle, onClick }: { battle: DiaryBattle; onClick: () => void }) {
  const end = new Date(battle.endAt).getTime();
  const now = Date.now();
  const diff = end - now;
  const isEndingSoon = diff > 0 && diff < 24 * 60 * 60 * 1000;
  const opponent = battle.participants.length > 1 ? battle.participants[1]?.name : '---';
  const progress = getBattleProgress(battle.startAt, battle.endAt);
  
  return (
    <div 
      onClick={onClick}
      className="group p-4 bg-card/30 border border-border rounded-2xl hover:border-muted-foreground/50 transition-all cursor-pointer space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-xl text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground transition-all">
            <Swords size={18} />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-sm group-hover:text-foreground transition-colors">{battle.name}</h4>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Súper: {opponent}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEndingSoon ? (
            <CountdownTimer endDate={battle.endAt} />
          ) : (
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {getTimeRemaining(battle.endAt)}
            </Badge>
          )}
          <ChevronRight size={16} className="text-border group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Priebeh</span>
          <span className="font-mono font-medium text-[#F97316]">{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
    </div>
  );
}

function MobileSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  badge
}: { 
  title: string; 
  icon: LucideIcon; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <section className="space-y-4">
      <div 
        className="flex items-center justify-between cursor-pointer md:cursor-default" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
          <Icon size={14} className="text-muted-foreground" />
          {title}
          {badge}
        </h3>
        <ChevronDown 
          size={16} 
          className={cn(
            "text-muted-foreground md:hidden transition-transform",
            isOpen && "rotate-180"
          )} 
        />
      </div>
      <div className={cn(
        "transition-all duration-300 overflow-hidden",
        isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 md:max-h-[2000px] md:opacity-100"
      )}>
        {children}
      </div>
    </section>
  );
}

function HistoryBattleRow({ battle, onClick }: { battle: ArchivedBattle; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="group flex items-center justify-between p-3 bg-card/30 border border-border rounded-xl hover:border-muted-foreground/50 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold shrink-0",
          battle.userPosition === 1 
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
            : "bg-muted text-muted-foreground"
        )}>
          {battle.userPosition === 1 ? <Trophy size={14} /> : `${battle.userPosition}.`}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{battle.name}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{battle.participantCount} účastníkov</p>
        </div>
      </div>
      <ChevronRight size={14} className="text-border group-hover:text-muted-foreground shrink-0" />
    </div>
  );
}

export default function BattleIndex() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: premiumStatus, isLoading: isPremiumLoading } = useQuery<{ isPremium: boolean }>({
    queryKey: ['/api/auth/premium-status'],
    enabled: !!user?.id,
  });

  const isPremium = premiumStatus?.isPremium;

  const { data: battles = [], isLoading: isBattlesLoading } = useQuery<DiaryBattle[]>({
    queryKey: ['/api/diary/battles'],
    enabled: !!user,
  });

  const { data: invitations = [], isLoading: isInvitationsLoading } = useQuery<BattleInvitation[]>({
    queryKey: ['/api/diary/battles/invitations'],
    enabled: !!user,
  });

  useEffect(() => {
    if (isPremiumLoading || isBattlesLoading || isInvitationsLoading) return;
    if (isPremium) return;
    const hasBattles = battles.length > 0;
    const hasInvitations = invitations.length > 0;
    if (!hasBattles && !hasInvitations) {
      setLocation('/diary/battles/paywall');
    }
  }, [isPremium, isPremiumLoading, battles, isBattlesLoading, invitations, isInvitationsLoading, setLocation]);

  const { data: archivedBattles = [] } = useQuery<ArchivedBattle[]>({
    queryKey: ['/api/diary/battles/archive'],
    enabled: !!user,
  });

  const hallOfFameStats = {
    totalWins: archivedBattles.filter(b => b.userPosition === 1).length,
    totalBattles: archivedBattles.length,
  };

  useEffect(() => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/archive'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
    }
  }, [user]);

  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await apiRequest('POST', `/api/diary/battles/invitations/${invitationId}/accept`);
      if (!response.ok) throw new Error('Failed to accept invitation');
      return invitationId;
    },
    onSuccess: () => {      
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      toast({ title: "Výzva prijatá", description: "Úspešne si prijal výzvu na súboj!" });
    },
    onError: () => {
      toast({ title: "Chyba", description: "Nepodarilo sa prijať výzvu", variant: "destructive" });
    },
  });

  const rejectInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await apiRequest('POST', `/api/diary/battles/invitations/${invitationId}/reject`);
      if (!response.ok) throw new Error('Failed to reject invitation');
      return invitationId;
    },
    onSuccess: () => {      
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      toast({ title: "Výzva odmietnutá", description: "Výzva bola úspešne odmietnutá" });
    },
    onError: () => {
      toast({ title: "Chyba", description: "Nepodarilo sa odmietnuť výzvu", variant: "destructive" });
    },
  });

  if (!user || isPremiumLoading || isPremium === undefined || isBattlesLoading) {
    return (
      <DiaryLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Načítavam...</p>
          </div>
        </div>
      </DiaryLayout>
    );
  }

  const activeBattles = battles.filter(b => b.status === 'active');
  const heroBattle = activeBattles.length > 0 ? activeBattles.reduce((closest, battle) => {
    const closestEnd = new Date(closest.endAt).getTime();
    const battleEnd = new Date(battle.endAt).getTime();
    const now = Date.now();
    return (battleEnd - now) < (closestEnd - now) && (battleEnd - now) > 0 ? battle : closest;
  }, activeBattles[0]) : null;
  const otherBattles = heroBattle ? activeBattles.filter(b => b.id !== heroBattle.id) : [];

  return (
    <DiaryLayout>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-px w-16 bg-[#F97316]"></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F97316]">PvP Battle Zone</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <TacticalIcon icon={Swords} variant="orange" size="lg" showLabel={false} />
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-foreground leading-none">
                  Súboje
                </h1>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  PREMIUM
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground italic tracking-tight pl-0.5">
                Priateľské rybárske duely
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => setLocation(isPremium ? "/diary/battles/create" : "/diary/battles/paywall")}
            className={cn(
              "rounded-xl w-full md:w-auto",
              isPremium 
                ? "bg-[#F97316] hover:bg-orange-600 text-white shadow-lg border border-orange-400/10"
                : "bg-yellow-600 hover:bg-yellow-700 text-white"
            )}
          >
            {isPremium ? <Plus className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
            Nový Súboj
            {!isPremium && (
              <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">
                <Crown className="w-3 h-3 mr-1" />
                PREMIUM
              </Badge>
            )}
          </Button>
        </header>

        {heroBattle && (
          <HeroBattleCard 
            battle={heroBattle} 
            onEnter={() => setLocation(`/diary/battles/${heroBattle.id}`)} 
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-8 space-y-8">
            {otherBattles.length > 0 && (
              <MobileSection title="Ďalšie aktívne súboje" icon={Clock} defaultOpen={true}>
                <div className="space-y-3">
                  {otherBattles.map((battle) => (
                    <BattleRow 
                      key={battle.id} 
                      battle={battle} 
                      onClick={() => setLocation(`/diary/battles/${battle.id}`)} 
                    />
                  ))}
                </div>
              </MobileSection>
            )}

            {activeBattles.length === 0 && (
              <div className="border-2 border-dashed border-border/60 rounded-2xl p-8 md:p-12 text-center bg-card/20">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6 text-muted-foreground">
                  <Swords size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 italic uppercase tracking-tight">
                  Žiadne aktívne súboje
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Je čas preveriť svoje rybárske zručnosti. Vyzvi svojich kamarátov!
                </p>
                <Button
                  onClick={() => setLocation(isPremium ? "/diary/battles/create" : "/diary/battles/paywall")}
                  className="rounded-xl bg-[#F97316] hover:bg-orange-600 text-white"
                >
                  {isPremium ? <Plus className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  Vytvoriť môj prvý Súboj
                </Button>
              </div>
            )}

            <MobileSection 
              title="Výzvy pre teba" 
              icon={Users} 
              defaultOpen={true}
              badge={invitations.length > 0 && (
                <Badge className="ml-2 bg-red-500/10 text-red-500 border-red-500/20 text-[9px]">
                  {invitations.length}
                </Badge>
              )}
            >
              <AnimatePresence mode="popLayout">
                {invitations.length > 0 ? (
                  <div className="space-y-3">
                    {invitations.map((invitation) => (
                      <motion.div
                        key={invitation.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 50 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 rounded-2xl border border-border bg-card/30"
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="w-10 h-10 border border-border">
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                              {getUserInitials(
                                invitation.invitedByUser?.firstName,
                                invitation.invitedByUser?.lastName,
                                invitation.invitedByUser?.email
                              )}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground mb-3">
                              <span className="font-bold">
                                {getUserDisplayName(
                                  invitation.invitedByUser?.firstName,
                                  invitation.invitedByUser?.lastName,
                                  invitation.invitedByUser?.email
                                )}
                              </span>
                              {' '}ťa vyzýva na súboj
                              {invitation.battle?.name && (
                                <span className="font-bold text-[#F97316]"> "{invitation.battle.name}"</span>
                              )}
                            </p>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => acceptInvitationMutation.mutate(invitation.id)}
                                disabled={acceptInvitationMutation.isPending || rejectInvitationMutation.isPending}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Prijať
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 rounded-xl"
                                onClick={() => rejectInvitationMutation.mutate(invitation.id)}
                                disabled={acceptInvitationMutation.isPending || rejectInvitationMutation.isPending}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Odmietnuť
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-border/60 rounded-2xl p-6 text-center bg-card/10">
                    <p className="text-sm text-muted-foreground mb-3">
                      Žiadne nové výzvy. Požiadaj kamarátov, nech ťa vyzvú!
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        toast({
                          title: "Ako funguje vyzývanie?",
                          description: "Vytvor nový súboj a pozvi do neho svojich kamarátov. Oni dostanú výzvu a môžu ju prijať alebo odmietnuť.",
                        });
                      }}
                    >
                      Ako funguje vyzývanie?
                    </Button>
                  </div>
                )}
              </AnimatePresence>
            </MobileSection>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-500/5 to-transparent border border-amber-500/20">
              <div className="text-center">
                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                  <Trophy size={24} className="text-amber-500" strokeWidth={1.75} />
                </div>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">
                  Sieň Slávy
                </h3>
                <div className="text-4xl font-mono font-bold text-amber-500 mb-1">
                  {hallOfFameStats.totalWins}
                </div>
                <p className="text-xs text-muted-foreground">
                  víťazstiev z {hallOfFameStats.totalBattles} súbojov
                </p>
                {hallOfFameStats.totalBattles > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Úspešnosť</span>
                      <span className="text-sm font-mono font-bold text-[#F97316]">
                        {Math.round((hallOfFameStats.totalWins / hallOfFameStats.totalBattles) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={(hallOfFameStats.totalWins / hallOfFameStats.totalBattles) * 100} 
                      className="h-1 mt-2" 
                    />
                  </div>
                )}
              </div>
            </div>

            <MobileSection title="História súbojov" icon={History} defaultOpen={true}>
              <div className="space-y-2">
                {archivedBattles.length > 0 ? (
                  <>
                    {archivedBattles.slice(0, 5).map((battle) => (
                      <HistoryBattleRow 
                        key={battle.id} 
                        battle={battle} 
                        onClick={() => setLocation(`/diary/battles/${battle.id}`)} 
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 rounded-xl"
                      onClick={() => setLocation("/diary/battles/archive")}
                    >
                      <History className="w-4 h-4 mr-2" />
                      Zobraziť celý archív
                      {archivedBattles.length > 5 && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {archivedBattles.length}
                        </Badge>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Zatiaľ žiadne dokončené súboje</p>
                  </div>
                )}
              </div>
            </MobileSection>
          </div>
        </div>
      </div>
    </DiaryLayout>
  );
}
