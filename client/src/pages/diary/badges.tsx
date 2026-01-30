import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useConfetti } from "@/hooks/useConfetti";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Lock, 
  Unlock, 
  ChevronDown, 
  Plus, 
  Trophy, 
  Sparkles, 
  Award, 
  Calendar, 
  Crosshair, 
  Crown, 
  Moon, 
  FileText, 
  Snowflake,
  TrendingUp,
  Target,
  type LucideIcon 
} from "lucide-react";
import { Dna } from "lucide-react";

const BADGE_COUNT_STORAGE_KEY = 'lastKnownBadgeCount';

const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  Calendar,
  Crosshair,
  Target,
  Crown,
  Dna,
  Moon,
  FileText,
  Snowflake,
};

import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { BADGE_DEFINITIONS, getTierColor, getTierBgClass, getTierTextClass, BadgeTier } from "@shared/badges";
import type { UserBadge } from "@shared/schema";
import { BadgeCelebrationModal } from "@/components/diary/BadgeCelebrationModal";
import { cn } from "@/lib/utils";

const getTierStyle = (tier: string, isActive = true) => {
  if (!isActive) return "text-muted-foreground bg-muted/20 border-border/40 opacity-40";
  switch (tier) {
    case 'gold': 
      return "text-amber-400 bg-amber-400/10 border-amber-400/50 shadow-[inset_0_0_10px_rgba(251,191,36,0.1)] scale-[1.02]";
    case 'silver': 
      return "text-slate-300 bg-slate-300/10 border-slate-300/30";
    case 'bronze': 
      return "text-orange-500 bg-orange-500/10 border-orange-500/30";
    default: return "text-muted-foreground bg-muted/10";
  }
};

const getTierHeaderColor = (tier: string) => {
  switch (tier) {
    case 'gold': return "text-amber-500";
    case 'silver': return "text-slate-400";
    case 'bronze': return "text-orange-600";
    default: return "text-muted-foreground";
  }
};

