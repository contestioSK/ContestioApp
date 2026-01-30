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
  Moon,
  Flame,
  Hourglass
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
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
  limit: number;
  isPremium: boolean;
}

// --- NARRATIVE LOGIC (MIKROCOPY SYSTÉM v2.1) ---
type NarrativeStatus = 'start' | 'normal' | 'near' | 'completed';

interface GoalNarrative {
  status: NarrativeStatus;
  badgeText: string;
  badgeVariant: 'slate' | 'blue' | 'gold' | 'green';
  headline: string;
  subtext: string;
  colorClass: string;
  icon: typeof Trophy;
  progressColorClass: string;
}

function getGoalNarrative(percentage: number, remaining: string, unit: string): GoalNarrative {
  // 1. STAV: COMPLETED (100%) - Hrdosť
  if (percentage >= 100) {
    return {
      status: 'completed',
      badgeText: 'ZVLÁDNUTÉ',
      badgeVariant: 'green',
      headline: 'Dokázal si to.',
      subtext: 'Cieľ je pokorený.',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      icon: Trophy,
      progressColorClass: 'bg-emerald-500'
    };
  }

  // 2. STAV: NEAR COMPLETION (80-99%) - Napätie
  if (percentage >= 80) {
    return {
      status: 'near',
      badgeText: 'FINÁLE BLÍZKO',
      badgeVariant: 'gold',
      headline: `Už len ${remaining} ${unit}.`,
      subtext: 'Toto je moment, ktorý rozhoduje.',
      colorClass: 'text-amber-600 dark:text-amber-400',
      icon: Flame,
      progressColorClass: 'bg-amber-500'
    };
  }

  // 3. STAV: FLOW (20-79%) - Minimalistická sila
  if (percentage >= 20) {
    return {
      status: 'normal',
      badgeText: 'V TEMPE',
      badgeVariant: 'blue',
      headline: 'Drž tempo.',
      subtext: 'Presne takto sa robí sezóna.',
      colorClass: 'text-blue-600 dark:text-blue-400',
      icon: Zap,
      progressColorClass: 'bg-blue-600 dark:bg-blue-500'
    };
  }

  // 4. STAV: START / STAGNÁCIA (0-19%)
  return {
    status: 'start',
    badgeText: 'SEZÓNA SA ZAČÍNA',
    badgeVariant: 'slate',
    headline: 'Sezóna sa práve začína.',
    subtext: 'Zapíš prvý úlovok a všetko sa pohne.',
    colorClass: 'text-slate-500 dark:text-slate-400',
    icon: Hourglass,
    progressColorClass: 'bg-slate-300 dark:bg-slate-700'
  };
}

// Circular Progress Component with status-based colors
interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  status?: NarrativeStatus;
}

