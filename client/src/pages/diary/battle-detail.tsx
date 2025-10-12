import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Trophy, Users, Calendar, Clock, Fish, Weight, Plus, AlertCircle, Download, Share2, BarChart3, UserCheck, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import DiaryLayout from "@/components/DiaryLayout";
import type { DiaryBattle } from "@shared/schema";

interface BattleInvitation {
  id: string;
  battleId: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  invitedUser?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

// WebSocket message interface
interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

const getModeLabel = (mode: string) => {
  switch (mode) {
    case "most_fish": return "Najviac rýb";
    case "total_weight": return "Celková váha";
    case "biggest_fish": return "Najväčšia ryba";
    case "best_3_fish": return "Top 3 ryby";
    case "best_5_fish": return "Top 5 rýb";
    default: return mode;
  }
};

const getModeIcon = (mode: string) => {
  switch (mode) {
    case "most_fish": return Fish;
    case "total_weight": return Weight;
    case "biggest_fish": return Trophy;
    case "best_3_fish": 
    case "best_5_fish": return BarChart3;
    default: return Trophy;
  }
};

export default function BattleDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [battle, setBattle] = useState<DiaryBattle | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  // WebSocket connection for live updates
  const { isConnected, sendMessage } = useWebSocket((message: WebSocketMessage) => {
    if (message.type === "battle_update" && message.battleId === id) {
      // Update battle data based on WebSocket message and deserialize dates
      setBattle(current => {
        if (!current) return null;
        const updatedData = { ...current, ...message.data };
        // Ensure dates are Date objects if they exist in the update
        if (updatedData.startAt && !(updatedData.startAt instanceof Date)) {
          updatedData.startAt = new Date(updatedData.startAt);
        }
        if (updatedData.endAt && !(updatedData.endAt instanceof Date)) {
          updatedData.endAt = new Date(updatedData.endAt);
        }
        return updatedData;
      });
    }
  });

  // Load battle data from API
  const { data: battleData, isLoading } = useQuery<DiaryBattle>({
    queryKey: ['/api/diary/battles', id],
    enabled: !!id && !!user,
  });

  // Load battle invitations
  const { data: allInvitations = [] } = useQuery<BattleInvitation[]>({
    queryKey: ['/api/diary/battles/invitations'],
    enabled: !!user,
  });

  // Filter invitations for this battle
  const battleInvitations = allInvitations.filter(inv => inv.battleId === id);

  // Update local state when data is loaded and deserialize dates
  useEffect(() => {
    if (battleData) {
      setBattle({
        ...battleData,
        startAt: new Date(battleData.startAt),
        endAt: new Date(battleData.endAt),
      });
    }
  }, [battleData]);

  // Update time remaining and progress
  useEffect(() => {
    if (!battle) return;

    const updateTimeAndProgress = () => {
      const now = new Date();
      const start = battle.startAt;
      const end = battle.endAt;
      const total = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      
      // Calculate progress (0-100%)
      const progressValue = Math.max(0, Math.min(100, (elapsed / total) * 100));
      setProgress(progressValue);

      // Calculate time remaining
      if (now < start) {
        const diff = start.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`Začína za ${hours}h ${minutes}m`);
      } else if (now > end) {
        setTimeRemaining("Skončený");
      } else {
        const diff = end.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`Zostáva ${hours}h ${minutes}m`);
      }
    };

    updateTimeAndProgress();
    const interval = setInterval(updateTimeAndProgress, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [battle]);

  if (isLoading) {
    return (
      <DiaryLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Načítavam battle...</p>
          </div>
        </div>
      </DiaryLayout>
    );
  }

  if (!battle) {
    return (
      <DiaryLayout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Battle sa nenašiel</h2>
            <p className="text-muted-foreground mb-6">
              Zadané battle neexistuje alebo k nemu nemáte prístup.
            </p>
            <Button onClick={() => setLocation("/diary/battle")} data-testid="button-back-to-battles">
              Späť na battles
            </Button>
          </div>
        </div>
      </DiaryLayout>
    );
  }

