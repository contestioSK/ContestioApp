import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getSideCompetitionLabel } from "@/lib/utils";
import { canUseFeature, PlanTier } from "@shared/plan-capabilities";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Camera, 
  X, 
  Loader2, 
  Plus, 
  Trash2,
  FileText,
  Users,
  Trophy,
  Gift,
  MapPin
} from "lucide-react";
import { z } from "zod";

const STEPS = [
  { id: 1, title: "Základy", icon: FileText, description: "Logo, popis, pravidlá a bodovanie" },
  { id: 2, title: "Sektory", icon: MapPin, description: "Rozdelenie na sektory a miesta" },
  { id: 3, title: "Špeciálne súťaže", icon: Trophy, description: "Doplnkové kategórie" },
  { id: 4, title: "Sponzori", icon: Gift, description: "Sponzori a ceny" },
  { id: 5, title: "Rozhodcovia", icon: Users, description: "Pridanie rozhodcov" },
];

const SIDE_COMPETITIONS = [
  "firstOver20",
  "firstOver25", 
  "firstOver30",
  "biggestFish",
  "biggestScaly",
  "biggestMirror",
  "dailyBigFish",
];

const basicsSchema = z.object({
  description: z.string().max(500).optional(),
  rules: z.string().optional(),
  scoringType: z.enum(["total", "avg3", "avg5"]).default("total"),
  minWeight: z.number().min(2).max(15).default(2),
  firstPlacePrize: z.string().optional(),
  secondPlacePrize: z.string().optional(),
  thirdPlacePrize: z.string().optional(),
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
  const [numSectors, setNumSectors] = useState(2);
  const [sectorPlaces, setSectorPlaces] = useState<Array<{ sectorName: string; places: string[] }>>([]);
  const [sideCompetitions, setSideCompetitions] = useState<string[]>([]);

  // Read plan and setup token from URL query parameter (passed from registration)
  const urlParams = new URLSearchParams(window.location.search);
  const isDemoMode = id === 'demo';
  const urlPlan = urlParams.get('plan') as PlanTier | null;
  const validUrlPlan = urlPlan && ['basic', 'pro', 'premium', 'enterprise'].includes(urlPlan) ? urlPlan : null;
  
  // Security token for updates - check URL first, then localStorage
  const [setupToken] = useState<string | null>(() => {
    const urlToken = urlParams.get('token');
    if (urlToken && id) {
      // Save token to localStorage for page refresh
      localStorage.setItem(`competition_token_${id}`, urlToken);
      return urlToken;
    }
    // Try to get from localStorage
    if (id) {
      return localStorage.getItem(`competition_token_${id}`);
    }
    return null;
  });
  
  // Persist plan in localStorage so it survives navigation/refresh
  const [cachedPlan, setCachedPlan] = useState<PlanTier | null>(() => {
    if (typeof window !== 'undefined' && id) {
      // Check URL param first, save to localStorage
      if (validUrlPlan) {
        localStorage.setItem(`competition_plan_${id}`, validUrlPlan);
        return validUrlPlan;
      }
      // Otherwise load from localStorage
      const stored = localStorage.getItem(`competition_plan_${id}`);
      if (stored && ['basic', 'pro', 'premium', 'enterprise'].includes(stored)) {
        return stored as PlanTier;
      }
    }
    return validUrlPlan;
  });

  const { data: registration, isLoading } = useQuery<{ selectedPlan?: string; contactEmail?: string }>({
    queryKey: ['/api/competition-registrations', id],
    enabled: !!id && !isDemoMode, // Always fetch to get contactEmail for verification
  });

  // Priority: URL param > cached > API response > default basic
  const selectedPlan = (validUrlPlan || cachedPlan || registration?.selectedPlan || 'basic') as PlanTier;

  const basicsForm = useForm<BasicsForm>({
    resolver: zodResolver(basicsSchema),
    defaultValues: {
      description: "",
      rules: "",
      scoringType: "total",
      minWeight: 2,
      firstPlacePrize: "",
      secondPlacePrize: "",
      thirdPlacePrize: "",
    },
  });

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompetitionLogo(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setCompetitionLogo(null);
    setLogoPreview(null);
  };

  const generateSectors = (count: number) => {
    const newSectors = [];
    for (let i = 0; i < count; i++) {
      newSectors.push({
        sectorName: `Sektor ${String.fromCharCode(65 + i)}`,
        places: ["Miesto 1", "Miesto 2", "Miesto 3", "Miesto 4"]
      });
    }
    setSectorPlaces(newSectors);
  };

  const addSector = () => {
    const newSector = { 
      sectorName: `Sektor ${String.fromCharCode(65 + sectorPlaces.length)}`, 
      places: ["Miesto 1", "Miesto 2", "Miesto 3", "Miesto 4"] 
    };
    setSectorPlaces([...sectorPlaces, newSector]);
  };

  const removeSector = (index: number) => {
    setSectorPlaces(sectorPlaces.filter((_, i) => i !== index));
  };

  const updateSector = (index: number, updates: Partial<{ sectorName: string; places: string[] }>) => {
    const updated = [...sectorPlaces];
    updated[index] = { ...updated[index], ...updates };
    setSectorPlaces(updated);
  };

  const addPlace = (sectorIndex: number) => {
    const updated = [...sectorPlaces];
    updated[sectorIndex].places.push(`Miesto ${updated[sectorIndex].places.length + 1}`);
    setSectorPlaces(updated);
  };

  const removePlace = (sectorIndex: number, placeIndex: number) => {
    const updated = [...sectorPlaces];
    updated[sectorIndex].places = updated[sectorIndex].places.filter((_, i) => i !== placeIndex);
    setSectorPlaces(updated);
  };

  const updatePlace = (sectorIndex: number, placeIndex: number, newName: string) => {
    const updated = [...sectorPlaces];
    updated[sectorIndex].places[placeIndex] = newName;
    setSectorPlaces(updated);
  };

  const toggleSideCompetition = (comp: string) => {
    if (sideCompetitions.includes(comp)) {
      setSideCompetitions(sideCompetitions.filter(c => c !== comp));
    } else {
      setSideCompetitions([...sideCompetitions, comp]);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipStep = () => {
    nextStep();
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleFinish = async () => {
    if (isDemoMode) {
      toast({
        title: "Demo ukážka dokončená",
        description: "Toto bola len ukážka wizardu. Pre registráciu skutočnej súťaže vyberte balík na stránke cenníka.",
      });
      setLocation("/pricing");
      return;
    }
    
    // Save all data to registration before finishing
    setIsSaving(true);
    try {
      const formData = basicsForm.getValues();
      
      const updatePayload = {
        description: formData.description || null,
        rules: formData.rules || null,
        scoringType: formData.scoringType || "total",
        minWeight: String(formData.minWeight || 2),
        hasSectors: hasSectors,
        sectorPlaces: hasSectors ? sectorPlaces : [],
        sideCompetitions: sideCompetitions,
        firstPlacePrize: formData.firstPlacePrize || null,
        secondPlacePrize: formData.secondPlacePrize || null,
        thirdPlacePrize: formData.thirdPlacePrize || null,
        // Security token for unauthenticated users (from URL)
        setupToken: setupToken,
      };

      const response = await fetch(`/api/competition-registrations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save registration');
      }

      // Clear cached data from localStorage
      if (id) {
        localStorage.removeItem(`competition_plan_${id}`);
        localStorage.removeItem(`competition_token_${id}`);
      }

      toast({
        title: "Nastavenie dokončené!",
        description: "Vaša súťaž bola úspešne nakonfigurovaná. Čaká na schválenie administrátorom.",
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

  const progress = (currentStep / STEPS.length) * 100;

  if (isLoading && !isDemoMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="mb-4"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť na domovskú stránku
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground">Nastavenie súťaže</h1>
          <p className="text-muted-foreground mt-2">
            Nakonfigurujte detaily vašej súťaže krok za krokom.
          </p>
          
          {/* Demo Mode Banner */}
          {isDemoMode && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <span className="text-xl">👁️</span>
                <span className="font-medium">
                  Demo režim - balík {selectedPlan.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Prezeráte si ukážku wizardu. Zmeny sa neuložia.
              </p>
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center ${isActive ? 'text-primary' : isCompleted ? 'text-green-500' : 'text-muted-foreground'}`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center mb-2
                    ${isActive ? 'bg-primary text-primary-foreground' : 
                      isCompleted ? 'bg-green-500 text-white' : 'bg-muted'}
                  `}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = STEPS[currentStep - 1].icon;
                return <Icon className="w-5 h-5" />;
              })()}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && (
              <Form {...basicsForm}>
                <div className="space-y-6">
                  <div>
                    <FormLabel>Logo súťaže (voliteľné)</FormLabel>
                    <div className="mt-2">
                      {logoPreview ? (
                        <div className="flex items-center justify-between p-4 border-2 border-dashed border-muted rounded-lg bg-muted/10">
                          <div className="flex items-center space-x-3">
                            <img src={logoPreview} alt="Logo" className="w-16 h-16 object-cover rounded" />
                            <span className="text-sm text-muted-foreground">{competitionLogo?.name}</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={removeLogo}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                          <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Kliknite pre nahratie loga</span>
                          <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>

                  <FormField
                    control={basicsForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Popis súťaže</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Stručný popis súťaže (max. 500 znakov)" 
                            maxLength={500}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          {field.value?.length || 0}/500 znakov
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={basicsForm.control}
                    name="rules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pravidlá súťaže</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Pravidlá a nariadenia súťaže"
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={basicsForm.control}
                      name="scoringType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Typ bodovania</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Vyberte typ" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="total">Celková váha</SelectItem>
                              <SelectItem value="avg3">Priemer 3 najväčších</SelectItem>
                              <SelectItem value="avg5">Priemer 5 najväčších</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={basicsForm.control}
                      name="minWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimálna váha (kg)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={2} 
                              max={15}
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>Minimálna váha pre započítanie úlovku</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={basicsForm.control}
                      name="firstPlacePrize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>1. miesto (€)</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="1000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={basicsForm.control}
                      name="secondPlacePrize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>2. miesto (€)</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="500" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={basicsForm.control}
                      name="thirdPlacePrize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>3. miesto (€)</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="250" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </Form>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                {!canUseFeature(selectedPlan, 'sectors') ? (
                  <div className="p-6 bg-muted/30 rounded-lg text-center">
                    <p className="text-muted-foreground">
                      Sektory nie sú dostupné vo vašom balíku. Upgradujte na Pro alebo vyšší.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div>
                        <h4 className="font-medium">Rozdeliť súťaž do sektorov</h4>
                        <p className="text-sm text-muted-foreground">
                          Povoľte ak chcete mať samostatné rebríčky pre každý sektor
                        </p>
                      </div>
                      <Switch 
                        checked={hasSectors} 
                        onCheckedChange={(checked) => {
                          setHasSectors(checked);
                          if (checked && sectorPlaces.length === 0) {
                            generateSectors(2);
                          }
                        }} 
                      />
                    </div>

                    {hasSectors && (
                      <>
                        <div className="flex items-center gap-4">
                          <label className="text-sm font-medium">Počet sektorov:</label>
                          <Select 
                            value={numSectors.toString()} 
                            onValueChange={(v) => {
                              const count = parseInt(v);
                              setNumSectors(count);
                              generateSectors(count);
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[2, 3, 4, 5, 6, 8, 10].map(n => (
                                <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" onClick={() => generateSectors(numSectors)}>
                            Vygenerovať
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {sectorPlaces.map((sector, sectorIndex) => (
                            <Card key={sectorIndex} className="bg-muted/10">
                              <CardContent className="pt-4">
                                <div className="flex items-center justify-between mb-4">
                                  <Input
                                    value={sector.sectorName}
                                    onChange={(e) => updateSector(sectorIndex, { sectorName: e.target.value })}
                                    className="max-w-[200px] font-medium"
                                  />
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => removeSector(sectorIndex)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Kliknite na názov miesta pre úpravu
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {sector.places.map((place, placeIndex) => (
                                    <div key={placeIndex} className="flex items-center gap-1 bg-background rounded border px-1 py-1">
                                      <Input
                                        value={place}
                                        onChange={(e) => updatePlace(sectorIndex, placeIndex, e.target.value)}
                                        className="h-7 w-24 text-sm border-0 p-1 focus-visible:ring-0"
                                        data-testid={`input-place-${sectorIndex}-${placeIndex}`}
                                      />
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5"
                                        onClick={() => removePlace(sectorIndex, placeIndex)}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => addPlace(sectorIndex)}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Miesto
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          <Button variant="outline" onClick={addSector}>
                            <Plus className="w-4 h-4 mr-2" />
                            Pridať sektor
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                {!canUseFeature(selectedPlan, 'sideCompetitions') ? (
                  <div className="p-6 bg-muted/30 rounded-lg text-center">
                    <p className="text-muted-foreground">
                      Špeciálne súťaže nie sú dostupné vo vašom balíku. Upgradujte na Pro alebo vyšší.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      Vyberte doplnkové súťaže, ktoré chcete zahrnúť:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {SIDE_COMPETITIONS.map((comp) => (
                        <div 
                          key={comp}
                          className={`
                            flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                            ${sideCompetitions.includes(comp) 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'}
                          `}
                          onClick={() => toggleSideCompetition(comp)}
                        >
                          <Checkbox checked={sideCompetitions.includes(comp)} />
                          <div>
                            <span className="font-medium">{getSideCompetitionLabel(comp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="p-8 bg-muted/30 rounded-lg text-center">
                  <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h4 className="font-medium mb-2">Správa sponzorov</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sponzorov a ich ceny budete môcť pridať po schválení súťaže.
                  </p>
                  {!canUseFeature(selectedPlan, 'sponsors') && (
                    <p className="text-xs text-orange-500">
                      Sponzori nie sú dostupní vo vašom balíku. Upgradujte na Pro alebo vyšší.
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="p-8 bg-muted/30 rounded-lg text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h4 className="font-medium mb-2">Pridávanie rozhodcov</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Rozhodcov budete môcť pridať po schválení súťaže administrátorom.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Váš balík ({selectedPlan}) povoľuje maximálne {selectedPlan === 'basic' ? '2' : selectedPlan === 'pro' ? '5' : 'neobmedzený počet'} rozhodcov.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 1}
            data-testid="button-prev-step"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť
          </Button>
          
          <div className="flex gap-3">
            {currentStep < STEPS.length && (
              <Button 
                variant="ghost" 
                onClick={skipStep}
                data-testid="button-skip-step"
              >
                Preskočiť
              </Button>
            )}
            
            {currentStep < STEPS.length ? (
              <Button 
                onClick={nextStep}
                data-testid="button-next-step"
              >
                Ďalej
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleFinish}
                disabled={isSaving}
                data-testid="button-finish-setup"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {isSaving ? "Ukladám..." : "Dokončiť nastavenie"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
