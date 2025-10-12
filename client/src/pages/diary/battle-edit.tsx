import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Plus, X, CalendarIcon, ArrowLeft, Loader2, User as UserIcon } from "lucide-react";
import { useLocation, useParams } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { UserSearch } from "@/components/diary/user-search";
import type { DiaryBattle } from "@shared/schema";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

// Form validation schema
const editBattleSchema = z.object({
  name: z.string().min(1, "Názov je povinný").max(255, "Názov je príliš dlhý"),
  mode: z.enum(["most_fish", "total_weight", "biggest_fish", "best_3_fish", "best_5_fish"]),
  minWeightKg: z.preprocess(
    (val) => val === null || val === "" ? undefined : val,
    z.coerce.number().positive().optional()
  ),
  includeOnlyVerified: z.boolean().default(false),
  startAt: z.date(),
  endAt: z.date(),
  participants: z.array(z.object({
    name: z.string().min(1, "Meno je povinné"),
    userId: z.string().optional()
  })).min(1, "Aspoň jeden účastník je povinný")
}).refine((data) => data.endAt > data.startAt, {
  message: "Koniec musí byť po začiatku",
  path: ["endAt"]
});

type EditBattleForm = z.infer<typeof editBattleSchema>;

const gameModes = [
  { value: "most_fish", label: "Najviac rýb" },
  { value: "total_weight", label: "Celková váha" },
  { value: "biggest_fish", label: "Najväčšia ryba" },
  { value: "best_3_fish", label: "Top 3 ryby" },
  { value: "best_5_fish", label: "Top 5 rýb" }
];

export default function BattleEdit() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);

  // Fetch existing battle data
  const { data: battle, isLoading: isLoadingBattle } = useQuery<DiaryBattle>({
    queryKey: ['/api/diary/battles', id],
    enabled: !!id && !!user,
  });

  const form = useForm<EditBattleForm>({
    resolver: zodResolver(editBattleSchema),
    defaultValues: {
      name: "",
      mode: "most_fish",
      includeOnlyVerified: false,
      participants: [{ name: "" }],
      startAt: new Date(),
      endAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });

  // Prefill form when battle data is loaded
  useEffect(() => {
    if (battle) {
      form.reset({
        name: battle.name,
        mode: battle.rules.mode,
        minWeightKg: battle.rules.minWeightKg,
        includeOnlyVerified: battle.rules.includeOnlyVerified || false,
        participants: battle.participants,
        startAt: new Date(battle.startAt),
        endAt: new Date(battle.endAt)
      });
    }
  }, [battle, form]);

  const updateBattleMutation = useMutation({
    mutationFn: async (data: EditBattleForm & { invitedUserIds?: string[] }) => {
      const requestData = {
        name: data.name,
        startAt: data.startAt.toISOString(),
        endAt: data.endAt.toISOString(),
        participants: data.participants,
        invitedUserIds: data.invitedUserIds || [],
        rules: {
          mode: data.mode,
          minWeightKg: data.minWeightKg,
          includeOnlyVerified: data.includeOnlyVerified
        }
      };
      const response = await apiRequest("PUT", `/api/diary/battles/${id}`, requestData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Úspech",
        description: "Battle bol úspešne upravený."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/battles"] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles', id] });
      setLocation(`/diary/battle/${id}`);
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa upraviť battle. Skúste to znovu.",
        variant: "destructive"
      });
    }
  });

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

  const handleSelectUser = (userId: string) => {
    setInvitedUserIds(prev => [...prev, userId]);
  };

  const handleRemoveUser = (userId: string) => {
    setInvitedUserIds(prev => prev.filter(id => id !== userId));
  };

  const onSubmit = (data: EditBattleForm) => {
    // Add invited user IDs to mutation data
    const mutationData = {
      ...data,
      invitedUserIds
    };
    updateBattleMutation.mutate(mutationData as EditBattleForm);
  };

  if (isLoadingBattle) {
    return (
      <DiaryLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Načítavam battle...</p>
          </div>
        </div>
      </DiaryLayout>
    );
  }

  if (!battle) {
    return (
      <DiaryLayout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Battle sa nenašiel</h2>
            <Button onClick={() => setLocation("/diary/battle")} className="mt-4">
              Späť na battles
            </Button>
          </div>
        </div>
      </DiaryLayout>
    );
  }

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => setLocation(`/diary/battle/${id}`)}
              className="mb-4"
              data-testid="button-back-to-battle"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Späť na battle
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary" />
              Upraviť Battle
            </h1>
            <p className="text-muted-foreground mt-2">
              Upravte detaily vášho fishing battle
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Základné informácie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Názov Battle</FormLabel>
                        <FormControl>
                          <Input placeholder="napr. Víkendový súboj kamarátov" {...field} data-testid="input-name" />
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
                        <FormLabel>Herný mód</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-mode">
                              <SelectValue placeholder="Vyberte herný mód" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {gameModes.map(mode => (
                              <SelectItem key={mode.value} value={mode.value}>
                                {mode.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Dates Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Časový rámec</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startAt"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Začiatok</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="pl-3 text-left font-normal"
                                  data-testid="button-start-date"
                                >
                                  {field.value ? format(field.value, "PPP", { locale: sk }) : "Vyberte dátum"}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date("1900-01-01")}
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
                          <FormLabel>Koniec</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="pl-3 text-left font-normal"
                                  data-testid="button-end-date"
                                >
                                  {field.value ? format(field.value, "PPP", { locale: sk }) : "Vyberte dátum"}
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

              {/* Participants Card */}
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
                        battleId={id}
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
                        Vyhľadajte používateľov podľa mena alebo emailu a pošlite im pozvánku
                      </FormDescription>
                    </div>

                    {/* Manual participant names */}
                    <div className="space-y-3">
                      <FormLabel>Alebo zadajte mená účastníkov manuálne</FormLabel>
                      {form.watch("participants").map((_, index) => (
                        <div key={index} className="flex gap-2">
                          <FormField
                            control={form.control}
                            name={`participants.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input 
                                    placeholder="Meno účastníka" 
                                    {...field} 
                                    data-testid={`input-participant-${index}`}
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
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rules Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Pravidlá</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="minWeightKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimálna váha (voliteľné)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            placeholder="napr. 0.5" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                            value={field.value ?? ""}
                            data-testid="input-min-weight"
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
                            Započítavať len úlovky s fotografiou
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

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/diary/battle/${id}`)}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Zrušiť
                </Button>
                <Button
                  type="submit"
                  disabled={updateBattleMutation.isPending}
                  className="flex-1"
                  data-testid="button-save"
                >
                  {updateBattleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Ukladám...
                    </>
                  ) : (
                    "Uložiť zmeny"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </DiaryLayout>
  );
}
