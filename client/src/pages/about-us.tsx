import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, Eye, Award, Trophy, BookOpen, User } from "lucide-react";
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
            Contestio je moderná digitálna platforma, ktorá mení spôsob, akým sa organizujú, sledujú a prežívajú rybárske súťaže na Slovensku. Naším cieľom je priniesť do športového rybárstva prehľadnosť, profesionalitu a jedinečný zážitok v reálnom čase – pre organizátorov, tímy aj fanúšikov.
          </p>
        </div>

        {/* Súťaže Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TacticalIcon icon={Trophy} variant="amber" size="sm" showLabel={false} />
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Súťaže</h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground">
              Organizátorom ponúkame profesionálny systém, ktorý pokrýva celé podujatie – od online registrácie tímov, cez správu rozhodcov a sektorov, až po živé výsledky s prehľadnými tabuľkami, mapami a fotografiami úlovkov. Rozhodcovia získavajú rýchle a spoľahlivé nástroje na zapisovanie priamo z brehu. Fanúšikovia môžu sledovať dianie v reálnom čase – kdekoľvek sú.
            </p>
          </CardContent>
        </Card>

        {/* Rybársky denník Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TacticalIcon icon={BookOpen} variant="slate" size="sm" showLabel={false} />
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Rybársky denník</h2>
            </div>
            <p className="text-base leading-relaxed mb-3 text-muted-foreground">
              Contestio však nie je len o súťažiach. Vytvorili sme aj Rybársky denník, určený pre každého vášnivého rybára. Ten ti umožní:
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground mb-5">
              <li className="flex items-start">
                <span className="text-primary mr-2 mt-0.5">•</span>
                <span>zapisovať si úlovky s fotkami, nástrahami a poznámkami,</span>
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
                  Neobmedzené výpravy (posledné 3 prístupné), 50 úlovkov, 1 fotka na úlovok, prijímanie battle výziev.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 border border-primary">
                <h3 className="font-semibold text-primary mb-1.5 text-sm">Verzia PREMIUM</h3>
                <p className="text-xs text-muted-foreground">
                  Neobmedzené výpravy, úlovky a fotky, pokročilé štatistiky a grafy, ukladanie GPS lokalít, predpoveď počasia, offline režim so synchronizáciou, vytváranie battle súbojov.
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
            <Card className="text-center" data-testid="card-organizers">
              <CardContent className="p-5">
                <TacticalIcon icon={Users} variant="orange" size="sm" showLabel={false} className="mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm">Organizátori</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Získajú profesionálny systém bez zbytočnej administratívy.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-teams">
              <CardContent className="p-5">
                <TacticalIcon icon={Target} variant="purple" size="sm" showLabel={false} className="mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm">Tímy</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Majú férovú a prehľadnú súťaž s okamžitým zobrazením výsledkov.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-fans">
              <CardContent className="p-5">
                <TacticalIcon icon={Eye} variant="blue" size="sm" showLabel={false} className="mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm">Fanúšikovia</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sledujú úlovky a rebríčky v reálnom čase.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-individuals">
              <CardContent className="p-5">
                <TacticalIcon icon={User} variant="slate" size="sm" showLabel={false} className="mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm">Jednotlivci</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Uchovávajú si rybárske spomienky, plnia si ciele a plánujú ďalšie úspechy.
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
              Contestio stavia na vášni pre rybárstvo, inováciách a komunite. Sme tu preto, aby sme slovenským rybárom – súťažiacim aj rekreačným – dali nový rozmer zážitku pri vode.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
