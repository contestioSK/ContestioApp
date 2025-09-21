import { Card, CardContent } from "@/components/ui/card";
import { Fish, Scale, Trophy, TrendingUp } from "lucide-react";
import type { Catch, Team } from "@shared/schema";

interface CompetitionStatsBarProps {
  catches: (Catch & { team?: Team })[];
  isLoading?: boolean;
}

export default function CompetitionStatsBar({ catches, isLoading }: CompetitionStatsBarProps) {
  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-3 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-16 mx-auto mb-2 animate-pulse"></div>
                <div className="h-6 bg-muted rounded w-20 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!catches || catches.length === 0) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center" data-testid="stat-total-weight">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Scale className="w-6 h-6 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Celková váha</p>
              <p className="text-2xl font-bold text-foreground">0 kg</p>
            </div>
            
            <div className="text-center" data-testid="stat-fish-count">
              <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Fish className="w-6 h-6 text-secondary" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Počet rýb</p>
              <p className="text-2xl font-bold text-foreground">0</p>
            </div>
            
            <div className="text-center" data-testid="stat-heaviest-fish">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Najťažšia ryba</p>
              <p className="text-2xl font-bold text-foreground">0 kg</p>
            </div>
            
            <div className="text-center" data-testid="stat-average-weight">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Váhový priemer</p>
              <p className="text-2xl font-bold text-foreground">0 kg</p>
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
    <Card className="mb-8" data-testid="competition-stats-bar">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Total Weight */}
          <div className="text-center" data-testid="stat-total-weight">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Scale className="w-6 h-6 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Celková váha</p>
            <p className="text-2xl font-bold text-foreground" data-testid="value-total-weight">
              {totalWeight.toFixed(2)} kg
            </p>
          </div>
          
          {/* Fish Count */}
          <div className="text-center" data-testid="stat-fish-count">
            <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Fish className="w-6 h-6 text-secondary" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Počet rýb</p>
            <p className="text-2xl font-bold text-foreground" data-testid="value-fish-count">
              {fishCount}
            </p>
          </div>
          
          {/* Heaviest Fish */}
          <div className="text-center" data-testid="stat-heaviest-fish">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Najťažšia ryba</p>
            <p className="text-2xl font-bold text-foreground" data-testid="value-heaviest-fish">
              {parseFloat(heaviestFish.weight).toFixed(2)} kg
            </p>
            {heaviestFish.team && (
              <p className="text-xs text-muted-foreground mt-1" data-testid="heaviest-fish-team">
                {heaviestFish.team.name}
              </p>
            )}
          </div>
          
          {/* Average Weight */}
          <div className="text-center" data-testid="stat-average-weight">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Váhový priemer</p>
            <p className="text-2xl font-bold text-foreground" data-testid="value-average-weight">
              {averageWeight.toFixed(2)} kg
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}