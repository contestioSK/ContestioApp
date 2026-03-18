import NavigationHeader from "@/components/navigation-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, X, Star, Crown, Zap, Building, BookOpen, Sparkles, Trophy, BookHeart, ChevronDown, Loader2, Lock } from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Pricing() {
  const [activeTab, setActiveTab] = useState("diary");
  const [isYearly, setIsYearly] = useState(false);
  const [showComparisonTable, setShowComparisonTable] = useState(false);
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const subscribeMutation = useMutation({
    mutationFn: async (billingInterval: 'monthly' | 'yearly') => {
      const response = await apiRequest('POST', '/api/diary/subscribe', { billingInterval });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa vytvoriť predplatné",
        variant: "destructive",
      });
    },
  });

  const renderFeatureText = (text: string) => {
    if (!text.includes('**')) {
      return text;
    }
    
    const parts = text.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-semibold">{part}</strong>;
      }
      return part;
    });
  };

  const pricingPlans = [
    {
      id: "basic",
      name: "Basic",
      price: "69",
      currency: "€",
      period: "/ súťaž",
      description: "Ideálne pre menšie súťaže",
      icon: Zap,
      color: "from-blue-500 to-blue-600",
      popular: false,
      cta: "Vybrať balík",
      features: [
        "Registrácia tímov",
        "👥 **Maximálne 15 tímov**",
        "Zápis úlovkov rozhodcami",
        "Live tabuľka výsledkov",
        "Základné štatistiky",
        "👨‍⚖️ **Až 2 rozhodcovia**"
      ]
    },
    {
      id: "pro",
      name: "Pro",
      price: "199",
      currency: "€",
      period: "/ súťaž",
      description: "Najobľúbenejší balík pre väčšinu súťaží",
      icon: Star,
      color: "from-purple-500 to-purple-600",
      popular: true,
      cta: "Vybrať balík",
      features: [
        "Všetko z Basic +",
        "👥 **Neobmedzený počet tímov**",
        "Doplnkové súťaže (Prvá ryba nad 20/25/30 kg, Najväčšia ryba a pod.)",
        "Sektory a vyhodnotenie sektorov",
        "Detailné profily tímov a úlovkov",
        "Sponzori (logá, ceny)",
        "Export výsledkov (PDF, Excel)",
        "👨‍⚖️ **Až 5 rozhodcovia**"
      ]
    },
    {
      id: "premium",
      name: "Premium",
      price: "599",
      currency: "€",
      period: "/ súťaž",
      description: "Pre veľké súťaže s vlastným brandingom",
      icon: Crown,
      color: "from-amber-500 to-amber-600",
      popular: false,
      cta: "Vybrať balík",
      features: [
        "Všetko z Pro +",
        "Branding (logo, farby, subdoména contestio.sk/nazovpreteku)",
        "Pokročilé štatistiky a grafy",
        "👨‍⚖️ **Neobmedzený počet rozhodcov**",
        "Prístup pre médiá a live výsledky",
        "Prioritná podpora počas preteku"
      ]
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Cena na vyžiadanie",
      currency: "",
      period: "",
      description: "Komplexné riešenie pre organizácie",
      icon: Building,
      color: "from-gray-700 to-gray-800",
      popular: false,
      cta: "Kontaktujte nás",
      features: [
        "Všetko z Premium +",
        "Interaktívna mapa sektorov s umiestnením tímov",
        "Viacero súťaží pod jednou organizáciou",
        "White-label riešenie (aplikácia pod vlastnou značkou)",
        "API prístup (integrácia na web organizátora)",
        "Garantovaná dostupnosť (SLA)",
        "Osobné zaškolenie rozhodcov",
        "Podpora od nášho tímu počas preteku"
      ]
    }
  ];

  const comparisonFeatures = [
    { name: "Registrácia tímov", basic: true, pro: true, premium: true, enterprise: true },
    { name: "Live tabuľka výsledkov", basic: true, pro: true, premium: true, enterprise: true },
    { name: "Zápis úlovkov rozhodcami", basic: true, pro: true, premium: true, enterprise: true },
    { name: "Základné štatistiky", basic: true, pro: true, premium: true, enterprise: true },
    { name: "Maximálny počet tímov", basic: "15", pro: "∞", premium: "∞", enterprise: "∞" },
    { name: "Počet rozhodcov", basic: "2", pro: "5", premium: "∞", enterprise: "∞" },
    { name: "Doplnkové súťaže", basic: false, pro: true, premium: true, enterprise: true },
    { name: "Sektory a vyhodnotenie", basic: false, pro: true, premium: true, enterprise: true },
    { name: "Detailné profily tímov", basic: false, pro: true, premium: true, enterprise: true },
    { name: "Sponzori (logá, ceny)", basic: false, pro: true, premium: true, enterprise: true },
    { name: "Export PDF/Excel", basic: false, pro: true, premium: true, enterprise: true },
    { name: "Vlastný branding", basic: false, pro: false, premium: true, enterprise: true },
    { name: "Subdoména", basic: false, pro: false, premium: true, enterprise: true },
    { name: "Pokročilé grafy", basic: false, pro: false, premium: true, enterprise: true },
    { name: "Prístup pre médiá", basic: false, pro: false, premium: true, enterprise: true },
    { name: "Prioritná podpora", basic: false, pro: false, premium: true, enterprise: true },
    { name: "Interaktívna mapa sektorov", basic: false, pro: false, premium: false, enterprise: true },
    { name: "Viacero súťaží", basic: false, pro: false, premium: false, enterprise: true },
    { name: "White-label riešenie", basic: false, pro: false, premium: false, enterprise: true },
    { name: "API prístup", basic: false, pro: false, premium: false, enterprise: true },
    { name: "SLA garancia", basic: false, pro: false, premium: false, enterprise: true },
    { name: "Osobné zaškolenie", basic: false, pro: false, premium: false, enterprise: true },
  ];

  const diaryFreePlan = {
    id: "free",
    name: "FREE",
    price: "0",
    currency: "€",
    period: "",
    description: "Ideálne na vyskúšanie appky.",
    icon: BookOpen,
    color: "from-gray-500 to-gray-600",
    cta: "Začať zadarmo",
    features: [
      "Kapacita 50 úlovkov",
      "1 fotografia na úlovok",
      "Prijímanie výziev v Battle",
      "História výprav (posledné 3)"
    ],
    lockedFeatures: [
      "Ukladanie tajných GPS lokalít",
      "Tvorba vlastných Battles",
      "Neobmedzená história a fotky",
      "Predpoveď počasia a tlaku"
    ]
  };

  const diaryPremiumPlan = {
    id: "premium",
    name: "PREMIUM",
    monthlyPrice: "7,00",
    monthlyOriginalPrice: "9,00",
    yearlyPrice: "60,00",
    yearlyOriginalPrice: "84,00",
    yearlySavings: "24 €",
    currency: "€",
    description: "Všetky funkcie bez obmedzení. Ovládni rebríčky.",
    icon: Sparkles,
    color: "from-teal-500 to-teal-600",
    cta: "Získať Premium",
    features: [
      "Neobmedzené výpravy a úlovky",
      "Neobmedzené fotografie",
      "Pokročilé štatistiky a grafy",
      "Tvorba vlastných Fishing Battles",
      "Interaktívne mapy a ukladanie GPS",
      "Predpoveď počasia a tlaku",
      "Offline režim pri vode"
    ]
  };

  const handlePlanSelect = (planId: string) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:info@contestio.sk?subject=Záujem o Enterprise balík&body=Dobrý deň,%0A%0AMám záujem o Enterprise balík pre našu organizáciu.%0A%0AĎakujem';
    } else {
      window.location.href = `/organizer/create?plan=${planId}`;
    }
  };

  const handleDiaryPlanSelect = (planId: string) => {
    if (planId === 'free') {
      navigate('/diary');
    } else {
      // Premium subscription - requires login
      if (!user) {
        toast({
          title: "Prihlásenie potrebné",
          description: "Pre predplatné Premium sa najprv prihlás",
        });
        navigate('/auth/login?redirect=/pricing?tab=diary');
        return;
      }
      
      const billingInterval = planId === 'premium-yearly' ? 'yearly' : 'monthly';
      subscribeMutation.mutate(billingInterval);
    }
  };

  const renderCellValue = (value: boolean | string) => {
    if (typeof value === 'string') {
      return <span className="font-semibold text-foreground">{value}</span>;
    }
    return value ? (
      <Check className="w-5 h-5 text-green-500 mx-auto" />
    ) : (
      <X className="w-5 h-5 text-red-400 mx-auto" />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="h-16" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6" data-testid="text-pricing-title">
            Cenník
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Vyber si riešenie, ktoré najlepšie vyhovuje tvojim potrebám
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 mx-auto mt-6 rounded-full"></div>
        </div>

        {/* Enhanced Tab Switcher */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col items-center mb-10">
            <div className="relative bg-muted/50 dark:bg-slate-800/50 p-2 rounded-2xl border border-border/50 shadow-lg backdrop-blur-sm">
              <TabsList className="grid grid-cols-2 gap-2 bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="competitions" 
                  data-testid="tab-competitions"
                  className={`relative px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex items-center gap-3 ${
                    activeTab === 'competitions' 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]' 
                      : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-[1.01]'
                  }`}
                >
                  <TacticalIconInline icon={Trophy} variant={activeTab === 'competitions' ? 'active' : 'blue'} size="md" />
                  <span>Rybárske súťaže</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="diary" 
                  data-testid="tab-diary"
                  className={`relative px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex items-center gap-3 ${
                    activeTab === 'diary' 
                      ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30 scale-[1.02]' 
                      : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-[1.01]'
                  }`}
                >
                  <TacticalIconInline icon={BookHeart} variant={activeTab === 'diary' ? 'active' : 'emerald'} size="md" />
                  <span>Rybársky denník</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Dynamic subtitle based on active tab */}
            <p className="mt-4 text-sm text-muted-foreground text-center transition-all duration-300">
              {activeTab === 'competitions' 
                ? '🏆 Profesionálne riešenie pre organizátorov rybárskych súťaží'
                : '📔 Tvoj osobný digitálny rybársky denník s Premium funkciami'
              }
            </p>
          </div>

          {/* Competitions Tab */}
          <TabsContent value="competitions">
            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
              {pricingPlans.map((plan) => {
                const IconComponent = plan.icon;
                const isEnterprise = plan.id === 'enterprise';
                
                return (
                  <div key={plan.id} className="relative">
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-1 text-sm font-medium shadow-lg">
                          Najobľúbenejší
                        </Badge>
                      </div>
                    )}
                    
                    <Card 
                      className={`relative h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 ${
                        plan.popular 
                          ? 'border-purple-200 shadow-xl ring-2 ring-purple-100' 
                          : 'border-border hover:border-primary/20'
                      }`}
                      data-testid={`card-plan-${plan.id}`}
                    >
                      <CardHeader className="text-center pb-8 pt-8">
                        {/* Icon with gradient background */}
                        <div className="flex justify-center mb-4">
                          <TacticalIcon icon={IconComponent} variant={plan.id === 'basic' ? 'blue' : plan.id === 'pro' ? 'purple' : plan.id === 'premium' ? 'amber' : 'slate'} size="md" showLabel={false} />
                        </div>
                        
                        {/* Plan Name */}
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                          {plan.name}
                        </h3>
                        
                        {/* Price */}
                        <div className="mb-4">
                          {isEnterprise ? (
                            <div className="text-2xl font-bold text-foreground">
                              {plan.price}
                            </div>
                          ) : (
                            <div>
                              <span className="text-4xl font-bold text-foreground">
                                {plan.price}
                              </span>
                              <span className="text-lg text-muted-foreground ml-1">
                                {plan.currency}{plan.period}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Description */}
                        <p className="text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                      </CardHeader>

                      <CardContent className="flex flex-col flex-grow">
                        {/* Features List */}
                        <ul className="space-y-3 mb-8 flex-grow">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-start">
                              <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-foreground leading-relaxed">
                                {renderFeatureText(feature)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {/* CTA Button */}
                        <Button
                          onClick={() => handlePlanSelect(plan.id)}
                          className={`w-full py-6 text-lg font-semibold transition-all duration-200 ${
                            plan.popular
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                              : isEnterprise
                              ? 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white'
                              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                          } ${plan.popular ? 'ring-2 ring-purple-200' : ''}`}
                          data-testid={`button-select-${plan.id}`}
                        >
                          {plan.cta}
                        </Button>
                        
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>

            {/* Feature Comparison Table */}
            <Collapsible open={showComparisonTable} onOpenChange={setShowComparisonTable} className="mt-12">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full max-w-md mx-auto flex items-center justify-center gap-2 py-6"
                  data-testid="button-toggle-comparison"
                >
                  <span>{showComparisonTable ? 'Skryť' : 'Zobraziť'} detailné porovnanie funkcií</span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showComparisonTable ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-8">
                <div className="overflow-x-auto rounded-xl border border-border shadow-lg">
                  <table className="w-full" data-testid="table-comparison">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-4 font-semibold text-foreground min-w-[200px]">Funkcia</th>
                        <th className="text-center p-4 font-semibold text-blue-600 min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <TacticalIconInline icon={Zap} variant="blue" size="md" />
                            <span>Basic</span>
                            <span className="text-xs font-normal text-muted-foreground">69€</span>
                          </div>
                        </th>
                        <th className="text-center p-4 font-semibold text-purple-600 min-w-[100px] bg-purple-50 dark:bg-purple-900/20">
                          <div className="flex flex-col items-center gap-1">
                            <TacticalIconInline icon={Star} variant="amber" size="md" />
                            <span>Pro</span>
                            <span className="text-xs font-normal text-muted-foreground">199€</span>
                          </div>
                        </th>
                        <th className="text-center p-4 font-semibold text-amber-600 min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <TacticalIconInline icon={Crown} variant="amber" size="md" />
                            <span>Premium</span>
                            <span className="text-xs font-normal text-muted-foreground">599€</span>
                          </div>
                        </th>
                        <th className="text-center p-4 font-semibold text-gray-600 min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <TacticalIconInline icon={Building} variant="slate" size="md" />
                            <span>Enterprise</span>
                            <span className="text-xs font-normal text-muted-foreground">Na mieru</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonFeatures.map((feature, index) => (
                        <tr 
                          key={feature.name} 
                          className={`border-t border-border ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                        >
                          <td className="p-4 text-sm text-foreground">{feature.name}</td>
                          <td className="p-4 text-center">{renderCellValue(feature.basic)}</td>
                          <td className="p-4 text-center bg-purple-50/50 dark:bg-purple-900/10">{renderCellValue(feature.pro)}</td>
                          <td className="p-4 text-center">{renderCellValue(feature.premium)}</td>
                          <td className="p-4 text-center">{renderCellValue(feature.enterprise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          {/* Diary Tab */}
          <TabsContent value="diary">
            {/* Scarcity Badge */}
            <div className="flex justify-center mb-6">
              <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-2 text-sm font-bold shadow-lg">
                🔴 ZĽAVA PRE PRVÝCH 500 RYBÁROV
              </Badge>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-10">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                  !isYearly
                    ? 'bg-teal-500 text-white shadow-lg'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                data-testid="button-billing-monthly"
              >
                Mesačne
              </button>
              <span className="text-muted-foreground font-medium">/</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsYearly(true)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    isYearly
                      ? 'bg-teal-500 text-white shadow-lg'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  data-testid="button-billing-yearly"
                >
                  Ročne
                </button>
                <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 text-xs font-bold">
                  Ušetríš {diaryPremiumPlan.yearlySavings}
                </Badge>
              </div>
            </div>

            {/* Diary Pricing Cards - 2 cards only */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-3xl mx-auto">
              {/* FREE Plan */}
              <div className="relative">
                <Card 
                  className="relative h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 border-border hover:border-primary/20"
                  data-testid="card-diary-plan-free"
                >
                  <CardHeader className="text-center pb-8 pt-8">
                    <div className="flex justify-center mb-4">
                      <TacticalIcon icon={BookOpen} variant="slate" size="md" showLabel={false} />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {diaryFreePlan.name}
                    </h3>
                    
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-foreground">
                        {diaryFreePlan.price}
                      </span>
                      <span className="text-lg text-muted-foreground ml-1">
                        {diaryFreePlan.currency}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {diaryFreePlan.description}
                    </p>
                  </CardHeader>

                  <CardContent className="flex flex-col flex-grow">
                    <ul className="space-y-3 mb-4 flex-grow">
                      {diaryFreePlan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="border-t border-border pt-4 mb-6">
                      <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Odomkni v Premium:</p>
                      <ul className="space-y-2">
                        {diaryFreePlan.lockedFeatures.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <Lock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-slate-500 leading-relaxed">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      onClick={() => handleDiaryPlanSelect('free')}
                      variant="outline"
                      className="w-full py-6 text-lg font-semibold transition-all duration-200"
                      data-testid="button-select-diary-free"
                    >
                      {diaryFreePlan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* PREMIUM Plan */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-1 text-sm font-medium shadow-lg">
                    Najobľúbenejší
                  </Badge>
                </div>
                
                <Card 
                  className="relative h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 border-teal-200 shadow-xl ring-2 ring-teal-100"
                  data-testid="card-diary-plan-premium"
                >
                  <CardHeader className="text-center pb-8 pt-8">
                    <div className="flex justify-center mb-4">
                      <TacticalIcon icon={Sparkles} variant="cyan" size="md" showLabel={false} />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {diaryPremiumPlan.name}
                    </h3>
                    
                    <div className="mb-4">
                      {!isYearly && (
                        <div className="flex items-center justify-center gap-2 mb-0.5">
                          <span className="text-base text-muted-foreground line-through">
                            {diaryPremiumPlan.monthlyOriginalPrice} {diaryPremiumPlan.currency} / mesiac
                          </span>
                          <span className="text-xs text-orange-400 font-medium">Uvádzacia cena</span>
                        </div>
                      )}
                      {isYearly && (
                        <div className="text-base text-muted-foreground line-through mb-0.5">
                          {diaryPremiumPlan.yearlyOriginalPrice} {diaryPremiumPlan.currency} / rok
                        </div>
                      )}
                      <span className="text-4xl font-bold text-foreground transition-all duration-300">
                        {isYearly ? diaryPremiumPlan.yearlyPrice : diaryPremiumPlan.monthlyPrice}
                      </span>
                      <span className="text-lg text-muted-foreground ml-1">
                        {diaryPremiumPlan.currency}{isYearly ? ' / rok' : ' / mesiac'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {isYearly 
                        ? `Ušetríš ${diaryPremiumPlan.yearlySavings} oproti mesačnému plánu`
                        : diaryPremiumPlan.description
                      }
                    </p>
                  </CardHeader>

                  <CardContent className="flex flex-col flex-grow">
                    <ul className="space-y-3 mb-8 flex-grow">
                      {diaryPremiumPlan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleDiaryPlanSelect(isYearly ? 'premium-yearly' : 'premium-monthly')}
                      disabled={subscribeMutation.isPending}
                      className="w-full py-6 text-lg font-semibold transition-all duration-200 bg-teal-500 hover:bg-teal-600 text-white shadow-lg hover:shadow-xl disabled:opacity-70"
                      data-testid="button-select-diary-premium"
                    >
                      {subscribeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Presmerovanie na platbu...
                        </>
                      ) : (
                        diaryPremiumPlan.cta
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Additional Info Section */}
        <div className="mt-20 text-center">
          <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Nevieš, ktorý plán si vybrať?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Napíš nám. Radi ti pomôžeme s výberom, vysvetlíme funkcie a zodpovieme všetky tvoje otázky, aby si mohol riešiť len to podstatné – ryby.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.location.href = 'mailto:info@contestio.sk?subject=Otázka o cenníku'}
                data-testid="button-contact-pricing"
              >
                Napísať tímu
              </Button>
              <Link href="/faq">
                <Button variant="ghost" size="lg" data-testid="button-faq">
                  Časté otázky
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ Preview */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <TacticalIcon icon={Check} variant="blue" size="sm" showLabel={false} />
            </div>
            <h4 className="font-semibold text-foreground mb-2">Bez skrytých poplatkov</h4>
            <p className="text-sm text-muted-foreground">
              Všetky ceny sú konečné, bez dodatočných poplatkov alebo prekvapení.
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <TacticalIcon icon={Star} variant="emerald" size="sm" showLabel={false} />
            </div>
            <h4 className="font-semibold text-foreground mb-2">Podpora počas celého obdobia</h4>
            <p className="text-sm text-muted-foreground">
              Náš tím je k dispozícii pre technickú podporu kedykoľvek to budeš potrebovať.
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <TacticalIcon icon={Crown} variant="purple" size="sm" showLabel={false} />
            </div>
            <h4 className="font-semibold text-foreground mb-2">Flexibilné možnosti</h4>
            <p className="text-sm text-muted-foreground">
              Vyber si balík podľa veľkosti tvojej súťaže alebo osobných potrieb.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
