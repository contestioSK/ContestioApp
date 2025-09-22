import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Trophy, Users, BarChart3, FileText, Share2 } from "lucide-react";
import { useLocation } from "wouter";

export default function BattlePaywall() {
  const [, setLocation] = useLocation();

  const premiumFeatures = [
    {
      icon: Trophy,
      title: "Vytvorenie súboja",
      description: "Založte vlastný Fishing Battle s vlastnými pravidlami"
    },
    {
      icon: Users,
      title: "Pozvanie kamarátov",
      description: "Pozvite ďalších Premium užívateľov cez username/email"
    },
    {
      icon: BarChart3,
      title: "Priebežné výsledky",
      description: "Rebríček v reálnom čase s grafickým znázornením"
    },
    {
      icon: Crown,
      title: "Digitálne trofeje",
      description: "Získajte medaile a trofeje za víťazstvá"
    },
    {
      icon: FileText,
      title: "Export výsledkov",
      description: "Exportujte výsledky ako PDF alebo zdieľajte na sociálne siete"
    },
    {
      icon: Share2,
      title: "Archív battle",
      description: "História všetkých battle s víťazstvami a štatistikami"
    }
  ];

  const battleModes = [
    "Najväčšia ryba",
    "Top 3 ryby (váhový priemer)",
    "Celková hmotnosť úlovkov",
    "Počet chytených rýb"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950" data-testid="paywall-fishing-battle">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Fishing Battle
            </h1>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              <Crown className="w-4 h-4 mr-1" />
              PREMIUM
            </Badge>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Súťažte s kamarátmi v priateľských rybárskych dueloch a zistite, kto je najlepší rybár!
          </p>
        </div>

        {/* Premium Notice */}
        <Card className="mb-8 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardContent className="p-6 text-center">
            <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Fishing Battle je dostupné len pre Premium členov
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Upgradujte svoje členstvo a vyzvite kamarátov na priateľský rybársky duel.
            </p>
            <Button 
              size="lg" 
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={() => setLocation('/pricing')}
              data-testid="button-upgrade-premium"
            >
              <Crown className="w-5 h-5 mr-2" />
              Prejsť na Premium
            </Button>
          </CardContent>
        </Card>

        {/* Battle Modes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Herné režimy
            </CardTitle>
            <CardDescription>
              Vyberte si zo štyroch rôznych súťažných režimov
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {battleModes.map((mode, index) => (
                <div 
                  key={index}
                  className="p-4 border rounded-lg bg-muted/50"
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {mode}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Premium Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Čo získate s Premium</CardTitle>
            <CardDescription className="text-center">
              Kompletný prístup ku všetkým Fishing Battle funkciám
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {premiumFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA Footer */}
        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90"
            onClick={() => setLocation('/pricing')}
            data-testid="button-upgrade-premium-footer"
          >
            <Crown className="w-5 h-5 mr-2" />
            Začať s Premium za 4,90€
          </Button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Prvý mesiac zdarma • Kedykoľvek zrušiteľné
          </p>
        </div>
      </div>
    </div>
  );
}