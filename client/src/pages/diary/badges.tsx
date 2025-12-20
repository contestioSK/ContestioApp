import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useConfetti } from "@/hooks/useConfetti";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Lock, Unlock, Share2, Copy, Check } from "lucide-react";
import DiaryLayout from "@/components/DiaryLayout";
import { BADGE_DEFINITIONS, getTierColor, getTierBgClass, getTierTextClass } from "@shared/badges";
import type { UserBadge } from "@shared/schema";

export default function BadgesPage() {
  const { user } = useAuth();
  const { celebrateGoalCompletion } = useConfetti();
  const { toast } = useToast();
  const previousBadgeCount = useRef<number | null>(null);

  // Fetch user's badges
  const { data: userBadges = [] } = useQuery<UserBadge[]>({
    queryKey: ["/api/diary/badges"],
    enabled: !!user?.id
  });

  // Fetch badge progress
  const { data: badgeProgress = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/diary/badges/progress"],
    enabled: !!user?.id
  });

  // Trigger confetti when new badge is unlocked
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

  // Create a set of unlocked badges for quick lookup
  const unlockedBadges = new Set(
    userBadges.map(b => `${b.badgeType}_${b.tier}`)
  );

  const badgesList = Object.values(BADGE_DEFINITIONS);

  // Share profile function
  const handleShare = async () => {
    const shareData = {
      title: 'Moje rybárske odznaky',
      text: `Mám ${userBadges.length} odznakov! 🎣🏅`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "📋 Odkaz skopírovaný",
          description: "Odkaz na profil bol skopírovaný do schránky.",
        });
      }
    } catch (err) {
      // User cancelled share
    }
  };

  return (
    <DiaryLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">🏅 Moje Odznaky</h1>
            <p className="text-muted-foreground text-sm md:text-lg">
              Zbierajte odznaky a staňte sa legendou rybárskeho sveta
            </p>
          </div>
          <Button
            onClick={handleShare}
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            data-testid="button-share-badges"
          >
            <Share2 className="w-4 h-4" />
            Zdieľať profil
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Odomknuté Odznaky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userBadges.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                z {badgesList.length * 3} možných
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Zlaté Odznaky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {userBadges.filter(b => b.tier === 'gold').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Najvyššia úroveň
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bronzové Odznaky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {userBadges.filter(b => b.tier === 'bronze').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Prvé kroky
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badgesList.map(badgeDef => (
            <div key={badgeDef.id} className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span className="text-2xl">{badgeDef.icon}</span>
                {badgeDef.name}
              </h3>
              <p className="text-sm text-muted-foreground">{badgeDef.description}</p>

              {/* Tier badges */}
              <div className="space-y-2">
                {(['bronze', 'silver', 'gold'] as const).map(tier => {
                  const isUnlocked = unlockedBadges.has(`${badgeDef.id}_${tier}`);
                  const tierDef = badgeDef.tiers[tier];
                  const bgClass = getTierBgClass(tier);
                  const textClass = getTierTextClass(tier);
                  
                  // Calculate progress for this tier
                  const currentValue = badgeProgress[badgeDef.id] || 0;
                  const threshold = tierDef.threshold;
                  const progressPercent = Math.min((currentValue / threshold) * 100, 100);

                  return (
                    <div
                      key={tier}
                      className={`p-3 rounded-lg border-2 transition-all ${bgClass} ${
                        isUnlocked ? 'opacity-100' : 'opacity-60 grayscale-[30%]'
                      }`}
                      data-testid={`badge-${badgeDef.id}-${tier}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              className={`bg-gradient-to-r ${getTierColor(tier)} text-white border-0`}
                            >
                              {tier === 'bronze' ? '🥉' : tier === 'silver' ? '🥈' : '🥇'} {tier}
                            </Badge>
                            {isUnlocked && <Unlock className={`w-4 h-4 ${textClass}`} />}
                            {!isUnlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <p className={`text-sm font-medium ${textClass}`}>
                            {tierDef.description}
                          </p>
                          
                          {/* Progress bar for locked badges */}
                          {!isUnlocked && (
                            <div className="mt-2 space-y-1">
                              <Progress value={progressPercent} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {currentValue} / {threshold} ({Math.round(progressPercent)}%)
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {userBadges.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎣</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Zatiaľ žiadne odznaky</h2>
            <p className="text-muted-foreground">
              Začnite s úlovkami a zbierajte odznaky! Čím viac rybárite, tým viac odznakov odomknete.
            </p>
          </div>
        )}
      </div>
    </DiaryLayout>
  );
}
