import { useState, useEffect, forwardRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { 
  Trophy, Users, Clock, X, User as UserIcon, Save, FolderOpen, 
  Trash2, Swords, Target, Weight, Star, MapPin, Anchor, 
  ShieldCheck, ChevronDown, AlertCircle, Timer, ChevronRight, ArrowLeft
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DiaryLayout from "@/components/DiaryLayout";
import { UserSearch } from "@/components/diary/user-search";
import { LocationSearchField } from "@/components/LocationSearchField";
import type { DiaryTrip } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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

interface BattleTemplate {
  id: string;
  name: string;
  mode: string;
  minWeightKg?: number;
  includeOnlyVerified: boolean;
  durationMinutes: number;
}

const toDateTimeLocal = (date: Date | undefined | null): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeLocal = (value: string): Date | undefined => {
  if (!value || value.trim() === "") {
    return undefined;
  }
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
};

const createBattleSchema = z.object({
  name: z.string().min(1, "Názov operácie je povinný").max(255, "Názov je príliš dlhý"),
  location: z.string().optional(),
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
}).refine((data) => {
  if (!data.useExistingTrip && (!data.location || data.location.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Lokalita je povinná pri novej výprave",
  path: ["location"]
});

type CreateBattleForm = z.infer<typeof createBattleSchema>;

const gameModes = [
  { value: "most_fish", label: "Najviac rýb", icon: Target, description: "Kto uloví najviac kusov" },
  { value: "total_weight", label: "Celková váha", icon: Weight, description: "Súčet váhy všetkých rýb" },
  { value: "biggest_fish", label: "Najväčšia ryba", icon: Trophy, description: "Rozhoduje najťažší kus" },
  { value: "best_3_fish", label: "Top 3 ryby", icon: Star, description: "Súčet 3 najlepších úlovkov" },
  { value: "best_5_fish", label: "Top 5 rýb", icon: Swords, description: "Súčet 5 najlepších úlovkov" }
];

const loadTemplates = (): BattleTemplate[] => {
  try {
    const saved = localStorage.getItem('battleTemplates');
    if (!saved) return [];
    const templates = JSON.parse(saved) as any[];
    return templates.map(t => ({
      ...t,
      durationMinutes: t.durationMinutes ?? (t.durationHours ? t.durationHours * 60 : 24 * 60)
    }));
  } catch {
    return [];
  }
};

const saveTemplates = (templates: BattleTemplate[]) => {
  localStorage.setItem('battleTemplates', JSON.stringify(templates));
};

const SectionHeader = ({ number, title, subtitle }: { number: string; title: string; subtitle: string }) => (
  <div className="flex gap-3 mb-4">
    <div className="flex-none w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-800 border border-slate-700 dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
      {number}
    </div>
    <div>
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground leading-none mb-1">{title}</h3>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{subtitle}</p>
    </div>
  </div>
);

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: { message?: string };
  icon?: React.ComponentType<{ className?: string; size?: number }>;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, icon: Icon, className, ...props }, ref) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />}
        <input 
          {...props} 
          ref={ref}
          className={cn(
            "w-full bg-card/50 dark:bg-slate-900/50 border transition-all outline-none",
            error ? 'border-red-500/50' : 'border-border dark:border-slate-800',
            "focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20",
            "rounded-xl py-3.5 text-sm text-foreground",
            Icon ? 'pl-12 pr-4' : 'px-4',
            "placeholder:text-muted-foreground/50",
            className
          )}
        />
      </div>
      {error && (
        <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1 mt-1">
          <AlertCircle size={10} /> {error.message}
        </p>
      )}
    </div>
  )
);
InputField.displayName = "InputField";

interface ModeCardProps {
  mode: typeof gameModes[0];
  isSelected: boolean;
  onClick: () => void;
}

