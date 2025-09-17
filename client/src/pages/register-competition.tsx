import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertCompetitionRegistrationSchema, type InsertCompetitionRegistration } from "@shared/schema";
import { PlanTier, canUseFeature, PLAN_CAPABILITIES, getPlanPrice } from "@shared/plan-capabilities";
import { Plus, Trash2, ArrowLeft, Award, MapPin, Trophy, Camera, X, Crown, Star, Zap, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSideCompetitionLabel } from "@/lib/utils";
import { useState, useEffect } from "react";
import { z } from "zod";

// Form-specific schema that uses strings for dates and handles null values
const competitionRegistrationFormSchema = z.object({
  name: z.string().min(1, "Názov súťaže je povinný").max(255, "Názov je príliš dlhý"),
  description: z.string().max(500, "Popis môže mať maximálne 500 znakov").optional(),
  rules: z.string().optional(),
  location: z.string().min(1, "Miesto je povinné").max(255, "Miesto je príliš dlhé"),
  startDate: z.string().min(1, "Dátum začiatku je povinný"),
  endDate: z.string().min(1, "Dátum konca je povinný"),
  firstPlacePrize: z.string().optional(),
  secondPlacePrize: z.string().optional(),
  thirdPlacePrize: z.string().optional(),
  registrationFee: z.string().optional(),
  maxTeams: z.string().optional(),
  contactName: z.string().min(1, "Meno kontaktnej osoby je povinné").max(255),
  contactEmail: z.string().email("Neplatný email").max(255),
  contactPhone: z.string().max(50).optional(),
  organizationName: z.string().max(255).optional(),
  hasSectors: z.boolean().default(false),
  sectorPlaces: z.array(z.object({
    sectorName: z.string().min(1, "Názov sektoru je povinný"),
    places: z.array(z.string().min(1, "Názov miesta je povinný")).min(1, "Sektor musí mať aspoň jedno miesto")
  })),
  sideCompetitions: z.array(z.string()).optional().default([]),
  scoringType: z.enum(["total", "avg3", "avg5"]).default("total"),
  minWeight: z.number().min(2, "Minimálna hmotnosť musí byť aspoň 2 kg").max(15, "Maximálna hmotnosť môže byť 15 kg").default(2),
  // Plan-related fields
  selectedPlan: z.enum(["basic", "pro", "premium", "enterprise"]).default("basic"),
  requestedSubdomain: z.string().min(3, "Subdoména musí mať aspoň 3 znaky").max(20, "Subdoména môže mať maximálne 20 znakov").regex(/^[a-z0-9-]+$/, "Subdoména môže obsahovať len malé písmená, čísla a pomlčky").optional(),
  brandingPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Neplatná farba").optional(),
  brandingSecondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Neplatná farba").optional(),
});

type CompetitionRegistrationForm = z.infer<typeof competitionRegistrationFormSchema>;