  const ModeIcon = getModeIcon(battle.rules.mode);

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                {battle.name}
              </h1>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                PREMIUM
              </Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <ModeIcon className="w-4 h-4" />
                <span>{getModeLabel(battle.rules.mode)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{battle.participants.length} účastníkov</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(battle.startAt, "d. MMMM", { locale: sk })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className={battle.status === "active" ? "text-green-600 font-medium" : ""}>
                  {timeRemaining}
                </span>
              </div>
              {isConnected && (
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Živé aktualizácie</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Battle Progress & Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Stav súboja
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant={battle.status === "active" ? "default" : "secondary"}>
                    {battle.status === "active" ? "Aktívny" : battle.status === "finished" ? "Skončený" : "Nadchádzajúci"}
                  </Badge>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Začiatok</span>
                    <span>Koniec</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{format(battle.startAt, "HH:mm")}</span>
                    <span>{format(battle.endAt, "HH:mm")}</span>
                  </div>
                </div>

                {/* Battle Mode Info */}
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Herný mód
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {getModeLabel(battle.rules.mode)}
                  </p>
                  {battle.rules.minWeightKg && (
                    <p className="text-sm text-muted-foreground">
                      Minimálna váha: {battle.rules.minWeightKg} kg
                    </p>
                  )}
                </div>

                {/* Add Catch Button */}
                {battle.status === "active" && (
                  <Button 
                    className="w-full" 
                    onClick={() => setLocation(`/diary/battle/${id}/add-catch`)}
                    data-testid="button-add-catch"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Pridať úlovok
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Účastníci
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Accepted Participants */}
                  {battle.participants.map((participant, index) => {
                    const isCurrentUser = participant.userId === user?.id;
                    
                    return (
                      <div 
                        key={index}
                        className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                          isCurrentUser 
                            ? "border-primary bg-primary/5 dark:bg-primary/10" 
                            : "border-border bg-muted/30"
                        }`}
                        data-testid={`participant-${participant.userId}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {participant.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-foreground truncate">
                                {participant.name}
                                {isCurrentUser && (
                                  <span className="text-primary ml-2 text-sm">(Vy)</span>
                                )}
                              </div>
                              <Badge variant="outline" className="border-green-600/50 bg-green-600/10 text-green-600 dark:border-green-500/50 dark:bg-green-500/10 dark:text-green-400 flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                Prijatý
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Pending Invitations */}
                  {battleInvitations.filter(inv => inv.status === 'pending').map((invitation) => {
                    const getInvitedUserName = () => {
                      if (!invitation.invitedUser) return 'Používateľ';
                      if (invitation.invitedUser.firstName || invitation.invitedUser.lastName) {
                        return `${invitation.invitedUser.firstName || ''} ${invitation.invitedUser.lastName || ''}`.trim();
                      }
                      return invitation.invitedUser.email;
                    };
                    
                    return (
                      <div 
                        key={invitation.id}
                        className="flex items-center gap-3 p-4 rounded-lg border border-orange-600/30 bg-orange-600/5 dark:border-orange-500/30 dark:bg-orange-500/5"
                        data-testid={`pending-invitation-${invitation.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full bg-orange-600/20 dark:bg-orange-500/20 flex items-center justify-center">
                            <span className="text-orange-600 dark:text-orange-400 font-semibold">
                              {getInvitedUserName().charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-foreground truncate">
                                {getInvitedUserName()}
                              </div>
                              <Badge variant="outline" className="border-orange-600/50 bg-orange-600/10 text-orange-600 dark:border-orange-500/50 dark:bg-orange-500/10 dark:text-orange-400 flex items-center gap-1">
                                <UserPlus className="w-3 h-3" />
                                Čaká na odpoveď
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <Trophy className="w-4 h-4 inline mr-1" />
                    Štatistiky a rebríček budú dostupné po pridaní úlovkov
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Akcie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button 
                  variant="outline"
                  onClick={() => {/* TODO: Export functionality */}}
                  data-testid="button-export-results"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportovať výsledky
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {/* TODO: Share functionality */}}
                  data-testid="button-share-battle"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Zdieľať battle
                </Button>
                {battle.status === "finished" && (
                  <Button 
                    variant="outline"
                    onClick={() => setLocation(`/diary/battle/${id}/archive`)}
                    data-testid="button-view-archive"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Zobraziť v archíve
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DiaryLayout>
  );
}