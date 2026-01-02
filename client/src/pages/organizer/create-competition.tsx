import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Competition } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { getSideCompetitionLabel } from "@/lib/utils";
import OrganizerLayout from "@/components/OrganizerLayout";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Loader2, 
  Plus, 
  Trash2,
  FileText,
  MapPin,
  Trophy,
  Settings,
  Save,
  Calendar,
  Info
} from "lucide-react";
import { z } from "zod";

const STEPS = [
  { id: 1, title: "Základné údaje", icon: FileText, description: "Názov, miesto a dátumy" },
  { id: 2, title: "Pravidlá", icon: Settings, description: "Bodovanie a nastavenia" },
  { id: 3, title: "Sektory", icon: MapPin, description: "Rozdelenie na sektory" },
  { id: 4, title: "Špeciálne súťaže", icon: Trophy, description: "Doplnkové kategórie" },
  { id: 5, title: "Súhrn", icon: Check, description: "Kontrola a uloženie" },
];

const SIDE_COMPETITIONS = [
  { id: "big-fish-overall", label: "Najväčšia ryba" },
  { id: "big-common-carp", label: "Najväčší šupináč" },
  { id: "big-mirror-carp", label: "Najväčší zrkadlák" },
  { id: "first-catch", label: "Prvý úlovok" },
  { id: "last-catch", label: "Posledný úlovok" },
  { id: "most-fish-caught", label: "Najviac úlovkov" },
  { id: "best-5-fish", label: "Najlepších 5 rýb" },
  { id: "best-3-fish", label: "Najlepšie 3 ryby" },
  { id: "daily-big-fish", label: "Denná najväčšia ryba" },
  { id: "first-fish-over-15kg", label: "Prvá ryba nad 15kg" },
  { id: "first-fish-over-20kg", label: "Prvá ryba nad 20kg" },
  { id: "first-fish-over-25kg", label: "Prvá ryba nad 25kg" },
];

const step1Schema = z.object({
  name: z.string().min(1, "Názov súťaže je povinný").max(255, "Názov je príliš dlhý"),
  location: z.string().min(1, "Miesto je povinné").max(255, "Miesto je príliš dlhé"),
  startDate: z.string().min(1, "Dátum začiatku je povinný"),
  endDate: z.string().min(1, "Dátum konca je povinný"),
  contactEmail: z.string().min(1, "Kontaktný email je povinný").email("Neplatný email"),
  contactPhone: z.string().min(1, "Kontaktný telefón je povinný").max(50, "Telefón je príliš dlhý"),
});

const step2Schema = z.object({
  description: z.string().max(2000).optional(),
  rules: z.string().optional(),
  scoringType: z.enum(["total", "avg3", "avg5"]).default("total"),
  minWeight: z.coerce.number().min(1).max(15).default(2),
  firstPlacePrize: z.string().optional(),
  secondPlacePrize: z.string().optional(),
  thirdPlacePrize: z.string().optional(),
  registrationFee: z.string().optional(),
  maxTeams: z.coerce.number().optional(),
});

const fullSchema = step1Schema.merge(step2Schema).refine((data) => {
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: "Dátum konca musí byť neskorší ako začiatok",
  path: ["endDate"]
});

type FormData = z.infer<typeof fullSchema>;

