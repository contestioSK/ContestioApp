import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Trophy, Users, Calendar, Clock, Fish, Weight, Crown, Archive, Search, Filter, Eye, RotateCcw, Medal, BarChart3, Star, Plus } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";

// Mock battle data interface
interface ArchivedBattle {
  id: string;
  name: string;
  mode: string;
  status: "finished";
  startAt: Date;
  endAt: Date;
  participantCount: number;
  winner: string;
  userPosition: number;
  userScore: number;
  totalScore: number;
  participants: string[];
}

// Mock archived battles data
const getMockArchivedBattles = (): ArchivedBattle[] => [
  {
    id: "battle-1", 
    name: "Víkendový súboj kamarátov",
    mode: "total_weight",
    status: "finished",
    startAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6 hours duration
    participantCount: 4,
    winner: "Tomáš K.",
    userPosition: 3,
    userScore: 9.3,
    totalScore: 12.5,
    participants: ["Tomáš K.", "Peter M.", "Vy", "Martin D."]
  },
  {
    id: "battle-2",
    name: "Ranný súboj na jazere",
    mode: "most_fish", 
    status: "finished",
    startAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    endAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours duration
    participantCount: 3,
    winner: "Vy",
    userPosition: 1,
    userScore: 12,
    totalScore: 12,
    participants: ["Vy", "Jozef S.", "Anna K."]
  },
  {
    id: "battle-3",
    name: "Večerný duel na Dunaji",
    mode: "biggest_fish",
    status: "finished", 
    startAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
    endAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours duration
    participantCount: 2,
    winner: "Milan R.",
    userPosition: 2,
    userScore: 3.1,
    totalScore: 4.2,
    participants: ["Milan R.", "Vy"]
  },
  {
    id: "battle-4",
    name: "Turnaj majstrov",
    mode: "best_3_fish",
    status: "finished",
    startAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 8 hours duration
    participantCount: 6,
    winner: "Ľuboš P.",
    userPosition: 4,
    userScore: 15.2,
    totalScore: 18.7,
    participants: ["Ľuboš P.", "Erik N.", "Dominik H.", "Vy", "Michal T.", "Robert F."]
  }
];

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

const getScoreUnit = (mode: string) => {
  switch (mode) {
    case "most_fish": return "rýb";
    case "total_weight": return "kg";
    case "biggest_fish": return "kg";
    case "best_3_fish": return "kg";
    case "best_5_fish": return "kg";
    default: return "";
  }
};

