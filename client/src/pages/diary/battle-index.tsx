import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Trophy, Plus, Archive, Swords, Users, Clock, Crown, ArrowRight, Check, X, Bell, UserPlus, Lock } from "lucide-react";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DiaryBattle } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

// Battle Invitation interface
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

// Archived battle interface (from API)
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

// Helper function to calculate time remaining
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

// Helper function to calculate battle progress (% of time elapsed)
const getBattleProgress = (startDate: Date | string | null | undefined, endDate: Date | string | null | undefined): number => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  // Validate dates
  if (isNaN(start) || isNaN(end) || end <= start) return 0;
  
  const now = Date.now();
  
  if (now <= start) return 0;
  if (now >= end) return 100;
  
  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
};

// Countdown Timer Component for battles ending in < 24h
function CountdownTimer({ endDate }: { endDate: Date | string }) {
  const [display, setDisplay] = useState<{ type: 'countdown' | 'ended' | 'hidden'; hours?: number; minutes?: number; seconds?: number }>({ type: 'hidden' });
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endDate).getTime();
      const now = Date.now();
      const diff = end - now;
      
      // Battle ended
      if (diff <= 0) {
        setDisplay({ type: 'ended' });
        return;
      }
      
      // More than 24 hours - don't show countdown
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

// Helper function to get user initials
const getUserInitials = (firstName?: string | null, lastName?: string | null, email?: string): string => {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'U';
};

// Helper function to get user display name
const getUserDisplayName = (firstName?: string | null, lastName?: string | null, email?: string): string => {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  return email || 'Používateľ';
};