export default function BadgesPage() {
  const { user } = useAuth();
  const { celebrateGoalCompletion } = useConfetti();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [demoBadge, setDemoBadge] = useState<{
    badgeType: string;
    badgeName: string;
    tier: BadgeTier;
    icon: string;
  } | null>(null);

  const { data: userBadges = [], isSuccess: badgesLoaded } = useQuery<UserBadge[]>({
    queryKey: ["/api/diary/badges"],
    enabled: !!user?.id
  });

  const { data: badgeProgress = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/diary/badges/progress"],
    enabled: !!user?.id
  });

  useEffect(() => {
    if (!badgesLoaded || userBadges.length === 0) return;
    
    try {
      const storedCount = localStorage.getItem(BADGE_COUNT_STORAGE_KEY);
      const lastKnownCount = storedCount ? parseInt(storedCount, 10) : null;
      
      if (lastKnownCount !== null && userBadges.length > lastKnownCount) {
        celebrateGoalCompletion();
        toast({
          title: "🏅 Nový odznak odomknutý!",
          description: "Gratulujeme! Získali ste nový odznak.",
        });
      }
      
      localStorage.setItem(BADGE_COUNT_STORAGE_KEY, userBadges.length.toString());
    } catch {
      // localStorage not available
    }
  }, [badgesLoaded, userBadges.length, celebrateGoalCompletion, toast]);

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

  const unlockedByTier = useMemo(() => {
    const result: Record<'gold' | 'silver' | 'bronze', { badgeDef: typeof badgesList[0]; tier: 'gold' | 'silver' | 'bronze' }[]> = {
      gold: [],
      silver: [],
      bronze: [],
    };
    
    for (const badgeDef of badgesList) {
      for (const tier of ['gold', 'silver', 'bronze'] as const) {
        if (unlockedBadges.has(`${badgeDef.id}_${tier}`)) {
          result[tier].push({ badgeDef, tier });
        }
      }
    }
    return result;
  }, [badgesList, unlockedBadges]);

  const hasNoBadges = userBadges.length === 0;

  return (
    <DiaryLayout>
      <div className="space-y-10">
        
        {/* HERO HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">Sieň slávy</h1>
            <p className="text-muted-foreground text-sm font-medium">Prehľad tvojich rybárskych úspechov a míľnikov.</p>
          </div>
          <div className="flex items-center gap-3 bg-card border border-border p-3 rounded-xl shadow-sm">
            <div className="text-right">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Stav zbierky</span>
              <span className="text-xl font-black text-amber-500 leading-none">
                {userBadges.length} <span className="text-xs text-muted-foreground font-normal">/ {badgesList.length * 3}</span>
              </span>
            </div>
            <div className="h-10 w-10 bg-amber-400/10 rounded-lg flex items-center justify-center text-amber-400">
              <Trophy size={20} strokeWidth={1.75} />
            </div>
          </div>
        </div>

        {/* EMPTY STATE */}
        {hasNoBadges && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-5 text-center">
              <div className="text-5xl mb-3">🎣</div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Tvoj prvý odznak čaká
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Stačí pridať prvý úlovok a odomkneš <span className="text-amber-500 font-semibold">Bronze</span> odznak.
              </p>
              <Button
                className="bg-orange-500 hover:bg-orange-400 text-white font-bold"
                onClick={() => setLocation('/diary')}
                data-testid="button-add-first-catch"
              >
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.75} />
                Pridať úlovok
              </Button>
            </CardContent>
          </Card>
        )}

        {/* NEXT GOAL CARD - Blue accent, badge name first */}
        {nextGoal && (
          <Card className="border-blue-500/20 bg-blue-500/[0.03] transition-all hover:bg-blue-500/[0.05]">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative shrink-0">
                  <div className="h-20 w-20 rounded-2xl bg-background flex items-center justify-center border border-border shadow-xl ring-1 ring-white/5">
                    {(() => {
                      const IconComponent = BADGE_ICON_MAP[nextGoal.badgeDef.icon] || Award;
                      return <IconComponent size={32} strokeWidth={1.75} className="text-blue-400" />;
                    })()}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded shadow-lg border border-white/10 uppercase">
                    {nextGoal.tier}
                  </div>
                </div>

                <div className="flex-1 space-y-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-blue-400 mb-1">
                    <TrendingUp size={14} strokeWidth={1.75} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Najbližší míľnik</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground tracking-tight leading-tight">
                    {nextGoal.badgeDef.name} <span className="text-muted-foreground font-normal ml-1">({nextGoal.tier})</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Už len <span className="text-foreground font-bold">{nextGoal.remaining} {nextGoal.badgeDef.id.includes('weight') ? 'kg' : 'úlovkov'}</span> k odomknutiu.
                  </p>
                </div>

                <div className="w-full md:w-48 space-y-2.5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Postup</span>
                    <span className="text-xs font-black text-blue-400">{Math.round(nextGoal.progressPercent)}%</span>
                  </div>
                  <Progress value={nextGoal.progressPercent} className="h-1.5" />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  size="sm"
                  className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold"
                  onClick={() => setLocation('/diary')}
                  data-testid="button-add-catch-for-badge"
                >
                  <Plus className="w-4 h-4 mr-2" strokeWidth={1.75} />
                  Pridať úlovok
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TIERED UNLOCKED BADGES */}
        <div className="space-y-8">
          {(['gold', 'silver', 'bronze'] as const).map((tier) => {
            const items = unlockedByTier[tier];
            if (items.length === 0) return null;
            
            return (
              <div key={tier} className="space-y-4">
                <div className="flex items-center gap-2 pl-1 border-l-2 border-border">
                  <h2 className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] ml-2",
                    getTierHeaderColor(tier)
                  )}>
                    {tier === 'gold' ? 'Zlaté' : tier === 'silver' ? 'Strieborné' : 'Bronzové'} Odznaky
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {items.map(({ badgeDef }) => {
                    const IconComponent = BADGE_ICON_MAP[badgeDef.icon] || Award;
                    return (
                      <div 
                        key={`${badgeDef.id}_${tier}`} 
                        className="group p-4 rounded-xl bg-card/30 border border-border/40 hover:border-border transition-all text-center space-y-3"
                        data-testid={`badge-unlocked-${badgeDef.id}-${tier}`}
                      >
                        <div className={cn(
                          "mx-auto h-12 w-12 rounded-lg flex items-center justify-center border transition-all group-hover:scale-110",
                          getTierStyle(tier)
                        )}>
                          <IconComponent size={24} strokeWidth={1.75} />
                        </div>
                        <p className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground truncate px-1">
                          {badgeDef.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* CATALOG - Collapsible with grayscale locked badges */}
        <Collapsible open={showAllBadges} onOpenChange={setShowAllBadges} className="pt-8 border-t border-border">
          <CollapsibleTrigger asChild>
            <button 
              className="w-full group flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-all"
              data-testid="button-toggle-all-badges"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-lg text-muted-foreground group-hover:text-foreground transition-colors">
                  <Lock size={14} strokeWidth={1.75} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">
                  Katalóg výziev
                </span>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-300",
                showAllBadges && "rotate-180"
              )} strokeWidth={1.75} />
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {badgesList.map(badgeDef => {
                const IconComponent = BADGE_ICON_MAP[badgeDef.icon] || Award;
                
                return (
                  <Card key={badgeDef.id} className="p-4 bg-card/50">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                        <IconComponent size={18} strokeWidth={1.75} />
                      </div>
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
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg transition-all",
                              isUnlocked 
                                ? "bg-muted/50" 
                                : "bg-muted/20 opacity-50 grayscale"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {tier === 'bronze' ? '🥉' : tier === 'silver' ? '🥈' : '🥇'}
                              </span>
                              <span className="text-xs text-muted-foreground">{tierDef.description}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isUnlocked ? (
                                <Unlock className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                              ) : (
                                <span className="text-[10px] text-muted-foreground">{currentValue}/{threshold}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Demo Button - subtle placement */}
        <div className="flex justify-center pt-4">
          <Button
            variant="ghost"
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
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-demo-celebration"
          >
            <Sparkles className="w-4 h-4 mr-2" strokeWidth={1.75} />
            Demo oslavy
          </Button>
        </div>
      </div>

      {/* Demo Badge Celebration Modal */}
      <BadgeCelebrationModal
        badge={demoBadge}
        onClose={() => setDemoBadge(null)}
      />
    </DiaryLayout>
  );
}
