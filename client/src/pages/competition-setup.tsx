import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSideCompetitionLabel } from "@/lib/utils";
import { canUseFeature, PlanTier } from "@shared/plan-capabilities";
import { StepIndicator, PrizeInput, LogoUpload, SectorGrid, SideCompetitionsSection } from "@/components/competition-form-shared";
import type { StepDef } from "@/components/competition-form-shared";
import { 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  FileText,
  Trophy,
  Gift,
  MapPin,
  Save,
  Calendar,
  Clock,
  Phone,
  Banknote
} from "lucide-react";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import type { CompetitionRegistration } from "@shared/schema";

const STEPS: StepDef[] = [
  { id: 1, title: "Základy", icon: FileText, description: "Toto vidia súťažiaci v detaile." },
  { id: 2, title: "Sektory", icon: MapPin, description: "Použi len ak chceš poradie aj podľa sektorov." },
  { id: 3, title: "Špeciálne súťaže", icon: Trophy, description: "Tieto trofeje sa rátajú automaticky." },
];

const TROPHY_COMPETITIONS = ["biggestFish", "biggestScaly", "biggestMirror", "dailyBigFish"];
const MILESTONE_COMPETITIONS = ["firstCatch", "lastCatch", "firstOver15", "firstOver20", "firstOver25"];
const STATS_COMPETITIONS = ["mostCatches", "best3", "best5"];

const basicsSchema = z.object({
  location: z.string().min(2, "Zadajte lokalitu"),
  startDate: z.string().min(1, "Zadajte dátum začiatku"),
  endDate: z.string().min(1, "Zadajte dátum konca"),
  startTime: z.string().min(1, "Zadajte čas začiatku"),
  contact: z.string().min(2, "Zadajte kontakt"),
  rules: z.string().optional(),
  scoringType: z.enum(["total", "avg3", "avg5"]).default("total"),
  minWeight: z.number().min(0).max(100).default(2),
  entryFee: z.string().min(1, "Zadajte výšku štartovného"),
  firstPlacePrize: z.string().optional(),
  secondPlacePrize: z.string().optional(),
  thirdPlacePrize: z.string().optional(),
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true;
  return new Date(data.startDate) <= new Date(data.endDate);
}, {
  message: "Dátum konca musí byť neskôr ako začiatok",
  path: ["endDate"],
});

type BasicsForm = z.infer<typeof basicsSchema>;

