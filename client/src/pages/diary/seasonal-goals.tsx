import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useConfetti } from "@/hooks/useConfetti";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Trash2,
  History,
  Lock,
  Moon
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  goalType: 'total_weight' | 'fish_count' | 'trips_count' | 'biggest_fish' | 'species_variety' | 'min_size_catch_count' | 'min_weight_catch_count' | 'spot_catch_count' | 'bait_catch_count' | 'night_trips_count';
  targetValue: string;
  currentValue: string;
  unit: string;
  title: string;
  description?: string;
  parameters?: {
    minSize?: number;
    minWeight?: number;
    spotName?: string;
    baitId?: string;
    baitName?: string;
  };
  isMainGoal: boolean;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface GoalLimit {
  canCreate: boolean;
  currentCount: number;
  limit: number; // -1 means unlimited (premium)
  isPremium: boolean;
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
    case 'min_size_catch_count': return Ruler;
    case 'min_weight_catch_count': return Weight;
    case 'spot_catch_count': return MapPin;
    case 'bait_catch_count': return Target;
    case 'night_trips_count': return Moon;
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
    case 'min_size_catch_count': return 'text-cyan-600 dark:text-cyan-400';
    case 'min_weight_catch_count': return 'text-indigo-600 dark:text-indigo-400';
    case 'spot_catch_count': return 'text-teal-600 dark:text-teal-400';
    case 'bait_catch_count': return 'text-rose-600 dark:text-rose-400';
    case 'night_trips_count': return 'text-slate-600 dark:text-slate-400';
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
    case 'personal_best': return 'Osobný rekord';
    case 'min_size_catch_count': return 'Ryby nad veľkosť';
    case 'min_weight_catch_count': return 'Ryby nad hmotnosť';
    case 'spot_catch_count': return 'Ryby na revíri';
    case 'bait_catch_count': return 'Ryby na nástrahu';
    case 'night_trips_count': return 'Nočné výpravy';
    default: return goalType;
  }
}

// Format number with spaces for thousands and comma for decimals
function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  // Round to 1 decimal place
  const rounded = Math.round(num * 10) / 10;
  
  // Format with Slovak locale (uses comma for decimals and nbsp for thousands)
  const formatted = rounded.toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  
  // Replace non-breaking spaces with regular spaces for thousands separator
  return formatted.replace(/\u00A0/g, ' ');
}

