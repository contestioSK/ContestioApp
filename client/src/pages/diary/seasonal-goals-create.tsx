import { useState } from "react";
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
const createGoalSchema = z.object({
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

  // Mock seasons data - in real app this would come from API
  const mockSeasons: Season[] = [
    {
      id: "winter-2024",
      name: "Zima 2024",
      startDate: "2024-12-01",
      endDate: "2025-02-28",
      isActive: true
    },
    {
      id: "spring-2025",
      name: "Jar 2025",
      startDate: "2025-03-01",
      endDate: "2025-05-31",
      isActive: false
    }
  ];

  const seasons = mockSeasons;

  const form = useForm<CreateGoalForm>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      seasonId: "",
      goalType: undefined,
      targetValue: "",
      title: "",
      description: "",
      isMainGoal: false
    }
  });

  // Watch goal type to update title automatically
  const watchedGoalType = form.watch("goalType");
  const watchedTargetValue = form.watch("targetValue");

  // Auto-generate title when goal type or target value changes
  useState(() => {
    if (watchedGoalType && watchedTargetValue) {
      const config = goalTypeConfig[watchedGoalType];
      const newTitle = `${config.label} - ${watchedTargetValue} ${config.unit}`;
      form.setValue("title", newTitle);
    }
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: CreateGoalForm) => {
      const goalConfig = goalTypeConfig[data.goalType];
      const goalData = {
        ...data,
        unit: goalConfig.unit,
        currentValue: "0" // Initialize with 0
      };
      const response = await apiRequest("POST", "/api/diary/seasonal-goals", goalData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/seasonal-goals"] });
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
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <Target className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-3xl font-bold text-foreground">Vytvoriť nový cieľ</h1>
            <p className="text-muted-foreground">
              Nastavte si nový sezónny cieľ a sledujte svoj pokrok
            </p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Detaily cieľa</CardTitle>
              <CardDescription>
                Vyplňte informácie o vašom novom sezónnom cieli
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