export default function CompetitionSetup() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [competitionLogo, setCompetitionLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [hasSectors, setHasSectors] = useState(false);
  const [sectorPlaces, setSectorPlaces] = useState<Array<{ sectorName: string; places: string[] }>>([]);
  const [sideCompetitions, setSideCompetitions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const urlPlan = urlParams.get('plan') as PlanTier | null;
  const validUrlPlan = urlPlan && ['basic', 'pro', 'premium', 'enterprise'].includes(urlPlan) ? urlPlan : null;

  const [setupToken] = useState<string | null>(() => {
    const urlToken = urlParams.get('token');
    if (urlToken && id) {
      localStorage.setItem(`competition_token_${id}`, urlToken);
      return urlToken;
    }
    if (id) {
      return localStorage.getItem(`competition_token_${id}`);
    }
    return null;
  });

  const [cachedPlan] = useState<PlanTier | null>(() => {
    if (typeof window !== 'undefined' && id) {
      if (validUrlPlan) {
        localStorage.setItem(`competition_plan_${id}`, validUrlPlan);
        return validUrlPlan;
      }
      const stored = localStorage.getItem(`competition_plan_${id}`);
      if (stored && ['basic', 'pro', 'premium', 'enterprise'].includes(stored)) {
        return stored as PlanTier;
      }
    }
    return validUrlPlan;
  });

  const { data: registration, isLoading } = useQuery<CompetitionRegistration>({
    queryKey: ['/api/competition-registrations', id],
    enabled: !!id,
  });

  const selectedPlan = (validUrlPlan || cachedPlan || registration?.selectedPlan || 'basic') as PlanTier;

  const basicsForm = useForm<BasicsForm>({
    resolver: zodResolver(basicsSchema),
    defaultValues: {
      location: "",
      startDate: "",
      endDate: "",
      startTime: "",
      contact: "",
      rules: "",
      scoringType: "total",
      minWeight: 2,
      entryFee: "",
      firstPlacePrize: "",
      secondPlacePrize: "",
      thirdPlacePrize: "",
    },
  });

  const scoringType = basicsForm.watch("scoringType");
  const minWeight = basicsForm.watch("minWeight");

  const isConflict = (comp: string) => {
    if (comp === 'best3' && scoringType === 'avg3') return true;
    if (comp === 'best5' && scoringType === 'avg5') return true;
    return false;
  };

  useEffect(() => {
    if (scoringType === 'avg3') setSideCompetitions(prev => prev.filter(c => c !== 'best3'));
    if (scoringType === 'avg5') setSideCompetitions(prev => prev.filter(c => c !== 'best5'));
  }, [scoringType]);

  useEffect(() => {
    if (registration) {
      const startDateStr = registration.startDate ? new Date(registration.startDate).toISOString().split('T')[0] : "";
      const endDateStr = registration.endDate ? new Date(registration.endDate).toISOString().split('T')[0] : "";

      basicsForm.reset({
        location: registration.location || "",
        startDate: startDateStr,
        endDate: endDateStr,
        startTime: "",
        contact: registration.contactPhone || registration.contactEmail || "",
        rules: registration.rules || "",
        scoringType: (registration.scoringType as "total" | "avg3" | "avg5") || "total",
        minWeight: registration.minWeight ? parseFloat(registration.minWeight) : 2,
        entryFee: registration.registrationFee || "",
        firstPlacePrize: registration.firstPlacePrize || "",
        secondPlacePrize: registration.secondPlacePrize || "",
        thirdPlacePrize: registration.thirdPlacePrize || "",
      });

      setHasSectors(!!registration.hasSectors);
      if (registration.hasSectors && registration.sectorPlaces && Array.isArray(registration.sectorPlaces)) {
        setSectorPlaces(registration.sectorPlaces);
      } else if (!registration.hasSectors) {
        setSectorPlaces([]);
      }

      if (registration.sideCompetitions && Array.isArray(registration.sideCompetitions)) {
        setSideCompetitions(registration.sideCompetitions);
      }
    }
  }, [registration]);

  useEffect(() => {
    if (hasSectors && sectorPlaces.length === 0) {
      setSectorPlaces([
        { sectorName: 'Sektor A', places: ['Stanovište 1', 'Stanovište 2', 'Stanovište 3', 'Stanovište 4'] },
        { sectorName: 'Sektor B', places: ['Stanovište 1', 'Stanovište 2', 'Stanovište 3', 'Stanovište 4'] }
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

  const addSector = () => {
    setSectorPlaces([...sectorPlaces, {
      sectorName: `Sektor ${String.fromCharCode(65 + sectorPlaces.length)}`,
      places: ["Stanovište 1", "Stanovište 2", "Stanovište 3", "Stanovište 4"]
    }]);
  };

  const toggleSideCompetition = (comp: string) => {
    if (isConflict(comp)) {
      toast({
        variant: "destructive",
        title: "Konflikt nastavenia",
        description: "Táto kategória je už nastavená ako hlavné bodovanie súťaže.",
      });
      return;
    }
    if (sideCompetitions.includes(comp)) {
      setSideCompetitions(sideCompetitions.filter(c => c !== comp));
    } else {
      setSideCompetitions([...sideCompetitions, comp]);
    }
  };

  const handleFinish = async () => {
    const valid = await basicsForm.trigger();
    if (!valid) {
      toast({
        variant: "destructive",
        title: "Chýbajúce údaje",
        description: "Prosím skontrolujte červené polia v prvom kroku.",
      });
      setCurrentStep(1);
      return;
    }

    setIsSaving(true);
    try {
      const formData = basicsForm.getValues();
      const finalSectorPlaces = hasSectors ? sectorPlaces : [];

      const updatePayload = {
        location: formData.location || null,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        contactPhone: formData.contact || null,
        registrationFee: formData.entryFee || null,
        rules: formData.rules || null,
        scoringType: formData.scoringType || "total",
        minWeight: String(formData.minWeight || 2),
        hasSectors: hasSectors,
        sectorPlaces: finalSectorPlaces,
        sideCompetitions: sideCompetitions,
        firstPlacePrize: formData.firstPlacePrize || null,
        secondPlacePrize: formData.secondPlacePrize || null,
        thirdPlacePrize: formData.thirdPlacePrize || null,
        setupToken: setupToken,
      };

      const response = await fetch(`/api/competition-registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save registration');
      }

      if (id) {
        localStorage.removeItem(`competition_plan_${id}`);
        localStorage.removeItem(`competition_token_${id}`);
      }

      toast({
        title: "Nastavenie dokončené!",
        description: "Vaša súťaž bola úspešne nakonfigurovaná. Čaká na schválenie.",
        className: "bg-emerald-500 border-none text-white"
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Chyba pri ukladaní",
        description: error.message || "Nepodarilo sa uložiť nastavenia súťaže.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!id || (!registration && !isLoading)) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="bg-[#0B1221] border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-white mb-2">Súťaž nenájdená</h2>
          <p className="text-slate-400 mb-6">Táto súťaž neexistuje alebo bol použitý neplatný odkaz.</p>
          <Button onClick={() => setLocation("/")} className="bg-orange-500 hover:bg-orange-600 text-white font-bold w-full h-12 rounded-xl">
            Späť na hlavnú stránku
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 py-12 selection:bg-orange-500/30 font-sans">
      <div className="max-w-5xl mx-auto px-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/")} className="text-slate-500 hover:text-white pl-0 hover:bg-transparent group">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            </Button>
            <div>
              <h1 className="text-2xl font-black italic uppercase text-white tracking-tighter">
                {registration?.name || "Nastavenie súťaže"}
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ukladá sa priebežne...
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-900/50 rounded-full border border-slate-800 p-1 pl-4 pr-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 mr-2 tracking-wide">Balík</span>
            <span className={`text-xs font-black uppercase ${selectedPlan !== 'basic' ? 'text-orange-500' : 'text-white'}`}>
              {selectedPlan}
            </span>
          </div>
        </div>

        <StepIndicator currentStep={currentStep} steps={STEPS} />

        <div className="mt-8 bg-[#0B1221] border border-slate-800/60 rounded-2xl shadow-2xl overflow-hidden relative min-h-[500px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />

          <AnimatePresence mode="wait">

            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 md:p-12 space-y-10">
                <div className="border-b border-slate-800 pb-6 mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">Základy súťaže</h2>
                  <p className="text-sm text-slate-500">Základné údaje pre vytvorenie verejného profilu súťaže.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-4">
                    <LogoUpload logoPreview={logoPreview} onSelect={handleLogoSelect} onRemove={removeLogo} />
                  </div>

                  <div className="lg:col-span-8 space-y-8">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Základné informácie</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs text-slate-400 font-bold ml-1">Lokalita (Revír)</label>
                          <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input {...basicsForm.register("location")} className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500 text-white h-12 rounded-xl" placeholder="Napr. Zemplínska Šírava" />
                          </div>
                          {basicsForm.formState.errors.location && <p className="text-red-500 text-[10px] pl-1">{basicsForm.formState.errors.location.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-slate-400 font-bold ml-1">Dátum začiatku</label>
                          <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <Input type="date" {...basicsForm.register("startDate")} className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500 text-white h-12 rounded-xl [color-scheme:dark]" />
                          </div>
                          {basicsForm.formState.errors.startDate && <p className="text-red-500 text-[10px] pl-1">{basicsForm.formState.errors.startDate.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-slate-400 font-bold ml-1">Dátum konca</label>
                          <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <Input type="date" {...basicsForm.register("endDate")} className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500 text-white h-12 rounded-xl [color-scheme:dark]" />
                          </div>
                          {basicsForm.formState.errors.endDate && <p className="text-red-500 text-[10px] pl-1">{basicsForm.formState.errors.endDate.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-slate-400 font-bold ml-1">Začiatok pretekov</label>
                          <div className="relative">
                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input {...basicsForm.register("startTime")} className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500 text-white h-12 rounded-xl" placeholder="Napr. 12:00" />
                          </div>
                          {basicsForm.formState.errors.startTime && <p className="text-red-500 text-[10px] pl-1">{basicsForm.formState.errors.startTime.message}</p>}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs text-slate-400 font-bold ml-1">Kontakt</label>
                          <div className="relative">
                            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input {...basicsForm.register("contact")} className="pl-9 bg-slate-950 border-slate-800 focus:border-orange-500 text-white h-12 rounded-xl" placeholder="+421 9xx xxx xxx" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-800/50">
                      <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Pravidlá</label>
                      <Textarea {...basicsForm.register("rules")} className="bg-slate-950 border-slate-800 text-white min-h-[120px] rounded-xl focus:border-orange-500 p-4 leading-relaxed font-mono text-sm" placeholder="Čo sa boduje, povolené nástrahy, povinná výbava, spôsob váženia, penalizácie..." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-800/50">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Typ Bodovania</label>
                        <Select value={basicsForm.watch("scoringType")} onValueChange={(v) => basicsForm.setValue("scoringType", v as any)}>
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
                        <Input type="number" {...basicsForm.register("minWeight", { valueAsNumber: true })} className="bg-slate-950 border-slate-800 text-white h-12 rounded-xl focus:border-orange-500 font-mono text-lg" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Štartovné</label>
                        <div className="relative">
                          <Banknote size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <Input {...basicsForm.register("entryFee")} className="pl-9 bg-slate-950 border-slate-800 text-white h-12 rounded-xl focus:border-orange-500 font-mono text-lg" placeholder="Napr. 150 €" />
                        </div>
                        {basicsForm.formState.errors.entryFee && <p className="text-red-500 text-[10px] pl-1">{basicsForm.formState.errors.entryFee.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-800/50">
                      <label className="text-xs font-black uppercase text-orange-500 tracking-widest flex items-center gap-2 mb-4">
                        <Gift size={14} /> Ceny pre víťazov
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <PrizeInput rank="1" value={basicsForm.watch("firstPlacePrize") || ""} onChange={(v) => basicsForm.setValue("firstPlacePrize", v)} placeholder="Napr. 1000 €" />
                        <PrizeInput rank="2" value={basicsForm.watch("secondPlacePrize") || ""} onChange={(v) => basicsForm.setValue("secondPlacePrize", v)} placeholder="Napr. 500 €" />
                        <PrizeInput rank="3" value={basicsForm.watch("thirdPlacePrize") || ""} onChange={(v) => basicsForm.setValue("thirdPlacePrize", v)} placeholder="Napr. 250 €" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 md:p-12 space-y-8">
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
                  isLocked={!canUseFeature(selectedPlan, 'sectors')}
                />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 md:p-12">
                <div className="border-b border-slate-800 pb-6 mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">Špeciálne súťaže</h2>
                  <p className="text-sm text-slate-500">Tieto trofeje a poradia systém počíta automaticky.</p>
                </div>

                <SideCompetitionsSection
                  sideCompetitions={sideCompetitions}
                  onToggle={toggleSideCompetition}
                  isConflict={isConflict}
                  isLocked={!canUseFeature(selectedPlan, 'sideCompetitions')}
                  trophyCompetitions={TROPHY_COMPETITIONS}
                  milestoneCompetitions={MILESTONE_COMPETITIONS}
                  statsCompetitions={STATS_COMPETITIONS}
                  getLabelFn={getSideCompetitionLabel}
                />
              </motion.div>
            )}

          </AnimatePresence>

          <div className="bg-[#020617] p-8 border-t border-slate-800 flex justify-between items-center relative z-20">
            <Button variant="ghost" disabled={currentStep === 1} onClick={() => setCurrentStep(p => p - 1)} className="text-slate-500 hover:text-white hover:bg-slate-900 px-6 h-12 rounded-xl disabled:opacity-30">
              <ArrowLeft className="w-4 h-4 mr-2" /> Späť
            </Button>

            <div className="flex gap-4">
              {currentStep < 3 ? (
                <Button onClick={() => setCurrentStep(p => p + 1)} className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest h-12 px-8 rounded-xl transition-transform active:scale-95">
                  Ďalej <ArrowRight size={16} className="ml-2" />
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest h-12 px-10 rounded-xl shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} className="mr-2" />}
                  Dokončiť
                </Button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
