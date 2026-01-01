import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Weight, 
  Fish, 
  MapPin, 
  Ruler, 
  Star,
  Crown,
  Loader2
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";

// Goal Types Configuration (same as create)
const goalTypeConfig = {
  total_weight: {
    icon: Weight,
    label: "Celková hmotnosť",
    color: "text-blue-500",
    unit: "kg",
    description: "Súčet hmotnosti všetkých ulovených rýb v sezóne",
    placeholder: "napr. 50.5"
  },
  fish_count: {
    icon: Fish,
    label: "Počet rýb",
    color: "text-green-500", 
    unit: "ks",
    description: "Celkový počet chytených rýb v sezóne",
    placeholder: "napr. 100"
  },
  trips_count: {
    icon: MapPin,
    label: "Počet dní strávených pri vode",
    color: "text-purple-500",
    unit: "dní",
    description: "Počet dní strávených rybárčením v sezóne",
    placeholder: "napr. 50"
  },
  biggest_fish: {
    icon: Ruler,
    label: "Najväčšia ryba",
    color: "text-orange-500",
    unit: "kg",
    description: "Hmotnosť najväčšej ulovenej ryby v sezóne",
    placeholder: "napr. 15.2"
  },
  species_variety: {
    icon: Star,
    label: "Rôzne druhy",
    color: "text-pink-500",
    unit: "druhov",
    description: "Počet rôznych druhov rýb ulovených v sezóne",
    placeholder: "napr. 4"
  }
};

// Form Schema
const editGoalSchema = z.object({
  seasonId: z.string().min(1, "Musíte vybrať sezónu"),
  goalType: z.enum(['total_weight', 'fish_count', 'trips_count', 'biggest_fish', 'species_variety'], {
    required_error: "Musíte vybrať typ cieľa"
  }),
  targetValue: z.string().min(1, "Cieľová hodnota je povinná").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Musí byť kladné číslo"),
  title: z.string().min(1, "Názov je povinný").max(100, "Názov môže mať maximálne 100 znakov"),
  description: z.string().optional(),
  isMainGoal: z.boolean().default(false)
});

type EditGoalForm = z.infer<typeof editGoalSchema>;

// Types
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