const ModeCard = ({ mode, isSelected, onClick }: ModeCardProps) => {
  const Icon = mode.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col p-4 rounded-2xl border transition-all text-left",
        isSelected 
          ? 'bg-orange-500/10 border-orange-500/50 ring-1 ring-orange-500/20' 
          : 'bg-card/30 dark:bg-slate-900/30 border-border dark:border-slate-800 hover:border-muted-foreground/50'
      )}
    >
      <div className={cn(
        "mb-4 p-2.5 rounded-xl inline-flex w-fit transition-colors",
        isSelected 
          ? 'bg-orange-500 text-white' 
          : 'bg-muted dark:bg-slate-800 text-muted-foreground group-hover:text-foreground'
      )}>
        <Icon size={20} />
      </div>
      <div className="text-[11px] font-black uppercase tracking-tight text-foreground mb-1">{mode.label}</div>
      <div className="text-[9px] font-bold text-muted-foreground leading-tight uppercase tracking-tighter">{mode.description}</div>
      {isSelected && (
        <motion.div 
          layoutId="active-mode" 
          className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]" 
        />
      )}
    </button>
  );
};

export default function BattleCreate() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<BattleTemplate[]>(loadTemplates);
  const [templateName, setTemplateName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: trips = [], isLoading: isLoadingTrips } = useQuery<DiaryTrip[]>({
    queryKey: ["/api/diary/trips"],
    enabled: !!user
  });

  const { data: premiumStatus, isLoading: isLoadingPremium } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id
  });

  const isPremium = premiumStatus?.isPremium || false;

  useEffect(() => {
    if (!isLoadingPremium && !isPremium && user) {
      setLocation('/diary/battles/paywall');
    }
  }, [isPremium, isLoadingPremium, user, setLocation]);

  const [rematchDefaults] = useState(() => {
    try {
      const rematchData = sessionStorage.getItem('rematchData');
      if (rematchData) {
        sessionStorage.removeItem('rematchData');
        const data = JSON.parse(rematchData);
        return {
          name: data.name || "",
          mode: data.mode || "most_fish",
          participantUserIds: data.participantUserIds || [],
        };
      }
    } catch (e) {
      console.error("Failed to parse rematch data:", e);
    }
    return { name: "", mode: "most_fish" as const, participantUserIds: [] as string[] };
  });

  useEffect(() => {
    if (rematchDefaults.participantUserIds.length > 0) {
      setInvitedUserIds(rematchDefaults.participantUserIds);
    }
  }, [rematchDefaults.participantUserIds]);

  const form = useForm<CreateBattleForm>({
    resolver: zodResolver(createBattleSchema),
    defaultValues: {
      name: rematchDefaults.name,
      location: "",
      mode: rematchDefaults.mode,
      includeOnlyVerified: false,
      startAt: new Date(),
      endAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      useExistingTrip: false,
      tripId: ""
    }
  });

  const formValues = form.watch();
  const useExistingTrip = formValues.useExistingTrip;

  const setDuration = (hours: number) => {
    const start = formValues.startAt instanceof Date ? formValues.startAt : new Date();
    const end = new Date(start.getTime() + hours * 3600000);
    form.setValue("endAt", end, { shouldValidate: true });
  };

  const createBattleMutation = useMutation({
    mutationFn: async (data: CreateBattleForm & { invitedUserIds?: string[] }) => {
      if (data.useExistingTrip && data.tripId) {
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
        const requestData = {
          name: data.name,
          location: data.location,
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
        title: "Misia spustená",
        description: "Tvoj súboj bol úspešne založený. Súperi boli upozornení."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/battles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
      const battleId = data.battle?.id || data.id;
      setLocation(`/diary/battles/${battleId}`);
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa založiť súboj. Skúste to znovu.",
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

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Chyba",
        description: "Zadajte názov šablóny",
        variant: "destructive"
      });
      return;
    }

    const values = form.getValues();
    const startAt = values.startAt instanceof Date ? values.startAt : new Date(values.startAt);
    const endAt = values.endAt instanceof Date ? values.endAt : new Date(values.endAt);
    const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / (1000 * 60));

    const newTemplate: BattleTemplate = {
      id: Date.now().toString(),
      name: templateName,
      mode: values.mode,
      minWeightKg: values.minWeightKg,
      includeOnlyVerified: values.includeOnlyVerified,
      durationMinutes: durationMinutes > 0 ? durationMinutes : 24 * 60
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateName("");

    toast({
      title: "Šablóna uložená",
      description: `"${templateName}" bola uložená pre budúce použitie.`
    });
  };

  const handleLoadTemplate = (template: BattleTemplate) => {
    const now = new Date();
    const endAt = new Date(now.getTime() + template.durationMinutes * 60 * 1000);

    form.setValue("mode", template.mode as any, { shouldValidate: true, shouldDirty: true });
    form.setValue("minWeightKg", template.minWeightKg, { shouldValidate: true, shouldDirty: true });
    form.setValue("includeOnlyVerified", template.includeOnlyVerified, { shouldValidate: true, shouldDirty: true });
    form.setValue("startAt", now, { shouldValidate: true, shouldDirty: true });
    form.setValue("endAt", endAt, { shouldValidate: true, shouldDirty: true });

    toast({
      title: "Šablóna načítaná",
      description: `Nastavenia "${template.name}" boli aplikované.`
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updated = templates.filter(t => t.id !== templateId);
    setTemplates(updated);
    saveTemplates(updated);

    toast({
      title: "Šablóna vymazaná",
      description: "Šablóna bola odstránená."
    });
  };

  const onSubmit = (data: CreateBattleForm) => {
    const mutationData = {
      ...data,
      invitedUserIds
    };
    createBattleMutation.mutate(mutationData as CreateBattleForm);
  };

  const getDurationDisplay = () => {
    const start = formValues.startAt;
    const end = formValues.endAt;
    if (!start || !end) return null;
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return null;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) {
      return `${days} ${days === 1 ? 'deň' : days < 5 ? 'dni' : 'dní'}${remainingHours > 0 ? ` a ${remainingHours}h` : ''}`;
    }
    return `${hours} ${hours === 1 ? 'hodina' : hours < 5 ? 'hodiny' : 'hodín'}`;
  };

  const getSelectedMode = () => gameModes.find(m => m.value === formValues.mode);

  return (
    <DiaryLayout>
      <div className="max-w-3xl mx-auto pb-16">
        
        <div className="flex items-center justify-between mb-6">
          <Link href="/diary/battles">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Späť</span>
            </button>
          </Link>
          
          {templates.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="rounded-xl border-border hover:border-orange-500/50 text-[10px] font-black uppercase tracking-widest"
                >
                  <FolderOpen size={14} className="text-orange-500 mr-2" /> 
                  Načítať šablónu
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Uložené šablóny</AlertDialogTitle>
                  <AlertDialogDescription>
                    Vyberte šablónu pre rýchle nastavenie súboja
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 my-4">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-orange-500/50 transition-all">
                      <button
                        type="button"
                        onClick={() => {
                          handleLoadTemplate(template);
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="font-bold text-sm">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {gameModes.find(m => m.value === template.mode)?.label} • {Math.round(template.durationMinutes / 60)}h
                        </div>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zavrieť</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Hidden inputs for form registration */}
          <input type="hidden" {...form.register("mode")} />
          <input type="hidden" {...form.register("location")} />
          <input type="hidden" {...form.register("tripId")} />
          <input type="hidden" {...form.register("useExistingTrip")} />
          <input type="hidden" {...form.register("minWeightKg")} />
          <input type="hidden" {...form.register("includeOnlyVerified")} />
          
          <section>
            <SectionHeader number="01" title="Konfigurácia súboja" subtitle="Základné parametre operácie" />
            <div className="space-y-5">
              <InputField 
                label="Názov operácie"
                placeholder="napr. Jesenná výprava s Mišom"
                {...form.register("name")}
                error={form.formState.errors.name}
              />
              
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Herný režim</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {gameModes.map((mode) => (
                    <ModeCard 
                      key={mode.value}
                      mode={mode}
                      isSelected={formValues.mode === mode.value}
                      onClick={() => form.setValue("mode", mode.value as any, { shouldValidate: true })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader number="02" title="Logistika a terén" subtitle="Kde a kedy sa stretnete?" />
            <div className="bg-card/20 dark:bg-slate-900/20 border border-border/50 dark:border-slate-800/50 rounded-xl p-5 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={() => form.setValue("useExistingTrip", false, { shouldValidate: true })}
                  className={cn(
                    "p-5 rounded-2xl border text-left transition-all",
                    !useExistingTrip 
                      ? 'bg-foreground text-background border-foreground shadow-xl' 
                      : 'bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800 text-muted-foreground hover:border-muted-foreground/50'
                  )}
                >
                  <MapPin size={20} className="mb-2" />
                  <div className="text-[11px] font-black uppercase tracking-tight">Nová výprava</div>
                  <div className="text-[9px] font-bold opacity-70 uppercase tracking-tighter">Vytvoriť nový záznam v denníku</div>
                </button>
                <button 
                  type="button"
                  onClick={() => form.setValue("useExistingTrip", true, { shouldValidate: true })}
                  className={cn(
                    "p-5 rounded-2xl border text-left transition-all",
                    useExistingTrip 
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xl shadow-orange-500/10' 
                      : 'bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800 text-muted-foreground hover:border-muted-foreground/50'
                  )}
                >
                  <Anchor size={20} className="mb-2" />
                  <div className="text-[11px] font-black uppercase tracking-tight">Existujúca výprava</div>
                  <div className="text-[9px] font-bold opacity-70 uppercase tracking-tighter">Priradiť k už naplánovanej akcii</div>
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!useExistingTrip ? (
                  <motion.div key="new" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Lokalita / Revír *</label>
                      <LocationSearchField
                        value={formValues.location || ""}
                        onChange={(value) => form.setValue("location", value, { shouldValidate: true })}
                        testId="input-battle-location"
                      />
                      {form.formState.errors.location && (
                        <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1 mt-1">
                          <AlertCircle size={10} /> {form.formState.errors.location.message}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="existing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Vyber výpravu</label>
                    <div className="relative">
                      <Select 
                        value={formValues.tripId} 
                        onValueChange={(value) => form.setValue("tripId", value, { shouldValidate: true })}
                      >
                        <SelectTrigger className="w-full bg-card/50 dark:bg-slate-950 border border-border dark:border-slate-800 rounded-xl px-4 py-3.5 text-sm">
                          <SelectValue placeholder="Zatiaľ žiadne naplánované výpravy" />
                        </SelectTrigger>
                        <SelectContent>
                          {trips.filter(trip => {
                            const endDate = new Date(trip.endDate || trip.startDate);
                            return endDate >= new Date();
                          }).map((trip) => (
                            <SelectItem key={trip.id} value={trip.id}>
                              <div>
                                <div className="font-medium">{trip.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(trip.startDate), "d.M.yyyy", { locale: sk })}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.formState.errors.tripId && (
                      <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1 mt-1">
                        <AlertCircle size={10} /> {form.formState.errors.tripId.message}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-6 pt-6 border-t border-border/50 dark:border-slate-800/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Controller
                    name="startAt"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Čas spustenia</label>
                        <Input
                          type="datetime-local"
                          value={toDateTimeLocal(field.value)}
                          onChange={(e) => {
                            const parsed = fromDateTimeLocal(e.target.value);
                            field.onChange(parsed ?? new Date());
                          }}
                          min={toDateTimeLocal(new Date())}
                          className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800 rounded-xl"
                        />
                        {fieldState.error && (
                          <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1">
                            <AlertCircle size={10} /> {fieldState.error.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                  
                  <Controller
                    name="endAt"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Čas ukončenia</label>
                        <Input
                          type="datetime-local"
                          value={toDateTimeLocal(field.value)}
                          onChange={(e) => {
                            const parsed = fromDateTimeLocal(e.target.value);
                            field.onChange(parsed ?? new Date(Date.now() + 24 * 60 * 60 * 1000));
                          }}
                          min={toDateTimeLocal(formValues.startAt)}
                          className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800 rounded-xl"
                        />
                        {fieldState.error && (
                          <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1">
                            <AlertCircle size={10} /> {fieldState.error.message}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 pt-1">
                          {[4, 8, 24, 48].map((h) => (
                            <button 
                              key={h}
                              type="button"
                              onClick={() => setDuration(h)}
                              className="px-3 py-1 bg-muted dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-orange-500 hover:border-orange-500/50 transition-all"
                            >
                              {h === 48 ? "Víkend" : `${h}h`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader number="03" title="Operačný personál" subtitle="Kto prijme vašu výzvu?" />
            <div className="bg-card/20 dark:bg-slate-900/20 border border-border/50 dark:border-slate-800/50 rounded-xl p-5 space-y-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Vyhľadať súpera</label>
                <UserSearch
                  selectedUsers={invitedUserIds}
                  onSelectUser={handleSelectUser}
                  onRemoveUser={handleRemoveUser}
                />
              </div>
              
              {invitedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {invitedUserIds.map((userId, index) => (
                    <Badge 
                      key={userId} 
                      variant="secondary" 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500"
                    >
                      <UserIcon className="h-3 w-3" />
                      Pozvaný súper #{index + 1}
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(userId)}
                        className="ml-1 hover:bg-orange-500/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <p className="text-[10px] text-muted-foreground">
                Tvorca súboja je automaticky pridaný ako účastník. Pozvaní súperi dostanú notifikáciu.
              </p>
            </div>
          </section>

          <section>
            <SectionHeader number="04" title="Bojové protokoly" subtitle="Pokročilé pravidlá (voliteľné)" />
            
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-border dark:border-slate-800 hover:border-orange-500/50 transition-all mb-6"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-muted-foreground" />
                <span className="text-[11px] font-black uppercase tracking-tight text-foreground">
                  {showAdvanced ? "Skryť pokročilé nastavenia" : "Zobraziť pokročilé nastavenia"}
                </span>
              </div>
              <ChevronDown 
                size={16} 
                className={cn(
                  "text-muted-foreground transition-transform",
                  showAdvanced && "rotate-180"
                )} 
              />
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card/20 dark:bg-slate-900/20 border border-border/50 dark:border-slate-800/50 rounded-xl p-5 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Minimálna hmotnosť (kg)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="napr. 0.5"
                        value={formValues.minWeightKg || ""}
                        onChange={(e) => form.setValue("minWeightKg", e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800 rounded-xl"
                      />
                      <p className="text-[10px] text-muted-foreground ml-1">Úlovky pod túto hmotnosť nebudú započítané</p>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl border border-border dark:border-slate-800">
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-black uppercase tracking-tight text-foreground">Len overené úlovky</div>
                        <div className="text-[9px] text-muted-foreground">Počítať len úlovky s fotografiou ako dôkaz</div>
                      </div>
                      <Switch
                        checked={formValues.includeOnlyVerified}
                        onCheckedChange={(checked) => form.setValue("includeOnlyVerified", checked)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="bg-gradient-to-b from-orange-500/5 to-transparent border border-orange-500/20 rounded-xl p-5">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 px-4 py-2 rounded-full mb-4">
                <Timer size={14} className="text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Mission Briefing</span>
              </div>
              <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Rekapitulácia operácie</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl bg-card/30 dark:bg-slate-900/30 border border-border dark:border-slate-800">
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Režim</div>
                <div className="text-sm font-bold text-foreground">{getSelectedMode()?.label || "—"}</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-card/30 dark:bg-slate-900/30 border border-border dark:border-slate-800">
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Trvanie</div>
                <div className="text-sm font-bold text-foreground">{getDurationDisplay() || "—"}</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-card/30 dark:bg-slate-900/30 border border-border dark:border-slate-800">
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Súperi</div>
                <div className="text-sm font-bold text-foreground">{invitedUserIds.length}</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-card/30 dark:bg-slate-900/30 border border-border dark:border-slate-800">
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Lokalita</div>
                <div className="text-sm font-bold text-foreground truncate">{useExistingTrip ? "Existujúca" : (formValues.location || "—")}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Názov šablóny (voliteľné)"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="flex-1 bg-card/50 dark:bg-slate-900/50 border-border dark:border-slate-800 rounded-xl"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveTemplate}
                  className="rounded-xl border-border hover:border-orange-500/50"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                type="submit"
                disabled={createBattleMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest rounded-xl px-8 py-3 shadow-lg shadow-orange-500/20"
              >
                {createBattleMutation.isPending ? (
                  "Spúšťam misiu..."
                ) : (
                  <>
                    Potvrdiť a založiť súboj
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </section>

        </form>
      </div>
    </DiaryLayout>
  );
}
