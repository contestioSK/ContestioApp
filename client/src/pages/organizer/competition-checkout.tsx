import { useState, useMemo, useEffect } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import OrganizerLayout from "@/components/OrganizerLayout";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  Check,
  CreditCard,
  Trophy,
  Users,
  Loader2,
  Shield,
  Star,
  Crown
} from "lucide-react";
import type { Competition } from "@shared/schema";

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 69,
    description: 'Ideálne pre menšie súťaže',
    features: [
      'Registrácia tímov',
      'Maximálne 15 tímov',
      'Zápis úlovkov rozhodcami',
      'Live tabuľka výsledkov',
      'Základné štatistiky',
      'Až 2 rozhodcovia',
    ],
    maxTeams: 15,
    maxReferees: 2,
    icon: Shield,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 199,
    description: 'Najobľúbenejší balík pre väčšinu súťaží',
    features: [
      'Všetko z Basic +',
      'Neobmedzený počet tímov',
      'Doplnkové súťaže',
      'Sektory a vyhodnotenie sektorov',
      'Detailné profily tímov a úlovkov',
      'Sponzori (logá, ceny)',
      'Export výsledkov (PDF, Excel)',
      'Až 5 rozhodcov',
    ],
    maxTeams: null,
    maxReferees: 5,
    icon: Star,
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 599,
    description: 'Pre veľké súťaže s vlastným brandingom',
    features: [
      'Všetko z Pro +',
      'Branding (logo, farby, subdoména)',
      'Pokročilé štatistiky a grafy',
      'Neobmedzený počet rozhodcov',
      'Prístup pre médiá a live výsledky',
      'Prioritná podpora počas preteku',
    ],
    maxTeams: null,
    maxReferees: null,
    icon: Crown,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    description: 'Komplexné riešenie pre organizácie',
    features: [
      'Všetko z Premium +',
      'Interaktívna mapa sektorov',
      'Viacero súťaží pod jednou organizáciou',
      'White-label riešenie',
      'API prístup',
      'Garantovaná dostupnosť (SLA)',
      'Osobné zaškolenie rozhodcov',
    ],
    maxTeams: null,
    maxReferees: null,
    icon: Crown,
    isEnterprise: true,
  },
];

