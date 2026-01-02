import { useState, useMemo } from "react";
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
    name: 'Základný',
    price: 9.99,
    description: 'Pre menšie súťaže do 10 tímov',
    features: [
      'Max. 10 tímov',
      'Základné štatistiky',
      'QR kódy pre registráciu',
      'Email podpora',
    ],
    maxTeams: 10,
    icon: Shield,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 24.99,
    description: 'Pre stredné súťaže do 30 tímov',
    features: [
      'Max. 30 tímov',
      'Pokročilé štatistiky',
      'Vedľajšie súťaže',
      'Rozhodcovia a sektory',
      'Prioritná podpora',
    ],
    maxTeams: 30,
    icon: Star,
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49.99,
    description: 'Pre veľké súťaže bez limitu',
    features: [
      'Neobmedzený počet tímov',
      'Všetky funkcie Premium',
      'Vlastný branding',
      'Prioritná podpora 24/7',
      'Dedikovaný account manager',
    ],
    maxTeams: null,
    icon: Crown,
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
    return urlParams.get('plan') || 'premium';
  }, [searchString]);

  const [currentPlan, setCurrentPlan] = useState(selectedPlanId);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: competition, isLoading } = useQuery<Competition>({
    queryKey: ['/api/competitions', competitionId],
    enabled: !!competitionId,
  });

  const paymentMutation = useMutation({
    mutationFn: async (planTier: string) => {
      return apiRequest('PATCH', `/api/competitions/${competitionId}`, {
        planTier,
        paymentStatus: 'paid',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/competitions'] });
      toast({
        title: "✅ Platba úspešná",
        description: "Vaša súťaž je teraz pripravená na spustenie.",
      });
      setLocation(`/organizer/competition/${competitionId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Chyba platby",
        description: error.message || "Platba zlyhala, skúste znova.",
        variant: "destructive",
      });
    },
  });

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      await paymentMutation.mutateAsync(currentPlan);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <OrganizerLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid md:grid-cols-3 gap-6">
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

  const selectedPlan = PLANS.find(p => p.id === currentPlan) || PLANS[1];

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
            Vyberte balík pre "{competition.name}"
          </h1>
          <p className="text-muted-foreground">
            Vyberte si balík podľa veľkosti a potrieb vašej súťaže.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isSelected = currentPlan === plan.id;
            
            return (
              <Card 
                key={plan.id}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-orange-500 ring-2 ring-orange-500/20' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'
                } ${plan.popular ? 'relative' : ''}`}
                onClick={() => setCurrentPlan(plan.id)}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white">
                    Najobľúbenejší
                  </Badge>
                )}
                <CardHeader className="text-center pt-8 pb-4">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${
                    isSelected ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-orange-500' : 'text-slate-500'}`} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{plan.price}€</span>
                    <span className="text-muted-foreground">/súťaž</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className={`w-4 h-4 ${isSelected ? 'text-orange-500' : 'text-green-500'}`} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Súhrn objednávky
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium text-foreground">{competition.name}</p>
                <p className="text-sm text-muted-foreground">Balík: {selectedPlan.name}</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{selectedPlan.price}€</p>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">Súťaž</span>
                <span className="text-foreground">{selectedPlan.price}€</span>
              </div>
              <div className="flex items-center justify-between font-bold text-lg">
                <span className="text-foreground">Celkom</span>
                <span className="text-orange-500">{selectedPlan.price}€</span>
              </div>
            </div>
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
          <Button
            onClick={handlePayment}
            disabled={isProcessing || paymentMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white order-1 sm:order-2"
            data-testid="button-pay"
          >
            {isProcessing || paymentMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Spracúvam...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Zaplatiť {selectedPlan.price}€
              </>
            )}
          </Button>
        </div>

        {/* Development mode notice - remove in production */}
        <Card className="mt-6 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Vývojový režim:</strong> Platobná brána nie je zatiaľ prepojená so Stripe. 
              Kliknutím na "Zaplatiť" sa súťaž aktivuje bez skutočnej platby.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Kliknutím na "Zaplatiť" súhlasíte s obchodnými podmienkami.
          Platba je spracovaná bezpečne cez Stripe.
        </p>
      </div>
    </OrganizerLayout>
  );
}
