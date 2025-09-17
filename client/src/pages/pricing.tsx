import NavigationHeader from "@/components/navigation-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Crown, Zap, Building } from "lucide-react";
import { Link } from "wouter";

export default function Pricing() {
  // Helper function to render text with bold formatting
  const renderFeatureText = (text: string) => {
    if (!text.includes('**')) {
      return text;
    }
    
    const parts = text.split('**');
    return parts.map((part, index) => {
      // Every odd index should be bold
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
      price: "49",
      currency: "€",
      period: "/ súťaž",
      description: "Ideálne pre menšie súťaže",
      icon: Zap,
      color: "from-blue-500 to-blue-600",
      popular: false,
      cta: "Vybrať balík",
      features: [
        "Registrácia tímov",
        "👥 **Maximálne 10 tímov**",
        "Zápis úlovkov rozhodcami",
        "Live tabuľka výsledkov",
        "Základné štatistiky",
        "👨‍⚖️ **Až 2 rozhodcovia**"
      ]
    },
    {
      id: "pro",
      name: "Pro",
      price: "149",
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
        "Sektory + ocenenie pre top 3 v sektore",
        "Profil tímov + kompletný zoznam úlovkov",
        "Sponzori (logá, ceny)",
        "Export výsledkov (PDF, Excel)",
        "👨‍⚖️ **Až 5 rozhodcovia**"
      ]
    },
    {
      id: "premium",
      name: "Premium",
      price: "499",
      currency: "€",
      period: "/ súťaž",
      description: "Pre veľké súťaže s vlastným brandingom",
      icon: Crown,
      color: "from-amber-500 to-amber-600",
      popular: false,
      cta: "Vybrať balík",
      features: [
        "Všetko z Pro +",
        "👥 **Neobmedzený počet tímov**",
        "Branding (logo, farby, subdoména contestio.sk/nazovpreteku)",
        "Pokročilé štatistiky a grafy",
        "👨‍⚖️ **Neobmedzený počet rozhodcovia**",
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
        "👥 **Neobmedzený počet tímov**",
        "👨‍⚖️ **Neobmedzený počet rozhodcovia**",
        "Interaktívna mapa sektorov s umiestnením tímov",
        "Viacero súťaží pod jednou organizáciou",
        "White-label riešenie (aplikácia pod vlastnou značkou)",
        "API prístup (integrácia na web organizátora)",
        "Podpora od nášho tímu počas preteku"
      ]
    }
  ];

  const handlePlanSelect = (planId: string) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:info@contestio.sk?subject=Záujem o Enterprise balík&body=Dobrý deň,%0A%0AMám záujem o Enterprise balík pre našu organizáciu.%0A%0AĎakujem';
    } else {
      // Redirect to competition registration with plan parameter
      window.location.href = `/register-competition?plan=${planId}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6" data-testid="text-pricing-title">
            Cenníky pre organizátorov
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Vyberte si balík, ktorý najlepšie vyhovuje vašej súťaži. Od jednoduchých turnajov 
            až po komplexné podujatia s vlastným brandingom.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 mx-auto mt-6 rounded-full"></div>
        </div>

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
                    <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                      <IconComponent className="w-8 h-8 text-white" />
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

        {/* Additional Info Section */}
        <div className="mt-20 text-center">
          <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Máte otázky o cenníkoch?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Naš tím vám rád pomôže vybrať správny balík pre vašu súťaž. 
              Kontaktujte nás a prediskutujeme vaše potreby.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.location.href = 'mailto:info@contestio.sk?subject=Otázka o cenníkoch'}
                data-testid="button-contact-pricing"
              >
                Kontaktovať nás
              </Button>
              <Link href="/about-us">
                <Button variant="ghost" size="lg" data-testid="button-learn-more">
                  Dozvedieť sa viac
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ Preview */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold text-foreground mb-2">Bez skrytých poplatkov</h4>
            <p className="text-sm text-muted-foreground">
              Všetky ceny sú konečné, bez dodatočných poplatkov alebo prekvapení.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold text-foreground mb-2">Podpora počas súťaže</h4>
            <p className="text-sm text-muted-foreground">
              Náš tím je k dispozícii počas celej súťaže pre technickú podporu.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold text-foreground mb-2">Flexibilné riešenia</h4>
            <p className="text-sm text-muted-foreground">
              Môžeme prispôsobiť balík presne vašim potrebám a požiadavkám.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}