export default function SeasonalGoals() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { celebrateGoalCompletion } = useConfetti();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Fetch all seasons for the dropdown
  const { data: allSeasons = [] } = useQuery<Season[]>({
    queryKey: ["/api/seasons"],
    enabled: !!user
  });

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

  // Fetch goal limit status
  const { data: goalLimit } = useQuery<GoalLimit>({
    queryKey: ["/api/seasonal-goals/limit"],
    enabled: !!user
  });

  // Set selected season to current season by default
  useEffect(() => {
    if (currentSeason && !selectedSeasonId) {
      setSelectedSeasonId(currentSeason.id);
    }
  }, [currentSeason, selectedSeasonId]);

  // Get the active season (selected or current)
  const activeSeason = selectedSeasonId 
    ? allSeasons.find(s => s.id === selectedSeasonId) || currentSeason
    : currentSeason;

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      await apiRequest("DELETE", `/api/seasonal-goals/${goalId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasonal-goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seasonal-goals/limit"] });
      toast({
        title: "🗑️ Cieľ zmazaný",
        description: "Cieľ bol úspešne odstránený.",
      });
    },
    onError: () => {
      toast({
        title: "❌ Chyba",
        description: "Nepodarilo sa zmazať cieľ.",
        variant: "destructive",
      });
    },
  });

  // Filter goals by selected season
  const seasonGoals = activeSeason ? allGoals.filter(goal => goal.seasonId === activeSeason.id) : [];
  const completedGoals = seasonGoals.filter(goal => goal.isCompleted);
  const activeGoals = seasonGoals.filter(goal => !goal.isCompleted);
  const mainGoal = seasonGoals.find(goal => goal.isMainGoal);
  const isViewingHistoricalSeason = selectedSeasonId && selectedSeasonId !== currentSeason?.id;

  // Find goal closest to completion (highest percentage) - "Ďalší na Rade"
  const nextGoal = activeGoals
    .filter(goal => !goal.isMainGoal) // Exclude main goal
    .map(goal => ({
      ...goal,
      percentage: (parseFloat(goal.currentValue) / parseFloat(goal.targetValue)) * 100
    }))
    .sort((a, b) => b.percentage - a.percentage)[0]; // Highest percentage first

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
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Sezónne Ciele</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Nastavte si ciele a sledujte svoj pokrok počas sezóny
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Season Switcher */}
              {allSeasons.length > 1 && (
                <Select
                  value={selectedSeasonId || currentSeason?.id || ""}
                  onValueChange={setSelectedSeasonId}
                >
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-season">
                    <History className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Vyber sezónu" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSeasons.map((season) => (
                      <SelectItem key={season.id} value={season.id} data-testid={`select-season-${season.id}`}>
                        <div className="flex items-center gap-2">
                          {season.name}
                          {season.isActive && (
                            <Badge variant="secondary" className="text-xs">Aktuálna</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!isViewingHistoricalSeason && (
                <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                  {/* Goal limit indicator for FREE users only */}
                  {goalLimit && !goalLimit.isPremium && (
                    <div className="text-xs text-muted-foreground text-right">
                      FREE účet: {goalLimit.currentCount} / {goalLimit.limit} cieľov
                    </div>
                  )}
                  {goalLimit && !goalLimit.canCreate ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          disabled
                          data-testid="button-create-goal-disabled"
                          className="bg-muted text-muted-foreground cursor-not-allowed w-full sm:w-auto"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          <span className="sm:inline">Limit dosiahnutý</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-sm">
                          Dosiahol si maximálny počet cieľov ({goalLimit.limit}) pre FREE účet.
                        </p>
                        <Button 
                          size="sm" 
                          className="mt-2 w-full"
                          onClick={() => setLocation("/pricing")}
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Prejsť na PREMIUM
                        </Button>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button 
                      onClick={() => setLocation("/diary/seasonal-goals/create")}
                      data-testid="button-create-goal"
                      className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="sm:inline">Vytvoriť Cieľ</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Historical season notice */}
          {isViewingHistoricalSeason && (
            <Card className="bg-muted/50 border-muted-foreground/20">
              <CardContent className="p-4 flex items-center gap-3">
                <History className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Zobrazuješ históriu sezóny {activeSeason?.name}</p>
                  <p className="text-sm text-muted-foreground">Ciele z minulých sezón nie je možné upravovať.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Súhrnné Widgety */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Widget 1: Celkom Cieľov */}
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-foreground" data-testid="text-total-goals-count">{seasonGoals.length}</div>
                <div className="text-sm text-muted-foreground mt-1">Celkom Cieľov</div>
              </CardContent>
            </Card>

            {/* Widget 2: Ďalší na Rade - Motivačný s gradientom */}
            <Card className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-primary/30">
              <CardContent className="p-6">
                {nextGoal ? (
                  <div className="text-center">
                    <Zap className="w-10 h-10 text-primary mx-auto mb-3" />
                    <div className="text-lg font-semibold text-foreground mb-2" data-testid="text-next-goal-label">Ďalší na Rade</div>
                    <div className="text-sm font-medium text-foreground truncate" data-testid="text-next-goal-title">{nextGoal.title}</div>
                    <div className="text-xs text-muted-foreground mt-2" data-testid="text-next-goal-remaining">
                      Chýba ti už len {formatNumber(parseFloat(nextGoal.targetValue) - parseFloat(nextGoal.currentValue))} {nextGoal.unit}!
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-bold text-primary" data-testid="text-next-goal-percentage">
                        {Math.round(nextGoal.percentage)}%
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <div className="text-sm text-muted-foreground" data-testid="text-no-next-goal">Pridaj si prvý cieľ!</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Widget 3: Splnených Cieľov */}
            <Card>
              <CardContent className="p-6 text-center">
                <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-foreground" data-testid="text-completed-goals-count">{completedGoals.length}</div>
                <div className="text-sm text-muted-foreground mt-1">Splnených Cieľov</div>
              </CardContent>
            </Card>
          </div>

          {/* Hlavný Cieľ Sezóny */}
          {mainGoal && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5" data-testid="card-main-goal">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                  {/* Kruhový Progress Bar - Responsive size */}
                  <div className="flex-shrink-0">
                    <CircularProgress 
                      value={parseFloat(mainGoal.currentValue)} 
                      max={parseFloat(mainGoal.targetValue)}
                      size={isMobile ? 140 : 180}
                      strokeWidth={isMobile ? 12 : 14}
                    >
                      <div className="text-center">
                        <div className={`font-bold text-primary ${isMobile ? 'text-2xl' : 'text-3xl'}`} data-testid="text-main-goal-percentage">
                          {Math.round((parseFloat(mainGoal.currentValue) / parseFloat(mainGoal.targetValue)) * 100)}%
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">splnené</div>
                      </div>
                    </CircularProgress>
                  </div>
                  
                  {/* Textový Obsah */}
                  <div className="flex-1 text-center md:text-left">
                    <Badge className="bg-primary text-primary-foreground mb-3 inline-flex items-center gap-1">
                      <Crown className="w-4 h-4" />
                      HLAVNÝ CIEĽ
                    </Badge>
                    <h2 className="text-3xl font-bold text-foreground mb-3" data-testid="text-main-goal-title">{mainGoal.title}</h2>
                    {mainGoal.description && (
                      <p className="text-muted-foreground mb-4" data-testid="text-main-goal-description">{mainGoal.description}</p>
                    )}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-base sm:text-xl">
                      <span className="font-medium text-muted-foreground">Aktuálne:</span>
                      <span className="font-bold text-primary" data-testid="text-main-goal-current">
                        {formatNumber(mainGoal.currentValue)} {mainGoal.unit}
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="font-medium text-muted-foreground">Cieľ:</span>
                      <span className="font-bold text-foreground" data-testid="text-main-goal-target">
                        {formatNumber(mainGoal.targetValue)} {mainGoal.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Aktívne Ciele */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Aktívne Ciele</h2>
            {activeGoals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {isViewingHistoricalSeason ? "Žiadne aktívne ciele v tejto sezóne" : "Žiadne aktívne ciele"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {isViewingHistoricalSeason 
                      ? "Táto sezóna nemala žiadne aktívne ciele."
                      : "Vytvorte si nové ciele pre túto sezónu a začnite sledovať svoj pokrok."
                    }
                  </p>
                  {!isViewingHistoricalSeason && (
                    <Button 
                      onClick={() => setLocation("/diary/seasonal-goals/create")}
                      data-testid="button-create-first-goal"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Vytvoriť prvý cieľ
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeGoals.map((goal) => {
                  const IconComponent = getGoalIcon(goal.goalType);
                  const progress = Math.min((parseFloat(goal.currentValue) / parseFloat(goal.targetValue)) * 100, 100);
                  
                  return (
                    <Card key={goal.id} className="hover:shadow-lg transition-all" data-testid={`card-goal-${goal.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="p-3 rounded-lg bg-primary/10">
                              <IconComponent className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-semibold text-foreground truncate" data-testid={`text-goal-title-${goal.id}`}>{goal.title}</h3>
                              <p className="text-sm text-muted-foreground" data-testid={`text-goal-type-${goal.id}`}>{getGoalTypeLabel(goal.goalType)}</p>
                            </div>
                          </div>
                          {!isViewingHistoricalSeason && (
                            <div className="flex gap-2 ml-4">
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => setLocation(`/diary/seasonal-goals/${goal.id}/edit`)}
                                data-testid={`button-edit-goal-${goal.id}`}
                                className="hover:bg-primary/10"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="icon" 
                                    variant="ghost"
                                    data-testid={`button-delete-goal-${goal.id}`}
                                    className="hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Zmazať cieľ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Naozaj chcete zmazať cieľ "{goal.title}"? Táto akcia je nevratná a všetok pokrok bude stratený.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteGoalMutation.mutate(goal.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      data-testid={`button-confirm-delete-${goal.id}`}
                                    >
                                      {deleteGoalMutation.isPending ? "Mažem..." : "Zmazať"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>

                        {goal.description && (
                          <p className="text-sm text-muted-foreground mb-4" data-testid={`text-goal-description-${goal.id}`}>{goal.description}</p>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-lg">
                            <span className="font-bold text-primary" data-testid={`text-goal-current-${goal.id}`}>
                              {formatNumber(goal.currentValue)} {goal.unit}
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-medium text-foreground" data-testid={`text-goal-target-${goal.id}`}>
                              {formatNumber(goal.targetValue)} {goal.unit}
                            </span>
                          </div>
                          
                          <Progress value={progress} className="h-3" data-testid={`progress-goal-${goal.id}`} />
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground" data-testid={`text-goal-remaining-${goal.id}`}>
                              Chýba ešte {formatNumber(parseFloat(goal.targetValue) - parseFloat(goal.currentValue))} {goal.unit}
                            </span>
                            <span className="text-sm font-semibold text-primary" data-testid={`text-goal-percentage-${goal.id}`}>
                              {Math.round(progress)}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DiaryLayout>
  );
}