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
  Medal,
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
  if (!isActive) return "text-muted-foreground bg-muted/20 border-border/40 opacity-40 grayscale";
  switch (tier) {
    case 'gold': 
      return "text-amber-400 bg-amber-400/10 border-amber-400/50 shadow-[inset_0_0_10px_rgba(251,191,36,0.1)]";
    case 'silver': 
      return "text-slate-300 bg-slate-300/10 border-slate-300/30";
    case 'bronze': 
      return "text-orange-500 bg-orange-500/10 border-orange-500/30";
    default: return "text-muted-foreground bg-muted/10";
  }
};

const getTierAccentColor = (tier: string) => {
  switch (tier) {
    case 'gold': return "bg-amber-500";
    case 'silver': return "bg-slate-400";
    case 'bronze': return "bg-orange-600";
    default: return "bg-muted";
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

const getUserStatus = (count: number, total: number) => {
  const p = (count / total) * 100;
  if (p === 0) return "Nováčik";
  if (p < 30) return "Sľubný štart";
  if (p < 70) return "Pokročilý rybár";
  return "Majster archívu";
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
  const totalPossibleBadges = badgesList.length * 3;
  const currentStatus = getUserStatus(userBadges.length, totalPossibleBadges);

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
      <div className="space-y-12">
        
        {/* HERO HEADER - Dramatic typography */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-0.5 w-8 bg-orange-500"></span>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-500">Tvoje úspechy</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-foreground leading-none">
                Sieň slávy
              </h1>
              <p className="text-sm font-bold text-muted-foreground italic tracking-tight opacity-80 pl-0.5">
                Odznaky a rybárske míľniky
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-2xl shadow-lg">
            <div className="text-right">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-0.5">Tvoj pokrok</span>
              <span className="text-2xl font-black text-foreground leading-none">
                {userBadges.length} <span className="text-xs text-muted-foreground font-normal">/ {totalPossibleBadges}</span>
              </span>
              <div className="flex items-center justify-end gap-1.5 mt-1.5">
                <span className="text-[8px] font-black uppercase tracking-widest text-orange-500">{currentStatus}</span>
                <div className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
              </div>
            </div>
            <div className="h-12 w-12 bg-amber-400/10 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-400/20 shadow-inner">
              <Trophy size={20} strokeWidth={1.75} />
            </div>
          </div>
        </header>

        {/* EMPTY STATE - Dashed border, circular icon */}
        {hasNoBadges && (
          <div className="py-16 text-center space-y-6 bg-card/20 rounded-3xl border border-dashed border-border">
            <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mx-auto border border-border text-muted-foreground">
              <Medal size={36} strokeWidth={1} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase text-foreground tracking-tight">Tvoj prvý odznak čaká</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Stačí pridať prvý úlovok a získaš svoj prvý <span className="text-orange-500 font-bold">bronzový odznak</span>.
              </p>
            </div>
            <Button
              className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-8"
              onClick={() => setLocation('/diary')}
              data-testid="button-add-first-catch"
            >
              <Plus className="w-4 h-4 mr-2" strokeWidth={1.75} />
              Pridať úlovok
            </Button>
          </div>
        )}

        {/* NEXT GOAL CARD - Orange accent, no button */}
        {nextGoal && (
          <Card className="border-orange-500/20 bg-orange-500/[0.03] transition-all hover:border-orange-500/40 rounded-3xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-border/30">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Tvoj najbližší míľnik</span>
                <p className="text-xs font-bold text-foreground mt-1 italic tracking-tight">Už si takmer tam</p>
              </div>
              <div className="p-2 bg-card rounded-lg text-muted-foreground border border-border/50">
                <TrendingUp size={14} strokeWidth={1.75} />
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative shrink-0">
                  <div className="h-20 w-20 rounded-2xl bg-card flex items-center justify-center border border-border shadow-2xl ring-1 ring-white/5">
                    {(() => {
                      const IconComponent = BADGE_ICON_MAP[nextGoal.badgeDef.icon] || Award;
                      return <IconComponent size={32} strokeWidth={1.75} className="text-orange-500" />;
                    })()}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-tighter">
                    {nextGoal.tier}
                  </div>
                </div>

                <div className="flex-1 space-y-1 text-center md:text-left">
                  <h3 className="text-2xl font-black text-foreground italic uppercase tracking-tight">
                    {nextGoal.badgeDef.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium italic">
                    Chýba ti už len <span className="text-foreground font-bold">{nextGoal.remaining} {nextGoal.badgeDef.id.includes('weight') ? 'kg' : 'ks'}</span> k odomknutiu.
                  </p>
                </div>

                <div className="w-full md:w-48 space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tvoj postup</span>
                    <span className="text-xs font-black text-orange-500">{Math.round(nextGoal.progressPercent)}%</span>
                  </div>
                  <Progress value={nextGoal.progressPercent} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TIERED UNLOCKED BADGES - Colored accent lines */}
        <div className="space-y-10">
          {(['gold', 'silver', 'bronze'] as const).map((tier) => {
            const items = unlockedByTier[tier];
            if (items.length === 0) return null;
            
            return (
              <div key={tier} className="space-y-4">
                <div className="flex items-center gap-4 pl-1">
                  <div className={cn("h-1 w-8 rounded-full", getTierAccentColor(tier))} />
                  <h2 className={cn(
                    "text-[10px] font-black uppercase tracking-[0.3em]",
                    getTierHeaderColor(tier)
                  )}>
                    {tier === 'gold' ? 'Zlaté odznaky' : tier === 'silver' ? 'Strieborné odznaky' : 'Bronzové odznaky'}
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {items.map(({ badgeDef }) => {
                    const IconComponent = BADGE_ICON_MAP[badgeDef.icon] || Award;
                    return (
                      <div 
                        key={`${badgeDef.id}_${tier}`} 
                        className="group p-6 rounded-3xl bg-card/40 border border-border/60 hover:border-border transition-all text-center space-y-4"
                        data-testid={`badge-unlocked-${badgeDef.id}-${tier}`}
                      >
                        <div className={cn(
                          "mx-auto h-12 w-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 shadow-lg",
                          getTierStyle(tier)
                        )}>
                          <IconComponent size={24} strokeWidth={1.75} />
                        </div>
                        <p className="text-xs font-black uppercase italic text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
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
        <Collapsible open={showAllBadges} onOpenChange={setShowAllBadges} className="pt-10 border-t border-border/50">
          <CollapsibleTrigger asChild>
            <button 
              className="w-full group flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-all"
              data-testid="button-toggle-all-badges"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-card rounded-lg text-muted-foreground group-hover:text-foreground transition-colors border border-border/50">
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
                  <Card key={badgeDef.id} className="p-4 bg-card/50 rounded-2xl">
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
