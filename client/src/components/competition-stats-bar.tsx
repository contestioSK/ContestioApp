import { Card, CardContent } from "@/components/ui/card";
import { Fish, Scale, Trophy, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { Catch, Team } from "@shared/schema";

interface CompetitionStatsBarProps {
  catches: (Catch & { team?: Team })[];
  isLoading?: boolean;
  enableCatchDetailLink?: boolean;
}

export default function CompetitionStatsBar({ catches, isLoading, enableCatchDetailLink = false }: CompetitionStatsBarProps) {
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

  return (
    <Card className="mb-6 border-0 shadow-md bg-gradient-to-r from-background to-muted/20" data-testid="competition-stats-bar">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Weight */}
          <div className="text-center" data-testid="stat-total-weight">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Scale className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">Celková váha</p>
            <p className="text-lg font-bold text-foreground" data-testid="value-total-weight">
              {totalWeight.toFixed(2)} kg
            </p>
          </div>
          
          {/* Fish Count */}
          <div className="text-center" data-testid="stat-fish-count">
            <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Fish className="w-4 h-4 text-accent-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">Počet rýb</p>
            <p className="text-lg font-bold text-foreground" data-testid="value-fish-count">
              {fishCount}
            </p>
          </div>
          
          {/* Heaviest Fish */}
          {enableCatchDetailLink ? (
            <Link href={`/diary/catches/${heaviestFish.id}`} data-testid="link-heaviest-fish">
              <div className="text-center cursor-pointer transition-all duration-200 hover:bg-muted/30 dark:hover:bg-muted/20 rounded-lg p-2 -m-2" data-testid="stat-heaviest-fish">
                <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Trophy className="w-4 h-4 text-secondary-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">Najťažšia ryba</p>
                <p className="text-lg font-bold text-foreground" data-testid="value-heaviest-fish">
                  {(Number(heaviestFish.weight) || 0).toFixed(2)} kg
                </p>
                {heaviestFish.team && (
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid="heaviest-fish-team">
                    {heaviestFish.team.name}
                  </p>
                )}
              </div>
            </Link>
          ) : (
            <div className="text-center" data-testid="stat-heaviest-fish">
              <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-4 h-4 text-secondary-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Najťažšia ryba</p>
              <p className="text-lg font-bold text-foreground" data-testid="value-heaviest-fish">
                {(Number(heaviestFish.weight) || 0).toFixed(2)} kg
              </p>
              {heaviestFish.team && (
                <p className="text-xs text-muted-foreground mt-0.5" data-testid="heaviest-fish-team">
                  {heaviestFish.team.name}
                </p>
              )}
            </div>
          )}
          
          {/* Average Weight */}
          <div className="text-center" data-testid="stat-average-weight">
            <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-1">Váhový priemer</p>
            <p className="text-lg font-bold text-foreground" data-testid="value-average-weight">
              {averageWeight.toFixed(2)} kg
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}