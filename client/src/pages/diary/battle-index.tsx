import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Trophy, Plus, Archive, Swords, Users, Clock, Crown, ArrowRight, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DiaryBattle } from "@shared/schema";

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

// Archived battle interface (static data)
interface ArchivedBattle {
  id: string;
  name: string;
  opponent: string;
  result: 'win' | 'loss';
}

// Mock data pre archív (statické pre prototyp)
const mockArchivedBattles: ArchivedBattle[] = [
  { id: '1', name: 'Víkend na Domaši', opponent: 'Peter M.', result: 'win' },
  { id: '2', name: 'Ranný súboj', opponent: 'Tomáš K.', result: 'loss' },
  { id: '3', name: 'Večerný duel', opponent: 'Martin D.', result: 'win' },
];

// Mock data pre sieň slávy (statické pre prototyp)
const mockHallOfFame = {
  totalWins: 12,
  totalBattles: 18,
};

// Helper function to calculate time remaining
const getTimeRemaining = (endDate: Date | string): string => {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return 'Skončený';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

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
  
  // Local state for managing invitations (will be removed when accepted/rejected)
  const [localInvitations, setLocalInvitations] = useState<BattleInvitation[]>([]);

  const { data: premiumStatus, isLoading: isPremiumLoading } = useQuery<{ isPremium: boolean }>({
    queryKey: ['/api/auth/premium-status'],
    enabled: !!user?.id,
  });

  const isPremium = premiumStatus?.isPremium;

  // Fetch user's battles
  const { data: battles = [], isLoading: isBattlesLoading } = useQuery<DiaryBattle[]>({
    queryKey: ['/api/diary/battles'],
    enabled: !!user && isPremium === true,
  });

  // Fetch battle invitations
  const { data: invitations = [] } = useQuery<BattleInvitation[]>({
    queryKey: ['/api/diary/battles/invitations'],
    enabled: !!user && isPremium === true,
  });

  // Update local invitations when data is fetched
  useEffect(() => {
    if (invitations) {
      setLocalInvitations(invitations);
    }
  }, [invitations]);

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest(`/api/diary/battles/invitations/${invitationId}/accept`, {
        method: 'POST',
      });
    },
    onSuccess: (_, invitationId) => {
      // Remove invitation from local state
      setLocalInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
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
      return await apiRequest(`/api/diary/battles/invitations/${invitationId}/reject`, {
        method: 'POST',
      });
    },
    onSuccess: (_, invitationId) => {
      // Remove invitation from local state
      setLocalInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
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

  // Redirect non-premium users to paywall
  useEffect(() => {
    if (user?.id && !isPremiumLoading && isPremium === false) {
      setLocation('/diary/battle/paywall');
    }
  }, [user?.id, isPremium, isPremiumLoading, setLocation]);

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
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Swords className="w-8 h-8 text-primary" />
                  <h1 className="text-3xl font-bold text-foreground" data-testid="heading-fishing-battle">
                    Fishing Battle
                  </h1>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    <Crown className="w-4 h-4 mr-1" />
                    PREMIUM
                  </Badge>
                </div>
                <p className="text-muted-foreground text-lg" data-testid="text-battle-description">
                  Súťažte s kamarátmi v priateľských rybárskych dueloch a zistite, kto je najlepší rybár!
                </p>
              </div>
              
              <Button
                size="lg"
                onClick={() => setLocation("/diary/battle/create")}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-create-new-battle"
              >
                <Plus className="w-5 h-5 mr-2" />
                Vytvoriť Nový Súboj
              </Button>
            </div>
          </div>

          {/* Main Grid Layout: 3 columns (2+1) */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left Block (2 columns) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Section: Moje Aktuálne Súboje */}
              <Card style={{ backgroundColor: '#012a36', borderColor: '#1e3a5f' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Moje Aktuálne Súboje
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeBattles.length > 0 ? (
                    activeBattles.map((battle, index) => {
                      const progress = 45 + (index * 15); // Mock progress
                      const position = index + 2; // Mock position
                      
                      return (
                        <div
                          key={battle.id}
                          className="p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
                          style={{ backgroundColor: '#0c1f28' }}
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
                              <Badge variant="outline" className="text-xs" data-testid={`badge-time-remaining-${battle.id}`}>
                                <Clock className="w-3 h-3 mr-1" />
                                {getTimeRemaining(battle.endAt)}
                              </Badge>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground" data-testid={`text-battle-progress-${battle.id}`}>
                                  Tvoj Progres ({position}. miesto)
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
                              onClick={() => setLocation(`/diary/battle/${battle.id}`)}
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
                    <div className="text-center py-8" data-testid="empty-active-battles">
                      <Swords className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground">Žiadne aktívne súboje</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section: Výzvy pre Teba */}
              <Card style={{ backgroundColor: '#012a36', borderColor: '#1e3a5f' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Users className="w-5 h-5 text-blue-500" />
                    Výzvy pre Teba
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {localInvitations.length > 0 ? (
                    localInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="p-4 rounded-lg border border-border/50"
                        style={{ backgroundColor: '#0c1f28' }}
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
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8" data-testid="empty-invitations">
                      <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground">Žiadne nové výzvy</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Block (1 column) */}
            <div className="space-y-6">
              
              {/* Section: Archív Súbojov */}
              <Card style={{ backgroundColor: '#012a36', borderColor: '#1e3a5f' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Archive className="w-5 h-5 text-purple-500" />
                    Archív Súbojov
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {mockArchivedBattles.map((battle) => (
                      <div
                        key={battle.id}
                        className="p-3 rounded-lg border border-border/50"
                        style={{ backgroundColor: '#0c1f28' }}
                        data-testid={`card-archived-battle-${battle.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate" data-testid={`text-archived-name-${battle.id}`}>
                              {battle.name}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-archived-opponent-${battle.id}`}>
                              vs {battle.opponent}
                            </p>
                          </div>
                          <Badge
                            variant={battle.result === 'win' ? 'default' : 'secondary'}
                            className={
                              battle.result === 'win'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }
                            data-testid={`badge-result-${battle.id}`}
                          >
                            {battle.result === 'win' ? 'Víťazstvo' : 'Prehra'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setLocation("/diary/battle/archive")}
                    data-testid="button-view-full-archive"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Zobraziť celý archív
                  </Button>
                </CardContent>
              </Card>

              {/* Section: Sieň Slávy */}
              <Card 
                className="bg-gradient-to-br from-yellow-500/10 to-amber-600/10 border-yellow-500/30"
                style={{ borderColor: '#f59e0b' }}
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-1" data-testid="heading-hall-of-fame">
                      Sieň Slávy
                    </h3>
                    <div className="text-3xl font-bold text-yellow-500 mb-2" data-testid="text-total-wins">
                      {mockHallOfFame.totalWins}
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-hall-description">
                      Celkový počet vyhratých súbojov
                    </p>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground" data-testid="text-success-rate">
                        Úspešnosť: {Math.round((mockHallOfFame.totalWins / mockHallOfFame.totalBattles) * 100)}%
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
