import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Archive, Swords, Users, Clock, Crown, Eye } from "lucide-react";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { DiaryBattle } from "@shared/schema";

export default function BattleIndex() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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

  // Redirect non-premium users to paywall
  useEffect(() => {
    if (user?.id && !isPremiumLoading && isPremium === false) {
      setLocation('/diary/battle/paywall');
    }
  }, [user?.id, isPremium, isPremiumLoading, setLocation]);

  // Show loading state while checking premium status or waiting for user
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

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Swords className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                Fishing Battle
              </h1>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                <Crown className="w-4 h-4 mr-1" />
                PREMIUM
              </Badge>
            </div>
            
            <p className="text-muted-foreground text-lg">
              Súťažte s kamarátmi v priateľských rybárskych dueloch
            </p>
          </div>

          {/* Battles Section - Show ALL battles */}
          {battles.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-orange-500" />
                Aktívne súboje
              </h2>
              <div className="grid gap-4">
                {battles.map((battle) => (
                  <Card 
                    key={battle.id} 
                    className="hover:shadow-lg transition-shadow"
                    data-testid={`card-battle-${battle.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-600" />
                            {battle.name}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {battle.participants.length} účastníkov
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(battle.startAt).toLocaleDateString('sk-SK')} - {new Date(battle.endAt).toLocaleDateString('sk-SK')}
                            </span>
                          </div>
                          <Button
                            onClick={() => setLocation(`/diary/battle/${battle.id}`)}
                            data-testid={`button-view-battle-${battle.id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Zobraziť detail
                          </Button>
                        </div>
                        <Badge className="bg-green-500 text-white">
                          {battle.rules.mode === 'most_fish' && 'Najviac rýb'}
                          {battle.rules.mode === 'total_weight' && 'Celková váha'}
                          {battle.rules.mode === 'biggest_fish' && 'Najväčšia ryba'}
                          {battle.rules.mode === 'best_3_fish' && 'Top 3 ryby'}
                          {battle.rules.mode === 'best_5_fish' && 'Top 5 rýb'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="mb-8 border-2 border-dashed border-muted-foreground/30">
              <CardContent className="p-12 text-center">
                <Swords className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Žiadne aktívne súboje
                </h3>
                <p className="text-muted-foreground mb-6">
                  Vytvorte nový Fishing Battle a pozvite kamarátov na súboj!
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Create New Battle Card */}
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30 hover:shadow-xl transition-all hover:-translate-y-1">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Vytvoriť nový Battle
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Založte vlastný súboj s vlastnými pravidlami a pozvite kamarátov
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setLocation("/diary/battle/create")}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-create-battle-main"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Vytvoriť Battle
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Archive Card */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/30 hover:shadow-xl transition-all hover:-translate-y-1">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4">
                    <Archive className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Archív súbojov
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Pozrite si históriu všetkých vašich battles a štatistiky
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setLocation("/diary/battle/archive")}
                    variant="outline"
                    className="w-full border-purple-500/50 hover:bg-purple-500/10"
                    data-testid="button-view-archive"
                  >
                    <Archive className="w-5 h-5 mr-2" />
                    Zobraziť archív
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="p-6 text-center">
                <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                <h4 className="font-semibold text-foreground mb-1">5 herných režimov</h4>
                <p className="text-sm text-muted-foreground">
                  Najväčšia ryba, celková váha, top 3/5 rýb a počet úlovkov
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                <h4 className="font-semibold text-foreground mb-1">Súťažte s kamarátmi</h4>
                <p className="text-sm text-muted-foreground">
                  Pozvite priateľov a súťažte v reálnom čase
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-6 text-center">
                <Crown className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <h4 className="font-semibold text-foreground mb-1">Digitálne trofeje</h4>
                <p className="text-sm text-muted-foreground">
                  Získajte medaile a trofeje za víťazstvá
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DiaryLayout>
  );
}
