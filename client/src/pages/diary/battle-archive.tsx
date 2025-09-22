import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Trophy, Users, Calendar, Clock, Fish, Weight, Crown, Archive, Search, Filter, ArrowLeft, Eye, RotateCcw, Medal, BarChart3, Star } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useLocation } from "wouter";

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
    name: "Turnaj najlepších rybárov",
    mode: "best_5_fish",
    status: "finished",
    startAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 8 hours duration
    participantCount: 6,
    winner: "Vy",
    userPosition: 1,
    userScore: 18.7,
    totalScore: 18.7,
    participants: ["Vy", "Robert K.", "Pavel N.", "Michal T.", "David L.", "Igor M."]
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

const getPositionBadge = (position: number) => {
  if (position === 1) return { emoji: "🥇", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
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
            <Archive className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Battle Archív
            </h1>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              PREMIUM
            </Badge>
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
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Hľadať podľa názvu súboja alebo víťaza..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-battles"
                  />
                </div>
              </div>
              
              {/* Mode Filter */}
              <Select value={filterMode} onValueChange={setFilterMode}>
                <SelectTrigger className="w-full md:w-48" data-testid="select-filter-mode">
                  <Filter className="w-4 h-4 mr-2" />
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
              
              {/* Result Filter */}
              <Select value={filterResult} onValueChange={setFilterResult}>
                <SelectTrigger className="w-full md:w-48" data-testid="select-filter-result">
                  <Medal className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Výsledok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všetky výsledky</SelectItem>
                  <SelectItem value="win">Víťazstvá</SelectItem>
                  <SelectItem value="podium">Pódiové umiestnenia</SelectItem>
                  <SelectItem value="participated">Ostatné účasti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Battle List */}
        <div className="space-y-6">
          {filteredBattles.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Archive className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                  Žiadne súboje neboli nájdené
                </h3>
                <p className="text-muted-foreground mb-4">
                  Skúste zmeniť filter alebo začať nový súboj.
                </p>
                <Button onClick={() => setLocation("/diary/battle/create")} data-testid="button-create-first-battle">
                  <Trophy className="w-4 h-4 mr-2" />
                  Vytvoriť prvý súboj
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredBattles.map((battle) => {
              const ModeIcon = getModeIcon(battle.mode);
              const positionBadge = getPositionBadge(battle.userPosition);
              
              return (
                <Card key={battle.id} className="hover:shadow-md transition-shadow" data-testid={`battle-card-${battle.id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Battle Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{battle.name}</h3>
                          <Badge className={positionBadge.color}>
                            {positionBadge.emoji} {battle.userPosition}. miesto
                          </Badge>
                          {battle.userPosition === 1 && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-300">
                              <Star className="w-3 h-3 mr-1" />
                              Víťazstvo
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <ModeIcon className="w-4 h-4" />
                            <span>{getModeLabel(battle.mode)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{battle.participantCount} účastníkov</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(battle.startAt, "d.M.yyyy", { locale: sk })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{Math.round((battle.endAt.getTime() - battle.startAt.getTime()) / (1000 * 60 * 60))}h</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Víťaz: </span>
                            <span className="font-medium">{battle.winner}</span>
                          </div>
                          <Separator orientation="vertical" className="h-4" />
                          <div>
                            <span className="text-muted-foreground">Vaše skóre: </span>
                            <span className="font-medium">
                              {battle.mode === "most_fish" ? `${battle.userScore} rýb` : `${battle.userScore}kg`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Participants Preview */}
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {battle.participants.slice(0, 4).map((participant, index) => (
                            <Avatar key={participant} className="w-8 h-8 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {participant === "Vy" ? "Vy" : participant.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {battle.participants.length > 4 && (
                            <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                              +{battle.participants.length - 4}
                            </div>
                          )}
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
                          <Eye className="w-4 h-4 mr-2" />
                          Zobraziť
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setLocation(`/diary/battle/create?rematch=${battle.id}`)}
                          data-testid={`button-rematch-${battle.id}`}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Rematch
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Results Summary */}
        {filteredBattles.length > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Zobrazuje sa {filteredBattles.length} z {battles.length} súbojov
          </div>
        )}
      </div>
    </div>
  );
}