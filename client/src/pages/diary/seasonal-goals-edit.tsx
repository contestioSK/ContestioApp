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
  ArrowLeft, 
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

type EditGoalFormData = z.infer<typeof editGoalSchema>;

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

export default function DiarySeasonalGoalsEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const goalId = params.id;

  // Fetch goal data
  const { data: goal, isLoading: goalLoading } = useQuery<SeasonGoal>({
    queryKey: ['/api/seasonal-goals', goalId],
    queryFn: async () => {
      const response = await fetch(`/api/seasonal-goals/${goalId}`);
      if (!response.ok) {
        throw new Error('Goal not found');
      }
      return response.json();
    },
    enabled: !!user && !!goalId
  });

  const form = useForm<EditGoalFormData>({
    resolver: zodResolver(editGoalSchema),
    defaultValues: {
      goalType: undefined,
      targetValue: "",
      title: "",
      description: "",
      isMainGoal: false
    }
  });

  // Load goal data into form
  useEffect(() => {
    if (goal) {
      form.reset({
        goalType: goal.goalType,
        targetValue: goal.targetValue,
        title: goal.title,
        description: goal.description || "",
        isMainGoal: goal.isMainGoal
      });
    }
  }, [goal, form]);

  const selectedGoalType = form.watch("goalType");

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async (data: EditGoalFormData) => {
      if (!goalId) throw new Error("Goal ID not found");
      
      return await apiRequest('PUT', `/api/seasonal-goals/${goalId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Cieľ aktualizovaný",
        description: "Váš sezónny cieľ bol úspešne aktualizovaný."
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/seasonal-goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seasonal-goals', goalId] });
      
      // Redirect back to dashboard
      setLocation('/diary/seasonal-goals');
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa aktualizovať cieľ. Skúste to znovu.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: EditGoalFormData) => {
    updateGoalMutation.mutate(data);
  };

  if (goalLoading) {
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

  if (!goal) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Cieľ nenájdený</h1>
            <Button onClick={() => setLocation('/diary/seasonal-goals')}>
              Späť na ciele
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/diary')}
              data-testid="button-back-to-diary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Späť do denníka
            </Button>
            <span className="text-muted-foreground">|</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/diary/seasonal-goals')}
              data-testid="button-back-to-goals"
            >
              Späť na ciele
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="page-title">
            <Target className="h-8 w-8 text-primary" />
            Upraviť cieľ
          </h1>
          <p className="text-muted-foreground mt-2">
            Upravte detaily vášho sezónneho cieľa
          </p>
        </div>

        {/* Goal Edit Form */}
        <Card data-testid="card-edit-form">
          <CardHeader>
            <CardTitle>Detaily cieľa</CardTitle>
            <CardDescription>
              Upravte typ cieľa a cieľovú hodnotu
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
                        onValueChange={field.onChange} 
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
                        Krátky a výstižný názov vášho cieľa
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
                    disabled={updateGoalMutation.isPending}
                    data-testid="button-update"
                  >
                    {updateGoalMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Aktualizovať cieľ
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setLocation('/diary/seasonal-goals')}
                    disabled={updateGoalMutation.isPending}
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