import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Plus, AlertCircle, Clock, Fish, CheckCircle2, Medal } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import DiaryLayout from "@/components/DiaryLayout";
import type { DiaryBattle, DiaryCatch } from "@shared/schema";

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

const getFishTypeLabel = (fishType: string) => {
  const fishTypes: Record<string, string> = {
    'carp': 'Kapor',
    'pike': 'Šťuka',
    'catfish': 'Sumec',
    'zander': 'Zubáč',
    'perch': 'Ostriež',
    'bream': 'Pleskáč',
    'other': 'Iné'
  };
  return fishTypes[fishType] || fishType;
};

export default function BattleDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [battle, setBattle] = useState<DiaryBattle | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // WebSocket connection for live updates
  useWebSocket((message: WebSocketMessage) => {
    if (message.type === "battle_update" && message.battleId === id) {
      setBattle(current => {
        if (!current) return null;
        const updatedData = { ...current, ...message.data };
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
  const { data: battleData, isLoading: battleLoading } = useQuery<DiaryBattle>({
    queryKey: ['/api/diary/battles', id],
    enabled: !!id && !!user,
  });

  // Load battle catches
  const { data: catches = [], isLoading: catchesLoading } = useQuery<DiaryCatch[]>({
    queryKey: ['/api/diary/battles', id, 'catches'],
    enabled: !!id && !!user && !!battle,
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (battleData) {
      setBattle({
        ...battleData,
        startAt: new Date(battleData.startAt),
        endAt: new Date(battleData.endAt),
      });
    }
  }, [battleData]);

  // Update time remaining
  useEffect(() => {
    if (!battle) return;

    const updateTime = () => {
      const now = new Date();
      const end = battle.endAt;
      
      if (now > end) {
        setTimeRemaining("Skončený");
      } else {
        const diff = end.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [battle]);

  // Calculate leaderboard data
  const leaderboardData = battle ? battle.participants.map(participant => {
    const participantCatches = catches.filter(c => 
      c.angler.userId === participant.userId || c.angler.name === participant.name
    );

    let score = 0;
    switch (battle.rules.mode) {
      case "most_fish":
        score = participantCatches.length;
        break;
      case "total_weight":
        score = participantCatches.reduce((sum, c) => sum + parseFloat(c.weight), 0);
        break;
      case "biggest_fish":
        score = participantCatches.length > 0 
          ? Math.max(...participantCatches.map(c => parseFloat(c.weight))) 
          : 0;
        break;
      case "best_3_fish":
        const top3 = participantCatches
          .map(c => parseFloat(c.weight))
          .sort((a, b) => b - a)
          .slice(0, 3);
        score = top3.reduce((sum, w) => sum + w, 0);
        break;
      case "best_5_fish":
        const top5 = participantCatches
          .map(c => parseFloat(c.weight))
          .sort((a, b) => b - a)
          .slice(0, 5);
        score = top5.reduce((sum, w) => sum + w, 0);
        break;
    }

    return {
      participant,
      score,
      catchCount: participantCatches.length
    };
  }).sort((a, b) => b.score - a.score) : [];

  const topScore = leaderboardData[0]?.score || 1;

  // Get biggest catch
  const biggestCatch = catches.length > 0 
    ? catches.reduce((max, c) => parseFloat(c.weight) > parseFloat(max.weight) ? c : c) 
    : null;

  if (battleLoading || catchesLoading) {
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
            <Button onClick={() => setLocation("/diary/battle")} data-testid="button-back-to-battles">
              Späť na battles
            </Button>
          </div>
        </div>
      </DiaryLayout>
    );
  }

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {battle.name}
              </h1>
              <p className="text-muted-foreground">
                {getModeLabel(battle.rules.mode)}
              </p>
            </div>
            <Button 
              onClick={() => setLocation(`/diary/catches/new?battleId=${id}`)}
              className="gap-2"
              data-testid="button-add-catch"
            >
              <Plus className="w-4 h-4" />
              Pridať úlovok
            </Button>
          </div>

          {/* Three Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Section (2 columns) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Priebežné Poradie
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {leaderboardData.map((entry, index) => {
                    const isCurrentUser = entry.participant.userId === user?.id;
                    const isLeader = index === 0;
                    const progressPercent = (entry.score / topScore) * 100;

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border transition-colors ${
                          isCurrentUser 
                            ? "border-primary bg-primary/5" 
                            : isLeader
                            ? "border-yellow-500/50 bg-yellow-500/5"
                            : "border-border bg-muted/30"
                        }`}
                        data-testid={`leaderboard-${index}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`text-2xl font-bold ${isLeader ? "text-yellow-500" : "text-muted-foreground"}`}>
                            #{index + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{entry.participant.name}</span>
                                {isCurrentUser && <Badge variant="outline">Vy</Badge>}
                                {isLeader && <Medal className="w-4 h-4 text-yellow-500" />}
                              </div>
                              <div className="text-lg font-bold">
                                {entry.score.toFixed(1)} {battle.rules.mode === "most_fish" ? "ks" : "kg"}
                              </div>
                            </div>
                            <div className="relative">
                              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${
                                    isLeader ? "bg-yellow-500" : "bg-primary"
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entry.catchCount} {entry.catchCount === 1 ? "úlovok" : "úlovkov"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Live Feed of Catches */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fish className="w-5 h-5" />
                    Live Feed Úlovkov
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {catches.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Zatiaľ žiadne úlovky
                      </p>
                    ) : (
                      catches.slice(0, 10).map((catch_) => (
                        <div 
                          key={catch_.id}
                          className="flex gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                          data-testid={`catch-${catch_.id}`}
                        >
                          {/* Photo */}
                          {catch_.photos && catch_.photos.length > 0 ? (
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                              <img 
                                src={typeof catch_.photos[0] === 'string' ? catch_.photos[0] : catch_.photos[0].url}
                                alt={getFishTypeLabel(catch_.fishType)}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <Fish className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-medium text-sm">
                                  {getFishTypeLabel(catch_.fishType)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {catch_.angler.name}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-primary">
                                  {parseFloat(catch_.weight).toFixed(1)} kg
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(catch_.capturedAt), { addSuffix: true, locale: sk })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Section (1 column) - Highlights */}
            <div className="space-y-6">
              {/* Time Remaining */}
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Clock className="w-5 h-5" />
                    Zostáva do Konca
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">
                      {timeRemaining}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Koniec: {format(battle.endAt, "HH:mm", { locale: sk })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Highlight Súboja */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Highlight Súboja
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {biggestCatch ? (
                    <div className="space-y-3">
                      {biggestCatch.photos && biggestCatch.photos.length > 0 && (
                        <div className="w-full h-40 rounded-lg overflow-hidden">
                          <img 
                            src={typeof biggestCatch.photos[0] === 'string' ? biggestCatch.photos[0] : biggestCatch.photos[0].url}
                            alt="Najväčšia ryba"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {parseFloat(biggestCatch.weight).toFixed(1)} kg
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getFishTypeLabel(biggestCatch.fishType)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Chytil: {biggestCatch.angler.name}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      Zatiaľ žiadne úlovky
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Pravidlá Súboja */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Pravidlá Súboja
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div>
                      <div className="font-medium">Herný mód</div>
                      <div className="text-sm text-muted-foreground">
                        {getModeLabel(battle.rules.mode)}
                      </div>
                    </div>
                  </div>
                  {battle.rules.minWeightKg && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                      <div>
                        <div className="font-medium">Minimálna váha</div>
                        <div className="text-sm text-muted-foreground">
                          {battle.rules.minWeightKg} kg
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div>
                      <div className="font-medium">Účastníci</div>
                      <div className="text-sm text-muted-foreground">
                        {battle.participants.length} rybárov
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div>
                      <div className="font-medium">Trvanie</div>
                      <div className="text-sm text-muted-foreground">
                        {format(battle.startAt, "HH:mm", { locale: sk })} - {format(battle.endAt, "HH:mm", { locale: sk })}
                      </div>
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
