import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useConfetti } from "@/hooks/useConfetti";
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
  Zap,
  Edit,
  Settings
} from "lucide-react";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";

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
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg 
        className="transform -rotate-90" 
        width={size} 
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// Goal Achievement Badge Component
function AchievementBadge({ goal }: { goal: SeasonGoal }) {
  const IconComponent = getGoalIcon(goal.goalType);
  
  return (
    <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border-primary/20 border">
      <div className="p-2 bg-primary rounded-full">
        <IconComponent className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground truncate">{goal.title}</div>
        <div className="text-sm text-muted-foreground">
          Splnený {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : ''}
        </div>
      </div>
      <Trophy className="w-5 h-5 text-yellow-500" />
    </div>
  );
}

// Get icon for goal type
function getGoalIcon(goalType: string) {
  switch (goalType) {
    case 'total_weight': return Weight;
    case 'fish_count': return Fish;
    case 'trips_count': return MapPin;
    case 'biggest_fish': return Ruler;
    case 'species_variety': return Star;
    default: return Target;
  }
}

// Get color for goal type
function getGoalColor(goalType: string) {
  switch (goalType) {
    case 'total_weight': return 'text-blue-600 dark:text-blue-400';
    case 'fish_count': return 'text-green-600 dark:text-green-400';
    case 'trips_count': return 'text-purple-600 dark:text-purple-400';
    case 'biggest_fish': return 'text-orange-600 dark:text-orange-400';
    case 'species_variety': return 'text-pink-600 dark:text-pink-400';
    default: return 'text-gray-600 dark:text-gray-400';
  }
}

// Goal type labels
function getGoalTypeLabel(goalType: string) {
  switch (goalType) {
    case 'total_weight': return 'Celková váha';
    case 'fish_count': return 'Počet rýb';
    case 'trips_count': return 'Počet výprav';
    case 'biggest_fish': return 'Najväčšia ryba';
    case 'species_variety': return 'Druhy rýb';
    default: return goalType;
  }
}

export default function SeasonalGoals() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { celebrateGoalCompletion } = useConfetti();

  // Fetch current season from API
  const { data: currentSeason, isLoading: seasonLoading } = useQuery<Season>({
    queryKey: ["/api/seasons/current"],
    enabled: !!user
  });

  // Fetch user's seasonal goals
  const { data: allGoals = [], isLoading: goalsLoading } = useQuery<SeasonGoal[]>({
    queryKey: ["/api/seasonal-goals"],
    enabled: !!user
  });

  // Filter goals by current season
  const seasonGoals = currentSeason ? allGoals.filter(goal => goal.seasonId === currentSeason.id) : [];
  const completedGoals = seasonGoals.filter(goal => goal.isCompleted);
  const activeGoals = seasonGoals.filter(goal => !goal.isCompleted);
  const mainGoal = seasonGoals.find(goal => goal.isMainGoal);

  // Trigger confetti for completed goals
  useEffect(() => {
    const newlyCompletedGoals = seasonGoals.filter(goal => 
      goal.isCompleted && 
      goal.completedAt &&
      new Date(goal.completedAt).getTime() > Date.now() - 5000 // Completed in last 5 seconds
    );
    
    if (newlyCompletedGoals.length > 0) {
      celebrateGoalCompletion();
    }
  }, [seasonGoals, celebrateGoalCompletion]);

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Sezónne ciele</h1>
              <p className="text-muted-foreground">
                Nastavte si ciele a sledujte svoj pokrok počas ročnej sezóny (15. január - 14. január)
              </p>
            </div>
            <Button 
              onClick={() => setLocation("/diary/seasonal-goals/create")}
              data-testid="button-create-goal"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nový cieľ
            </Button>
          </div>

          {/* Current Season Display */}
          {currentSeason && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Aktuálna sezóna
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary text-primary-foreground text-lg px-4 py-2">
                    {currentSeason.name}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(currentSeason.startDate).toLocaleDateString('sk-SK')} - {new Date(currentSeason.endDate).toLocaleDateString('sk-SK')}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Season Overview */}
          {currentSeason && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Target className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{seasonGoals.length}</div>
                  <div className="text-sm text-muted-foreground">Celkom cieľov</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{completedGoals.length}</div>
                  <div className="text-sm text-muted-foreground">Splnených</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{activeGoals.length}</div>
                  <div className="text-sm text-muted-foreground">Aktívnych</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Goal Progress */}
          {mainGoal && (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-primary" />
                  Hlavný cieľ sezóny
                  {mainGoal.isCompleted && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Splnený!
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <CircularProgress 
                      value={parseFloat(mainGoal.currentValue)} 
                      max={parseFloat(mainGoal.targetValue)}
                      size={140}
                      strokeWidth={12}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">
                          {Math.round((parseFloat(mainGoal.currentValue) / parseFloat(mainGoal.targetValue)) * 100)}%
                        </div>
                        <div className="text-sm text-muted-foreground">splnené</div>
                      </div>
                    </CircularProgress>
                  </div>
                  
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-foreground mb-2">{mainGoal.title}</h3>
                    {mainGoal.description && (
                      <p className="text-muted-foreground mb-4">{mainGoal.description}</p>
                    )}
                    <div className="flex items-center justify-center md:justify-start gap-4 text-lg">
                      <span className="font-semibold text-primary">
                        {mainGoal.currentValue} {mainGoal.unit}
                      </span>
                      <span className="text-muted-foreground">z</span>
                      <span className="font-semibold text-foreground">
                        {mainGoal.targetValue} {mainGoal.unit}
                      </span>
                    </div>
                    <div className="mt-4">
                      <Progress 
                        value={(parseFloat(mainGoal.currentValue) / parseFloat(mainGoal.targetValue)) * 100} 
                        className="h-3"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Goals Tabs */}
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active" data-testid="tab-active-goals">
                Aktívne ciele ({activeGoals.length})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed-goals">
                Splnené ciele ({completedGoals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeGoals.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Žiadne aktívne ciele
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Vytvorte si nové ciele pre túto sezónu a začnite sledovať svoj pokrok.
                    </p>
                    <Button 
                      onClick={() => setLocation("/diary/seasonal-goals/create")}
                      data-testid="button-create-first-goal"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Vytvoriť prvý cieľ
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeGoals.map((goal) => {
                    const IconComponent = getGoalIcon(goal.goalType);
                    const progress = (parseFloat(goal.currentValue) / parseFloat(goal.targetValue)) * 100;
                    
                    return (
                      <Card key={goal.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <IconComponent className={`w-5 h-5 ${getGoalColor(goal.goalType)}`} />
                              <CardTitle className="text-lg">{goal.title}</CardTitle>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setLocation(`/diary/seasonal-goals/${goal.id}/edit`)}
                              data-testid={`button-edit-goal-${goal.id}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                          <CardDescription className="text-sm">
                            {getGoalTypeLabel(goal.goalType)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-foreground">
                                {goal.currentValue} {goal.unit}
                              </span>
                              <span className="text-muted-foreground">
                                z {goal.targetValue} {goal.unit}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="text-right text-sm font-medium text-primary">
                              {Math.round(progress)}% splnené
                            </div>
                            {goal.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {goal.description}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedGoals.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Žiadne splnené ciele
                    </h3>
                    <p className="text-muted-foreground">
                      Keď splníte nejaké ciele, zobrazíme ich tu s vašimi úspechmi.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {completedGoals.map((goal) => (
                    <AchievementBadge key={goal.id} goal={goal} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DiaryLayout>
  );
}