export default function CompetitionCheckout() {
  const [, params] = useRoute("/organizer/competition/:id/checkout");
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { user } = useAuth();
  const { toast } = useToast();
  const competitionId = params?.id;
  
  const selectedPlanId = useMemo(() => {
    const urlParams = new URLSearchParams(searchString);
    return urlParams.get('plan') || 'pro';
  }, [searchString]);

  const { data: competition, isLoading } = useQuery<Competition>({
    queryKey: ['/api/competitions', competitionId],
    enabled: !!competitionId,
  });

  // Prioritize plan from competition (set in wizard) over URL param
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  
  // Sync currentPlan when competition loads or changes
  useEffect(() => {
    if (competition?.planTier) {
      setCurrentPlan(competition.planTier);
    } else if (currentPlan === null) {
      setCurrentPlan(selectedPlanId);
    }
  }, [competition?.planTier, selectedPlanId, currentPlan]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use effective plan (from competition or selected)
  const effectivePlan = currentPlan || selectedPlanId;

  const paymentMutation = useMutation({
    mutationFn: async (planTier: string) => {
      // Use dedicated payment endpoint that validates and processes payment server-side
      const response = await apiRequest('POST', `/api/competitions/${competitionId}/pay`, {
        planTier,
      });
      return response.json();
    },
    onSuccess: async (data: { checkoutUrl?: string; competition?: Competition }) => {
      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        // Dev mode - payment processed locally
        await queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId] });
        await queryClient.invalidateQueries({ queryKey: ['/api/organizer/competitions'] });
        toast({
          title: "✅ Platba úspešná",
          description: "Vaša súťaž je teraz pripravená na spustenie.",
        });
        setLocation(`/organizer/competition/${competitionId}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Chyba platby",
        description: error.message || "Platba zlyhala, skúste znova.",
        variant: "destructive",
      });
    },
  });

  const validateCompetitionReadiness = (): string[] => {
    const errors: string[] = [];
    if (!competition) return errors;
    
    if (!competition.name || competition.name.trim() === '') errors.push("Názov súťaže");
    if (!competition.location || competition.location.trim() === '') errors.push("Miesto konania");
    if (!competition.startDate) errors.push("Dátum začiatku");
    if (!competition.endDate) errors.push("Dátum konca");
    if (!competition.scoringType) errors.push("Typ bodovania");
    if (!competition.contactEmail || competition.contactEmail.trim() === '') errors.push("Kontaktný email");
    if (!competition.contactPhone || competition.contactPhone.trim() === '') errors.push("Kontaktný telefón");
    
    if (competition.startDate && competition.endDate) {
      const start = new Date(competition.startDate);
      const end = new Date(competition.endDate);
      if (end < start) {
        errors.push("Dátum konca musí byť po dátume začiatku");
      }
    }
    
    if (competition.hasSectors && (!competition.sectorPlaces || competition.sectorPlaces.length === 0)) {
      errors.push("Konfigurácia sektorov");
    }
    
    return errors;
  };

  const handlePayment = async () => {
    const validationErrors = validateCompetitionReadiness();
    if (validationErrors.length > 0) {
      toast({
        title: "Chýbajúce údaje",
        description: `Pred platbou vyplňte: ${validationErrors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      await paymentMutation.mutateAsync(effectivePlan);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <OrganizerLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </OrganizerLayout>
    );
  }

  if (!competition) {
    return (
      <OrganizerLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Súťaž nebola nájdená.</p>
              <Button onClick={() => setLocation('/organizer')} className="mt-4">
                Späť na dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </OrganizerLayout>
    );
  }

  const selectedPlan = PLANS.find(p => p.id === effectivePlan) || PLANS[1];

  return (
    <OrganizerLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation(`/organizer/competition/${competitionId}`)}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Späť
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Vyber balík pre "{competition.name}"
          </h1>
          <p className="text-muted-foreground">
            Vyber si balík podľa veľkosti a potrieb tvojej súťaže.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isSelected = effectivePlan === plan.id;
            const isEnterprise = plan.id === 'enterprise';
            
            return (
              <Card 
                key={plan.id}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-cyan-500 ring-2 ring-cyan-500/20' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300'
                } ${plan.popular ? 'relative' : ''} ${isEnterprise ? 'opacity-75' : ''}`}
                onClick={() => !isEnterprise && setCurrentPlan(plan.id)}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white">
                    Najobľúbenejší
                  </Badge>
                )}
                <CardHeader className="text-center pt-8 pb-4">
                  <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 ${
                    isSelected ? 'bg-cyan-100 dark:bg-cyan-900/30' : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-[#28C6CE]' : 'text-muted-foreground'}`} strokeWidth={1.75} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    {isEnterprise ? (
                      <span className="text-xl font-bold text-foreground">Cena na vyžiadanie</span>
                    ) : (
                      <>
                        <span className="text-3xl font-mono font-medium text-[#28C6CE]">{plan.price}€</span>
                        <span className="text-muted-foreground"> / súťaž</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" strokeWidth={1.75} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isEnterprise && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = 'mailto:info@privode.eu?subject=Záujem o Enterprise balík';
                      }}
                    >
                      Kontaktujte nás
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
              Súhrn objednávky
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium text-foreground">{competition.name}</p>
                <p className="text-sm text-muted-foreground">Balík: {selectedPlan.name}</p>
              </div>
              <p className="text-2xl font-mono font-medium text-[#28C6CE]">
                {selectedPlan.price ? `${selectedPlan.price}€` : 'Na vyžiadanie'}
              </p>
            </div>
            {selectedPlan.price && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Súťaž</span>
                  <span className="font-mono font-medium text-[#28C6CE]">{selectedPlan.price}€</span>
                </div>
                <div className="flex items-center justify-between font-bold text-lg">
                  <span className="text-foreground">Celkom</span>
                  <span className="font-mono font-medium text-[#28C6CE]">{selectedPlan.price}€</span>
                </div>
              </div>
            )}
            {!selectedPlan.price && (
              <div className="border-t pt-4 text-center">
                <p className="text-muted-foreground">Pre Enterprise balík nás kontaktujte.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => setLocation(`/organizer/competition/${competitionId}`)}
            className="order-2 sm:order-1"
          >
            Zrušiť
          </Button>
          {selectedPlan.price ? (
            <Button
              onClick={handlePayment}
              disabled={isProcessing || paymentMutation.isPending}
              className="bg-[#28C6CE] hover:bg-[#1DB5BC] text-white order-1 sm:order-2"
              data-testid="button-pay"
            >
              {isProcessing || paymentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Spracúvam...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" strokeWidth={1.75} />
                  Zaplatiť {selectedPlan.price}€
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => window.location.href = 'mailto:info@privode.eu?subject=Záujem o Enterprise balík'}
              className="bg-gray-700 hover:bg-gray-800 text-white order-1 sm:order-2"
            >
              Kontaktujte nás
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Kliknutím na "Zaplatiť" súhlasíte s obchodnými podmienkami.
          Platba je spracovaná bezpečne cez Stripe.
        </p>
      </div>
    </OrganizerLayout>
  );
}