export default function SeasonalGoalsEdit() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedGoalType, setSelectedGoalType] = useState<string>("");

  // Fetch seasons from API
  const { data: seasons = [], isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ['/api/seasons'],
  });

  // Fetch all goals and find the one being edited
  const { data: allGoals = [], isLoading: goalsLoading } = useQuery<SeasonGoal[]>({
    queryKey: ['/api/seasonal-goals'],
  });

  const goal = allGoals.find(g => g.id === id);

  const form = useForm<EditGoalForm>({
    resolver: zodResolver(editGoalSchema),
    defaultValues: {
      seasonId: "",
      goalType: undefined,
      targetValue: "",
      title: "",
      description: "",
      isMainGoal: false
    }
  });

  // Load goal data into form when goal is available
  useEffect(() => {
    if (goal) {
      form.reset({
        seasonId: goal.seasonId,
        goalType: goal.goalType,
        targetValue: goal.targetValue,
        title: goal.title,
        description: goal.description || "",
        isMainGoal: goal.isMainGoal
      });
      setSelectedGoalType(goal.goalType);
    }
  }, [goal, form]);

  // Watch goal type to update title automatically  
  const watchedGoalType = form.watch("goalType");
  const watchedTargetValue = form.watch("targetValue");

  // Auto-generate title when goal type or target value changes
  useEffect(() => {
    if (watchedGoalType && watchedTargetValue && form.getValues("title") !== goal?.title) {
      const config = goalTypeConfig[watchedGoalType];
      const newTitle = `${config.label} - ${watchedTargetValue} ${config.unit}`;
      form.setValue("title", newTitle);
    }
  }, [watchedGoalType, watchedTargetValue, form, goal]);

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async (data: EditGoalForm) => {
      const goalConfig = goalTypeConfig[data.goalType];
      const goalData = {
        ...data,
        unit: goalConfig.unit,
        currentValue: goal?.currentValue || "0" // Keep current progress
      };
      const response = await apiRequest("PUT", `/api/seasonal-goals/${id}`, goalData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasonal-goals"] });
      toast({
        title: "Cieľ aktualizovaný!",
        description: "Váš sezónny cieľ bol úspešne aktualizovaný.",
      });
      setLocation("/diary/seasonal-goals");
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať cieľ. Skúste to znovu.",
        variant: "destructive"
      });
      console.error("Update goal error:", error);
    }
  });

  const onSubmit = (data: EditGoalForm) => {
    updateGoalMutation.mutate(data);
  };

  const selectedConfig = selectedGoalType ? goalTypeConfig[selectedGoalType as keyof typeof goalTypeConfig] : null;

  // Show loading state while fetching
  if (goalsLoading || seasonsLoading) {
    return (
      <DiaryLayout>
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Načítavanie...
            </h3>
            <p className="text-muted-foreground">
              Načítavam detaily cieľa
            </p>
          </CardContent>
        </Card>
      </DiaryLayout>
    );
  }

  // Show error state if goal not found
  if (!goal) {
    return (
      <DiaryLayout>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <TacticalIcon icon={Target} variant="neutral" size="lg" showLabel={false} />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Cieľ nenájdený
            </h3>
            <p className="text-muted-foreground mb-4">
              Požadovaný cieľ neexistuje alebo k nemu nemáte prístup.
            </p>
            <Button onClick={() => setLocation("/diary/seasonal-goals")}>
              Späť na ciele
            </Button>
          </CardContent>
        </Card>
      </DiaryLayout>
    );
  }

  return (
    <DiaryLayout>
      <div className="space-y-8">
        {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <TacticalIcon icon={Target} variant="active" size="lg" showLabel={false} />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Upraviť cieľ</h1>
            <p className="text-muted-foreground">
              Upravte detaily vášho sezónneho cieľa
            </p>
          </div>

          {/* Progress Info */}
          {goal && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Aktuálny pokrok
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {goal.currentValue} {goal.unit} z {goal.targetValue} {goal.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {Math.round((parseFloat(goal.currentValue) / parseFloat(goal.targetValue)) * 100)}%
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">splnené</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Detaily cieľa</CardTitle>
              <CardDescription>
                Upravte informácie o vašom sezónnom cieli
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Season Selection */}
                  <FormField
                    control={form.control}
                    name="seasonId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sezóna</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-season">
                              <SelectValue placeholder="Vyberte sezónu" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {seasons.map((season) => (
                              <SelectItem key={season.id} value={season.id}>
                                <div className="flex items-center gap-2">
                                  <span>{season.name}</span>
                                  {season.isActive && (
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                                      Aktívna
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Goal Type Selection */}
                  <FormField
                    control={form.control}
                    name="goalType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Typ cieľa</FormLabel>
                        <FormDescription>
                          Vyberte typ cieľa, ktorý chcete sledovať
                        </FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          {Object.entries(goalTypeConfig).map(([key, config]) => {
                            const IconComponent = config.icon;
                            const isSelected = field.value === key;
                            
                            return (
                              <Card 
                                key={key}
                                className={`cursor-pointer transition-all hover:shadow-md ${
                                  isSelected ? 'ring-2 ring-primary border-primary' : ''
                                }`}
                                onClick={() => {
                                  field.onChange(key);
                                  setSelectedGoalType(key);
                                }}
                                data-testid={`goal-type-${key}`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <IconComponent className={`w-6 h-6 ${config.color} flex-shrink-0 mt-0.5`} />
                                    <div className="min-w-0 flex-1">
                                      <h3 className="font-medium text-foreground">{config.label}</h3>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {config.description}
                                      </p>
                                      <Badge variant="secondary" className="mt-2 text-xs">
                                        Jednotka: {config.unit}
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Target Value */}
                  <FormField
                    control={form.control}
                    name="targetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cieľová hodnota</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder={selectedConfig?.placeholder || "Zadajte hodnotu"}
                              data-testid="input-target-value"
                              {...field} 
                            />
                          </FormControl>
                          {selectedConfig && (
                            <div className="flex items-center px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                              {selectedConfig.unit}
                            </div>
                          )}
                        </div>
                        <FormDescription>
                          {selectedConfig ? `Cieľová hodnota pre ${selectedConfig.label.toLowerCase()}` : "Vyberte typ cieľa"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Názov cieľa</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="napr. Celková hmotnosť - 50 kg"
                            data-testid="input-title"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Názov sa automaticky vygeneruje alebo si ho môžete upraviť
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Popis (voliteľné)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Dodatočné informácie o cieli..."
                            data-testid="textarea-description"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Main Goal Checkbox */}
                  <FormField
                    control={form.control}
                    name="isMainGoal"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-main-goal"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-yellow-500" />
                            Hlavný cieľ sezóny
                          </FormLabel>
                          <FormDescription>
                            Označte tento cieľ ako váš hlavný cieľ pre sezónu. Bude zvýraznený a sledovaný s vyššou prioritou.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Actions */}
                  <div className="flex justify-end gap-4 pt-6">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setLocation("/diary/seasonal-goals")}
                      data-testid="button-cancel"
                    >
                      Zrušiť
                    </Button>
                    <Button 
                      type="submit"
                      disabled={updateGoalMutation.isPending}
                      data-testid="button-update-goal"
                    >
                      {updateGoalMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Uložiť zmeny
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
    </DiaryLayout>
  );
}