import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useConfetti } from "@/hooks/useConfetti";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Lock, Unlock, ChevronDown, ChevronUp, Target, Plus, Trophy, Sparkles, Award } from "lucide-react";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { BADGE_DEFINITIONS, getTierColor, getTierBgClass, getTierTextClass, BadgeTier } from "@shared/badges";
import type { UserBadge } from "@shared/schema";
import { BadgeCelebrationModal } from "@/components/diary/BadgeCelebrationModal";

export default function BadgesPage() {
  const { user } = useAuth();
  const { celebrateGoalCompletion } = useConfetti();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const previousBadgeCount = useRef<number | null>(null);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [demoBadge, setDemoBadge] = useState<{
    badgeType: string;
    badgeName: string;
    tier: BadgeTier;
    icon: string;
  } | null>(null);

  const { data: userBadges = [] } = useQuery<UserBadge[]>({
    queryKey: ["/api/diary/badges"],
    enabled: !!user?.id
  });

  const { data: badgeProgress = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/diary/badges/progress"],
    enabled: !!user?.id
  });

  useEffect(() => {
    if (previousBadgeCount.current !== null && userBadges.length > previousBadgeCount.current) {
      celebrateGoalCompletion();
      toast({
        title: "🏅 Nový odznak odomknutý!",
        description: "Gratulujeme! Získali ste nový odznak.",
      });
    }
    previousBadgeCount.current = userBadges.length;
  }, [userBadges.length, celebrateGoalCompletion, toast]);

  const unlockedBadges = new Set(
    userBadges.map(b => `${b.badgeType}_${b.tier}`)
  );

  const badgesList = Object.values(BADGE_DEFINITIONS);

  const nextGoal = useMemo(() => {
    let bestCandidate: {
      badgeDef: typeof badgesList[0];
      tier: 'bronze' | 'silver' | 'gold';
      currentValue: number;
      threshold: number;
      progressPercent: number;
      remaining: number;
    } | null = null;

    for (const badgeDef of badgesList) {
      for (const tier of ['bronze', 'silver', 'gold'] as const) {
        const isUnlocked = unlockedBadges.has(`${badgeDef.id}_${tier}`);
        if (isUnlocked) continue;

        const currentValue = badgeProgress[badgeDef.id] || 0;
        const threshold = badgeDef.tiers[tier].threshold;
        const progressPercent = Math.min((currentValue / threshold) * 100, 100);
        const remaining = Math.max(0, threshold - currentValue);

        if (progressPercent >= 100) continue;

        if (!bestCandidate || progressPercent > bestCandidate.progressPercent) {
          bestCandidate = { badgeDef, tier, currentValue, threshold, progressPercent, remaining };
        }
      }
    }
    return bestCandidate;
  }, [badgesList, unlockedBadges, badgeProgress]);

  const unlockedBadgesList = useMemo(() => {
    const result: { badgeDef: typeof badgesList[0]; tier: 'bronze' | 'silver' | 'gold' }[] = [];
    for (const badgeDef of badgesList) {
      for (const tier of ['gold', 'silver', 'bronze'] as const) {
        if (unlockedBadges.has(`${badgeDef.id}_${tier}`)) {
          result.push({ badgeDef, tier });
        }
      }
    }
    return result;
  }, [badgesList, unlockedBadges]);

  const hasNoBadges = userBadges.length === 0;

  return (
    <DiaryLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <TacticalIcon icon={Award} variant="amber" size="lg" showLabel={false} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Moje Odznaky</h1>
              <p className="text-muted-foreground text-sm">
                {userBadges.length} odomknutých z {badgesList.length * 3} možných
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const demoTiers: BadgeTier[] = ['gold', 'silver', 'bronze'];
              const randomTier = demoTiers[Math.floor(Math.random() * demoTiers.length)];
              const firstBadge = badgesList[0];
              setDemoBadge({
                badgeType: firstBadge.id,
                badgeName: firstBadge.name,
                tier: randomTier,
                icon: firstBadge.icon,
              });
            }}
            className="border-lime-500/50 text-lime-500 hover:bg-lime-500/10"
            data-testid="button-demo-celebration"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Demo oslavy
          </Button>
        </div>

        {hasNoBadges && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-5 text-center">
              <div className="text-5xl mb-3">🎣</div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Tvoj prvý odznak čaká
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Stačí pridať prvý úlovok a odomkneš <span className="text-amber-500 font-semibold">Bronze</span> odznak.
              </p>
              <Button
                className="bg-lime-500 hover:bg-lime-400 text-background font-bold"
                onClick={() => setLocation('/diary')}
                data-testid="button-add-first-catch"
              >
                <Plus className="w-4 h-4 mr-2" />
                Pridať úlovok
              </Button>
            </CardContent>
          </Card>
        )}

        {nextGoal && (
          <Card className="mb-6 border-lime-500/30 bg-lime-500/5">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{nextGoal.badgeDef.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TacticalIconInline icon={Target} variant="purple" size="sm" />
                    <span className="text-xs font-bold uppercase tracking-wider text-lime-500">Najbližší odznak</span>
                  </div>
                  <h3 className="font-bold text-foreground mb-1">
                    {nextGoal.badgeDef.name} 
                    <Badge className={`ml-2 bg-gradient-to-r ${getTierColor(nextGoal.tier)} text-white border-0 text-xs`}>
                      {nextGoal.tier === 'bronze' ? '🥉' : nextGoal.tier === 'silver' ? '🥈' : '🥇'} {nextGoal.tier}
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Chýba ti ešte <span className="font-bold text-foreground">{nextGoal.remaining}</span> do {nextGoal.threshold}
                  </p>
                  <div className="flex items-center gap-4">
                    <Progress value={nextGoal.progressPercent} className="h-2 flex-1" />
                    <span className="text-xs font-bold text-muted-foreground">{Math.round(nextGoal.progressPercent)}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  size="sm"
                  className="w-full bg-lime-500 hover:bg-lime-400 text-background font-bold"
                  onClick={() => setLocation('/diary')}
                  data-testid="button-add-catch-for-badge"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Pridať úlovok
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {unlockedBadgesList.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <TacticalIconInline icon={Trophy} variant="amber" size="md" />
              Odomknuté odznaky
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {unlockedBadgesList.map(({ badgeDef, tier }) => {
                const tierDef = badgeDef.tiers[tier];
                const bgClass = getTierBgClass(tier);
                const textClass = getTierTextClass(tier);

                return (
                  <div
                    key={`${badgeDef.id}_${tier}`}
                    className={`p-4 rounded-xl border-2 ${bgClass}`}
                    data-testid={`badge-unlocked-${badgeDef.id}-${tier}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{badgeDef.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`font-bold ${textClass}`}>{badgeDef.name}</span>
                          <Badge className={`bg-gradient-to-r ${getTierColor(tier)} text-white border-0 text-[10px] px-1.5`}>
                            {tier === 'bronze' ? '🥉' : tier === 'silver' ? '🥈' : '🥇'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{tierDef.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Collapsible open={showAllBadges} onOpenChange={setShowAllBadges}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between text-muted-foreground hover:text-foreground mb-4"
              data-testid="button-toggle-all-badges"
            >
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Čo môžem získať
              </span>
              {showAllBadges ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {badgesList.map(badgeDef => (
                <Card key={badgeDef.id} className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{badgeDef.icon}</span>
                    <div>
                      <h3 className="font-bold text-foreground">{badgeDef.name}</h3>
                      <p className="text-xs text-muted-foreground">{badgeDef.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(['bronze', 'silver', 'gold'] as const).map(tier => {
                      const isUnlocked = unlockedBadges.has(`${badgeDef.id}_${tier}`);
                      const tierDef = badgeDef.tiers[tier];
                      const currentValue = badgeProgress[badgeDef.id] || 0;
                      const threshold = tierDef.threshold;
                      const progressPercent = Math.min((currentValue / threshold) * 100, 100);

                      return (
                        <div
                          key={tier}
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            isUnlocked ? 'bg-muted/50' : 'bg-muted/20 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {tier === 'bronze' ? '🥉' : tier === 'silver' ? '🥈' : '🥇'}
                            </span>
                            <span className="text-xs text-muted-foreground">{tierDef.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isUnlocked ? (
                              <Unlock className="w-3.5 h-3.5 text-lime-500" />
                            ) : (
                              <span className="text-[10px] text-muted-foreground">{currentValue}/{threshold}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Demo Badge Celebration Modal */}
      <BadgeCelebrationModal
        badge={demoBadge}
        onClose={() => setDemoBadge(null)}
      />
    </DiaryLayout>
  );
}
