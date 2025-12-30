import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
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
  { id: 1, title: "DNA Rybára" },
  { id: 2, title: "Tvoja Misia" },
  { id: 3, title: "Tvoj Štýl" }
];

const fishingStyles = [
  { id: "carp" as FishingStyle, label: "Kaprárina", icon: "🎣", description: "Vôňa boilies a trpezlivé čakanie na životnú jazdu" },
  { id: "spinning" as FishingStyle, label: "Prívlač", icon: "🐟", description: "Adrenalínový lov dravcov a nekonečné hádzanie" },
  { id: "feeder" as FishingStyle, label: "Feeder", icon: "🪣", description: "Maximálna precíznosť a jemná technika na každú rybu" },
  { id: "fly" as FishingStyle, label: "Muškárenie", icon: "🪰", description: "Umenie fly-fishingu a súboj s prúdom rieky" },
  { id: "catfish" as FishingStyle, label: "Sumčiarina", icon: "🐋", description: "Súboj s riečnymi gigantmi, kde rozhoduje sila" }
];

const mainGoals = [
  { id: "battles" as MainGoal, label: "Nadvláda v Fishing Battle", icon: Swords, description: "Vyzvi kamošov a ukáž im, kto je skutočný pán vody" },
  { id: "diary" as MainGoal, label: "Digitálny denník", icon: BookOpen, description: "Uchovaj si spomienky na každú výpravu v profi kvalite" },
  { id: "statistics" as MainGoal, label: "Dátový mág", icon: BarChart3, description: "Analyzuj tlak, vietor a úspešnosť tvojich revírov" }
];

const visualPreferences = [
  { id: "lists" as VisualPreference, label: "Čistý zoznam", icon: List, description: "Prehľadné textové rozhranie (old-school klasika)" },
  { id: "charts" as VisualPreference, label: "Moderná vizualizácia", icon: PieChart, description: "Dáta v grafoch a mapách (všetko vidíš na prvý pohľad)" }
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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
    onSuccess: (_, variables) => {
      toast({
        title: "🎉 Revír pripravený!",
        description: "Tvoj profil je nastavený. Vidíme sa pri vode!",
      });
      
      const goal = variables.mainGoal || "diary";
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
      fishingStyle: "carp",
      mainGoal: "diary",
      visualPreference: "lists",
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
              <h1 className="text-2xl font-bold mb-2">Aké druhy rybolovu máš najradšej?</h1>
              <p className="text-muted-foreground">
                Prispôsobíme tvoj denník a štatistiky presne podľa toho, čo a ako lovíš.
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

            <div className="mt-8 flex gap-4">
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                disabled={savePreferencesMutation.isPending}
                className="text-muted-foreground"
              >
                Preskočiť
              </Button>
              <Button 
                className="flex-1"
                onClick={handleNext}
                disabled={!canProceed() || savePreferencesMutation.isPending}
                data-testid="button-next-step"
              >
                Pokračovať
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="w-full max-w-lg animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <Target className="w-12 h-12 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Aká je tvoja hlavná misia?</h1>
              <p className="text-muted-foreground">
                Povedz nám, prečo si tu. Contestio ti podľa toho nastaví úvodnú obrazovku.
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

            <div className="mt-8 flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={savePreferencesMutation.isPending}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Späť
              </Button>
              <Button 
                className="flex-1"
                onClick={handleNext}
                disabled={!canProceed() || savePreferencesMutation.isPending}
                data-testid="button-next-step"
              >
                Pokračovať
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="w-full max-w-lg animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <LineChart className="w-12 h-12 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Zvoľ si svoj štýl</h1>
              <p className="text-muted-foreground">
                Ako chceš sledovať svoje dáta? Vyber si rozhranie, ktoré ti sedí.
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

            <div className="mt-8 flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={savePreferencesMutation.isPending}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Späť
              </Button>
              <Button 
                className="flex-1"
                onClick={handleNext}
                disabled={!canProceed() || savePreferencesMutation.isPending}
                data-testid="button-next-step"
              >
                {savePreferencesMutation.isPending ? "Ukladám..." : "Vstúpiť do Contestia"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
