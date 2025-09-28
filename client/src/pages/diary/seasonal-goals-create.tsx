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
  ArrowLeft, 
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
    label: "Počet výprav",
    color: "text-purple-500",
    unit: "výprav",
    description: "Počet rybárskych výprav v sezóne",
    placeholder: "napr. 20"
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
  goalType: z.enum(['total_weight', 'fish_count', 'trips_count', 'biggest_fish', 'species_variety'], {
    required_error: "Vyberte typ cieľa"
  }),
  targetValue: z.string()
    .min(1, "Zadajte cieľovú hodnotu")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Cieľová hodnota musí byť pozitívne číslo"),
  title: z.string()
    .min(3, "Názov musí mať aspoň 3 znaky")
    .max(100, "Názov môže mať maximálne 100 znakov"),
  description: z.string()
    .max(500, "Popis môže mať maximálne 500 znakov")
    .optional(),
  isMainGoal: z.boolean().default(false)
});

type CreateGoalFormData = z.infer<typeof createGoalSchema>;

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function DiarySeasonalGoalsCreate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch current season
  const { data: currentSeason, isLoading: seasonLoading } = useQuery<Season>({
    queryKey: ['/api/seasons/current'],
    enabled: !!user
  });

  // Check freemium limits
  const { data: limitData, isLoading: limitLoading } = useQuery({
    queryKey: ['/api/seasonal-goals', 'limits', currentSeason?.id],
    queryFn: async () => {
      if (!currentSeason) return null;
      const response = await fetch(`/api/seasonal-goals/limits?seasonId=${currentSeason.id}`);
      return response.json();
    },
    enabled: !!user && !!currentSeason
  });

  const form = useForm<CreateGoalFormData>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      goalType: undefined,
      targetValue: "",
      title: "",
      description: "",
      isMainGoal: false
    }
  });

  const selectedGoalType = form.watch("goalType");

  // Auto-generate title based on goal type and target value
  const handleGoalTypeChange = (goalType: string) => {
    form.setValue("goalType", goalType as any);
    
    const config = goalTypeConfig[goalType as keyof typeof goalTypeConfig];
    if (config) {
      form.setValue("title", `${config.label} - sezóna`);
    }
  };

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: CreateGoalFormData) => {
      if (!currentSeason) throw new Error("No active season found");
      
      const goalData = {
        ...data,
        seasonId: currentSeason.id,
        unit: goalTypeConfig[data.goalType].unit
      };
      
      return await apiRequest('/api/seasonal-goals', 'POST', goalData);
    },
    onSuccess: () => {
      toast({
        title: "Cieľ vytvorený",
        description: "Váš sezónny cieľ bol úspešne vytvorený."
      });
      
      // Invalidate seasonal goals query
      queryClient.invalidateQueries({ queryKey: ['/api/seasonal-goals'] });
      
      // Redirect back to dashboard
      setLocation('/diary/seasonal-goals');
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa vytvoriť cieľ. Skúste to znovu.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: CreateGoalFormData) => {
    createGoalMutation.mutate(data);
  };

  const isLoading = seasonLoading || limitLoading;
  const canCreateGoal = limitData?.canCreate !== false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-96 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // Freemium limit reached
  if (!canCreateGoal) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/diary/seasonal-goals')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Späť na ciele
            </Button>
          </div>

          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20" data-testid="card-limit-reached">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertCircle className="h-5 w-5" />
                Limit dosiahnutý
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-600 dark:text-orange-400 mb-4">
                Dosiahli ste limit cieľov pre FREE verziu. Môžete mať maximálne {limitData?.limit} cieľ na sezónu.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setLocation('/pricing')} data-testid="button-upgrade">
                  Prejsť na PREMIUM
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/diary/seasonal-goals')}
                  data-testid="button-back-to-goals"
                >
                  Späť na ciele
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/diary/seasonal-goals')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Späť na ciele
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="page-title">
            <Target className="h-8 w-8 text-primary" />
            Nový sezónny cieľ
          </h1>
          <p className="text-muted-foreground mt-2">
            Vytvorte si nový cieľ pre aktuálnu sezónu a sledujte svoj pokrok
          </p>
        </div>

        {/* Current Season Info */}
        {currentSeason && (
          <Card className="mb-6" data-testid="card-season-info">
            <CardHeader>
              <CardTitle className="text-lg">Aktuálna sezóna</CardTitle>
              <CardDescription>
                {currentSeason.name} • {new Date(currentSeason.startDate).toLocaleDateString('sk-SK')} - {new Date(currentSeason.endDate).toLocaleDateString('sk-SK')}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Goal Creation Form */}
        <Card data-testid="card-create-form">
          <CardHeader>
            <CardTitle>Detaily cieľa</CardTitle>
            <CardDescription>
              Vyberte typ cieľa a zadajte cieľovú hodnotu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Goal Type Selection */}
                <FormField
                  control={form.control}
                  name="goalType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ cieľa</FormLabel>
                      <Select 
                        onValueChange={handleGoalTypeChange} 
                        value={field.value}
                        data-testid="select-goal-type"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte typ cieľa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(goalTypeConfig).map(([key, config]) => {
                            const IconComponent = config.icon;
                            return (
                              <SelectItem key={key} value={key} data-testid={`option-goal-type-${key}`}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className={`h-4 w-4 ${config.color}`} />
                                  {config.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {selectedGoalType && (
                        <FormDescription>
                          {goalTypeConfig[selectedGoalType].description}
                        </FormDescription>
                      )}
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
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.1" 
                            min="0.1"
                            placeholder={selectedGoalType ? goalTypeConfig[selectedGoalType].placeholder : "Zadajte hodnotu"}
                            data-testid="input-target-value"
                          />
                        </FormControl>
                        {selectedGoalType && (
                          <Badge variant="secondary">
                            {goalTypeConfig[selectedGoalType].unit}
                          </Badge>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Goal Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Názov cieľa</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Zadajte názov cieľa"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormDescription>
                        Krátky a výstižný názov vašeho cieľa
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Goal Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Popis (voliteľný)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Pridajte popis alebo poznámky k vášmu cieľu"
                          rows={3}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Detailnejší popis vašeho cieľa alebo motivácie
                      </FormDescription>
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
                          <Crown className="h-4 w-4 text-primary" />
                          Nastaviť ako hlavný cieľ sezóny
                        </FormLabel>
                        <FormDescription>
                          Hlavný cieľ bude zvýraznený na dashboard a môžete mať len jeden na sezónu
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={createGoalMutation.isPending}
                    data-testid="button-create"
                  >
                    {createGoalMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Vytvoriť cieľ
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setLocation('/diary/seasonal-goals')}
                    disabled={createGoalMutation.isPending}
                    data-testid="button-cancel"
                  >
                    Zrušiť
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}