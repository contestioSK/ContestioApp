import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent } from "@/components/ui/card";
import { Award, BookOpen, User, BarChart2, Map, Swords } from "lucide-react";
import { TacticalIcon } from "@/components/ui/tactical-icon";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="h-16" />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3" data-testid="text-about-title">
            O nás
          </h1>
          <div className="w-20 h-1 bg-primary mx-auto rounded-full"></div>
        </div>

        {/* Main Content */}
        <div className="mb-8">
          <p className="text-base md:text-lg leading-relaxed text-foreground text-center max-w-3xl mx-auto">
            Contestio je digitálny rybársky denník, ktorý mení spôsob, akým rybári zaznamenávajú, analyzujú a prežívajú svoje výpravy. Naším cieľom je priniesť do rybárstva dáta, prehľadnosť a motiváciu – pre každého, kto chce byť pri vode lepší.
          </p>
        </div>

        {/* Rybársky denník Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TacticalIcon icon={BookOpen} variant="slate" size="sm" showLabel={false} />
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Rybársky denník</h2>
            </div>
            <p className="text-base leading-relaxed mb-3 text-muted-foreground">
              Contestio ti umožní:
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground mb-5">
              <li className="flex items-start">
                <span className="text-primary mr-2 mt-0.5">•</span>
                <span>zapisovať si úlovky s fotografiami, nástrahami a poznámkami,</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 mt-0.5">•</span>
                <span>ukladať miesta lovu (aj pomocou GPS),</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 mt-0.5">•</span>
                <span>sledovať predpoveď počasia, tlak a vietor,</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 mt-0.5">•</span>
                <span>nastavovať si osobné ciele na novú sezónu a merať ich plnenie,</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 mt-0.5">•</span>
                <span>porovnávať sa s priateľmi cez Fishing Battle.</span>
              </li>
            </ul>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <h3 className="font-semibold text-foreground mb-1.5 text-sm">Verzia FREE</h3>
                <p className="text-xs text-muted-foreground">
                  Neobmedzené výpravy (posledné 3 prístupné), 50 úlovkov, 1 fotografia na úlovok, prijímanie battle výziev.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 border border-primary">
                <h3 className="font-semibold text-primary mb-1.5 text-sm">Verzia PREMIUM</h3>
                <p className="text-xs text-muted-foreground">
                  Neobmedzené výpravy, úlovky a fotografie, pokročilé štatistiky a grafy, ukladanie GPS lokalít, predpoveď počasia, offline režim so synchronizáciou, vytváranie battle súbojov.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vision Section */}
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-5 text-center">
            Naša vízia
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="text-center" data-testid="card-individuals">
              <CardContent className="p-5">
                <TacticalIcon icon={User} variant="slate" size="sm" showLabel={false} className="mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm">Rybár</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Uchováva spomienky, plní si ciele a plánuje ďalšie úspechy.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-diary">
              <CardContent className="p-5">
                <TacticalIcon icon={BookOpen} variant="blue" size="sm" showLabel={false} className="mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm">Denník</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Každý úlovok zaznamenaný presne — fotka, váha, nástraha, podmienky.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-stats">
              <CardContent className="p-5">
                <TacticalIcon icon={BarChart2} variant="purple" size="sm" showLabel={false} className="mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm">Štatistiky</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tvrdé dáta namiesto pocitov. Vieš, čo funguje a kedy.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-battle">
              <CardContent className="p-5">
                <TacticalIcon icon={Swords} variant="orange" size="sm" showLabel={false} className="mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm">Fishing Battle</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vyzvi kamošov na súboj. Tabuľka neklame.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mission Statement */}
        <Card className="text-center bg-muted/40">
          <CardContent className="p-6">
            <TacticalIcon icon={Award} variant="amber" size="sm" showLabel={false} className="mx-auto mb-4" />
            <p className="text-base md:text-lg font-semibold text-foreground max-w-3xl mx-auto leading-relaxed" data-testid="text-tagline">
              Contestio stavia na vášni pre rybárstvo, inováciách a komunite. Sme tu preto, aby sme slovenským rybárom dali nový rozmer zážitku pri vode.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
