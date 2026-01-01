import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trophy, Plus, AlertCircle, Clock, Fish, CheckCircle2, Medal, Flag, BarChart3, TrendingUp, Award, QrCode, Swords } from "lucide-react";
import { QRShareDialog } from "@/components/QRShareDialog";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { format, formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DiaryLayout from "@/components/DiaryLayout";
import CatchFormDialog from "@/components/diary/CatchFormDialog";
import { BattleVictoryModal, type BattleVictoryStats } from "@/components/diary/BattleVictoryModal";
import type { DiaryBattle, DiaryCatch, DiaryTrip } from "@shared/schema";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

// Extended battle type to include isOwner flag from backend
type DiaryBattleExtended = DiaryBattle & { isOwner?: boolean };

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

export default function BattleDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [battle, setBattle] = useState<DiaryBattleExtended | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isAddCatchDialogOpen, setIsAddCatchDialogOpen] = useState(false);
  const [showEndBattleDialog, setShowEndBattleDialog] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);

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
  const { data: battleData, isLoading: battleLoading } = useQuery<DiaryBattleExtended>({
    queryKey: ['/api/diary/battles', id],
    enabled: !!id && !!user,
  });

  // Load battle catches
  const { data: catches = [], isLoading: catchesLoading } = useQuery<DiaryCatch[]>({
    queryKey: ['/api/diary/battles', id, 'catches'],
    enabled: !!id && !!user && !!battle,
  });

  // Load victory stats for finished battles
  const { data: victoryStats } = useQuery<BattleVictoryStats & { isWinner: boolean }>({
    queryKey: ['/api/diary/battles', id, 'victory-stats'],
    enabled: !!id && !!user && battle?.status === 'finished',
  });

  // Show victory modal automatically for winner on first visit
  useEffect(() => {
    if (victoryStats?.isWinner && id) {
      const seenKey = `battle-victory-seen-${id}`;
      const hasSeen = localStorage.getItem(seenKey);
      
      if (!hasSeen) {
        setShowVictoryModal(true);
        localStorage.setItem(seenKey, 'true');
      }
    }
  }, [victoryStats, id]);

  // End battle mutation
  const endBattleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", `/api/diary/battles/${id}`, {
        status: "finished"
      });
    },
    onSuccess: () => {
      // Update local battle state immediately
      setBattle(prev => prev ? { ...prev, status: "finished" } : null);
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles', id, 'catches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/archive'] });
      
      toast({
        title: "Battle ukončený!",
        description: "Battle bol úspešne ukončený a presunutý do archívu.",
      });
      setShowEndBattleDialog(false);
      setLocation("/diary/battles/archive");
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa ukončiť battle",
        variant: "destructive",
      });
    }
  });

  const canEndBattle = battle?.isOwner && battle?.status === "active";

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

    // Filter catches by minimum weight if specified
    const validCatches = battle.rules.minWeightKg 
      ? participantCatches.filter(c => parseFloat(c.weight) >= battle.rules.minWeightKg!)
      : participantCatches;

    let score = 0;
    switch (battle.rules.mode) {
      case "most_fish":
        score = validCatches.length;
        break;
      case "total_weight":
        score = validCatches.reduce((sum, c) => sum + parseFloat(c.weight), 0);
        break;
      case "biggest_fish":
        score = validCatches.length > 0 
          ? Math.max(...validCatches.map(c => parseFloat(c.weight))) 
          : 0;
        break;
      case "best_3_fish":
        const top3 = validCatches
          .map(c => parseFloat(c.weight))
          .sort((a, b) => b - a)
          .slice(0, 3);
        score = top3.reduce((sum, w) => sum + w, 0);
        break;
      case "best_5_fish":
        const top5 = validCatches
          .map(c => parseFloat(c.weight))
          .sort((a, b) => b - a)
          .slice(0, 5);
        score = top5.reduce((sum, w) => sum + w, 0);
        break;
    }

    return {
      participant,
      score,
      catchCount: validCatches.length
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
            <Button onClick={() => setLocation("/diary/battles")} data-testid="button-back-to-battles">
              Späť na battles
            </Button>
          </div>
        </div>
      </DiaryLayout>
    );
  }

  return (
    <DiaryLayout>
      {/* Victory Modal for winner */}
      {showVictoryModal && victoryStats && (
        <BattleVictoryModal 
          stats={victoryStats}
          onClose={() => setShowVictoryModal(false)}
        />
      )}

      <div className="p-3 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">
                {battle.name}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {getModeLabel(battle.rules.mode)}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <QRShareDialog 
                type="battle" 
                id={id || ""} 
                name={battle.name}
                trigger={
                  <Button size="sm" variant="outline" data-testid="button-qr-battle">
                    <QrCode className="w-4 h-4" />
                  </Button>
                }
              />
              <Button 
                onClick={() => setIsAddCatchDialogOpen(true)}
                size="sm"
                className="gap-2 flex-1 sm:flex-none"
                data-testid="button-add-catch"
              >
                <Plus className="w-4 h-4" />
                Pridať úlovok
              </Button>
              {canEndBattle && (
                <Button
                  onClick={() => setShowEndBattleDialog(true)}
                  size="sm"
                  variant="destructive"
                  className="gap-2 flex-1 sm:flex-none"
                  data-testid="button-end-battle"
                >
                  <Flag className="w-4 h-4" />
                  Ukončiť Battle
                </Button>
              )}
            </div>
          </div>

          {/* Three Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Left Section (2 columns) */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Leaderboard */}
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <TacticalIconInline icon={Trophy} variant="amber" size="md" />
                    Priebežné Poradie
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 md:space-y-3 p-4 md:p-6 pt-0">
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
                                {battle?.rules.mode === "most_fish" ? entry.score.toFixed(0) : entry.score.toFixed(1)} {battle?.rules.mode === "most_fish" ? "ks" : "kg"}
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

              {/* Score Comparison Chart (only for finished battles) */}
              {battle.status === "finished" && leaderboardData.length > 0 && (
                <Card>
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <TacticalIconInline icon={BarChart3} variant="orange" size="md" />
                      Porovnanie Výsledkov
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={leaderboardData.map((entry, index) => ({
                        name: entry.participant.name,
                        score: entry.score,
                        position: index + 1
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ 
                            value: battle?.rules.mode === "most_fish" ? "Počet rýb" : "Váha (kg)", 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { fontSize: 12 }
                          }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => {
                            const unit = battle?.rules.mode === "most_fish" ? "ks" : "kg";
                            const formatted = battle?.rules.mode === "most_fish" 
                              ? value.toFixed(0) 
                              : value.toFixed(1);
                            return [`${formatted} ${unit}`, 'Výsledok'];
                          }}
                        />
                        <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                          {leaderboardData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`}
                              fill={
                                entry.participant.userId === user?.id 
                                  ? 'hsl(var(--primary))' 
                                  : index === 0 
                                  ? '#eab308' 
                                  : '#94a3b8'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Fish Types Distribution (only for finished battles with catches) */}
              {battle.status === "finished" && catches.length > 0 && (
                <Card>
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <TacticalIconInline icon={Fish} variant="cyan" size="md" />
                      Rozdelenie Druhov Rýb
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    {(() => {
                      const fishTypeData = catches.reduce((acc, c) => {
                        const type = getFishTypeLabel(c.fishType);
                        if (!acc[type]) {
                          acc[type] = { name: type, value: 0, weight: 0 };
                        }
                        acc[type].value += 1;
                        acc[type].weight += parseFloat(c.weight);
                        return acc;
                      }, {} as Record<string, { name: string; value: number; weight: number }>);

                      const chartData = Object.values(fishTypeData);
                      const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

                      return (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => {
                                const pct = percent ?? 0;
                                return `${name} (${(pct * 100).toFixed(0)}%)`;
                              }}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number, name: string, props: any) => [
                                `${value} rýb (${props.payload.weight.toFixed(1)} kg)`,
                                props.payload.name
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Live Feed of Catches */}
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <TacticalIconInline icon={Fish} variant="cyan" size="md" />
                    Live Feed Úlovkov
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="space-y-4">
                    {catches.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Zatiaľ žiadne úlovky
                      </p>
                    ) : (
                      catches.slice(0, 10).map((catch_) => {
                        // Check if catch meets minimum weight requirement
                        const meetsMinWeight = !battle.rules.minWeightKg || parseFloat(catch_.weight) >= battle.rules.minWeightKg;
                        
                        return (
                          <div 
                            key={catch_.id}
                            className={`flex gap-4 p-3 rounded-lg border transition-colors ${
                              meetsMinWeight 
                                ? 'border-border hover:bg-muted/50' 
                                : 'border-muted bg-muted/30 opacity-60'
                            }`}
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
                                  {!meetsMinWeight && (
                                    <Badge variant="outline" className="mt-1 text-xs bg-muted">
                                      Nezapočítava sa
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold ${meetsMinWeight ? 'text-primary' : 'text-muted-foreground'}`}>
                                    {parseFloat(catch_.weight).toFixed(1)} kg
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(catch_.capturedAt), { addSuffix: true, locale: sk })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Section (1 column) - Highlights */}
            <div className="space-y-6">
              {/* Time Remaining or Battle Results */}
              {battle.status === "finished" ? (
                <Card className="border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                      <Trophy className="w-5 h-5" />
                      Víťaz Battle
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-4">
                      <div className="text-5xl">🏆</div>
                      <div>
                        <div className="text-2xl font-bold text-foreground mb-1">
                          {leaderboardData[0]?.participant.name || "Nikto"}
                        </div>
                        <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                          {battle?.rules.mode === "most_fish" 
                            ? (leaderboardData[0]?.score.toFixed(0) || "0")
                            : (leaderboardData[0]?.score.toFixed(1) || "0.0")
                          } {battle?.rules.mode === "most_fish" ? "ks" : "kg"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {leaderboardData[0]?.catchCount || 0} úlovkov
                        </div>
                      </div>
                      {user && leaderboardData[0]?.participant.userId === user.id && (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                          Gratulujeme! 🎉
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
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
              )}

              {/* Personal Statistics (only for finished battles) */}
              {battle.status === "finished" && user && (
                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Award className="w-5 h-5 text-primary" />
                      Vaše Výsledky
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const userResult = leaderboardData.find(entry => entry.participant.userId === user.id);
                      const userCatches = catches.filter(c => c.angler.userId === user.id);
                      const userPosition = leaderboardData.findIndex(entry => entry.participant.userId === user.id) + 1;
                      
                      if (!userResult) {
                        return (
                          <p className="text-sm text-muted-foreground text-center">
                            Nezúčastnili ste sa tohto battle
                          </p>
                        );
                      }
                      
                      const scoreGap = leaderboardData[0]?.score - userResult.score;
                      
                      return (
                        <div className="space-y-4">
                          <div className="text-center p-4 bg-primary/5 rounded-lg">
                            <div className="text-4xl font-bold text-primary mb-1">
                              #{userPosition}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              z {leaderboardData.length} účastníkov
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Váš výsledok:</span>
                              <span className="font-bold">
                                {battle?.rules.mode === "most_fish" ? userResult.score.toFixed(0) : userResult.score.toFixed(1)} {battle?.rules.mode === "most_fish" ? "ks" : "kg"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Počet úlovkov:</span>
                              <span className="font-bold">{userCatches.length}</span>
                            </div>
                            {userPosition > 1 && scoreGap > 0 && (
                              <div className="flex justify-between text-orange-600 dark:text-orange-400">
                                <span>Rozdiel od víťaza:</span>
                                <span className="font-bold">
                                  -{battle?.rules.mode === "most_fish" ? scoreGap.toFixed(0) : scoreGap.toFixed(1)} {battle?.rules.mode === "most_fish" ? "ks" : "kg"}
                                </span>
                              </div>
                            )}
                            {userCatches.length > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Najväčší úlovok:</span>
                                <span className="font-bold">
                                  {Math.max(...userCatches.map(c => parseFloat(c.weight))).toFixed(1)} kg
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Battle Insights (only for finished battles) */}
              {battle.status === "finished" && catches.length > 0 && (
                <Card className="border-blue-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                      Battle Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const totalFish = catches.length;
                      const totalWeight = catches.reduce((sum, c) => sum + parseFloat(c.weight), 0);
                      
                      // Find most active angler (most catches)
                      const catchesByAngler = catches.reduce((acc, c) => {
                        const name = c.angler.name;
                        acc[name] = (acc[name] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      const mostActiveAngler = Object.entries(catchesByAngler).sort((a, b) => b[1] - a[1])[0];
                      
                      // Find biggest catch
                      const biggest = catches.reduce((max, c) => 
                        parseFloat(c.weight) > parseFloat(max.weight) ? c : max
                      );
                      
                      // Calculate score gap between 1st and 2nd place
                      const scoreGap = leaderboardData.length > 1 
                        ? leaderboardData[0].score - leaderboardData[1].score 
                        : 0;
                      
                      return (
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <div className="font-medium">Celkový počet rýb</div>
                              <div className="text-foreground font-bold">{totalFish} rýb ({totalWeight.toFixed(1)} kg)</div>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <div className="font-medium">Najaktívnejší rybár</div>
                              <div className="text-foreground font-bold">
                                {mostActiveAngler[0]} ({mostActiveAngler[1]} úlovkov)
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <div className="font-medium">Najväčší úlovok</div>
                              <div className="text-foreground font-bold">
                                {parseFloat(biggest.weight).toFixed(1)} kg ({getFishTypeLabel(biggest.fishType)})
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Chytil: {biggest.angler.name}
                              </div>
                            </div>
                          </div>
                          
                          {leaderboardData.length >= 2 && scoreGap > 0 && (
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {scoreGap < 2 ? "Tesný súboj! 🔥" : "Rozdiel na vedení"}
                                </div>
                                <div className="text-foreground font-bold">
                                  {battle?.rules.mode === "most_fish" ? scoreGap.toFixed(0) : scoreGap.toFixed(1)} {battle?.rules.mode === "most_fish" ? "ks" : "kg"}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

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

      {/* Catch Form Dialog */}
      <CatchFormDialog
        isOpen={isAddCatchDialogOpen}
        onClose={() => setIsAddCatchDialogOpen(false)}
        editingCatch={null}
        battleId={id}
        onSuccess={() => {
          // Invalidate catches query to refresh the feed
          // This is handled automatically by CatchFormDialog
        }}
      />

      {/* End Battle Confirmation Dialog */}
      <AlertDialog open={showEndBattleDialog} onOpenChange={setShowEndBattleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ukončiť Battle?</AlertDialogTitle>
            <AlertDialogDescription>
              Týmto ukončíte tento súboj a presuniete ho do archívu. Výsledky budú automaticky vypočítané podľa aktuálneho stavu. Túto akciu nie je možné vrátiť späť.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-end-battle">
              Zrušiť
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => endBattleMutation.mutate()}
              disabled={endBattleMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="button-confirm-end-battle"
            >
              {endBattleMutation.isPending ? "Ukončujem..." : "Ukončiť Battle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DiaryLayout>
  );
}
