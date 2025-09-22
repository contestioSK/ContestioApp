import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trophy, Plus, Calendar, Fish, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";

export default function DiaryIndex() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // TODO: Replace with actual API call to check premium status
  const isPremium = false; // This will be connected to actual premium check

  const diaryFeatures = [
    {
      icon: Calendar,
      title: "Výpravy",
      description: "Zaznamenávajte svoje rybárske výpravy",
      href: "/diary/trips",
      isPremium: false
    },
    {
      icon: Fish,
      title: "Úlovky",
      description: "Sledujte svoje úlovky s fotkami a poznámkami",
      href: "/diary/catches", 
      isPremium: false
    },
    {
      icon: Trophy,
      title: "Fishing Battle",
      description: "Súťažte s kamarátmi v rybárskych dueloch",
      href: "/diary/battle",
      isPremium: true
    },
    {
      icon: BarChart3,
      title: "Štatistiky",
      description: "Detailné analýzy vašich úlovkov",
      href: "/diary/stats",
      isPremium: true
    }
  ];

  const handleFeatureClick = (feature: typeof diaryFeatures[0]) => {
    if (feature.isPremium && !isPremium) {
      // Redirect to specific paywall for that feature
      if (feature.href === "/diary/battle") {
        setLocation("/diary/battle/paywall");
      } else {
        setLocation("/pricing");
      }
    } else {
      setLocation(feature.href);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Rybársky denník
            </h1>
            {isPremium && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                PREMIUM
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-lg">
            Zaznamenávajte svoje rybárske zážitky a sledujte progres
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Výpravy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Úlovky</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Battles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">0 kg</div>
              <div className="text-sm text-muted-foreground">Celková váha</div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {diaryFeatures.map((feature, index) => (
            <Card 
              key={index} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                feature.isPremium && !isPremium ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/10' : ''
              }`}
              onClick={() => handleFeatureClick(feature)}
              data-testid={`card-${feature.title.toLowerCase().replace(' ', '-')}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      feature.isPremium && !isPremium 
                        ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                        : 'bg-primary/10'
                    }`}>
                      <feature.icon className={`w-5 h-5 ${
                        feature.isPremium && !isPremium 
                          ? 'text-yellow-600 dark:text-yellow-400' 
                          : 'text-primary'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      {feature.isPremium && !isPremium && (
                        <Badge variant="outline" className="text-xs mt-1 border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300">
                          PREMIUM
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
                {feature.isPremium && !isPremium && (
                  <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Táto funkcia vyžaduje Premium predplatné
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Premium CTA */}
        {!isPremium && (
          <Card className="mt-8 border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">Odomknite plný potenciál denníka</h3>
              <p className="text-muted-foreground mb-4">
                Získajte prístup k Fishing Battle, pokročilým štatistikám a neobmedzenému počtu výprav
              </p>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => setLocation('/pricing')}
                data-testid="button-upgrade-premium"
              >
                Prejsť na Premium za 4,90€
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}