const getPositionBadge = (position: number) => {
  if (position === 1) return { emoji: "🏆", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
  if (position === 2) return { emoji: "🥈", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" };
  if (position === 3) return { emoji: "🥉", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" };
  return { emoji: `${position}.`, color: "bg-muted text-muted-foreground" };
};

export default function BattleArchive() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");
  
  const battles = getMockArchivedBattles();

  // Filter battles based on search and filters
  const filteredBattles = useMemo(() => {
    return battles.filter(battle => {
      const matchesSearch = battle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          battle.winner.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMode = filterMode === "all" || battle.mode === filterMode;
      const matchesResult = filterResult === "all" || 
                          (filterResult === "win" && battle.userPosition === 1) ||
                          (filterResult === "podium" && battle.userPosition <= 3) ||
                          (filterResult === "participated" && battle.userPosition > 3);
      
      return matchesSearch && matchesMode && matchesResult;
    });
  }, [battles, searchTerm, filterMode, filterResult]);

  // Calculate user statistics
  const userStats = useMemo(() => {
    const totalBattles = battles.length;
    const wins = battles.filter(b => b.userPosition === 1).length;
    const podiums = battles.filter(b => b.userPosition <= 3).length;
    const winRate = totalBattles > 0 ? (wins / totalBattles * 100).toFixed(1) : "0";
    
    return { totalBattles, wins, podiums, winRate };
  }, [battles]);

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Archive className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">
                  Battle Archív
                </h1>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  PREMIUM
                </Badge>
              </div>
              <Button
                size="lg"
                onClick={() => setLocation("/diary/battle/create")}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-create-battle"
              >
                <Plus className="w-5 h-5 mr-2" />
                Vytvoriť nový Battle
              </Button>
            </div>
            
            <p className="text-muted-foreground text-lg">
              História všetkých vašich Fishing Battle súbojov a štatistiky
            </p>
          </div>

          {/* User Statistics Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Vaše štatistiky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">{userStats.totalBattles}</div>
                  <div className="text-sm text-muted-foreground">Celkovo súbojov</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-1">{userStats.wins}</div>
                  <div className="text-sm text-muted-foreground">Víťazstvá</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-1">{userStats.podiums}</div>
                  <div className="text-sm text-muted-foreground">Pódiové umiestnenia</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">{userStats.winRate}%</div>
                  <div className="text-sm text-muted-foreground">Úspešnosť víťazstiev</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Vyhľadávanie a filtre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Hľadať podľa názvu súboja alebo víťaza..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    data-testid="input-search-battles"
                  />
                </div>
                <div className="flex gap-4">
                  <Select value={filterMode} onValueChange={setFilterMode}>
                    <SelectTrigger className="w-48" data-testid="select-filter-mode">
                      <SelectValue placeholder="Herný režim" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všetky režimy</SelectItem>
                      <SelectItem value="most_fish">Najviac rýb</SelectItem>
                      <SelectItem value="total_weight">Celková váha</SelectItem>
                      <SelectItem value="biggest_fish">Najväčšia ryba</SelectItem>
                      <SelectItem value="best_3_fish">Top 3 ryby</SelectItem>
                      <SelectItem value="best_5_fish">Top 5 rýb</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterResult} onValueChange={setFilterResult}>
                    <SelectTrigger className="w-48" data-testid="select-filter-result">
                      <SelectValue placeholder="Výsledok" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všetky výsledky</SelectItem>
                      <SelectItem value="win">Víťazstvá</SelectItem>
                      <SelectItem value="podium">Pódiové umiestnenia</SelectItem>
                      <SelectItem value="participated">Účasť</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Battles List */}
          <div className="space-y-4">
            {filteredBattles.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchTerm || filterMode !== "all" || filterResult !== "all" 
                      ? "Žiadne súboje nevyhovujú filtrom"
                      : "Zatiaľ ste neabsolvovali žiadne súboje"
                    }
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || filterMode !== "all" || filterResult !== "all"
                      ? "Skúste upraviť hľadacie kritériá alebo filtre."
                      : "Vytvorte svoj prvý Fishing Battle a súťažte s kamarátmi!"
                    }
                  </p>
                  {!(searchTerm || filterMode !== "all" || filterResult !== "all") && (
                    <Button 
                      onClick={() => setLocation("/diary/battle/create")}
                      data-testid="button-create-first-battle"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Vytvoriť prvý súboj
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredBattles.map((battle) => {
                const positionBadge = getPositionBadge(battle.userPosition);
                
                return (
                  <Card key={battle.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Battle Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground truncate">
                              {battle.name}
                            </h3>
                            <Badge 
                              variant="secondary" 
                              className={positionBadge.color}
                            >
                              {positionBadge.emoji} {battle.userPosition}. miesto
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{format(battle.startAt, "d. MMM yyyy", { locale: sk })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Trophy className="w-4 h-4" />
                              <span>{getModeLabel(battle.mode)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{battle.participantCount} účastníkov</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Crown className="w-4 h-4" />
                              <span>Víťaz: {battle.winner}</span>
                            </div>
                          </div>
                        </div>

                        {/* Battle Stats */}
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-lg font-bold text-foreground">
                              {battle.userScore} {getScoreUnit(battle.mode)}
                            </div>
                            <div className="text-xs text-muted-foreground">Váš výsledok</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-muted-foreground">
                              {battle.totalScore} {getScoreUnit(battle.mode)}
                            </div>
                            <div className="text-xs text-muted-foreground">Víťazný výsledok</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation(`/diary/battle/${battle.id}`)}
                            data-testid={`button-view-battle-${battle.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Zobraziť
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {/* TODO: Rematch functionality */}}
                            data-testid={`button-rematch-battle-${battle.id}`}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Revanš
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Create New Battle CTA */}
          {filteredBattles.length > 0 && (
            <Card className="mt-8">
              <CardContent className="p-6 text-center">
                <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Pripravený na ďalší súboj?
                </h3>
                <p className="text-muted-foreground mb-4">
                  Vyzvite kamarátov na nový Fishing Battle a ukážte, kto je najlepší rybár!
                </p>
                <Button 
                  onClick={() => setLocation("/diary/battle/create")}
                  data-testid="button-create-new-battle"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Vytvoriť nový súboj
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DiaryLayout>
  );
}