import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  Fish, 
  Target, 
  LineChart, 
  Swords, 
  BookOpen, 
  BarChart3, 
  List, 
  PieChart,
  ChevronRight,
  ChevronLeft,
  Check
} from "lucide-react";

type FishingStyle = "carp" | "spinning" | "feeder" | "fly" | "catfish";
type MainGoal = "battles" | "diary" | "statistics";
type VisualPreference = "lists" | "charts";

interface Preferences {
  fishingStyle?: FishingStyle;
  mainGoal?: MainGoal;
  visualPreference?: VisualPreference;
  onboardingCompleted: boolean;
}

const STEPS = [
  { id: 1, title: "Rybárska identita" },
  { id: 2, title: "Váš cieľ" },
  { id: 3, title: "Vizualizácia" }
];

const fishingStyles = [
  { id: "carp" as FishingStyle, label: "Kaprárina", icon: "🎣", description: "Lov kaprov a iných bielych rýb" },
  { id: "spinning" as FishingStyle, label: "Prívlač", icon: "🐟", description: "Lov dravých rýb na umelé nástrahy" },
  { id: "feeder" as FishingStyle, label: "Feeder", icon: "🪣", description: "Moderný spôsob lovu na položenú" },
  { id: "fly" as FishingStyle, label: "Muškárenie", icon: "🪰", description: "Lov na umelú mušku" },
  { id: "catfish" as FishingStyle, label: "Sumčiarina", icon: "🐋", description: "Lov sumcov a veľkých rýb" }
];

const mainGoals = [
  { id: "battles" as MainGoal, label: "Súťaženie s kamošmi", icon: Swords, description: "Fishing Battle a súťaže" },
  { id: "diary" as MainGoal, label: "Súkromný denník", icon: BookOpen, description: "Záznamy výletov a úlovkov" },
  { id: "statistics" as MainGoal, label: "Analýza a štatistiky", icon: BarChart3, description: "Grafy, trendy a dáta" }
];

const visualPreferences = [
  { id: "lists" as VisualPreference, label: "Minimalistické zoznamy", icon: List, description: "Textovo orientované rozhranie" },
  { id: "charts" as VisualPreference, label: "Grafy a mapy", icon: PieChart, description: "Vizuálne orientované rozhranie" }
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [preferences, setPreferences] = useState<Preferences>({
    onboardingCompleted: false
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs: Preferences) => {
      return await apiRequest("PUT", "/api/user/preferences", prefs);
    },
    onMutate: async (newPrefs) => {
      await queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });
      const previousUser = queryClient.getQueryData(["/api/auth/user"]);
      
      queryClient.setQueryData(["/api/auth/user"], (old: any) => ({
        ...old,
        preferences: { ...old?.preferences, ...newPrefs }
      }));
      
      return { previousUser };
    },
    onError: (err, newPrefs, context) => {
      queryClient.setQueryData(["/api/auth/user"], context?.previousUser);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onSuccess: () => {
      const goal = preferences.mainGoal;
      if (goal === "battles") {
        setLocation("/diary/battles");
      } else if (goal === "diary") {
        setLocation("/diary");
      } else {
        setLocation("/diary/statistics");
      }
    }
  });

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      savePreferencesMutation.mutate({
        ...preferences,
        onboardingCompleted: true
      });
    }
  };

  const handleSkip = () => {
    savePreferencesMutation.mutate({
      onboardingCompleted: true
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!preferences.fishingStyle;
      case 2: return !!preferences.mainGoal;
      case 3: return !!preferences.visualPreference;
      default: return false;
    }
  };

  const progress = (currentStep / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      <div className="p-4">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          {STEPS.map((step) => (
            <span 
              key={step.id} 
              className={currentStep >= step.id ? "text-primary font-medium" : ""}
            >
              {step.title}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {currentStep === 1 && (
          <div className="w-full max-w-lg animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <Fish className="w-12 h-12 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Vitajte na palube! 🎣</h1>
              <p className="text-muted-foreground">
                Akým štýlom najčastejšie lovíte?
              </p>
            </div>

            <div className="space-y-3">
              {fishingStyles.map((style) => (
                <Card 
                  key={style.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    preferences.fishingStyle === style.id 
                      ? "border-primary bg-primary/5 ring-2 ring-primary" 
                      : ""
                  }`}
                  onClick={() => setPreferences({ ...preferences, fishingStyle: style.id })}
                  data-testid={`card-style-${style.id}`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <span className="text-3xl">{style.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold">{style.label}</div>
                      <div className="text-sm text-muted-foreground">{style.description}</div>
                    </div>
                    {preferences.fishingStyle === style.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="w-full max-w-lg animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <Target className="w-12 h-12 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Čo je pre vás najdôležitejšie?</h1>
              <p className="text-muted-foreground">
                Prispôsobíme rozhranie vašim potrebám
              </p>
            </div>

            <div className="space-y-3">
              {mainGoals.map((goal) => (
                <Card 
                  key={goal.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    preferences.mainGoal === goal.id 
                      ? "border-primary bg-primary/5 ring-2 ring-primary" 
                      : ""
                  }`}
                  onClick={() => setPreferences({ ...preferences, mainGoal: goal.id })}
                  data-testid={`card-goal-${goal.id}`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <goal.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{goal.label}</div>
                      <div className="text-sm text-muted-foreground">{goal.description}</div>
                    </div>
                    {preferences.mainGoal === goal.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="w-full max-w-lg animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <LineChart className="w-12 h-12 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Už takmer sme tam! 🎉</h1>
              <p className="text-muted-foreground">
                Ako najradšej sledujete svoj progres?
              </p>
            </div>

            <div className="space-y-3">
              {visualPreferences.map((pref) => (
                <Card 
                  key={pref.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    preferences.visualPreference === pref.id 
                      ? "border-primary bg-primary/5 ring-2 ring-primary" 
                      : ""
                  }`}
                  onClick={() => setPreferences({ ...preferences, visualPreference: pref.id })}
                  data-testid={`card-visual-${pref.id}`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <pref.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{pref.label}</div>
                      <div className="text-sm text-muted-foreground">{pref.description}</div>
                    </div>
                    {preferences.visualPreference === pref.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t bg-background">
        <div className="max-w-lg mx-auto flex gap-4">
          {currentStep > 1 ? (
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={savePreferencesMutation.isPending}
              data-testid="button-back-step"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Späť
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              disabled={savePreferencesMutation.isPending}
              data-testid="button-skip-onboarding"
            >
              Preskočiť
            </Button>
          )}
          <Button 
            className="flex-1"
            onClick={handleNext}
            disabled={!canProceed() || savePreferencesMutation.isPending}
            data-testid="button-next-step"
          >
            {currentStep === 3 ? (
              savePreferencesMutation.isPending ? "Ukladám..." : "Dokončiť"
            ) : (
              <>
                Pokračovať
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
