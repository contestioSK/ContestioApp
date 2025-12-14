import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Fish, Scale, Trophy, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { Catch, Team } from "@shared/schema";

type ModalType = "weight" | "count" | "heaviest" | "average" | null;

interface CompetitionStatsBarProps {
  catches: (Catch & { team?: Team })[];
  isLoading?: boolean;
  enableCatchDetailLink?: boolean;
  competitionId?: string;
}

export default function CompetitionStatsBar({ catches, isLoading, enableCatchDetailLink = false, competitionId }: CompetitionStatsBarProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  if (isLoading) {
    return (
      <Card className="mb-6 border-0 shadow-md bg-gradient-to-r from-background to-muted/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="w-8 h-8 bg-muted rounded-full mx-auto mb-2 animate-pulse"></div>
                <div className="h-3 bg-muted rounded w-12 mx-auto mb-1 animate-pulse"></div>
                <div className="h-5 bg-muted rounded w-16 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!catches || catches.length === 0) {
    return (
      <Card className="mb-6 border-0 shadow-md bg-gradient-to-r from-background to-muted/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center" data-testid="stat-total-weight">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Scale className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Celková váha</p>
              <p className="text-lg font-bold text-foreground">0 kg</p>
            </div>
            
            <div className="text-center" data-testid="stat-fish-count">
              <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Fish className="w-4 h-4 text-accent-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Počet rýb</p>
              <p className="text-lg font-bold text-foreground">0</p>
            </div>
            
            <div className="text-center" data-testid="stat-heaviest-fish">
              <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-4 h-4 text-secondary-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Najťažšia ryba</p>
              <p className="text-lg font-bold text-foreground">0 kg</p>
            </div>
            
            <div className="text-center" data-testid="stat-average-weight">
              <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Váhový priemer</p>
              <p className="text-lg font-bold text-foreground">0 kg</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics with robustness guards
  const totalWeight = catches.reduce((sum, catch_) => {
    const weight = Number(catch_.weight) || 0;
    return sum + weight;
  }, 0);
  const fishCount = catches.length;
  const heaviestFish = catches.reduce((max, current) => {
    const currentWeight = Number(current.weight) || 0;
    const maxWeight = Number(max.weight) || 0;
    return currentWeight > maxWeight ? current : max;
  });
  const averageWeight = fishCount > 0 ? totalWeight / fishCount : 0;

  const sortedByWeight = [...catches].sort((a, b) => Number(b.weight) - Number(a.weight));
  const sortedByTime = [...catches].sort((a, b) => 
    new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
  );

  const getFishTypeLabel = (fishType: string) => {
    switch (fishType) {
      case 'scaly': return 'Šupináč';
      case 'mirror': return 'Lysec';
      default: return fishType;
    }
  };

  return (
    <>
      <Card className="mb-6 border-0 shadow-md bg-gradient-to-r from-background to-muted/20" data-testid="competition-stats-bar">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Weight - Clickable */}
            <button
              onClick={() => setActiveModal("weight")}
              className="text-center cursor-pointer transition-all duration-200 hover:bg-muted/30 dark:hover:bg-muted/20 rounded-lg p-2 -m-2"
              data-testid="stat-total-weight"
            >
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Scale className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Celková váha</p>
              <p className="text-lg font-bold text-foreground underline decoration-dotted underline-offset-2" data-testid="value-total-weight">
                {totalWeight.toFixed(2)} kg
              </p>
            </button>
            
            {/* Fish Count - Clickable */}
            <button
              onClick={() => setActiveModal("count")}
              className="text-center cursor-pointer transition-all duration-200 hover:bg-muted/30 dark:hover:bg-muted/20 rounded-lg p-2 -m-2"
              data-testid="stat-fish-count"
            >
              <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Fish className="w-4 h-4 text-accent-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Počet rýb</p>
              <p className="text-lg font-bold text-foreground underline decoration-dotted underline-offset-2" data-testid="value-fish-count">
                {fishCount}
              </p>
            </button>
            
            {/* Heaviest Fish - Clickable */}
            <button
              onClick={() => setActiveModal("heaviest")}
              className="text-center cursor-pointer transition-all duration-200 hover:bg-muted/30 dark:hover:bg-muted/20 rounded-lg p-2 -m-2"
              data-testid="stat-heaviest-fish"
            >
              <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-4 h-4 text-secondary-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Najťažšia ryba</p>
              <p className="text-lg font-bold text-foreground underline decoration-dotted underline-offset-2" data-testid="value-heaviest-fish">
                {(Number(heaviestFish.weight) || 0).toFixed(2)} kg
              </p>
              {heaviestFish.team && (
                <p className="text-xs text-muted-foreground mt-0.5" data-testid="heaviest-fish-team">
                  {heaviestFish.team.name}
                </p>
              )}
            </button>
            
            {/* Average Weight - Clickable */}
            <button
              onClick={() => setActiveModal("average")}
              className="text-center cursor-pointer transition-all duration-200 hover:bg-muted/30 dark:hover:bg-muted/20 rounded-lg p-2 -m-2"
              data-testid="stat-average-weight"
            >
              <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Váhový priemer</p>
              <p className="text-lg font-bold text-foreground underline decoration-dotted underline-offset-2" data-testid="value-average-weight">
                {averageWeight.toFixed(2)} kg
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Total Weight Modal */}
      <Dialog open={activeModal === "weight"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Celková váha: {totalWeight.toFixed(2)} kg
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {sortedByWeight.slice(0, 10).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                    <div>
                      <p className="font-medium">{Number(c.weight).toFixed(2)} kg</p>
                      <p className="text-xs text-muted-foreground">{c.team?.name || 'Neznámy tím'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{getFishTypeLabel(c.fishType)}</span>
                </div>
              ))}
              {catches.length > 10 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  ... a ďalších {catches.length - 10} úlovkov
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Fish Count Modal */}
      <Dialog open={activeModal === "count"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fish className="w-5 h-5 text-accent-foreground" />
              Počet rýb: {fishCount}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {sortedByTime.slice(0, 15).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">{Number(c.weight).toFixed(2)} kg - {getFishTypeLabel(c.fishType)}</p>
                    <p className="text-xs text-muted-foreground">{c.team?.name || 'Neznámy tím'}</p>
                  </div>
                  {c.submittedAt && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(c.submittedAt), "d.M. HH:mm", { locale: sk })}
                    </span>
                  )}
                </div>
              ))}
              {catches.length > 15 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  ... a ďalších {catches.length - 15} úlovkov
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Heaviest Fish Modal */}
      <Dialog open={activeModal === "heaviest"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-secondary" />
              Najťažšia ryba
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {heaviestFish.photoUrl && (
              <div className="relative rounded-lg overflow-hidden">
                <img 
                  src={heaviestFish.photoUrl} 
                  alt="Najťažšia ryba"
                  className="w-full h-auto max-h-64 object-contain bg-muted"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Váha</p>
                <p className="font-bold text-lg">{Number(heaviestFish.weight).toFixed(2)} kg</p>
              </div>
              <div>
                <p className="text-muted-foreground">Typ ryby</p>
                <p className="font-semibold">{getFishTypeLabel(heaviestFish.fishType)}</p>
              </div>
              {heaviestFish.team && (
                <div>
                  <p className="text-muted-foreground">Tím</p>
                  {competitionId ? (
                    <Link 
                      href={`/competition/${competitionId}/team/${heaviestFish.teamId}`}
                      className="font-semibold text-secondary hover:underline"
                      onClick={() => setActiveModal(null)}
                    >
                      {heaviestFish.team.name}
                    </Link>
                  ) : (
                    <p className="font-semibold">{heaviestFish.team.name}</p>
                  )}
                </div>
              )}
              {heaviestFish.submittedAt && (
                <div>
                  <p className="text-muted-foreground">Dátum</p>
                  <p className="font-semibold">
                    {format(new Date(heaviestFish.submittedAt), "d. MMMM yyyy, HH:mm", { locale: sk })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Average Weight Modal */}
      <Dialog open={activeModal === "average"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              Váhový priemer: {averageWeight.toFixed(2)} kg
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{fishCount}</p>
                <p className="text-xs text-muted-foreground">Celkový počet</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{totalWeight.toFixed(1)} kg</p>
                <p className="text-xs text-muted-foreground">Celková váha</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Top 5 najťažších:</p>
              {sortedByWeight.slice(0, 5).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                    <span className="font-medium">{Number(c.weight).toFixed(2)} kg</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{c.team?.name}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}