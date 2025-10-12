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
  AlertCircle,
  Loader2
} from "lucide-react";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";

// Goal Types Configuration
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
    description: "Hmotnosť alebo dĺžka najväčšej ulovenej ryby",
    placeholder: "napr. 15.2",
    hasMultipleFields: true // Special flag for weight + length fields
  },
  personal_best: {
    icon: Crown,
    label: "Prekonať PB",
    color: "text-yellow-500",
    unit: "kg",
    description: "Prekona osobný rekord v hmotnosti alebo dĺžke",
    placeholder: "napr. 20.0"
  }
};

// Form Schema
const createGoalSchema = z.object({
  seasonId: z.string().min(1, "Musíte vybrať sezónu"),
  goalType: z.enum(['total_weight', 'fish_count', 'trips_count', 'biggest_fish', 'personal_best'], {
    required_error: "Musíte vybrať typ cieľa"
  }),
  targetValue: z.string().min(1, "Cieľová hodnota je povinná").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Musí byť kladné číslo"),
  targetLength: z.string().optional(), // For biggest_fish type - optional length field
  title: z.string().min(1, "Názov je povinný").max(100, "Názov môže mať maximálne 100 znakov"),
  description: z.string().optional(),
  isMainGoal: z.boolean().default(false)
});

type CreateGoalForm = z.infer<typeof createGoalSchema>;

// Types
interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function SeasonalGoalsCreate() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedGoalType, setSelectedGoalType] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Fetch seasons from API
  const { data: seasons = [], isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ['/api/seasons'],
  });

  const form = useForm<CreateGoalForm>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      seasonId: "",
      goalType: undefined,
      targetValue: "",
      targetLength: "",
      title: "",
      description: "",
      isMainGoal: false
    }
  });

  // Watch goal type to update title automatically
  const watchedGoalType = form.watch("goalType");
  const watchedTargetValue = form.watch("targetValue");
  const watchedTargetLength = form.watch("targetLength");

  // Auto-generate title when goal type or target value changes
  useEffect(() => {
    if (watchedGoalType && watchedTargetValue) {
      const config = goalTypeConfig[watchedGoalType];
      let titleText = `${config.label} - ${watchedTargetValue} ${config.unit}`;
      
      // Add length if provided for biggest_fish
      if (watchedGoalType === 'biggest_fish' && watchedTargetLength) {
        titleText = `${config.label} - ${watchedTargetValue} kg / ${watchedTargetLength} cm`;
      }
      
      form.setValue("title", titleText);
    }
  }, [watchedGoalType, watchedTargetValue, watchedTargetLength, form]);

  // Handle goal type selection
  const handleGoalTypeSelect = (goalType: string) => {
    setSelectedGoalType(goalType);
    form.setValue("goalType", goalType as any);
    setCurrentStep(2); // Move to step 2
  };

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: CreateGoalForm) => {
      const goalConfig = goalTypeConfig[data.goalType];
      const goalData = {
        ...data,
        unit: goalConfig.unit,
        currentValue: "0" // Initialize with 0
      };
      const response = await apiRequest("POST", "/api/seasonal-goals", goalData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasonal-goals"] });
      toast({
        title: "Cieľ vytvorený!",
        description: "Váš sezónny cieľ bol úspešne vytvorený.",
      });
      setLocation("/diary/seasonal-goals");
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vytvoriť cieľ. Skúste to znovu.",
        variant: "destructive"
      });
      console.error("Create goal error:", error);
    }
  });

  const onSubmit = (data: CreateGoalForm) => {
    createGoalMutation.mutate(data);
  };

  const selectedConfig = selectedGoalType ? goalTypeConfig[selectedGoalType as keyof typeof goalTypeConfig] : null;

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <Target className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-3xl font-bold text-foreground">Vytvoriť nový cieľ</h1>
            <p className="text-muted-foreground">
              Nastavte si nový sezónny cieľ a sledujte svoj pokrok
            </p>
          </div>

          {/* STEP 1: Goal Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Krok 1: Vyberte typ cieľa</CardTitle>
              <CardDescription>
                Vyberte si, aký cieľ chcete dosiahnuť v tejto sezóne
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(goalTypeConfig).map(([key, config]) => {
                  const IconComponent = config.icon;
                  const isSelected = selectedGoalType === key;
                  
                  return (
                    <Card 
                      key={key}
                      className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                        isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleGoalTypeSelect(key)}
                      data-testid={`goal-card-${key}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                          <div className={`p-3 rounded-full ${isSelected ? 'bg-primary/20' : 'bg-muted'}`}>
                            <IconComponent className={`w-8 h-8 ${config.color}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{config.label}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {config.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: Goal Details Form - Only show when type is selected */}
          {currentStep === 2 && selectedGoalType && (
            <Card>
              <CardHeader>
                <CardTitle>Krok 2: Nastavte hodnotu</CardTitle>
                <CardDescription>
                  Zadajte detaily vášho cieľa pre {goalTypeConfig[selectedGoalType as keyof typeof goalTypeConfig]?.label.toLowerCase()}
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
                          <Select onValueChange={field.onChange} value={field.value} disabled={seasonsLoading}>
                            <FormControl>
                              <SelectTrigger data-testid="select-season">
                                <SelectValue placeholder={seasonsLoading ? "Načítavajú sa sezóny..." : "Vyberte sezónu"} />
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

                    {/* Target Value - Weight (always shown) */}
                    <FormField
                      control={form.control}
                      name="targetValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {selectedGoalType === 'biggest_fish' ? 'Hmotnosť (kg)' : 'Cieľová hodnota'}
                          </FormLabel>
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
                            {selectedConfig && selectedGoalType !== 'biggest_fish' && (
                              <div className="flex items-center px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                                {selectedConfig.unit}
                              </div>
                            )}
                          </div>
                          {selectedGoalType === 'biggest_fish' && (
                            <FormDescription>
                              Môžete zadať hmotnosť, dĺžku, alebo oboje
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Target Length - Only for biggest_fish */}
                    {selectedGoalType === 'biggest_fish' && (
                      <FormField
                        control={form.control}
                        name="targetLength"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dĺžka (cm) - voliteľné</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.1"
                                  placeholder="napr. 85"
                                  data-testid="input-target-length"
                                  {...field} 
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

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
                      disabled={createGoalMutation.isPending}
                      data-testid="button-create-goal"
                    >
                      {createGoalMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Vytvoriť cieľ
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          )}

          {/* Tips */}
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Tipy pre nastavenie cieľov
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Nastavte si realistické ale výzývné ciele</li>
                    <li>• Hlavný cieľ sezóny by mal byť váš najdôležitejší a najambicióznejší cieľ</li>
                    <li>• Môžete mať viacero cieľov rôznych typov pre jednu sezónu</li>
                    <li>• Pokrok sa automaticky aktualizuje na základe vašich úlovkov a výprav</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DiaryLayout>
  );
}