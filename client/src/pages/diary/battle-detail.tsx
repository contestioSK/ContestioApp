import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Trophy, Users, Calendar, Clock, Fish, Weight, Crown, Plus, AlertCircle, ArrowLeft, Download, Share2, Medal, Star, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";

// WebSocket message interface
interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Mock data interface for battle
interface Battle {
  id: string;
  name: string;
  mode: string;
  status: "active" | "finished" | "upcoming";
  startAt: Date;
  endAt: Date;
  participants: Array<{
    name: string;
    catches: number;
    totalWeight: number;
    biggestFish: number;
    position: number;
  }>;
  currentUser: {
    name: string;
    catches: number;
    totalWeight: number;
    biggestFish: number;
    position: number;
  };
}

// Mock battle data - will be replaced with real API
const getMockBattleData = (id: string): Battle => ({
  id,
  name: "Víkendový súboj kamarátov",
  mode: "total_weight",
  status: "finished",
  startAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  endAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
  participants: [
    { name: "Tomáš K.", catches: 8, totalWeight: 12.5, biggestFish: 3.2, position: 1 },
    { name: "Peter M.", catches: 6, totalWeight: 11.8, biggestFish: 4.1, position: 2 },
    { name: "Vy", catches: 5, totalWeight: 9.3, biggestFish: 2.8, position: 3 },
    { name: "Martin D.", catches: 3, totalWeight: 7.2, biggestFish: 2.5, position: 4 }
  ],
  currentUser: { name: "Vy", catches: 5, totalWeight: 9.3, biggestFish: 2.8, position: 3 }
});

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
    case "best_3_fish": return Crown;
    case "best_5_fish": return Crown;
    default: return Trophy;
  }
};

