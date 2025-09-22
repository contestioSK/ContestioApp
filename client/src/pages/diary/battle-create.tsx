import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { CalendarIcon, Trophy, Users, Clock, Plus, X } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
const createBattleSchema = z.object({
  name: z.string().min(1, "Názov je povinný").max(255, "Názov je príliš dlhý"),
  mode: z.enum(["most_fish", "total_weight", "biggest_fish", "best_3_fish", "best_5_fish"]),
  minWeightKg: z.number().optional(),
  includeOnlyVerified: z.boolean().default(false),
  startAt: z.date(),
  endAt: z.date(),
  participants: z.array(z.object({
    name: z.string().min(1, "Meno je povinné")
  })).min(1, "Aspoň jeden účastník je povinný")
}).refine((data) => data.endAt > data.startAt, {
  message: "Koniec musí byť po začiatku",
  path: ["endAt"]
});

type CreateBattleForm = z.infer<typeof createBattleSchema>;

const gameModes = [
  { value: "most_fish", label: "Najviac rýb", description: "Víťazí kto má najviac ulovených rýb" },
  { value: "total_weight", label: "Celková váha", description: "Víťazí kto má najväčšiu celkovú váhu" },
  { value: "biggest_fish", label: "Najväčšia ryba", description: "Víťazí kto uloví najväčšiu rybu" },
  { value: "best_3_fish", label: "Top 3 ryby", description: "Víťazí kto má najlepších 3 rýb spolu" },
  { value: "best_5_fish", label: "Top 5 rýb", description: "Víťazí kto má najlepších 5 rýb spolu" }
];

export default function BattleCreate() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // TODO: Replace with actual API call to check premium status
  const isPremium = true; // Temporarily set to true for development - will be connected to actual premium check

  const form = useForm<CreateBattleForm>({
    resolver: zodResolver(createBattleSchema),
    defaultValues: {
      name: "",
      mode: "most_fish",
      includeOnlyVerified: false,
      participants: [{ name: "" }],
      startAt: new Date(),
      endAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Default to 24 hours later
    }
  });

  const createBattleMutation = useMutation({
    mutationFn: async (data: CreateBattleForm) => {
      // TODO: For now creating a stub tripId - in production this should be selected by user
      // Generate a UUID-like string for the stub to pass validation
      const tripId = crypto.randomUUID();
      
      const battleData = {
        tripId,
        name: data.name,
        rules: {
          mode: data.mode,
          minWeightKg: data.minWeightKg,
          includeOnlyVerified: data.includeOnlyVerified
        },
        participants: data.participants,
        startAt: data.startAt.toISOString(),
        endAt: data.endAt.toISOString()
      };
      
      return apiRequest('POST', "/api/diary/battles", battleData);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Battle vytvorený!",
        description: "Váš fishing battle bol úspešne vytvorený."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/battles"] });
      setLocation(`/diary/battle/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vytvoriť battle. Skúste to znovu.",
        variant: "destructive"
      });
    }
  });

  // Redirect to paywall if not premium (moved to useEffect to avoid render loop)
  useEffect(() => {
    if (!isPremium) {
      setLocation("/diary/battle/paywall");
    }
  }, [isPremium, setLocation]);

  const addParticipant = () => {
    const currentParticipants = form.getValues("participants");
    form.setValue("participants", [...currentParticipants, { name: "" }]);
  };

  const removeParticipant = (index: number) => {
    const currentParticipants = form.getValues("participants");
    if (currentParticipants.length > 1) {
      form.setValue("participants", currentParticipants.filter((_, i) => i !== index));
    }
  };

  const onSubmit = (data: CreateBattleForm) => {
    createBattleMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Vytvoriť Fishing Battle
            </h1>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              PREMIUM
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Vytvorte súťaž medzi kamarátmi a zmerajte si sily na vode
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Základné informácie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Názov battle</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="napr. Letná súťaž na Dunaji"
                          data-testid="input-battle-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Herný režim</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-game-mode">
                            <SelectValue placeholder="Vyberte herný režim" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {gameModes.map((mode) => (
                            <SelectItem key={mode.value} value={mode.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{mode.label}</span>
                                <span className="text-sm text-muted-foreground">{mode.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minWeightKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimálna váha (kg)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.1"
                            placeholder="napr. 0.5"
                            data-testid="input-min-weight"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Ryby pod touto váhou sa nebudú počítať
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="includeOnlyVerified"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Len overené úlovky
                          </FormLabel>
                          <FormDescription>
                            Počítajú sa len úlovky s fotografiou
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-verified-only"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Time Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Časové nastavenia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startAt"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Začiatok battle</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className="w-full pl-3 text-left font-normal"
                                data-testid="button-start-date"
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: sk })
                                ) : (
                                  <span>Vyberte dátum</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endAt"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Koniec battle</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className="w-full pl-3 text-left font-normal"
                                data-testid="button-end-date"
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: sk })
                                ) : (
                                  <span>Vyberte dátum</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < form.getValues("startAt")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Účastníci
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.watch("participants").map((participant, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`participants.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input 
                              placeholder={`Meno účastníka ${index + 1}`}
                              data-testid={`input-participant-${index}`}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch("participants").length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeParticipant(index)}
                        data-testid={`button-remove-participant-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addParticipant}
                  className="w-full"
                  data-testid="button-add-participant"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Pridať účastníka
                </Button>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/diary")}
                data-testid="button-cancel"
              >
                Zrušiť
              </Button>
              <Button 
                type="submit" 
                disabled={createBattleMutation.isPending}
                data-testid="button-create-battle"
              >
                {createBattleMutation.isPending ? "Vytvára sa..." : "Vytvoriť Battle"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}