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
import { Trophy, Users, Calendar, Clock, Fish, Weight, Crown, Plus, AlertCircle, ArrowLeft } from "lucide-react";
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
  status: "active",
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

              {battle.status === "finished" && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Súboj skončený!</span>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Víťazom je {battle.participants[0].name} s {battle.mode === "most_fish" ? `${battle.participants[0].catches} rybami` : `${battle.participants[0].totalWeight}kg`}!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}