export default function BattleDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Mock data loading
  useEffect(() => {
    if (id) {
      // Simulate API loading delay
      setTimeout(() => {
        setBattle(getMockBattleData(id));
      }, 500);
    }
  }, [id]);

  // Time remaining countdown
  useEffect(() => {
    if (!battle) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const timeLeft = battle.endAt.getTime() - now.getTime();
      
      if (timeLeft <= 0) {
        setTimeRemaining("Skončené");
        return;
      }

      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [battle]);

  // WebSocket integration for real-time updates
  const handleWebSocketMessage = (data: WebSocketMessage) => {
    if (data.type === 'diary_battle_updated' && data.battleId === id) {
      // Update battle data when new catches are added
      setBattle(prev => prev ? { ...prev, ...data.payload } : null);
    }
  };

  const { isConnected } = useWebSocket(handleWebSocketMessage);

  if (!battle) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ModeIcon = getModeIcon(battle.mode);
  const progress = battle.status === "active" ? 
    ((Date.now() - battle.startAt.getTime()) / (battle.endAt.getTime() - battle.startAt.getTime())) * 100 : 
    100;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/diary")}
            className="mb-4 -ml-4"
            data-testid="button-back-diary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť na denník
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
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
              <span>{getModeLabel(battle.mode)}</span>
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

              {/* Current User Stats */}
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Fish className="w-4 h-4" />
                  Vaše štatistiky
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{battle.currentUser.catches}</div>
                    <div className="text-xs text-muted-foreground">úlovkov</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{battle.currentUser.totalWeight}kg</div>
                    <div className="text-xs text-muted-foreground">celkom</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{battle.currentUser.biggestFish}kg</div>
                    <div className="text-xs text-muted-foreground">najväčšia</div>
                  </div>
                </div>
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

          {/* Live Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Rebríček
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {battle.participants.map((participant, index) => (
                  <div 
                    key={participant.name}
                    className={`flex items-center gap-4 p-3 rounded-lg border ${
                      participant.name === "Vy" ? "bg-primary/5 border-primary/20" : "bg-background"
                    }`}
                    data-testid={`leaderboard-participant-${index}`}
                  >
                    {/* Position */}
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold">
                      {participant.position === 1 && <Crown className="w-4 h-4 text-yellow-500" />}
                      {participant.position !== 1 && participant.position}
                    </div>

                    {/* Avatar & Name */}
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="font-medium">
                        {participant.name}
                        {participant.name === "Vy" && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Vy
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {participant.catches} úlovkov • {participant.totalWeight}kg celkom
                      </div>
                    </div>

                    {/* Score based on mode */}
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {battle.mode === "most_fish" && participant.catches}
                        {battle.mode === "total_weight" && `${participant.totalWeight}kg`}
                        {battle.mode === "biggest_fish" && `${participant.biggestFish}kg`}
                        {(battle.mode === "best_3_fish" || battle.mode === "best_5_fish") && `${participant.totalWeight}kg`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {battle.mode === "most_fish" && "rýb"}
                        {battle.mode === "total_weight" && "váha"}
                        {battle.mode === "biggest_fish" && "najväčšia"}
                        {(battle.mode === "best_3_fish" || battle.mode === "best_5_fish") && "priemer"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Battle Results UI - Only shown when battle is finished */}
        {battle.status === "finished" && (
          <div className="mt-12">
            {/* Winner Celebration */}
            <Card className="mb-8 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-8 text-center">
                <div className="mb-4">
                  <Crown className="w-16 h-16 text-yellow-500 mx-auto animate-bounce" />
                </div>
                <h2 className="text-4xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                  🎉 Víťaz súboja! 🎉
                </h2>
                <div className="text-2xl font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
                  {battle.participants[0].name}
                </div>
                <div className="text-lg text-yellow-600 dark:text-yellow-400">
                  {battle.mode === "most_fish" && `${battle.participants[0].catches} rýb`}
                  {battle.mode === "total_weight" && `${battle.participants[0].totalWeight}kg celkom`}
                  {battle.mode === "biggest_fish" && `${battle.participants[0].biggestFish}kg najväčšia ryba`}
                  {(battle.mode === "best_3_fish" || battle.mode === "best_5_fish") && `${battle.participants[0].totalWeight}kg priemer`}
                </div>
                
                {/* Export Actions */}
                <div className="flex flex-wrap justify-center gap-4 mt-6">
                  <Button 
                    variant="outline" 
                    className="bg-white dark:bg-gray-800 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                    data-testid="button-export-pdf"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button 
                    variant="outline"
                    className="bg-white dark:bg-gray-800 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                    data-testid="button-share-results"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Zdieľať výsledky
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Podium - Top 3 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="w-5 h-5" />
                    Víťazné póidium
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {battle.participants.slice(0, 3).map((participant, index) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const colors = [
                        'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
                        'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800',
                        'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                      ];
                      
                      return (
                        <div 
                          key={participant.name}
                          className={`p-4 rounded-lg border ${colors[index]} ${index === 0 ? 'ring-2 ring-yellow-300 dark:ring-yellow-600' : ''}`}
                          data-testid={`podium-position-${index + 1}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-3xl">{medals[index]}</div>
                            
                            <Avatar className="w-12 h-12">
                              <AvatarFallback>
                                {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="font-bold text-lg">
                                {participant.name}
                                {participant.name === "Vy" && (
                                  <Badge variant="outline" className="ml-2 text-xs">Vy</Badge>
                                )}
                              </div>
                              <div className="text-sm opacity-75">
                                {participant.catches} úlovkov • {participant.totalWeight}kg celkom
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-bold text-xl">
                                {battle.mode === "most_fish" && participant.catches}
                                {battle.mode === "total_weight" && `${participant.totalWeight}kg`}
                                {battle.mode === "biggest_fish" && `${participant.biggestFish}kg`}
                                {(battle.mode === "best_3_fish" || battle.mode === "best_5_fish") && `${participant.totalWeight}kg`}
                              </div>
                              <div className="text-xs opacity-75">
                                {getModeLabel(battle.mode)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Battle Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Štatistiky súboja
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {battle.participants.reduce((sum, p) => sum + p.catches, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Celkovo úlovkov</div>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {battle.participants.reduce((sum, p) => sum + p.totalWeight, 0).toFixed(1)}kg
                      </div>
                      <div className="text-sm text-muted-foreground">Celková váha</div>
                    </div>
                  </div>

                  {/* Achievements */}
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Ocenenia
                    </h4>
                    
                    {/* Most Catches */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <Fish className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Najaktívnejší rybár</div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">Najviac úlovkov</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-800 dark:text-blue-200">
                          {battle.participants.reduce((prev, current) => 
                            prev.catches > current.catches ? prev : current
                          ).name}
                        </div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">
                          {Math.max(...battle.participants.map(p => p.catches))} rýb
                        </div>
                      </div>
                    </div>

                    {/* Biggest Fish */}
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium text-green-800 dark:text-green-200">Najväčšia ryba</div>
                          <div className="text-sm text-green-600 dark:text-green-400">Rekord súboja</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-800 dark:text-green-200">
                          {battle.participants.reduce((prev, current) => 
                            prev.biggestFish > current.biggestFish ? prev : current
                          ).name}
                        </div>
                        <div className="text-sm text-green-600 dark:text-green-400">
                          {Math.max(...battle.participants.map(p => p.biggestFish))}kg
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Battle Duration */}
                  <Separator />
                  <div className="text-center text-sm text-muted-foreground">
                    Súboj trval {Math.round((battle.endAt.getTime() - battle.startAt.getTime()) / (1000 * 60 * 60))} hodín
                    <br />
                    {format(battle.startAt, "d.M.yyyy HH:mm", { locale: sk })} - {format(battle.endAt, "d.M.yyyy HH:mm", { locale: sk })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Complete Results Table */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Kompletné výsledky
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Pozícia</th>
                        <th className="text-left p-3">Účastník</th>
                        <th className="text-center p-3">Úlovky</th>
                        <th className="text-center p-3">Celková váha</th>
                        <th className="text-center p-3">Najväčšia ryba</th>
                        <th className="text-center p-3">Skóre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battle.participants.map((participant, index) => (
                        <tr 
                          key={participant.name}
                          className={`border-b hover:bg-muted/30 ${participant.name === "Vy" ? "bg-primary/5" : ""}`}
                          data-testid={`results-row-${index}`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {participant.position === 1 && <Crown className="w-4 h-4 text-yellow-500" />}
                              {participant.position <= 3 && ['🥇', '🥈', '🥉'][participant.position - 1]}
                              <span className="font-medium">{participant.position}.</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs">
                                  {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {participant.name}
                                {participant.name === "Vy" && (
                                  <Badge variant="outline" className="ml-2 text-xs">Vy</Badge>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono">{participant.catches}</td>
                          <td className="p-3 text-center font-mono">{participant.totalWeight}kg</td>
                          <td className="p-3 text-center font-mono">{participant.biggestFish}kg</td>
                          <td className="p-3 text-center font-mono font-bold">
                            {battle.mode === "most_fish" && participant.catches}
                            {battle.mode === "total_weight" && `${participant.totalWeight}kg`}
                            {battle.mode === "biggest_fish" && `${participant.biggestFish}kg`}
                            {(battle.mode === "best_3_fish" || battle.mode === "best_5_fish") && `${participant.totalWeight}kg`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}