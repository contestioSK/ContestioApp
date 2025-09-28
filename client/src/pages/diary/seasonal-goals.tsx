import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, 
  Trophy, 
  Plus, 
  Calendar, 
  Fish, 
  Weight, 
  Ruler, 
  MapPin,
  Star,
  Crown,
  CheckCircle2,
  Clock,
  Zap
} from "lucide-react";
import { useLocation } from "wouter";

// Types from backend
interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface SeasonGoal {
  id: string;
  userId: string;
  seasonId: string;
  goalType: 'total_weight' | 'fish_count' | 'trips_count' | 'biggest_fish' | 'species_variety';
  targetValue: string;
  currentValue: string;
  unit: string;
  title: string;
  description?: string;
  isMainGoal: boolean;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Circular Progress Component
interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

function CircularProgress({ 
  value, 
  max, 
  size = 120, 
  strokeWidth = 8, 
  className = "", 
  children 
}: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted-foreground/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={`transition-all duration-300 ease-in-out ${
            percentage === 100 ? 'text-green-500' : 'text-primary'
          }`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// Goal Type Configuration
const goalTypeConfig = {
  total_weight: {
    icon: Weight,
    label: "Celková hmotnosť",
    color: "text-blue-500",
    unit: "kg"
  },
  fish_count: {
    icon: Fish,
    label: "Počet rýb",
    color: "text-green-500", 
    unit: "ks"
  },
  trips_count: {
    icon: MapPin,
    label: "Počet výprav",
    color: "text-purple-500",
    unit: "výprav"
  },
  biggest_fish: {
    icon: Ruler,
    label: "Najväčšia ryba",
    color: "text-orange-500",
    unit: "kg"
  },
  species_variety: {
    icon: Star,
    label: "Rôzne druhy",
    color: "text-pink-500",
    unit: "druhov"
  }
};

export default function DiarySeasonalGoals() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch current season
  const { data: currentSeason, isLoading: seasonLoading } = useQuery<Season>({
    queryKey: ['/api/seasons/current'],
    enabled: !!user
  });

  // Fetch user's seasonal goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery<SeasonGoal[]>({
    queryKey: ['/api/seasonal-goals'],
    enabled: !!user
  });

  const isLoading = seasonLoading || goalsLoading;

  // Calculate season progress
  const getSeasonProgress = () => {
    if (!currentSeason) return { daysElapsed: 0, totalDays: 0, percentage: 0 };
    
    const now = new Date();
    const start = new Date(currentSeason.startDate);
    const end = new Date(currentSeason.endDate);
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const percentage = Math.min((daysElapsed / totalDays) * 100, 100);
    
    return { daysElapsed: Math.max(0, daysElapsed), totalDays, percentage };
  };

  const seasonProgress = getSeasonProgress();
  const mainGoal = goals.find(goal => goal.isMainGoal);
  const completedGoals = goals.filter(goal => goal.isCompleted);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="page-title">
              <Target className="h-8 w-8 text-primary" />
              Sezónne ciele
            </h1>
            <p className="text-muted-foreground mt-2">
              Sledujte svoj pokrok a dosahujte nové míľniky
            </p>
          </div>
          <Button 
            onClick={() => setLocation('/diary/seasonal-goals/create')}
            className="flex items-center gap-2"
            data-testid="button-create-goal"
          >
            <Plus className="h-4 w-4" />
            Nový cieľ
          </Button>
        </div>

        {/* Season Overview */}
        {currentSeason && (
          <Card data-testid="card-season-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {currentSeason.name}
              </CardTitle>
              <CardDescription>
                {new Date(currentSeason.startDate).toLocaleDateString('sk-SK')} - {new Date(currentSeason.endDate).toLocaleDateString('sk-SK')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <CircularProgress 
                    value={seasonProgress.daysElapsed} 
                    max={seasonProgress.totalDays}
                    size={100}
                  >
                    <div className="text-center">
                      <div className="text-lg font-bold" data-testid="text-season-progress">
                        {Math.round(seasonProgress.percentage)}%
                      </div>
                      <div className="text-xs text-muted-foreground">sezóny</div>
                    </div>
                  </CircularProgress>
                  <p className="text-sm text-muted-foreground mt-2">
                    {seasonProgress.daysElapsed} z {seasonProgress.totalDays} dní
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground" data-testid="text-total-goals">
                    {goals.length}
                  </div>
                  <p className="text-sm text-muted-foreground">celkovo cieľov</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500" data-testid="text-completed-goals">
                    {completedGoals.length}
                  </div>
                  <p className="text-sm text-muted-foreground">dokončených</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Goal Highlight */}
        {mainGoal && (
          <Card className="border-primary/50 bg-primary/5" data-testid="card-main-goal">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Hlavný cieľ sezóny
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <CircularProgress 
                  value={parseFloat(mainGoal.currentValue)} 
                  max={parseFloat(mainGoal.targetValue)}
                  size={140}
                  strokeWidth={10}
                >
                  <div className="text-center">
                    <div className="text-xl font-bold" data-testid={`text-main-goal-progress`}>
                      {Math.round((parseFloat(mainGoal.currentValue) / parseFloat(mainGoal.targetValue)) * 100)}%
                    </div>
                    {mainGoal.isCompleted && (
                      <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mt-1" />
                    )}
                  </div>
                </CircularProgress>
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" data-testid="text-main-goal-title">
                    {mainGoal.title}
                  </h3>
                  {mainGoal.description && (
                    <p className="text-muted-foreground mb-3">{mainGoal.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      <strong>{mainGoal.currentValue}</strong> / {mainGoal.targetValue} {goalTypeConfig[mainGoal.goalType].unit}
                    </span>
                    {mainGoal.isCompleted ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Dokončené
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Prebieha
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const config = goalTypeConfig[goal.goalType];
            const IconComponent = config.icon;
            const progress = (parseFloat(goal.currentValue) / parseFloat(goal.targetValue)) * 100;
            
            return (
              <Card 
                key={goal.id} 
                className={`transition-all duration-200 hover:shadow-lg ${
                  goal.isCompleted ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''
                }`}
                data-testid={`card-goal-${goal.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <IconComponent className={`h-5 w-5 ${config.color}`} />
                    <div className="flex items-center gap-2">
                      {goal.isMainGoal && (
                        <Crown className="h-4 w-4 text-primary" />
                      )}
                      {goal.isCompleted && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg" data-testid={`text-goal-title-${goal.id}`}>
                    {goal.title}
                  </CardTitle>
                  <CardDescription>{config.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-4">
                    <CircularProgress 
                      value={parseFloat(goal.currentValue)} 
                      max={parseFloat(goal.targetValue)}
                      size={80}
                    >
                      <div className="text-center">
                        <div className="text-sm font-bold" data-testid={`text-goal-progress-${goal.id}`}>
                          {Math.round(progress)}%
                        </div>
                      </div>
                    </CircularProgress>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Pokrok:</span>
                      <span className="font-medium" data-testid={`text-goal-values-${goal.id}`}>
                        {goal.currentValue} / {goal.targetValue} {config.unit}
                      </span>
                    </div>
                    
                    {goal.isCompleted && goal.completedAt && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Dokončené:</span>
                        <span>{new Date(goal.completedAt).toLocaleDateString('sk-SK')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {goals.length === 0 && (
          <Card className="text-center py-12" data-testid="card-empty-state">
            <CardContent>
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Žiadne sezónne ciele</h3>
              <p className="text-muted-foreground mb-6">
                Vytvorte si svoj prvý cieľ a začnite sledovať pokrok
              </p>
              <Button 
                onClick={() => setLocation('/diary/seasonal-goals/create')}
                className="flex items-center gap-2"
                data-testid="button-create-first-goal"
              >
                <Plus className="h-4 w-4" />
                Vytvoriť cieľ
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}