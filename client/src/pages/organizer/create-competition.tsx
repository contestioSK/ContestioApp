import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Competition } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSideCompetitionLabel } from "@/lib/utils";
import OrganizerLayout from "@/components/OrganizerLayout";
import { StepIndicator, PrizeInput, LogoUpload, SectorGrid, SideCompetitionsSection } from "@/components/competition-form-shared";
import type { StepDef } from "@/components/competition-form-shared";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Loader2, 
  FileText,
  MapPin,
  Trophy,
  Settings,
  Save,
  Info,
  CreditCard,
  Star,
  Crown,
  Zap,
  Lock,
  Gift,
  Phone,
  Mail,
  Banknote,
  Users,
  ChevronRight
} from "lucide-react";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 69,
    description: 'Pre menšie súťaže',
    icon: Star,
    features: ['Max 15 tímov', '2 rozhodcovia', 'Bez sektorov', 'Základná štatistika'],
    maxTeams: 15,
    maxReferees: 2,
    hasSectors: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 199,
    description: 'Pre stredné súťaže',
    icon: Zap,
    features: ['Neobmedzené tímy', '5 rozhodcov', 'Podpora sektorov', 'Rozšírená štatistika', 'Email notifikácie'],
    maxTeams: null,
    maxReferees: 5,
    hasSectors: true,
    recommended: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 599,
    description: 'Pre veľké podujatia',
    icon: Crown,
    features: ['Neobmedzené tímy', 'Neobmedzený počet rozhodcov', 'Všetky funkcie', 'Logo a branding', 'Prioritná podpora'],
    maxTeams: null,
    maxReferees: null,
    hasSectors: true,
  },
];

const STEPS: StepDef[] = [
  { id: 1, title: "Balík", icon: CreditCard, description: "Vyber si plán" },
  { id: 2, title: "Základy", icon: FileText, description: "Názov, miesto a dátumy" },
  { id: 3, title: "Pravidlá", icon: Settings, description: "Bodovanie a nastavenia" },
  { id: 4, title: "Sektory", icon: MapPin, description: "Rozdelenie na sektory" },
  { id: 5, title: "Špeciálne", icon: Trophy, description: "Doplnkové kategórie" },
  { id: 6, title: "Súhrn", icon: Check, description: "Kontrola a uloženie" },
];