export default function CreateCompetition() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  
  const editId = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get('id');
  }, [searchString]);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [competitionId, setCompetitionId] = useState<string | null>(editId);
  const competitionIdRef = useRef<string | null>(editId);
  const [hasSectors, setHasSectors] = useState(false);
  const [numSectors, setNumSectors] = useState(2);
  const [sectorPlaces, setSectorPlaces] = useState<Array<{ sectorName: string; places: string[] }>>([]);
  const [sideCompetitions, setSideCompetitions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      name: "",
      location: "",
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16),
      contactEmail: user?.email || "",
      contactPhone: "",
      description: "",
      rules: "",
      scoringType: "total",
      minWeight: 2,
      firstPlacePrize: "",
      secondPlacePrize: "",
      thirdPlacePrize: "",
      registrationFee: "",
      maxTeams: undefined,
    },
  });

  const { data: existingCompetition, isLoading: loadingExisting } = useQuery<Competition>({
    queryKey: ['/api/competitions', editId],
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingCompetition) {
      form.reset({
        name: existingCompetition.name || "",
        location: existingCompetition.location || "",
        startDate: existingCompetition.startDate 
          ? new Date(existingCompetition.startDate).toISOString().slice(0, 16) 
          : new Date().toISOString().slice(0, 16),
        endDate: existingCompetition.endDate 
          ? new Date(existingCompetition.endDate).toISOString().slice(0, 16) 
          : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16),
        contactEmail: existingCompetition.contactEmail || user?.email || "",
        contactPhone: existingCompetition.contactPhone || "",
        description: existingCompetition.description || "",
        rules: existingCompetition.rules || "",
        scoringType: (existingCompetition.scoringType as "total" | "avg3" | "avg5") || "total",
        minWeight: existingCompetition.minWeight ? parseFloat(existingCompetition.minWeight) : 2,
        firstPlacePrize: existingCompetition.firstPlacePrize || "",
        secondPlacePrize: existingCompetition.secondPlacePrize || "",
        thirdPlacePrize: existingCompetition.thirdPlacePrize || "",
        registrationFee: existingCompetition.registrationFee || "",
        maxTeams: existingCompetition.maxTeams ?? undefined,
      });
      if (existingCompetition.hasSectors) {
        setHasSectors(true);
        if (existingCompetition.sectorPlaces && Array.isArray(existingCompetition.sectorPlaces)) {
          setNumSectors(existingCompetition.sectorPlaces.length);
          setSectorPlaces(existingCompetition.sectorPlaces as any);
        }
      }
      if (existingCompetition.sideCompetitions && Array.isArray(existingCompetition.sideCompetitions)) {
        setSideCompetitions(existingCompetition.sideCompetitions as string[]);
      }
    }
  }, [existingCompetition, form]);

  useEffect(() => {
    if (!hasSectors) return;
    
    setSectorPlaces(prev => {
      if (prev.length === numSectors) return prev;
      
      if (numSectors > prev.length) {
        // Pridávame nové sektory, staré zachováme
        const added = Array.from({ length: numSectors - prev.length }, (_, i) => ({
          sectorName: `Sektor ${String.fromCharCode(65 + prev.length + i)}`,
          places: Array.from({ length: 5 }, (_, j) => `Miesto ${j + 1}`),
        }));
        return [...prev, ...added];
      } else {
        // Odoberáme sektory z konca
        return prev.slice(0, numSectors);
      }
    });
  }, [hasSectors, numSectors]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest('POST', '/api/competitions', {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        hasSectors,
        sectorPlaces: hasSectors ? sectorPlaces : [],
        sideCompetitions,
        status: 'draft',
      });
      return response;
    },
    onSuccess: (data: any) => {
      competitionIdRef.current = data.id;
      setCompetitionId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/competitions'] });
      toast({
        title: "✅ Súťaž vytvorená",
        description: "Pokračujte v nastavovaní.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa vytvoriť súťaž",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<FormData>) => {
      if (!competitionId) throw new Error("No competition ID");
      const response = await apiRequest('PATCH', `/api/competitions/${competitionId}`, {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
        hasSectors,
        sectorPlaces: hasSectors ? sectorPlaces : [],
        sideCompetitions,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/competitions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba pri ukladaní",
        description: error.message || "Skúste znovu",
        variant: "destructive",
      });
    },
  });

  const saveProgress = async () => {
    setIsSaving(true);
    try {
      const values = form.getValues();
      if (!competitionId) {
        await createMutation.mutateAsync(values);
      } else {
        await updateMutation.mutateAsync(values);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    // Guard: ak sme za krokom 1 a nemáme competitionId, niečo je zle
    // Používame ref namiesto state kvôli race condition
    if (currentStep > 1 && !competitionIdRef.current) {
      toast({
        title: "Chyba",
        description: "Najprv vytvor súťaž v kroku 1",
        variant: "destructive",
      });
      setCurrentStep(1);
      return;
    }
    
    let isValid = false;
    
    if (currentStep === 1) {
      isValid = await form.trigger(['name', 'location', 'startDate', 'endDate']);
      if (isValid && !competitionId) {
        // Create competition and wait for ID before proceeding
        setIsSaving(true);
        try {
          const values = form.getValues();
          const result = await createMutation.mutateAsync(values);
          // Set ref first (synchronous), then state
          competitionIdRef.current = result.id;
          setCompetitionId(result.id);
          setCurrentStep(2);
        } finally {
          setIsSaving(false);
        }
        return; // Stop here, don't continue to the normal flow
      }
    } else if (currentStep === 2) {
      isValid = await form.trigger(['description', 'rules', 'scoringType', 'minWeight']);
      if (isValid && competitionIdRef.current) {
        await saveProgress();
      }
    } else if (currentStep === 3) {
      // Validácia sektorov ak sú zapnuté
      if (hasSectors) {
        const isSectorsValid = sectorPlaces.every(s => s.sectorName.trim() !== "" && s.places.length > 0);
        if (!isSectorsValid) {
          toast({
            title: "Chýbajúce údaje",
            description: "Všetky sektory musia mať názov a aspoň jedno miesto.",
            variant: "destructive",
          });
          return;
        }
      }
      isValid = true;
      if (competitionIdRef.current) {
        await saveProgress();
      }
    } else if (currentStep === 4) {
      isValid = true;
      if (competitionIdRef.current) {
        await saveProgress();
      }
    } else {
      isValid = true;
    }

    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    await saveProgress();
    toast({
      title: "🎉 Súťaž uložená!",
      description: "Súťaž je uložená ako rozpracovaná. Keď budete pripravení, môžete ju publikovať.",
    });
    setLocation('/organizer');
  };

  const updateSectorName = (index: number, name: string) => {
    const newPlaces = [...sectorPlaces];
    newPlaces[index].sectorName = name;
    setSectorPlaces(newPlaces);
  };

  const updatePlaceName = (sectorIndex: number, placeIndex: number, name: string) => {
    const newPlaces = [...sectorPlaces];
    newPlaces[sectorIndex].places[placeIndex] = name;
    setSectorPlaces(newPlaces);
  };

  const addPlace = (sectorIndex: number) => {
    const newPlaces = [...sectorPlaces];
    const placeCount = newPlaces[sectorIndex].places.length;
    newPlaces[sectorIndex].places.push(`Miesto ${placeCount + 1}`);
    setSectorPlaces(newPlaces);
  };

  const removePlace = (sectorIndex: number, placeIndex: number) => {
    const newPlaces = [...sectorPlaces];
    newPlaces[sectorIndex].places.splice(placeIndex, 1);
    setSectorPlaces(newPlaces);
  };

  const toggleSideCompetition = (id: string) => {
    setSideCompetitions(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  if (authLoading || (editId && loadingExisting)) {
    return (
      <OrganizerLayout>
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </OrganizerLayout>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Prihlásenie potrebné</CardTitle>
            <CardDescription>Pre vytvorenie súťaže sa musíte prihlásiť.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/auth/login')} className="w-full">
              Prihlásiť sa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercent = (currentStep / STEPS.length) * 100;

  return (
    <OrganizerLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/organizer')}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť na dashboard
          </Button>
          
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {editId ? 'Dokončiť súťaž' : 'Vytvoriť novú súťaž'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {editId 
              ? 'Dokončite nastavenie vašej rozpracovanej súťaže.' 
              : 'Vyplňte údaje o súťaži. Všetko môžete kedykoľvek upraviť.'
            }
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Krok {currentStep} z {STEPS.length}: {STEPS[currentStep - 1].title}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          
          <div className="hidden md:flex justify-between mt-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <div 
                  key={step.id} 
                  className={`flex flex-col items-center text-center ${
                    isActive ? 'text-orange-600 dark:text-orange-400' : 
                    isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    isActive ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500' :
                    isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-medium">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <Form {...form}>
              <form className="space-y-6">
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-5 h-5 text-orange-500" />
                      <h2 className="text-lg font-semibold">Základné informácie</h2>
                    </div>

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Názov súťaže *</FormLabel>
                          <FormControl>
                            <Input placeholder="napr. Jarný kaprový maratón 2025" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Miesto konania *</FormLabel>
                          <FormControl>
                            <Input placeholder="napr. Vodná nádrž Domaša" {...field} data-testid="input-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Začiatok súťaže *</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} data-testid="input-start-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Koniec súťaže *</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} data-testid="input-end-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="border-t pt-6 mt-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-4">Kontaktné údaje organizátora</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kontaktný email *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="napr. info@vasasutaz.sk" {...field} data-testid="input-contact-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kontaktný telefón *</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="napr. +421 900 123 456" {...field} data-testid="input-contact-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Settings className="w-5 h-5 text-orange-500" />
                      <h2 className="text-lg font-semibold">Pravidlá a bodovanie</h2>
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Popis súťaže</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Stručný popis súťaže pre účastníkov..." 
                              className="min-h-[100px]"
                              {...field} 
                              data-testid="input-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rules"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pravidlá</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Pravidlá súťaže..." 
                              className="min-h-[120px]"
                              {...field} 
                              data-testid="input-rules"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="scoringType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Typ bodovania</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-scoring-type">
                                  <SelectValue placeholder="Vyberte typ" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="total">Celková hmotnosť</SelectItem>
                                <SelectItem value="avg3">Priemer 3 najväčších</SelectItem>
                                <SelectItem value="avg5">Priemer 5 najväčších</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimálna váha (kg)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1} 
                                max={15} 
                                step={0.5}
                                {...field}
                                data-testid="input-min-weight"
                              />
                            </FormControl>
                            <FormDescription>Ryby pod touto váhou sa nerátajú</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="firstPlacePrize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>1. miesto (cena)</FormLabel>
                            <FormControl>
                              <Input placeholder="napr. 500€" {...field} data-testid="input-prize-1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="secondPlacePrize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>2. miesto (cena)</FormLabel>
                            <FormControl>
                              <Input placeholder="napr. 300€" {...field} data-testid="input-prize-2" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="thirdPlacePrize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>3. miesto (cena)</FormLabel>
                            <FormControl>
                              <Input placeholder="napr. 200€" {...field} data-testid="input-prize-3" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="registrationFee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Štartovné</FormLabel>
                            <FormControl>
                              <Input placeholder="napr. 50€ / tím" {...field} data-testid="input-fee" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxTeams"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximálny počet tímov</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={2}
                                placeholder="neobmedzené"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                data-testid="input-max-teams"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-5 h-5 text-orange-500" />
                      <h2 className="text-lg font-semibold">Sektory a miesta</h2>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Rozdeliť súťaž na sektory?</p>
                        <p className="text-sm text-muted-foreground">Sektory umožňujú priradiť tímy k jednotlivým zónam</p>
                      </div>
                      <Switch 
                        checked={hasSectors} 
                        onCheckedChange={setHasSectors}
                        data-testid="switch-sectors"
                      />
                    </div>

                    {hasSectors && (
                      <>
                        <div className="flex items-center gap-4">
                          <label className="text-sm font-medium">Počet sektorov:</label>
                          <Select 
                            value={numSectors.toString()} 
                            onValueChange={(v) => setNumSectors(parseInt(v))}
                          >
                            <SelectTrigger className="w-24" data-testid="select-num-sectors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[2, 3, 4, 5, 6, 7, 8].map(n => (
                                <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-4">
                          {sectorPlaces.map((sector, sectorIndex) => (
                            <Card key={sectorIndex} className="border-dashed">
                              <CardHeader className="pb-2">
                                <Input
                                  value={sector.sectorName}
                                  onChange={(e) => updateSectorName(sectorIndex, e.target.value)}
                                  className="font-semibold text-lg border-0 px-0 focus-visible:ring-0"
                                  data-testid={`input-sector-name-${sectorIndex}`}
                                />
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {sector.places.map((place, placeIndex) => (
                                    <div key={placeIndex} className="flex items-center gap-1">
                                      <Input
                                        value={place}
                                        onChange={(e) => updatePlaceName(sectorIndex, placeIndex, e.target.value)}
                                        className="w-28 h-8 text-sm"
                                        data-testid={`input-place-${sectorIndex}-${placeIndex}`}
                                      />
                                      {sector.places.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => removePlace(sectorIndex, placeIndex)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addPlace(sectorIndex)}
                                    className="h-8"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Miesto
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}

                    {!hasSectors && (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>Sektory nie sú povolené.</p>
                        <p className="text-sm">Zapnite ich prepínačom vyššie, ak ich potrebujete.</p>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="w-5 h-5 text-orange-500" />
                      <h2 className="text-lg font-semibold">Špeciálne súťaže</h2>
                    </div>

                    <p className="text-muted-foreground">
                      Vyberte doplnkové kategórie, ktoré chcete sledovať počas súťaže.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {SIDE_COMPETITIONS.map((comp) => (
                        <div
                          key={comp.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            sideCompetitions.includes(comp.id)
                              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                              : 'bg-muted/30 hover:bg-muted/50'
                          }`}
                          onClick={() => toggleSideCompetition(comp.id)}
                          data-testid={`checkbox-side-${comp.id}`}
                        >
                          <Checkbox
                            checked={sideCompetitions.includes(comp.id)}
                            className="pointer-events-none"
                          />
                          <span className="text-sm font-medium">{comp.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Check className="w-5 h-5 text-green-500" />
                      <h2 className="text-lg font-semibold">Súhrn súťaže</h2>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800 dark:text-green-200">
                            Súťaž bude uložená ako rozpracovaná
                          </h4>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            Po kliknutí na "Uložiť" sa súťaž uloží do vášho dashboardu. 
                            Keď budete pripravení, môžete ju publikovať a prijímať prihlášky tímov.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Názov</p>
                        <p className="font-medium">{form.getValues('name') || '—'}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Miesto</p>
                        <p className="font-medium">{form.getValues('location') || '—'}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Začiatok</p>
                        <p className="font-medium">
                          {form.getValues('startDate') 
                            ? new Date(form.getValues('startDate')).toLocaleString('sk-SK')
                            : '—'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Koniec</p>
                        <p className="font-medium">
                          {form.getValues('endDate')
                            ? new Date(form.getValues('endDate')).toLocaleString('sk-SK')
                            : '—'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Bodovanie</p>
                        <p className="font-medium">
                          {form.getValues('scoringType') === 'total' ? 'Celková hmotnosť' :
                           form.getValues('scoringType') === 'avg3' ? 'Priemer 3 najväčších' :
                           'Priemer 5 najväčších'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Min. váha</p>
                        <p className="font-medium">{form.getValues('minWeight')} kg</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Sektory</p>
                        <p className="font-medium">{hasSectors ? `${sectorPlaces.length} sektorov` : 'Nie'}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Špeciálne súťaže</p>
                        <p className="font-medium">{sideCompetitions.length > 0 ? `${sideCompetitions.length} vybratých` : 'Žiadne'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            data-testid="button-back-step"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť
          </Button>

          <div className="flex gap-2">
            {competitionId && currentStep < STEPS.length && (
              <Button
                variant="ghost"
                onClick={saveProgress}
                disabled={isSaving}
                data-testid="button-save"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Uložiť
              </Button>
            )}

            {currentStep < STEPS.length ? (
              <Button
                onClick={handleNext}
                disabled={isSaving || createMutation.isPending || updateMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600"
                data-testid="button-next-step"
              >
                {(isSaving || createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Ďalej
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-finish"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Uložiť súťaž
              </Button>
            )}
          </div>
        </div>
      </div>
    </OrganizerLayout>
  );
}
