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
import { CalendarIcon, Trophy, Users, Clock, Plus, X, User as UserIcon } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DiaryLayout from "@/components/DiaryLayout";
import { UserSearch } from "@/components/diary/user-search";
import type { DiaryTrip } from "@shared/schema";

// Form validation schema
const createBattleSchema = z.object({
  name: z.string().min(1, "Názov je povinný").max(255, "Názov je príliš dlhý"),
  mode: z.enum(["most_fish", "total_weight", "biggest_fish", "best_3_fish", "best_5_fish"]),
  minWeightKg: z.number().optional(),
  includeOnlyVerified: z.boolean().default(false),
  startAt: z.date(),
  endAt: z.date(),
  useExistingTrip: z.boolean().default(false),
  tripId: z.string().optional()
}).refine((data) => data.endAt > data.startAt, {
  message: "Koniec musí byť po začiatku",
  path: ["endAt"]
}).refine((data) => {
  if (data.useExistingTrip && !data.tripId) {
    return false;
  }
  return true;
}, {
  message: "Výber výpravy je povinný",
  path: ["tripId"]
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
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  
  // Fetch user's trips for the trip selector
  const { data: trips = [], isLoading: isLoadingTrips } = useQuery<DiaryTrip[]>({
    queryKey: ["/api/diary/trips"],
    enabled: !!user
  });
  
  // Check premium status for battle creation
  const { data: premiumStatus, isLoading: isLoadingPremium } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id
  });
  
  const isPremium = premiumStatus?.isPremium || false;
  
  // Redirect FREE users to paywall
  useEffect(() => {
    if (!isLoadingPremium && !isPremium && user) {
      setLocation('/diary/battle-paywall');
    }
  }, [isPremium, isLoadingPremium, user, setLocation]);

  const form = useForm<CreateBattleForm>({
    resolver: zodResolver(createBattleSchema),
    defaultValues: {
      name: "",
      mode: "most_fish",
      includeOnlyVerified: false,
      startAt: new Date(),
      endAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to 24 hours later
      useExistingTrip: false,
      tripId: ""
    }
  });
  
  const useExistingTrip = form.watch("useExistingTrip");

  const createBattleMutation = useMutation({
    mutationFn: async (data: CreateBattleForm & { invitedUserIds?: string[] }) => {
      if (data.useExistingTrip && data.tripId) {
        // Use existing trip (advanced flow)
        const requestData = {
          name: data.name,
          mode: data.mode,
          startAt: data.startAt.toISOString(),
          endAt: data.endAt.toISOString(),
          invitedUserIds: data.invitedUserIds || [],
          tripId: data.tripId,
          rules: {
            mode: data.mode,
            minWeightKg: data.minWeightKg,
            includeOnlyVerified: data.includeOnlyVerified
          }
        };
        const response = await apiRequest("POST", "/api/diary/battles", requestData);
        return response.json();
      } else {
        // Auto-create trip (default flow)
        const requestData = {
          name: data.name,
          startAt: data.startAt.toISOString(),
          endAt: data.endAt.toISOString(),
          invitedUserIds: data.invitedUserIds || [],
          rules: {
            mode: data.mode,
            minWeightKg: data.minWeightKg,
            includeOnlyVerified: data.includeOnlyVerified
          }
        };
        const response = await apiRequest("POST", "/api/diary/battles-with-trip", requestData);
        return response.json();
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Úspech",
        description: "Váš fishing battle bol úspešne vytvorený."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/battles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
      
      // Handle response - can be either { battle, trip } or just battle
      const battleId = data.battle?.id || data.id;
      setLocation(`/diary/battles/${battleId}`);
    },
    onError: (error) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vytvoriť battle. Skúste to znovu.",
        variant: "destructive"
      });
    }
  });

  const handleSelectUser = (userId: string) => {
    setInvitedUserIds(prev => [...prev, userId]);
  };

  const handleRemoveUser = (userId: string) => {
    setInvitedUserIds(prev => prev.filter(id => id !== userId));
  };

  const onSubmit = (data: CreateBattleForm) => {
    // Add invited user IDs to mutation data
    const mutationData = {
      ...data,
      invitedUserIds
    };
    createBattleMutation.mutate(mutationData as CreateBattleForm);
  };

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
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
                        <FormDescription>
                          Automaticky vytvoríme novú výpravu s týmto názvom
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="useExistingTrip"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Použiť existujúcu výpravu
                          </FormLabel>
                          <FormDescription>
                            Pre pokročilých: pripojiť battle k už naplánovanej výprave
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-use-existing-trip"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {useExistingTrip && (
                    <FormField
                      control={form.control}
                      name="tripId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Výprava</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-trip">
                                <SelectValue placeholder="Vyberte výpravu pre battle" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {trips.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">
                                  Najprv vytvorte výpravu v sekcii Výpravy
                                </div>
                              ) : (
                                trips.filter(trip => {
                                  // Show only upcoming or ongoing trips
                                  const endDate = new Date(trip.endDate || trip.startDate);
                                  return endDate >= new Date();
                                }).map((trip) => (
                                  <SelectItem key={trip.id} value={trip.id}>
                                    <div>
                                      <div className="font-medium">{trip.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {format(new Date(trip.startDate), "d.M.yyyy", { locale: sk })}
                                        {trip.endDate && trip.endDate !== trip.startDate && 
                                          ` - ${format(new Date(trip.endDate), "d.M.yyyy", { locale: sk })}`
                                        }
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Battle bude priradený k vybranej výprave
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

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
                                <div>
                                  <div className="font-medium">{mode.label}</div>
                                  <div className="text-sm text-muted-foreground">{mode.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                  variant="outline"
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
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
                                  variant="outline"
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
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
                                disabled={(date) => date < new Date()}
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
                <CardContent>
                  <div className="space-y-6">
                    {/* Invite registered users */}
                    <div className="space-y-3">
                      <FormLabel>Pozvať registrovaných používateľov</FormLabel>
                      <UserSearch
                        selectedUsers={invitedUserIds}
                        onSelectUser={handleSelectUser}
                        onRemoveUser={handleRemoveUser}
                      />
                      {invitedUserIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {invitedUserIds.map((userId, index) => (
                            <Badge 
                              key={userId} 
                              variant="secondary" 
                              className="flex items-center gap-1"
                              data-testid={`badge-invited-user-${index}`}
                            >
                              <UserIcon className="h-3 w-3" />
                              Pozvaný používateľ
                              <button
                                type="button"
                                onClick={() => handleRemoveUser(userId)}
                                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                data-testid={`button-remove-invited-${index}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <FormDescription>
                        Vyhľadajte používateľov podľa mena alebo emailu a pošlite im pozvánku. Tvorca battle je automaticky pridaný ako účastník.
                      </FormDescription>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Nastavenia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="minWeightKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimálna hmotnosť (kg)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.1"
                            placeholder="napr. 0.5"
                            data-testid="input-min-weight"
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Úlovky pod túto hmotnosť nebudú započítané
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
                            Počítať len úlovky s fotografiou ako dôkaz
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
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-4">
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
    </DiaryLayout>
  );
}