const TROPHY_COMPETITIONS = ["biggestFish", "biggestScaly", "biggestMirror", "dailyBigFish"];
const MILESTONE_COMPETITIONS = ["firstCatch", "lastCatch", "firstOver15", "firstOver20", "firstOver25"];
const STATS_COMPETITIONS = ["mostCatches", "best3", "best5"];

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
  resultBlocking: z.enum(["none", "12h", "24h"]).default("none"),
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
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [hasSectors, setHasSectors] = useState(false);
  const [sectorPlaces, setSectorPlaces] = useState<Array<{ sectorName: string; places: string[] }>>([]);
  const [sideCompetitions, setSideCompetitions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [competitionLogo, setCompetitionLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const currentPlanLimits = useMemo(() => {
    return PLANS.find(p => p.id === selectedPlan) || PLANS[1];
  }, [selectedPlan]);

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
      resultBlocking: "none",
      firstPlacePrize: "",
      secondPlacePrize: "",
      thirdPlacePrize: "",
      registrationFee: "",
      maxTeams: undefined,
    },
  });

  const scoringType = form.watch("scoringType");

  const isConflict = (comp: string) => {
    if (comp === 'best3' && scoringType === 'avg3') return true;
    if (comp === 'best5' && scoringType === 'avg5') return true;
    return false;
  };

  useEffect(() => {
    if (scoringType === 'avg3') setSideCompetitions(prev => prev.filter(c => c !== 'best3'));
    if (scoringType === 'avg5') setSideCompetitions(prev => prev.filter(c => c !== 'best5'));
  }, [scoringType]);

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
        resultBlocking: (existingCompetition.resultBlocking as "none" | "12h" | "24h") || "none",
        firstPlacePrize: existingCompetition.firstPlacePrize || "",
        secondPlacePrize: existingCompetition.secondPlacePrize || "",
        thirdPlacePrize: existingCompetition.thirdPlacePrize || "",
        registrationFee: existingCompetition.registrationFee || "",
        maxTeams: existingCompetition.maxTeams ?? undefined,
      });
      if (existingCompetition.hasSectors) {
        setHasSectors(true);
        if (existingCompetition.sectorPlaces && Array.isArray(existingCompetition.sectorPlaces)) {
          setSectorPlaces(existingCompetition.sectorPlaces as any);
        }
      }
      if (existingCompetition.sideCompetitions && Array.isArray(existingCompetition.sideCompetitions)) {
        setSideCompetitions(existingCompetition.sideCompetitions as string[]);
      }
      if ((existingCompetition as any).planTier) {
        setSelectedPlan((existingCompetition as any).planTier);
      }
    }
  }, [existingCompetition, form]);

  useEffect(() => {
    if (hasSectors && sectorPlaces.length === 0) {
      setSectorPlaces([
        { sectorName: 'Sektor A', places: ['Stanovište 1', 'Stanovište 2', 'Stanovište 3', 'Stanovište 4'] },
        { sectorName: 'Sektor B', places: ['Stanovište 1', 'Stanovište 2', 'Stanovište 3', 'Stanovište 4'] },
      ]);
    }
  }, [hasSectors]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompetitionLogo(file);
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setCompetitionLogo(null);
    setLogoPreview(null);
  };

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
        planTier: selectedPlan,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      competitionIdRef.current = data.id;
      setCompetitionId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/competitions'] });
      toast({
        title: "Súťaž vytvorená",
        description: "Pokračujte v nastavovaní.",
        className: "bg-emerald-500 border-none text-white"
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
      const id = competitionIdRef.current;
      if (!id) throw new Error("No competition ID");
      const response = await apiRequest('PATCH', `/api/competitions/${id}`, {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
        hasSectors,
        sectorPlaces: hasSectors ? sectorPlaces : [],
        sideCompetitions,
        planTier: selectedPlan,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/competitions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba pri ukladaní",
        description: error.message || "Skúste to znovu.",
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
    if (currentStep > 2 && !competitionIdRef.current) {
      toast({ title: "Chyba", description: "Najprv vytvor súťaž v kroku 2", variant: "destructive" });
      setCurrentStep(2);
      return;
    }
    
    let isValid = false;
    
    if (currentStep === 1) {
      if (!selectedPlan) {
        toast({ title: "Vyber balík", description: "Pre pokračovanie musíš vybrať cenový balík.", variant: "destructive" });
        return;
      }
      if (selectedPlan === 'basic') setHasSectors(false);
      setCurrentStep(2);
      return;
    }
    
    if (currentStep === 2) {
      isValid = await form.trigger(['name', 'location', 'startDate', 'endDate', 'contactEmail', 'contactPhone']);
      if (isValid && !competitionId) {
        setIsSaving(true);
        try {
          const values = form.getValues();
          const result = await createMutation.mutateAsync(values);
          competitionIdRef.current = result.id;
          setCompetitionId(result.id);
          setCurrentStep(3);
        } finally {
          setIsSaving(false);
        }
        return;
      }
    } else if (currentStep === 3) {
      isValid = await form.trigger(['description', 'rules', 'scoringType', 'minWeight', 'resultBlocking']);
      const maxTeamsValue = form.getValues('maxTeams');
      if (maxTeamsValue && currentPlanLimits.maxTeams !== null && maxTeamsValue > currentPlanLimits.maxTeams) {
        form.setError('maxTeams', { type: 'manual', message: `Balík ${currentPlanLimits.name} povoľuje maximálne ${currentPlanLimits.maxTeams} tímov` });
        isValid = false;
      }
      if (isValid && competitionIdRef.current) await saveProgress();
    } else if (currentStep === 4) {
      if (hasSectors) {
        const isSectorsValid = sectorPlaces.every(s => s.sectorName.trim() !== "" && s.places.length > 0);
        if (!isSectorsValid) {
          toast({ title: "Chýbajúce údaje", description: "Všetky sektory musia mať názov a aspoň jedno miesto.", variant: "destructive" });
          return;
        }
      }
      isValid = true;
      if (competitionIdRef.current) await saveProgress();
    } else if (currentStep === 5) {
      isValid = true;
      if (competitionIdRef.current) await saveProgress();
    } else {
      isValid = true;
    }

    if (isValid && currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFinish = async () => {
    await saveProgress();
    const compId = competitionIdRef.current;
    if (compId) {
      toast({ title: "Súťaž uložená!", description: "Teraz dokončite registráciu platbou.", className: "bg-emerald-500 border-none text-white" });
      setLocation(`/organizer/competition/${compId}/checkout`);
    } else {
      toast({ title: "Súťaž uložená!", description: "Súťaž je uložená ako rozpracovaná.", className: "bg-emerald-500 border-none text-white" });
      setLocation('/organizer');
    }
  };

  const addSector = () => {
    setSectorPlaces([...sectorPlaces, {
      sectorName: `Sektor ${String.fromCharCode(65 + sectorPlaces.length)}`,
      places: ["Stanovište 1", "Stanovište 2", "Stanovište 3", "Stanovište 4"]
    }]);
  };

  const toggleSideCompetition = (comp: string) => {
    if (isConflict(comp)) {
      toast({ variant: "destructive", title: "Konflikt nastavenia", description: "Táto kategória je už nastavená ako hlavné bodovanie súťaže." });
      return;
    }
    if (sideCompetitions.includes(comp)) {
      setSideCompetitions(sideCompetitions.filter(c => c !== comp));
    } else {
      setSideCompetitions([...sideCompetitions, comp]);
    }
  };

  const getScoringLabel = (type: string) => {
    switch (type) {
      case 'total': return 'Celková váha (Maratón)';
      case 'avg3': return 'Priemer 3 najťažších';
      case 'avg5': return 'Priemer 5 najťažších';
      default: return type;
    }
  };

  if (authLoading || (editId && loadingExisting)) {
    return (
      <OrganizerLayout>
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </OrganizerLayout>
    );
  }

  if (!user) {
    return (
      <OrganizerLayout>
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
          <div className="bg-[#0B1221] border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-slate-500" />
            <h2 className="text-xl font-bold text-white mb-2">Prihlásenie potrebné</h2>
            <p className="text-slate-400 mb-6">Pre vytvorenie súťaže sa musíš prihlásiť.</p>
            <Button onClick={() => setLocation('/auth/login')} className="bg-orange-500 hover:bg-orange-600 text-white font-bold w-full h-12 rounded-xl">
              Prihlásiť sa
            </Button>
          </div>
        </div>
      </OrganizerLayout>
    );
  }

  return (
    <OrganizerLayout>
      <div className="min-h-screen bg-[#020617] text-slate-200 py-8 selection:bg-orange-500/30 font-sans -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setLocation('/organizer')} className="text-slate-500 hover:text-white pl-0 hover:bg-transparent group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              </Button>
              <div>
                <h1 className="text-2xl font-black italic uppercase text-white tracking-tighter">
                  {editId ? 'Dokončiť súťaž' : 'Nová súťaž'}
                </h1>
                <p className="text-xs text-slate-500">
                  {editId ? 'Dokonči nastavenie svojej rozpracovanej súťaže.' : 'Vyplň údaje a nakonfiguruj súťaž.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {competitionId && currentStep > 1 && currentStep < STEPS.length && (
                <Button variant="ghost" onClick={saveProgress} disabled={isSaving} className="text-slate-500 hover:text-white hover:bg-slate-900 h-10 rounded-xl">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Uložiť
                </Button>
              )}
              <div className="flex items-center bg-slate-900/50 rounded-full border border-slate-800 p-1 pl-4 pr-4">
                <span className="text-[10px] uppercase font-bold text-slate-500 mr-2 tracking-wide">Balík</span>
                <span className={`text-xs font-black uppercase ${selectedPlan !== 'basic' ? 'text-orange-500' : 'text-white'}`}>
                  {selectedPlan}
                </span>
              </div>
            </div>
          </div>

          <StepIndicator currentStep={currentStep} steps={STEPS} />

          <div className="mt-8 bg-[#0B1221] border border-slate-800/60 rounded-2xl shadow-2xl overflow-hidden relative min-h-[500px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />

            <AnimatePresence mode="wait">

              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 md:p-12">
                  <div className="border-b border-slate-800 pb-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-1">Vyber cenový balík</h2>
                    <p className="text-sm text-slate-500">Balík určuje limity a funkcie pre tvoju súťaž. Platba bude až na konci.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map((plan) => {
                      const Icon = plan.icon;
                      const isSelected = selectedPlan === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/10 shadow-[0_10px_40px_-10px_rgba(249,115,22,0.2)]'
                              : 'border-slate-800 bg-slate-950 hover:border-slate-600'
                          }`}
                        >
                          {'recommended' in plan && plan.recommended && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-lg">
                              Odporúčané
                            </div>
                          )}
                          <div className="flex items-center gap-4 mb-5">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-black text-white uppercase tracking-wide">{plan.name}</h3>
                              <p className="text-2xl font-mono font-medium text-orange-500">{plan.price}€</p>
                            </div>
                          </div>
                          <p className="text-sm text-slate-400 mb-5">{plan.description}</p>
                          <ul className="space-y-2">
                            {plan.features.map((feature, i) => (
                              <li key={i} className="flex items-center gap-2.5 text-sm">
                                <Check className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-600'}`} />
                                <span className={isSelected ? 'text-slate-200' : 'text-slate-500'}>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          {isSelected && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-4 right-4 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                              <Check size={14} className="text-white" />
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedPlan === 'basic' && (
                    <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                      <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-400">Basic balík má obmedzenia</p>
                        <p className="text-sm text-amber-400/70">Maximum 15 tímov, 2 rozhodcovia a sektory nie sú podporované.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 md:p-12 space-y-10">
                  <div className="border-b border-slate-800 pb-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">Základné informácie</h2>
                    <p className="text-sm text-slate-500">Tieto údaje vidia súťažiaci v detaile súťaže.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-4">
                      <LogoUpload logoPreview={logoPreview} onSelect={handleLogoSelect} onRemove={removeLogo} />
                    </div>

                    <div className="lg:col-span-8 space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Základné informácie</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-xs text-slate-400 font-bold ml-1">Názov súťaže *</label>
                            <div className="relative">
                              <Trophy size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                              <Input {...form.register("name")} className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500 text-white h-12 rounded-xl" placeholder="napr. Jarný kaprový maratón 2025" />
                            </div>
                            {form.formState.errors.name && <p className="text-red-500 text-[10px] pl-1">{form.formState.errors.name.message}</p>}
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-bold ml-1">Miesto konania *</label>
                            <div className="relative">
                              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                              <Input {...form.register("location")} className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500 text-white h-12 rounded-xl" placeholder="napr. Vodná nádrž Domaša" />
                            </div>
                            {form.formState.errors.location && <p className="text-red-500 text-[10px] pl-1">{form.formState.errors.location.message}</p>}
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-bold ml-1">Kontaktný telefón *</label>
                            <div className="relative">
                              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                              <Input type="tel" {...form.register("contactPhone")} className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500 text-white h-12 rounded-xl" placeholder="+421 900 123 456" />
                            </div>
                            {form.formState.errors.contactPhone && <p className="text-red-500 text-[10px] pl-1">{form.formState.errors.contactPhone.message}</p>}
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-bold ml-1">Začiatok súťaže *</label>
                            <div className="[&_input]:bg-slate-950 [&_input]:border-slate-800 [&_input]:text-white [&_input]:h-12 [&_input]:rounded-xl [&_button]:bg-slate-950 [&_button]:border-slate-800 [&_button]:text-white [&_button]:h-12 [&_button]:rounded-xl">
                              <DateTimePicker value={form.watch("startDate")} onChange={(v) => form.setValue("startDate", v)} placeholder="Vyber dátum a čas začiatku" />
                            </div>
                            {form.formState.errors.startDate && <p className="text-red-500 text-[10px] pl-1">{form.formState.errors.startDate.message}</p>}
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs text-slate-400 font-bold ml-1">Koniec súťaže *</label>
                            <div className="[&_input]:bg-slate-950 [&_input]:border-slate-800 [&_input]:text-white [&_input]:h-12 [&_input]:rounded-xl [&_button]:bg-slate-950 [&_button]:border-slate-800 [&_button]:text-white [&_button]:h-12 [&_button]:rounded-xl">
                              <DateTimePicker value={form.watch("endDate")} onChange={(v) => form.setValue("endDate", v)} placeholder="Vyber dátum a čas konca" />
                            </div>
                            {form.formState.errors.endDate && <p className="text-red-500 text-[10px] pl-1">{form.formState.errors.endDate.message}</p>}
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="text-xs text-slate-400 font-bold ml-1">Kontaktný email *</label>
                            <div className="relative">
                              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                              <Input type="email" {...form.register("contactEmail")} className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500 text-white h-12 rounded-xl" placeholder="info@vasasutaz.sk" />
                            </div>
                            {form.formState.errors.contactEmail && <p className="text-red-500 text-[10px] pl-1">{form.formState.errors.contactEmail.message}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 md:p-12 space-y-8">
                  <div className="border-b border-slate-800 pb-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">Pravidlá a bodovanie</h2>
                    <p className="text-sm text-slate-500">Nastav typ bodovania, váhu a pravidlá súťaže.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-bold ml-1">Popis súťaže</label>
                    <Textarea {...form.register("description")} className="bg-slate-950 border-slate-800 text-white min-h-[100px] rounded-xl focus:border-orange-500 p-4 leading-relaxed text-sm" placeholder="Stručný popis súťaže pre účastníkov..." />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-bold ml-1">Pravidlá</label>
                    <Textarea {...form.register("rules")} className="bg-slate-950 border-slate-800 text-white min-h-[120px] rounded-xl focus:border-orange-500 p-4 leading-relaxed font-mono text-sm" placeholder="Čo sa boduje, povolené nástrahy, povinná výbava, spôsob váženia, penalizácie..." />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-800/50">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Typ Bodovania</label>
                      <Select value={form.watch("scoringType")} onValueChange={(v) => form.setValue("scoringType", v as any)}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white h-12 rounded-xl hover:border-slate-700 transition-colors"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="total">Celková váha (Maratón)</SelectItem>
                          <SelectItem value="avg3">Priemer 3 najťažších rýb</SelectItem>
                          <SelectItem value="avg5">Priemer 5 najťažších rýb</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Min. váha (kg)</label>
                      <Input type="number" {...form.register("minWeight", { valueAsNumber: true })} className="bg-slate-950 border-slate-800 text-white h-12 rounded-xl focus:border-orange-500 font-mono text-lg" min={1} max={15} step={0.5} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Štartovné</label>
                      <div className="relative">
                        <Banknote size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <Input {...form.register("registrationFee")} className="pl-9 bg-slate-950 border-slate-800 text-white h-12 rounded-xl focus:border-orange-500 font-mono text-lg" placeholder="Napr. 150 €" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-800/50">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Skrytie výsledkov</label>
                      <Select value={form.watch("resultBlocking")} onValueChange={(v) => form.setValue("resultBlocking", v as any)}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white h-12 rounded-xl hover:border-slate-700 transition-colors"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="none">Žiadne</SelectItem>
                          <SelectItem value="12h">Posledných 12h</SelectItem>
                          <SelectItem value="24h">Posledných 24h</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-600 pl-1">Zamrazí tabuľku pre divákov pred koncom súťaže.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Max. počet tímov</label>
                      <div className="relative">
                        <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <Input
                          type="number" min={2} max={currentPlanLimits.maxTeams ?? undefined}
                          placeholder={currentPlanLimits.maxTeams ? `max ${currentPlanLimits.maxTeams}` : "neobmedzené"}
                          value={form.watch("maxTeams") || ''}
                          onChange={(e) => form.setValue("maxTeams", e.target.value ? parseInt(e.target.value) : undefined)}
                          className="pl-9 bg-slate-950 border-slate-800 text-white h-12 rounded-xl focus:border-orange-500 font-mono"
                        />
                      </div>
                      {currentPlanLimits.maxTeams !== null && <p className="text-[10px] text-slate-600 pl-1">Balík {currentPlanLimits.name} povoľuje max. {currentPlanLimits.maxTeams} tímov</p>}
                      {form.formState.errors.maxTeams && <p className="text-red-500 text-[10px] pl-1">{form.formState.errors.maxTeams.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-800/50">
                    <label className="text-xs font-black uppercase text-orange-500 tracking-widest flex items-center gap-2 mb-4">
                      <Gift size={14} /> Ceny pre víťazov
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <PrizeInput rank="1" value={form.watch("firstPlacePrize") || ""} onChange={(v) => form.setValue("firstPlacePrize", v)} placeholder="napr. 1000 €" />
                      <PrizeInput rank="2" value={form.watch("secondPlacePrize") || ""} onChange={(v) => form.setValue("secondPlacePrize", v)} placeholder="napr. 500 €" />
                      <PrizeInput rank="3" value={form.watch("thirdPlacePrize") || ""} onChange={(v) => form.setValue("thirdPlacePrize", v)} placeholder="napr. 250 €" />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 md:p-12 space-y-8">
                  <div className="border-b border-slate-800 pb-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">Sektory a miesta</h2>
                    <p className="text-sm text-slate-500">Použi len ak chceš, aby mal každý sektor vlastné poradie.</p>
                  </div>

                  <SectorGrid
                    hasSectors={hasSectors}
                    setHasSectors={setHasSectors}
                    sectorPlaces={sectorPlaces}
                    onAddSector={addSector}
                    onRemoveSector={(idx) => setSectorPlaces(sectorPlaces.filter((_, i) => i !== idx))}
                    onUpdateSectorName={(idx, name) => { const u = [...sectorPlaces]; u[idx].sectorName = name; setSectorPlaces(u); }}
                    onAddPlace={(sIdx) => { const u = [...sectorPlaces]; u[sIdx].places.push(`Stanovište ${u[sIdx].places.length + 1}`); setSectorPlaces(u); }}
                    onRemovePlace={(sIdx, pIdx) => { const u = [...sectorPlaces]; u[sIdx].places = u[sIdx].places.filter((_, i) => i !== pIdx); setSectorPlaces(u); }}
                    onUpdatePlace={(sIdx, pIdx, name) => { const u = [...sectorPlaces]; u[sIdx].places[pIdx] = name; setSectorPlaces(u); }}
                    isLocked={selectedPlan === 'basic'}
                  />
                </motion.div>
              )}

              {currentStep === 5 && (
                <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 md:p-12">
                  <div className="border-b border-slate-800 pb-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">Špeciálne súťaže</h2>
                    <p className="text-sm text-slate-500">Tieto trofeje a poradia systém počíta automaticky.</p>
                  </div>

                  <SideCompetitionsSection
                    sideCompetitions={sideCompetitions}
                    onToggle={toggleSideCompetition}
                    isConflict={isConflict}
                    isLocked={selectedPlan === 'basic'}
                    trophyCompetitions={TROPHY_COMPETITIONS}
                    milestoneCompetitions={MILESTONE_COMPETITIONS}
                    statsCompetitions={STATS_COMPETITIONS}
                    getLabelFn={getSideCompetitionLabel}
                  />
                </motion.div>
              )}

              {currentStep === 6 && (
                <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 md:p-12">
                  <div className="border-b border-slate-800 pb-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-1">Súhrn súťaže</h2>
                    <p className="text-sm text-slate-500">Skontroluj údaje pred uložením a platbou.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                          {(() => { const PlanIcon = PLANS.find(p => p.id === selectedPlan)?.icon || Star; return <PlanIcon className="w-6 h-6 text-white" />; })()}
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase">Vybraný balík</p>
                          <p className="font-black text-white text-lg uppercase tracking-wide">{PLANS.find(p => p.id === selectedPlan)?.name}</p>
                        </div>
                      </div>
                      <p className="text-3xl font-mono font-medium text-orange-500">{PLANS.find(p => p.id === selectedPlan)?.price}€</p>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-start gap-3">
                      <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-emerald-300 text-sm">Ďalší krok: Platba</h4>
                        <p className="text-sm text-emerald-400/70 mt-1">Po kliknutí na "Pokračovať" budeš presmerovaný na platobnú stránku kde dokončíš registráciu súťaže.</p>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Názov</p>
                          <p className="text-white font-medium">{form.getValues('name') || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Miesto</p>
                          <p className="text-white font-medium">{form.getValues('location') || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Začiatok</p>
                          <p className="text-white font-medium">{form.getValues('startDate') ? new Date(form.getValues('startDate')).toLocaleString('sk-SK') : '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Koniec</p>
                          <p className="text-white font-medium">{form.getValues('endDate') ? new Date(form.getValues('endDate')).toLocaleString('sk-SK') : '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Bodovanie</p>
                          <p className="text-white font-medium">{getScoringLabel(form.getValues('scoringType'))}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Min. váha</p>
                          <p className="text-white font-medium font-mono">{form.getValues('minWeight')} kg</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Skrytie výsledkov</p>
                          <p className="text-white font-medium">{form.getValues('resultBlocking') === 'none' ? 'Nie' : form.getValues('resultBlocking') === '12h' ? 'Posledných 12h' : 'Posledných 24h'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Sektory</p>
                          <p className="text-white font-medium">{hasSectors ? <span className="text-emerald-400 flex items-center gap-1"><Check size={12} /> {sectorPlaces.length} sektorov</span> : <span className="text-slate-500">Vypnuté</span>}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Špeciálne súťaže</p>
                          <p className="text-white font-medium">{sideCompetitions.length > 0 ? `${sideCompetitions.length} aktívnych` : <span className="text-slate-500">Žiadne</span>}</p>
                        </div>
                        {form.getValues('registrationFee') && (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-500 font-bold uppercase">Štartovné</p>
                            <p className="text-white font-medium font-mono">{form.getValues('registrationFee')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            <div className="bg-[#020617] p-8 border-t border-slate-800 flex justify-between items-center relative z-20">
              <Button variant="ghost" disabled={currentStep === 1} onClick={handleBack} className="text-slate-500 hover:text-white hover:bg-slate-900 px-6 h-12 rounded-xl disabled:opacity-30">
                <ArrowLeft className="w-4 h-4 mr-2" /> Späť
              </Button>
              <div className="flex gap-4">
                {currentStep < STEPS.length ? (
                  <Button onClick={handleNext} disabled={isSaving || createMutation.isPending || updateMutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest h-12 px-8 rounded-xl transition-transform active:scale-95">
                    {(isSaving || createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Ďalej <ArrowRight size={16} className="ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleFinish} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest h-12 px-10 rounded-xl shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95">
                    {isSaving ? <Loader2 className="animate-spin" /> : <ChevronRight size={18} className="mr-2" />}
                    Pokračovať na platbu
                  </Button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </OrganizerLayout>
  );
}
