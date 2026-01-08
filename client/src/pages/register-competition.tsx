import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PlanTier, PLAN_CAPABILITIES, getPlanPrice, canUseFeature } from "@shared/plan-capabilities";
import { ArrowLeft, Crown, Star, Zap, Building, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { z } from "zod";

const quickRegistrationSchema = z.object({
  selectedPlan: z.enum(["basic", "pro", "premium", "enterprise"]).default("basic"),
  name: z.string().min(1, "Názov súťaže je povinný").max(255, "Názov je príliš dlhý"),
  location: z.string().min(1, "Miesto je povinné").max(255, "Miesto je príliš dlhé"),
  startDate: z.string().min(1, "Dátum začiatku je povinný"),
  endDate: z.string().min(1, "Dátum konca je povinný"),
  contactName: z.string().min(1, "Meno kontaktnej osoby je povinné").max(255),
  contactEmail: z.string().email("Neplatný email").max(255),
});

type QuickRegistrationForm = z.infer<typeof quickRegistrationSchema>;

export default function RegisterCompetition() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedPlan = urlParams.get('plan') as PlanTier | null;

  const form = useForm<QuickRegistrationForm>({
    resolver: zodResolver(quickRegistrationSchema),
    defaultValues: {
      selectedPlan: (preselectedPlan && ['basic', 'pro', 'premium', 'enterprise'].includes(preselectedPlan)) ? preselectedPlan : "basic",
      name: "",
      location: "",
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      contactName: "",
      contactEmail: "",
    },
  });

  const selectedPlan = form.watch("selectedPlan");

  const onSubmit = async (data: QuickRegistrationForm) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('location', data.location);
      formData.append('startDate', new Date(data.startDate).toISOString());
      formData.append('endDate', new Date(data.endDate).toISOString());
      formData.append('contactName', data.contactName);
      formData.append('contactEmail', data.contactEmail);
      formData.append('selectedPlan', data.selectedPlan);
      formData.append('hasSectors', 'false');
      formData.append('sectorPlaces', JSON.stringify([]));
      formData.append('sideCompetitions', JSON.stringify([]));
      formData.append('minWeight', '2');

      const response = await fetch('/api/competition-registrations', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const result = await response.json();

      toast({
        title: "Registrácia úspešne vytvorená!",
        description: "Teraz môžete pokračovať v nastavení súťaže.",
      });
      
      // Invalidate organizer competitions cache so new competition appears in list
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/competitions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
      
      // Include setupToken in URL for secure setup wizard access
      setLocation(`/competition/${result.id}/setup?plan=${data.selectedPlan}&token=${result.setupToken}`);
    } catch (error: any) {
      toast({
        title: "Nepodarilo sa vytvoriť registráciu",
        description: error.message || "Prosím, skúste to znovu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          
          <h1 className="text-3xl font-bold text-foreground">Rýchla registrácia súťaže</h1>
          <p className="text-muted-foreground mt-2">
            Vyplňte základné údaje za 60 sekúnd. Detaily môžete nastaviť neskôr.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Základné údaje o súťaži</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.log('Form validation errors:', errors);
                toast({
                  title: "Formulár obsahuje chyby",
                  description: "Skontrolujte zvýraznené polia a skúste znovu.",
                  variant: "destructive"
                });
              })} className="space-y-8">
                
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-foreground">1. Výber balíka</h3>
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
                                      <div>• Počet tímov: {capabilities.maxTeams ?? 'Neobmedzený'}</div>
                                      <div>• Počet rozhodcov: {capabilities.maxReferees ?? 'Neobmedzený'}</div>
                                      {planTier === 'basic' && <div>• Zápis úlovkov rozhodcami</div>}
                                      {canUseFeature(planTier, 'sectors') && <div>• Sektory</div>}
                                      {canUseFeature(planTier, 'sideCompetitions') && <div>• Doplnkové súťaže</div>}
                                      {canUseFeature(planTier, 'sponsors') && <div>• Sponzori</div>}
                                      {canUseFeature(planTier, 'export') && <div>• Export výsledkov</div>}
                                      {canUseFeature(planTier, 'branding') && <div>• Vlastný branding</div>}
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

                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-foreground">2. Základné informácie</h3>
                  
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
                            <Input placeholder="Napríklad: Jazero Orava" {...field} data-testid="input-competition-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dátum a čas začiatku *</FormLabel>
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
                          <FormLabel>Dátum a čas konca *</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} data-testid="input-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-foreground">3. Kontaktné údaje</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meno kontaktnej osoby *</FormLabel>
                          <FormControl>
                            <Input placeholder="Vaše meno" {...field} data-testid="input-contact-name" />
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
                            <Input type="email" placeholder="vas@email.sk" {...field} data-testid="input-contact-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                </div>

                <div className="flex justify-end pt-6 border-t">
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={isSubmitting}
                    data-testid="button-submit-registration"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Spracovávam...
                      </>
                    ) : (
                      "Pokračovať k platbe"
                    )}
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
