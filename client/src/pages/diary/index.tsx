import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trophy, Plus, Calendar, Fish, BarChart3, Crown, Archive, Eye, Clock, Medal, Users, Target } from "lucide-react";
import { useLocation } from "wouter";

// Mock battle data for integration
const getMockBattleStats = () => ({
  totalBattles: 4,
  wins: 2,
  podiums: 3,
  winRate: 50
});

const getMockRecentBattles = () => [
  {
    id: "battle-1",
    name: "Víkendový súboj kamarátov", 
    status: "finished" as const,
    userPosition: 3,
    participants: 4,
    winner: "Tomáš K.",
    endedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
  },
  {
    id: "battle-2", 
    name: "Ranný súboj na jazere",
    status: "finished" as const,
    userPosition: 1,
    participants: 3,
    winner: "Vy",
    endedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 14 days ago
  }
];

export default function DiaryIndex() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // TODO: Replace with actual API call to check premium status
  const isPremium = true; // Temporarily set to true for development - will be connected to actual premium check
  
  // Mock battle data
  const battleStats = getMockBattleStats();
  const recentBattles = getMockRecentBattles();

  const diaryFeatures = [
    {
      icon: Calendar,
      title: "Výpravy",
      description: "Zaznamenávajte svoje rybárske výpravy",
      href: "/diary/trips",
      isPremium: false
    },
    {
      icon: Fish,
      title: "Úlovky",
      description: "Sledujte svoje úlovky s fotkami a poznámkami",
      href: "/diary/catches", 
      isPremium: false
    },
    {
      icon: Target,
      title: "Sezónne ciele",
      description: "Sledujte pokrok a dosahujte nové míľniky",
      href: "/diary/seasonal-goals",
      isPremium: false
    },
    {
      icon: Trophy,
      title: "Fishing Battle",
      description: "Súťažte s kamarátmi v rybárskych dueloch",
      href: "/diary/battle",
      isPremium: true
    },
    {
      icon: BarChart3,
      title: "Štatistiky",
      description: "Detailné analýzy vašich úlovkov",
      href: "/diary/stats",
      isPremium: true
    }
  ];

  const handleFeatureClick = (feature: typeof diaryFeatures[0]) => {
    if (feature.isPremium && !isPremium) {
      // Redirect to specific paywall for that feature
      if (feature.href === "/diary/battle") {
        setLocation("/diary/battle/paywall");
      } else {
        setLocation("/pricing");
      }
    } else {
      // For premium users or free features
      if (feature.href === "/diary/battle") {
        setLocation("/diary/battle/create");
      } else {
        setLocation(feature.href);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Rybársky denník
            </h1>
            {isPremium && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                PREMIUM
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-lg">
            Zaznamenávajte svoje rybárske zážitky a sledujte progres
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Výpravy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Úlovky</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{battleStats.totalBattles}</div>
              <div className="text-sm text-muted-foreground">Battles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">0 kg</div>
              <div className="text-sm text-muted-foreground">Celková váha</div>
            </CardContent>
          </Card>
        </div>

        {/* Battle Integration Section - Only for Premium users */}
        {isPremium && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Fishing Battle
              </h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation("/diary/battle/archive")}
                data-testid="button-view-battle-archive"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archív
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Battle Stats */}
              <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-4 text-center">
                  <Crown className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{battleStats.wins}</div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">Víťazstvá</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
                <CardContent className="p-4 text-center">
                  <Medal className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{battleStats.podiums}</div>
                  <div className="text-sm text-orange-600 dark:text-orange-400">Pódiá</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{battleStats.totalBattles}</div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Celkovo</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{battleStats.winRate}%</div>
                  <div className="text-sm text-green-600 dark:text-green-400">Úspešnosť</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Battle Activity */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Posledné súboje
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation("/diary/battle/create")}
                    data-testid="button-create-new-battle"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nový súboj
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentBattles.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      Žiadne súboje zatiaľ
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Vytvorte svoj prvý Fishing Battle a súťažte s kamarátmi!
                    </p>
                    <Button onClick={() => setLocation("/diary/battle/create")} data-testid="button-first-battle">
                      <Trophy className="w-4 h-4 mr-2" />
                      Vytvoriť prvý súboj
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentBattles.map((battle) => {
                      const positionColors = {
                        1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                        2: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200", 
                        3: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      };
                      const defaultColor = "bg-muted text-muted-foreground";
                      const positionColor = positionColors[battle.userPosition as keyof typeof positionColors] || defaultColor;
                      
                      return (
                        <div 
                          key={battle.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                          data-testid={`recent-battle-${battle.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <Badge className={positionColor}>
                              {battle.userPosition === 1 && "🥇"}
                              {battle.userPosition === 2 && "🥈"}
                              {battle.userPosition === 3 && "🥉"}
                              {battle.userPosition > 3 && `${battle.userPosition}.`}
                              {" "}
                              {battle.userPosition === 1 ? "Víťazstvo" : `${battle.userPosition}. miesto`}
                            </Badge>
                            
                            <div>
                              <div className="font-medium">{battle.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {battle.participants} účastníkov • Víťaz: {battle.winner}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {Math.floor((Date.now() - battle.endedAt.getTime()) / (1000 * 60 * 60 * 24))} dní
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setLocation(`/diary/battle/${battle.id}`)}
                              data-testid={`button-view-battle-${battle.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="text-center pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setLocation("/diary/battle/archive")}
                        data-testid="button-view-all-battles"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Zobraziť všetky súboje
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {diaryFeatures.map((feature, index) => (
            <Card 
              key={index} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                feature.isPremium && !isPremium ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/10' : ''
              }`}
              onClick={() => handleFeatureClick(feature)}
              data-testid={`card-${feature.title.toLowerCase().replace(' ', '-')}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      feature.isPremium && !isPremium 
                        ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                        : 'bg-primary/10'
                    }`}>
                      <feature.icon className={`w-5 h-5 ${
                        feature.isPremium && !isPremium 
                          ? 'text-yellow-600 dark:text-yellow-400' 
                          : 'text-primary'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      {feature.isPremium && !isPremium && (
                        <Badge variant="outline" className="text-xs mt-1 border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300">
                          PREMIUM
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
                {feature.isPremium && !isPremium && (
                  <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Táto funkcia vyžaduje Premium predplatné
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Premium CTA */}
        {!isPremium && (
          <Card className="mt-8 border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">Odomknite plný potenciál denníka</h3>
              <p className="text-muted-foreground mb-4">
                Získajte prístup k Fishing Battle, pokročilým štatistikám a neobmedzenému počtu výprav
              </p>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => setLocation('/pricing')}
                data-testid="button-upgrade-premium"
              >
                Prejsť na Premium za 4,90€
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}