function CircularProgress({ 
  value, 
  max, 
  size = 120, 
  strokeWidth = 8, 
  className = "", 
  children,
  status = 'normal'
}: CircularProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClass = status === 'completed' 
    ? 'text-emerald-500' 
    : status === 'near' 
      ? 'text-amber-500' 
      : status === 'start' 
        ? 'text-slate-300 dark:text-slate-700' 
        : 'text-blue-600 dark:text-blue-500';

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
          className="text-slate-100 dark:text-slate-800"
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
          className={`${colorClass} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        {children}
      </div>
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
  
  const rounded = Math.round(num * 10) / 10;
  const formatted = rounded.toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  
  return formatted.replace(/\u00A0/g, ' ');
}

// Badge variants mapping
const badgeVariantClasses: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  gold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
};

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
    .filter(goal => !goal.isMainGoal)
    .map(goal => ({
      ...goal,
      percentage: (parseFloat(goal.currentValue) / parseFloat(goal.targetValue)) * 100
    }))
    .sort((a, b) => b.percentage - a.percentage)[0];

  // Calculate narrative for main goal
  const mainGoalPercentage = mainGoal 
    ? Math.min((parseFloat(mainGoal.currentValue) / parseFloat(mainGoal.targetValue)) * 100, 100) 
    : 0;
  const mainGoalRemaining = mainGoal 
    ? formatNumber(parseFloat(mainGoal.targetValue) - parseFloat(mainGoal.currentValue))
    : '0';
  const mainGoalNarrative = mainGoal 
    ? getGoalNarrative(mainGoalPercentage, mainGoalRemaining, mainGoal.unit)
    : null;

  // Trigger confetti for completed goals
  useEffect(() => {
    const newlyCompletedGoals = seasonGoals.filter(goal => 
      goal.isCompleted && 
      goal.completedAt &&
      new Date(goal.completedAt).getTime() > Date.now() - 5000
    );
    
    if (newlyCompletedGoals.length > 0) {
      celebrateGoalCompletion();
    }
  }, [seasonGoals, celebrateGoalCompletion]);

  // Render goal card with narrative
  const renderGoalCard = (goal: SeasonGoal & { percentage?: number }) => {
    const IconComponent = getGoalIcon(goal.goalType);
    const progress = goal.percentage ?? Math.min((parseFloat(goal.currentValue) / parseFloat(goal.targetValue)) * 100, 100);
    const remaining = formatNumber(parseFloat(goal.targetValue) - parseFloat(goal.currentValue));
    const narrative = getGoalNarrative(progress, remaining, goal.unit);
    const NarrativeIcon = narrative.icon;

    return (
      <Card key={goal.id} className="hover:shadow-lg transition-all" data-testid={`card-goal-${goal.id}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <TacticalIcon 
                icon={IconComponent} 
                variant={narrative.status === 'completed' ? 'emerald' : narrative.status === 'near' ? 'amber' : narrative.status === 'start' ? 'slate' : 'blue'} 
                size="sm" 
                showLabel={false} 
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-foreground truncate" data-testid={`text-goal-title-${goal.id}`}>{goal.title}</h3>
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
                  <Edit className="w-4 h-4" strokeWidth={1.75} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      data-testid={`button-delete-goal-${goal.id}`}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.75} />
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

          {/* Narrative Badge & Headline */}
          <div className="mb-4">
            <div className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeVariantClasses[narrative.badgeVariant]}`}>
              <NarrativeIcon className="w-3 h-3 mr-1.5" strokeWidth={1.75} />
              {narrative.badgeText}
            </div>
            <p className={`mt-2 text-lg font-bold ${narrative.colorClass}`}>{narrative.headline}</p>
            <p className="text-sm text-muted-foreground">{narrative.subtext}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-lg">
              <span className="font-mono font-medium text-[#F97316]" data-testid={`text-goal-current-${goal.id}`}>
                {formatNumber(goal.currentValue)} {goal.unit}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium text-foreground" data-testid={`text-goal-target-${goal.id}`}>
                {formatNumber(goal.targetValue)} {goal.unit}
              </span>
            </div>
            
            <div className={`h-2.5 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800`}>
              <div
                className={`h-full transition-all duration-1000 ease-out ${narrative.progressColorClass}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground" data-testid={`text-goal-remaining-${goal.id}`}>
                Chýba ešte {remaining} {goal.unit}
              </span>
              <span className={`text-sm font-mono font-medium ${narrative.colorClass}`} data-testid={`text-goal-percentage-${goal.id}`}>
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DiaryLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <TacticalIcon icon={Target} variant="active" size="lg" showLabel={false} />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Sezónne Ciele</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Nastavte si ciele a sledujte svoj pokrok počas sezóny
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Season Switcher */}
            {allSeasons.length > 1 && (
              <Select
                value={selectedSeasonId || currentSeason?.id || ""}
                onValueChange={setSelectedSeasonId}
              >
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-season">
                  <History className="w-4 h-4 mr-2 text-muted-foreground" strokeWidth={1.75} />
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
                {goalLimit && !goalLimit.isPremium && (
                  <div className="text-xs text-muted-foreground text-right">
                    FREE účet: <span className="font-mono font-medium text-[#F97316]">{goalLimit.currentCount}</span> / {goalLimit.limit} cieľov
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
                        <Lock className="w-4 h-4 mr-2" strokeWidth={1.75} />
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
                        <Crown className="w-4 h-4 mr-2" strokeWidth={1.75} />
                        Prejsť na PREMIUM
                      </Button>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button 
                    onClick={() => setLocation("/diary/seasonal-goals/create")}
                    data-testid="button-create-goal"
                    className="bg-[#F97316] hover:bg-[#EA580C] w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" strokeWidth={1.75} />
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
              <History className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
              <div>
                <p className="font-bold text-foreground">Zobrazuješ históriu sezóny {activeSeason?.name}</p>
                <p className="text-sm text-muted-foreground">Ciele z minulých sezón nie je možné upravovať.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== SECTION 1: HERO - Hlavný Cieľ Sezóny ===== */}
        {mainGoal && mainGoalNarrative && (
          <Card className="border-primary/30" data-testid="card-main-goal">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                {/* Kruhový Progress Bar */}
                <div className="flex-shrink-0">
                  <CircularProgress 
                    value={parseFloat(mainGoal.currentValue)} 
                    max={parseFloat(mainGoal.targetValue)}
                    size={isMobile ? 140 : 180}
                    strokeWidth={isMobile ? 12 : 14}
                    status={mainGoalNarrative.status}
                  >
                    <div className="text-center">
                      <div className={`font-mono font-bold ${mainGoalNarrative.colorClass} ${isMobile ? 'text-2xl' : 'text-3xl'}`} data-testid="text-main-goal-percentage">
                        {Math.round(mainGoalPercentage)}%
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">splnené</div>
                    </div>
                  </CircularProgress>
                </div>
                
                {/* Textový Obsah s Naratívom */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                    <Badge className="bg-primary text-primary-foreground inline-flex items-center gap-1">
                      <Crown className="w-4 h-4" strokeWidth={1.75} />
                      HLAVNÝ CIEĽ
                    </Badge>
                    <div className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeVariantClasses[mainGoalNarrative.badgeVariant]}`}>
                      {mainGoalNarrative.badgeText}
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="text-main-goal-title">{mainGoal.title}</h2>
                  
                  {/* Narrative Headline */}
                  <p className={`text-xl font-bold mb-1 ${mainGoalNarrative.colorClass}`}>{mainGoalNarrative.headline}</p>
                  <p className="text-muted-foreground mb-4">{mainGoalNarrative.subtext}</p>

                  {mainGoal.description && (
                    <p className="text-muted-foreground mb-4" data-testid="text-main-goal-description">{mainGoal.description}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-base sm:text-xl">
                    <span className="font-medium text-muted-foreground">Aktuálne:</span>
                    <span className="font-mono font-bold text-[#F97316]" data-testid="text-main-goal-current">
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

        {/* ===== SECTION 2: NEXT UP - Ďalší na Rade ===== */}
        {nextGoal && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
              Ďalší na Rade
            </h2>
            {renderGoalCard(nextGoal)}
          </div>
        )}

        {/* ===== SECTION 3: COMPLETED - Splnené Ciele ===== */}
        {completedGoals.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-500" strokeWidth={1.75} />
              Splnené Ciele ({completedGoals.length})
            </h2>
            <div className="space-y-3">
              {completedGoals.map((goal) => {
                const IconComponent = getGoalIcon(goal.goalType);
                return (
                  <Card key={goal.id} className="bg-emerald-500/5 border-emerald-500/20" data-testid={`card-completed-${goal.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <TacticalIcon icon={IconComponent} variant="emerald" size="sm" showLabel={false} />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-foreground truncate">{goal.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatNumber(goal.targetValue)} {goal.unit} • Splnený {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString('sk-SK') : ''}
                          </div>
                        </div>
                        <Trophy className="w-5 h-5 text-emerald-500" strokeWidth={1.75} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== SECTION 4: ACTIVE LIST - Ostatné Aktívne Ciele ===== */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Aktívne Ciele</h2>
          {activeGoals.filter(g => g.id !== nextGoal?.id && !g.isMainGoal).length === 0 && !nextGoal && !mainGoal ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <TacticalIcon icon={Target} variant="neutral" size="lg" showLabel={false} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
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
                    className="bg-[#F97316] hover:bg-[#EA580C]"
                  >
                    <Plus className="w-4 h-4 mr-2" strokeWidth={1.75} />
                    Vytvoriť prvý cieľ
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeGoals
                .filter(g => g.id !== nextGoal?.id && !g.isMainGoal)
                .map((goal) => {
                  const progress = Math.min((parseFloat(goal.currentValue) / parseFloat(goal.targetValue)) * 100, 100);
                  return renderGoalCard({ ...goal, percentage: progress });
                })}
            </div>
          )}
        </div>
      </div>
    </DiaryLayout>
  );
}