export default function BattleIndex() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Force re-render every 30 seconds to update time-based UI (countdown, progress)
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

  // Fetch user's battles (enabled for all users - FREE users can be invited to battles)
  const { data: battles = [], isLoading: isBattlesLoading } = useQuery<DiaryBattle[]>({
    queryKey: ['/api/diary/battles'],
    enabled: !!user,
  });

  // Fetch battle invitations (FREE users can receive invitations)
  const { data: invitations = [], isLoading: isInvitationsLoading } = useQuery<BattleInvitation[]>({
    queryKey: ['/api/diary/battles/invitations'],
    enabled: !!user,
  });

  // Redirect FREE users to paywall if they have no battles and no invitations
  useEffect(() => {
    // Wait for all data to load
    if (isPremiumLoading || isBattlesLoading || isInvitationsLoading) return;
    
    // Premium users can always access
    if (isPremium) return;
    
    // FREE users can access if they have battles (were invited) or have pending invitations
    const hasBattles = battles.length > 0;
    const hasInvitations = invitations.length > 0;
    
    if (!hasBattles && !hasInvitations) {
      setLocation('/diary/battles/paywall');
    }
  }, [isPremium, isPremiumLoading, battles, isBattlesLoading, invitations, isInvitationsLoading, setLocation]);

  // Fetch archived battles (FREE users can view their battle history)
  const { data: archivedBattles = [] } = useQuery<ArchivedBattle[]>({
    queryKey: ['/api/diary/battles/archive'],
    enabled: !!user,
  });

  // Calculate Hall of Fame stats from archived battles
  const hallOfFameStats = {
    totalWins: archivedBattles.filter(b => b.userPosition === 1).length,
    totalBattles: archivedBattles.length,
  };

  // Force refresh data on mount to clear stale cache (for all users)
  useEffect(() => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/archive'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
    }
  }, [user]);

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await apiRequest('POST', `/api/diary/battles/invitations/${invitationId}/accept`);
      // Check response and throw on failure so onError handles it
      if (!response.ok) {
        throw new Error('Failed to accept invitation');
      }
      return invitationId;
    },
    onSuccess: (invitationId) => {      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      
      toast({
        title: "Výzva prijatá",
        description: "Úspešne ste prijali výzvu na súboj!",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa prijať výzvu",
        variant: "destructive",
      });
    },
  });

  // Reject invitation mutation
  const rejectInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await apiRequest('POST', `/api/diary/battles/invitations/${invitationId}/reject`);
      // Check response and throw on failure so onError handles it
      if (!response.ok) {
        throw new Error('Failed to reject invitation');
      }
      return invitationId;
    },
    onSuccess: () => {      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      
      toast({
        title: "Výzva odmietnutá",
        description: "Výzva bola úspešne odmietnutá",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odmietnuť výzvu",
        variant: "destructive",
      });
    },
  });

  // Show loading state
  if (!user || isPremiumLoading || isPremium === undefined || isBattlesLoading) {
    return (
      <DiaryLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Načítavam...</p>
          </div>
        </div>
      </DiaryLayout>
    );
  }

  // Filter active battles only
  const activeBattles = battles.filter(b => b.status === 'active');

  return (
    <DiaryLayout>
      <div className="p-3 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              <div>
                <div className="flex items-center gap-3 md:gap-4 mb-2">
                  <TacticalIcon icon={Swords} variant="rose" size="lg" showLabel={false} />
                  <h1 className="text-xl md:text-3xl font-bold text-foreground" data-testid="heading-fishing-battle">
                    Fishing Battle
                  </h1>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs md:text-sm">
                    <Crown className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    PREMIUM
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm md:text-lg" data-testid="text-battle-description">
                  Súťažte s kamarátmi v priateľských rybárskych dueloch a zistite, kto je najlepší rybár!
                </p>
              </div>
              
              <Button
                size="sm"
                onClick={() => setLocation(isPremium ? "/diary/battles/create" : "/diary/battle-paywall")}
                className={isPremium 
                  ? "bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
                  : "bg-yellow-600 hover:bg-yellow-700 text-white w-full md:w-auto"
                }
                data-testid="button-create-new-battle"
              >
                {isPremium ? (
                  <Plus className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
                ) : (
                  <Lock className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
                )}
                <span className="hidden sm:inline">Vytvoriť Nový Súboj</span>
                <span className="sm:hidden">Vytvoriť Súboj</span>
                {!isPremium && (
                  <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    PREMIUM
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Main Grid Layout: 3 columns (2+1) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            
            {/* Left Block (2 columns) */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              
              {/* Section: Moje Aktuálne Súboje */}
              <Card className="bg-card border-border">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-foreground text-base md:text-lg">
                    <TacticalIconInline icon={Clock} variant="indigo" size="md" />
                    Moje Aktuálne Súboje
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
                  {activeBattles.length > 0 ? (
                    activeBattles.map((battle) => {
                      const progress = getBattleProgress(battle.startAt, battle.endAt);
                      const end = new Date(battle.endAt).getTime();
                      const now = Date.now();
                      const isEndingSoon = (end - now) < 24 * 60 * 60 * 1000 && (end - now) > 0;
                      
                      return (
                        <div
                          key={battle.id}
                          className="p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors bg-muted/30"
                          data-testid={`card-active-battle-${battle.id}`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground mb-1" data-testid={`text-battle-name-${battle.id}`}>
                                  {battle.name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Users className="w-4 h-4" />
                                  <span data-testid={`text-battle-opponents-${battle.id}`}>
                                    {battle.participants.map(p => p.name).join(', ')}
                                  </span>
                                </div>
                              </div>
                              {isEndingSoon ? (
                                <CountdownTimer endDate={battle.endAt} />
                              ) : (
                                <Badge variant="outline" className="text-xs" data-testid={`badge-time-remaining-${battle.id}`}>
                                  <Clock className="w-3 h-3 mr-1" />
                                  {getTimeRemaining(battle.endAt)}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Progress Bar - % of time elapsed */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground" data-testid={`text-battle-progress-${battle.id}`}>
                                  Priebeh súboja
                                </span>
                                <span className="text-muted-foreground" data-testid={`text-battle-progress-percent-${battle.id}`}>
                                  {progress}%
                                </span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                            
                            {/* Detail Link */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-between text-primary hover:text-primary"
                              onClick={() => setLocation(`/diary/battles/${battle.id}`)}
                              data-testid={`button-view-detail-${battle.id}`}
                            >
                              Zobraziť detail
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div 
                      className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center bg-muted/20"
                      data-testid="empty-active-battles"
                    >
                      <div className="flex justify-center mb-4">
                        <TacticalIcon icon={UserPlus} variant="neutral" size="lg" showLabel={false} />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Žiadne aktívne súboje.
                      </h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Je čas preveriť svoje rybárske zručnosti. Vyzvite svojich kamarátov!
                      </p>
                      <Button
                        onClick={() => setLocation(isPremium ? "/diary/battles/create" : "/diary/battle-paywall")}
                        className={isPremium 
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-yellow-600 hover:bg-yellow-700 text-white"
                        }
                        data-testid="button-create-first-battle"
                      >
                        {isPremium ? (
                          <Plus className="w-4 h-4 mr-2" />
                        ) : (
                          <Lock className="w-4 h-4 mr-2" />
                        )}
                        Vytvoriť môj prvý Súboj
                        {!isPremium && (
                          <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">
                            <Crown className="w-3 h-3 mr-1" />
                            PREMIUM
                          </Badge>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section: Výzvy pre Teba */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <TacticalIconInline icon={Users} variant="orange" size="md" />
                    Výzvy pre Teba
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <AnimatePresence mode="popLayout">
                  {invitations.length > 0 ? (
                    invitations.map((invitation) => (
                      <motion.div
                        key={invitation.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 100 }}
                        transition={{ duration: 0.3 }}
                        className="p-4 rounded-lg border border-border/50 bg-muted/30"
                        data-testid={`card-invitation-${invitation.id}`}
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {getUserInitials(
                                invitation.invitedByUser?.firstName,
                                invitation.invitedByUser?.lastName,
                                invitation.invitedByUser?.email
                              )}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground mb-3" data-testid={`text-invitation-message-${invitation.id}`}>
                              <span className="font-semibold">
                                {getUserDisplayName(
                                  invitation.invitedByUser?.firstName,
                                  invitation.invitedByUser?.lastName,
                                  invitation.invitedByUser?.email
                                )}
                              </span>
                              {' '}ťa vyzval na súboj
                              {invitation.battle?.name && (
                                <span className="font-semibold"> "{invitation.battle.name}"</span>
                              )}
                            </p>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                onClick={() => acceptInvitationMutation.mutate(invitation.id)}
                                disabled={acceptInvitationMutation.isPending || rejectInvitationMutation.isPending}
                                data-testid={`button-accept-invitation-${invitation.id}`}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Prijať
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => rejectInvitationMutation.mutate(invitation.id)}
                                disabled={acceptInvitationMutation.isPending || rejectInvitationMutation.isPending}
                                data-testid={`button-reject-invitation-${invitation.id}`}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Odmietnuť
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div 
                      className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center bg-muted/20"
                      data-testid="empty-invitations"
                    >
                      <div className="flex justify-center mb-4">
                        <TacticalIcon icon={Bell} variant="neutral" size="lg" showLabel={false} />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Žiadne nové výzvy.
                      </h3>
                      <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                        Požiadajte kamarátov, nech vás vyzvú, alebo ich predbehnite a vytvorte súboj sami!
                      </p>
                      <Button
                        variant="link"
                        className="text-primary"
                        onClick={() => {
                          toast({
                            title: "Ako funguje vyzývanie?",
                            description: "Vytvorte nový súboj a pozvite do neho svojich kamarátov. Oni dostanú výzvu a môžu ju prijať alebo odmietnuť.",
                          });
                        }}
                        data-testid="link-learn-challenges"
                      >
                        Naučte sa, ako funguje vyzývanie.
                      </Button>
                    </div>
                  )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>

            {/* Right Block (1 column) */}
            <div className="space-y-6">
              
              {/* Section: Archív Súbojov */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Archive className="w-5 h-5 text-purple-500" />
                    Archív Súbojov
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {archivedBattles.length > 0 ? (
                      archivedBattles.slice(0, 3).map((battle) => (
                        <div
                          key={battle.id}
                          className="p-3 rounded-lg border border-border/50 bg-muted/30"
                          data-testid={`card-archived-battle-${battle.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate" data-testid={`text-archived-name-${battle.id}`}>
                                {battle.name}
                              </p>
                              <p className="text-xs text-muted-foreground" data-testid={`text-archived-opponent-${battle.id}`}>
                                {battle.participantCount} účastníkov
                              </p>
                            </div>
                            <Badge
                              variant={battle.userPosition === 1 ? 'default' : 'secondary'}
                              className={
                                battle.userPosition === 1
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-muted text-muted-foreground'
                              }
                              data-testid={`badge-result-${battle.id}`}
                            >
                              {battle.userPosition === 1 ? 'Víťazstvo' : `${battle.userPosition}. miesto`}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Archive className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Zatiaľ žiadne dokončené súboje</p>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setLocation("/diary/battles/archive")}
                    data-testid="button-view-full-archive"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Zobraziť celý archív
                  </Button>
                </CardContent>
              </Card>

              {/* Section: Sieň Slávy */}
              <Card className="bg-yellow-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-yellow-500/10 dark:to-amber-600/10 border-yellow-500/30">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <TacticalIcon icon={Trophy} variant="action" size="lg" showLabel={false} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-1" data-testid="heading-hall-of-fame">
                      Sieň Slávy
                    </h3>
                    <div className="text-3xl font-bold text-yellow-500 mb-2" data-testid="text-total-wins">
                      {hallOfFameStats.totalWins}
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-hall-description">
                      Celkový počet vyhratých súbojov
                    </p>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground" data-testid="text-success-rate">
                        Úspešnosť: {hallOfFameStats.totalBattles > 0 ? Math.round((hallOfFameStats.totalWins / hallOfFameStats.totalBattles) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DiaryLayout>
  );
}