export default function RegisterCompetition() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [competitionLogo, setCompetitionLogo] = useState<File | null>(null);

  // Get URL parameters for plan preselection
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedPlan = urlParams.get('plan') as PlanTier | null;

  const form = useForm<CompetitionRegistrationForm>({
    resolver: zodResolver(competitionRegistrationFormSchema),
    defaultValues: {
      name: "",
      description: "",
      rules: "",
      location: "",
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      firstPlacePrize: "",
      secondPlacePrize: "",
      thirdPlacePrize: "",
      registrationFee: "",
      maxTeams: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      organizationName: "",
      hasSectors: false,
      sectorPlaces: [
        { sectorName: "Sektor A", places: ["Miesto 1", "Miesto 2", "Miesto 3"] },
        { sectorName: "Sektor B", places: ["Miesto 1", "Miesto 2"] }
      ],
      sideCompetitions: [],
      scoringType: "total",
      minWeight: 2,
      selectedPlan: (preselectedPlan && ['basic', 'pro', 'premium', 'enterprise'].includes(preselectedPlan)) ? preselectedPlan : "basic",
      requestedSubdomain: "",
      brandingPrimaryColor: "",
      brandingSecondaryColor: "",
    },
  });

  // Watch the selected plan to dynamically enable/disable features
  const selectedPlan = form.watch("selectedPlan");
  const hasSectors = form.watch("hasSectors");

  // Reset form values when plan changes to ensure capability compliance
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'selectedPlan') {
        const newPlan = value.selectedPlan as PlanTier;
        
        // Reset sectors if not allowed in new plan
        if (!canUseFeature(newPlan, 'sectors')) {
          form.setValue('hasSectors', false);
          form.setValue('sectorPlaces', []);
        }
        
        // Reset side competitions if not allowed in new plan
        if (!canUseFeature(newPlan, 'sideCompetitions')) {
          form.setValue('sideCompetitions', []);
        }
        
        // Reset branding if not allowed in new plan
        if (!canUseFeature(newPlan, 'branding')) {
          form.setValue('requestedSubdomain', '');
          form.setValue('brandingPrimaryColor', '');
          form.setValue('brandingSecondaryColor', '');
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  const handleLogoSelect = (file: File | null) => {
    setCompetitionLogo(file);
  };

  const removeLogo = () => {
    setCompetitionLogo(null);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: CompetitionRegistrationForm) => {
    // Create FormData to handle file uploads
    const formData = new FormData();
    
    // Add logo if exists
    if (competitionLogo) {
      formData.append('competitionLogo', competitionLogo);
    }

    // Transform and add form data
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.rules) formData.append('rules', data.rules);
    formData.append('location', data.location);
    formData.append('startDate', new Date(data.startDate).toISOString());
    formData.append('endDate', new Date(data.endDate).toISOString());
    if (data.firstPlacePrize) formData.append('firstPlacePrize', data.firstPlacePrize);
    if (data.secondPlacePrize) formData.append('secondPlacePrize', data.secondPlacePrize);
    if (data.thirdPlacePrize) formData.append('thirdPlacePrize', data.thirdPlacePrize);
    if (data.registrationFee) formData.append('registrationFee', data.registrationFee);
    if (data.maxTeams) formData.append('maxTeams', data.maxTeams);
    formData.append('contactName', data.contactName);
    formData.append('contactEmail', data.contactEmail);
    if (data.contactPhone) formData.append('contactPhone', data.contactPhone);
    if (data.organizationName) formData.append('organizationName', data.organizationName);
    formData.append('hasSectors', data.hasSectors.toString());
    formData.append('sectorPlaces', JSON.stringify(data.sectorPlaces));
    formData.append('sideCompetitions', JSON.stringify(data.sideCompetitions || []));
    
    // Plan-related fields
    formData.append('selectedPlan', data.selectedPlan);
    if (data.requestedSubdomain) formData.append('requestedSubdomain', data.requestedSubdomain);
    
    // Branding fields (combine into branding object)
    const branding: any = {};
    if (data.brandingPrimaryColor) branding.primaryColor = data.brandingPrimaryColor;
    if (data.brandingSecondaryColor) branding.secondaryColor = data.brandingSecondaryColor;
    if (Object.keys(branding).length > 0) {
      formData.append('branding', JSON.stringify(branding));
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/competition-registrations', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      toast({
        title: "Registrácia úspešne odoslaná!",
        description: "Vaša žiadosť o registráciu súťaže bola odoslaná na schválenie administrátorom.",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Nepodarilo sa odoslať registráciu",
        description: error.message || "Prosím skúste znovu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove useMutation since we handle submission directly
  // const createRegistrationMutation = useMutation({
  //   mutationFn: onSubmit,
  // });

  const [sectorPlaces, setSectorPlaces] = useState(form.watch("sectorPlaces") || []);

  // Update form when sector places change
  const updateSectorPlaces = (newSectorPlaces: typeof sectorPlaces) => {
    setSectorPlaces(newSectorPlaces);
    form.setValue("sectorPlaces", newSectorPlaces);
  };

  const addSector = () => {
    const newSector = { sectorName: `Sektor ${String.fromCharCode(65 + sectorPlaces.length)}`, places: ["Miesto 1"] };
    updateSectorPlaces([...sectorPlaces, newSector]);
  };

  const removeSector = (index: number) => {
    updateSectorPlaces(sectorPlaces.filter((_, i) => i !== index));
  };

  const updateSector = (index: number, updates: Partial<{ sectorName: string; places: string[] }>) => {
    const updatedSectors = [...sectorPlaces];
    updatedSectors[index] = { ...updatedSectors[index], ...updates };
    updateSectorPlaces(updatedSectors);
  };

  const addPlace = (sectorIndex: number) => {
    const updatedSectors = [...sectorPlaces];
    updatedSectors[sectorIndex].places.push(`Miesto ${updatedSectors[sectorIndex].places.length + 1}`);
    updateSectorPlaces(updatedSectors);
  };

  const removePlace = (sectorIndex: number, placeIndex: number) => {
    const updatedSectors = [...sectorPlaces];
    updatedSectors[sectorIndex].places = updatedSectors[sectorIndex].places.filter((_, i) => i !== placeIndex);
    updateSectorPlaces(updatedSectors);
  };

  const updatePlace = (sectorIndex: number, placeIndex: number, newName: string) => {
    const updatedSectors = [...sectorPlaces];
    updatedSectors[sectorIndex].places[placeIndex] = newName;
    updateSectorPlaces(updatedSectors);
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
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
          
          <h1 className="text-3xl font-bold text-foreground">Registrácia súťaže</h1>
          <p className="text-muted-foreground mt-2">
            Vyplňte formulár pre registráciu novej rybárskej súťaže. Vaša žiadosť bude preskúmaná administrátorom.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Údaje o súťaži</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Plan Selection */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-foreground">Výber balíka</h3>
                  <FormField
                    control={form.control}
                    name="selectedPlan"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                            data-testid="radio-group-plan-selection"
                          >
                            {Object.entries(PLAN_CAPABILITIES).map(([planId, capabilities]) => {
                              const isSelected = field.value === planId;
                              const planTier = planId as PlanTier;
                              const { price, currency } = getPlanPrice(planTier);
                              
                              const PlanIcon = planTier === 'basic' ? Zap : 
                                             planTier === 'pro' ? Star : 
                                             planTier === 'premium' ? Crown : Building;
                              
                              return (
                                <div key={planId}>
                                  <RadioGroupItem value={planId} id={planId} className="sr-only" />
                                  <label
                                    htmlFor={planId}
                                    className={`
                                      relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all
                                      ${isSelected 
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                                        : 'border-border hover:border-primary/50'
                                      }
                                    `}
                                    data-testid={`plan-card-${planId}`}
                                  >
                                    {planTier === 'pro' && (
                                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white text-xs">
                                        Najobľúbenejší
                                      </Badge>
                                    )}
                                    
                                    <div className="flex items-center justify-center w-12 h-12 mb-3 mx-auto bg-primary/10 rounded-full">
                                      <PlanIcon className="w-6 h-6 text-primary" />
                                    </div>
                                    
                                    <h4 className="text-center font-semibold capitalize mb-2">
                                      {planTier}
                                    </h4>
                                    
                                    <div className="text-center mb-4">
                                      {price ? (
                                        <div>
                                          <span className="text-2xl font-bold">{price}</span>
                                          <span className="text-muted-foreground ml-1">{currency}</span>
                                          <div className="text-xs text-muted-foreground">/ súťaž</div>
                                        </div>
                                      ) : (
                                        <div className="text-sm font-medium text-muted-foreground">
                                          Cena na vyžiadanie
                                        </div>
                                      )}
                                    </div>

                                    <div className="text-xs text-muted-foreground space-y-1">
                                      <div>• Počet rozhodcov: {capabilities.maxReferees ?? 'Neobmedzený'}</div>
                                      {planTier === 'basic' && <div>• Základné funkcie</div>}
                                      {canUseFeature(planTier, 'sectors') && <div>• Sektory</div>}
                                      {canUseFeature(planTier, 'sideCompetitions') && <div>• Doplnkové súťaže</div>}
                                      {canUseFeature(planTier, 'sponsors') && <div>• Sponzori</div>}
                                      {canUseFeature(planTier, 'export') && <div>• Export výsledkov</div>}
                                      {canUseFeature(planTier, 'branding') && <div>• Vlastný branding</div>}
                                      {canUseFeature(planTier, 'prioritySupport') && <div>• Prioritná podpora</div>}
                                    </div>
                                  </label>
                                </div>
                              );
                            })}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedPlan && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Vybraný balík:</strong> {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
                        {getPlanPrice(selectedPlan).price && (
                          <span> - {getPlanPrice(selectedPlan).price}{getPlanPrice(selectedPlan).currency}</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Basic Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-foreground">Základné informácie</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Názov súťaže *</FormLabel>
                          <FormControl>
                            <Input placeholder="Zadajte názov súťaže" {...field} data-testid="input-competition-name" />
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
                            <Input placeholder="Napríklad: Jazero Orava, Oravská Polhora" {...field} data-testid="input-competition-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Krátky popis súťaže</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Stručný popis súťaže, ktorý sa zobrazí v prehľade (max. 500 znakov)" 
                            maxLength={500}
                            {...field} 
                            data-testid="input-competition-description" 
                          />
                        </FormControl>
                        <FormDescription>
                          Tento popis sa zobrazí na verejnej stránke súťaže. {form.watch("description")?.length || 0}/500 znakov
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="rules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pravidlá súťaže (voliteľné)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Úplné pravidlá a nariadenia súťaže (podporuje zalomenia riadkov)"
                            className="min-h-[150px]"
                            {...field} 
                            data-testid="input-competition-rules" 
                          />
                        </FormControl>
                        <FormDescription>
                          Pravidlá budú zobrazené na samostatnej záložke "Pravidlá" v detaile súťaže
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Competition Logo Upload */}
                  <div>
                    <FormLabel>Logo súťaže (voliteľné)</FormLabel>
                    <div className="mt-2">
                      {competitionLogo ? (
                        <div className="flex items-center justify-between p-4 border-2 border-dashed border-muted rounded-lg bg-muted/10">
                          <div className="flex items-center space-x-3">
                            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Trophy className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{competitionLogo.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {Math.round(competitionLogo.size / 1024)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeLogo}
                            data-testid="button-remove-competition-logo"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <label
                          htmlFor="competition-logo-input"
                          className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/10 hover:bg-muted/20"
                          data-testid="label-competition-logo-upload"
                        >
                          <input
                            id="competition-logo-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              handleLogoSelect(file);
                            }}
                            data-testid="input-competition-logo"
                          />
                          <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                            <Trophy className="w-8 h-8 text-primary" />
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">
                            Pridať logo súťaže
                          </p>
                          <p className="text-xs text-muted-foreground text-center">
                            Kliknite pre výber súboru
                            <br />
                            <span className="text-xs">JPG, PNG, GIF (max 5MB)</span>
                          </p>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dátum začiatku *</FormLabel>
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
                          <FormLabel>Dátum ukončenia *</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} data-testid="input-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Branding Section */}
                {canUseFeature(selectedPlan, 'branding') ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-lg font-medium text-foreground">Vlastný branding</h3>
                      <Badge variant="secondary" className="text-xs">
                        {selectedPlan.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="requestedSubdomain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Požadovaná subdoména</FormLabel>
                            <FormControl>
                              <div className="flex">
                                <Input 
                                  placeholder="nazov-sutaze" 
                                  {...field} 
                                  data-testid="input-requested-subdomain"
                                  className="rounded-r-none"
                                />
                                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-muted-foreground/20 bg-muted text-muted-foreground text-sm">
                                  .contestio.sk
                                </span>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Vaša súťaž bude dostupná na vlastnej adrese (napr. nazov-sutaze.contestio.sk)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="brandingPrimaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primárna farba</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <Input 
                                  type="color" 
                                  {...field} 
                                  className="w-20 h-10 p-1 border"
                                  data-testid="input-branding-primary-color"
                                />
                                <Input 
                                  placeholder="#3B82F6" 
                                  {...field} 
                                  className="flex-1"
                                  data-testid="input-branding-primary-hex"
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Hlavná farba pre tlačidlá a zvýraznené prvky
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="brandingSecondaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sekundárna farba</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Input 
                                type="color" 
                                {...field} 
                                className="w-20 h-10 p-1 border"
                                data-testid="input-branding-secondary-color"
                              />
                              <Input 
                                placeholder="#64748B" 
                                {...field} 
                                className="flex-1"
                                data-testid="input-branding-secondary-hex"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Doplnková farba pre texty a pozadia
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  selectedPlan === 'pro' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-lg font-medium text-muted-foreground">Vlastný branding</h3>
                      </div>
                      <div className="p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/10">
                        <p className="text-center text-muted-foreground text-sm">
                          Vlastný branding (logo, farby, subdoména) je dostupný v <strong>Premium</strong> a <strong>Enterprise</strong> balíkoch.
                          <br />
                          <button
                            type="button"
                            onClick={() => form.setValue("selectedPlan", "premium")}
                            className="mt-2 text-primary underline hover:no-underline"
                            data-testid="button-upgrade-to-premium"
                          >
                            Upgradovať na Premium balík
                          </button>
                        </p>
                      </div>
                    </div>
                  )
                )}

                {/* Competition Details */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-foreground">Detaily súťaže</h3>
                  
                  {/* Scoring Type */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-muted-foreground" />
                      <h4 className="text-sm font-medium text-foreground">Typ hodnotenia súťaže</h4>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="scoringType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormDescription>
                            Vyberte ako sa bude hodnotiť výsledok tímov v súťaži
                          </FormDescription>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col space-y-2"
                              data-testid="radio-group-scoring-type"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="total" id="total" data-testid="radio-scoring-total" />
                                <FormLabel htmlFor="total" className="font-normal">
                                  Celková hmotnosť všetkých rýb
                                </FormLabel>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="avg3" id="avg3" data-testid="radio-scoring-avg3" />
                                <FormLabel htmlFor="avg3" className="font-normal">
                                  Priemerná hmotnosť 3 najväčších rýb
                                </FormLabel>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="avg5" id="avg5" data-testid="radio-scoring-avg5" />
                                <FormLabel htmlFor="avg5" className="font-normal">
                                  Priemerná hmotnosť 5 najväčších rýb
                                </FormLabel>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Minimum Weight */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-muted-foreground" />
                      <h4 className="text-sm font-medium text-foreground">Minimálna hmotnošť bodovanej ryby</h4>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="minWeight"
                      render={({ field }) => (
                        <FormItem className="max-w-xs">
                          <FormLabel>Minimálna váha (kg) *</FormLabel>
                          <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger data-testid="select-min-weight">
                                <SelectValue placeholder="Vyberte minimálnu hmotnošť" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 14 }, (_, i) => {
                                const weight = i + 2; // 2-15 kg
                                return (
                                  <SelectItem key={weight} value={weight.toString()} data-testid={`option-min-weight-${weight}`}>
                                    {weight} kg
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Úlovky pod touto hmotnost’ou nebudú započítané do výsledkov
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="firstPlacePrize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Výhry: 1. miesto (€)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="500.00" step="0.01" {...field} data-testid="input-first-place-prize" />
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
                          <FormLabel>2. miesto (€)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="300.00" step="0.01" {...field} data-testid="input-second-place-prize" />
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
                          <FormLabel>3. miesto (€)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="200.00" step="0.01" {...field} data-testid="input-third-place-prize" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="registrationFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Štartovné na tím (€)</FormLabel>
                          <FormControl>
                            <Input placeholder="25.00" {...field} data-testid="input-registration-fee" />
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
                            <Input type="number" placeholder="50" {...field} data-testid="input-max-teams" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Side Competitions */}
                {canUseFeature(selectedPlan, 'sideCompetitions') ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-lg font-medium text-foreground">Špeciálne súťaže</h3>
                      <Badge variant="secondary" className="text-xs">
                        {selectedPlan.toUpperCase()}
                      </Badge>
                    </div>
                  
                  <FormField
                    control={form.control}
                    name="sideCompetitions"
                    render={() => (
                      <FormItem>
                        <FormDescription>
                          Vyberte špeciálne súťaže, ktoré budú súčasťou hlavnej súťaže
                        </FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { id: "big-fish-overall", label: getSideCompetitionLabel("big-fish-overall") },
                            { id: "big-common-carp", label: getSideCompetitionLabel("big-common-carp") },
                            { id: "big-mirror-carp", label: getSideCompetitionLabel("big-mirror-carp") },
                            { id: "first-catch", label: getSideCompetitionLabel("first-catch") },
                            { id: "last-catch", label: getSideCompetitionLabel("last-catch") },
                            { id: "most-fish-caught", label: getSideCompetitionLabel("most-fish-caught") },
                            { id: "best-5-fish", label: getSideCompetitionLabel("best-5-fish") },
                            { id: "best-3-fish", label: getSideCompetitionLabel("best-3-fish") },
                            { id: "daily-big-fish", label: getSideCompetitionLabel("daily-big-fish") },
                            { id: "first-fish-over-15kg", label: getSideCompetitionLabel("first-fish-over-15kg") },
                            { id: "first-fish-over-20kg", label: getSideCompetitionLabel("first-fish-over-20kg") },
                            { id: "first-fish-over-25kg", label: getSideCompetitionLabel("first-fish-over-25kg") },
                          ].map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="sideCompetitions"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          return checked
                                            ? field.onChange([...currentValue, item.id])
                                            : field.onChange(currentValue.filter((value) => value !== item.id));
                                        }}
                                        data-testid={`checkbox-side-competition-${item.id}`}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Show selected side competitions as badges */}
                  {form.watch("sideCompetitions")?.length > 0 && (
                    <div>
                      <FormLabel className="text-sm font-medium">Vybrané špeciálne súťaže:</FormLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.watch("sideCompetitions").map((id: string, index: number) => (
                          <Badge 
                            key={id} 
                            variant="outline" 
                            className="bg-muted/20 text-foreground border-muted"
                            data-testid={`badge-selected-side-competition-${index}`}
                          >
                            {getSideCompetitionLabel(id)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-lg font-medium text-muted-foreground">Špeciálne súťaže</h3>
                    </div>
                    <div className="p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/10">
                      <p className="text-center text-muted-foreground text-sm">
                        Špeciálne súťaže sú dostupné v <strong>Pro</strong>, <strong>Premium</strong> a <strong>Enterprise</strong> balíkoch.
                        <br />
                        <button
                          type="button"
                          onClick={() => form.setValue("selectedPlan", "pro")}
                          className="mt-2 text-primary underline hover:no-underline"
                          data-testid="button-upgrade-to-pro"
                        >
                          Upgradovať na Pro balík
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-foreground">Kontaktné údaje organizátora</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meno kontaktnej osoby *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ján Novák" {...field} data-testid="input-contact-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="jan.novak@email.com" {...field} data-testid="input-contact-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefón</FormLabel>
                          <FormControl>
                            <Input placeholder="+421 900 123 456" {...field} data-testid="input-contact-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Názov organizácie</FormLabel>
                          <FormControl>
                            <Input placeholder="Rybársky spolok Orava" {...field} data-testid="input-organization-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Sectors and Places Configuration */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-foreground">Konfigurácia sektorov a miest</h3>
                    {form.watch("hasSectors") && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addSector}
                        data-testid="button-add-sector"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Pridať sektor
                      </Button>
                    )}
                  </div>
                  
                  {/* Sector Toggle */}
                  {canUseFeature(selectedPlan, 'sectors') ? (
                    <FormField
                      control={form.control}
                      name="hasSectors"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              Súťaž je rozdelená do sektorov
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {selectedPlan.toUpperCase()}
                              </Badge>
                            </FormLabel>
                            <FormDescription>
                              Aktivujte túto možnosť, ak sa súťaž bude konať v geograficky rozdelených sektoroch
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-has-sectors"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="text-base font-medium text-muted-foreground">
                            Súťaž rozdelená do sektorov
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Funkcia dostupná v Pro, Premium a Enterprise balíkoch
                          </div>
                        </div>
                        <Switch disabled={true} data-testid="switch-has-sectors-disabled" />
                      </div>
                      <button
                        type="button"
                        onClick={() => form.setValue("selectedPlan", "pro")}
                        className="mt-2 text-primary text-sm underline hover:no-underline"
                        data-testid="button-upgrade-sectors"
                      >
                        Upgradovať na Pro balík
                      </button>
                    </div>
                  )}
                  
                  {form.watch("hasSectors") && (
                    <>
                      <FormDescription>
                        Definujte sektory a miesta pre súťaž. Každý sektor môže mať viacero miest kde sa tímy môžu umiestniť.
                      </FormDescription>

                      {sectorPlaces.map((sector, sectorIndex) => (
                    <Card key={sectorIndex} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Input
                            value={sector.sectorName}
                            onChange={(e) => updateSector(sectorIndex, { sectorName: e.target.value })}
                            placeholder="Názov sektoru"
                            data-testid={`input-sector-name-${sectorIndex}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeSector(sectorIndex)}
                            disabled={sectorPlaces.length <= 1}
                            data-testid={`button-remove-sector-${sectorIndex}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Miesta v sektore:</label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addPlace(sectorIndex)}
                              data-testid={`button-add-place-${sectorIndex}`}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Pridať miesto
                            </Button>
                          </div>
                          
                          {sector.places.map((place, placeIndex) => (
                            <div key={placeIndex} className="flex items-center gap-2">
                              <Input
                                value={place}
                                onChange={(e) => updatePlace(sectorIndex, placeIndex, e.target.value)}
                                placeholder="Názov miesta"
                                data-testid={`input-place-${sectorIndex}-${placeIndex}`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removePlace(sectorIndex, placeIndex)}
                                disabled={sector.places.length <= 1}
                                data-testid={`button-remove-place-${sectorIndex}-${placeIndex}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                      ))}

                      {(!sectorPlaces || sectorPlaces.length === 0) && (
                        <div className="text-center py-4 text-muted-foreground">
                          <MapPin className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
                          <p>Žiadne sektory nie sú definované. Kliknite na "Pridať sektor" pre začatie.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full md:w-auto"
                    data-testid="button-submit-registration"
                  >
                    {isSubmitting ? "Odosiela sa..." : "Odoslať registráciu"}
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