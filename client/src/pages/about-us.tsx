import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, Eye, Award, Trophy, BookOpen, User } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="h-16" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-about-title">
            O nás
          </h1>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg max-w-none text-foreground mb-12">
          <p className="text-lg leading-relaxed mb-8">
            Contestio je moderná digitálna platforma, ktorá mení spôsob, akým sa organizujú, sledujú a prežívajú rybárske súťaže na Slovensku. Naším cieľom je priniesť do športového rybárstva prehľadnosť, profesionalitu a jedinečný zážitok v reálnom čase – pre organizátorov, tímy aj fanúšikov.
          </p>
        </div>

        {/* Súťaže Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Súťaže</h2>
          </div>
          <div className="bg-muted/30 rounded-lg p-6">
            <p className="text-lg leading-relaxed mb-4 text-foreground">
              Organizátorom ponúkame profesionálny systém, ktorý pokrýva celé podujatie – od online registrácie tímov, cez správu rozhodcov a sektorov, až po živé výsledky s prehľadnými tabuľkami, mapami a fotografiami úlovkov. Rozhodcovia získavajú rýchle a spoľahlivé nástroje na zapisovanie priamo z brehu. Fanúšikovia môžu sledovať dianie v reálnom čase – kdekoľvek sú.
            </p>
          </div>
        </div>

        {/* Rybársky denník Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Rybársky denník</h2>
          </div>
          <div className="bg-muted/30 rounded-lg p-6 mb-6">
            <p className="text-lg leading-relaxed mb-4 text-foreground">
              Contestio však nie je len o súťažiach. Vytvorili sme aj Rybársky denník, určený pre každého vášnivého rybára. Ten ti umožní:
            </p>
            <ul className="space-y-2 text-foreground mb-6">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>zapisovať si úlovky s fotkami, nástrahami a poznámkami,</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>ukladať miesta lovu (aj pomocou GPS),</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>sledovať predpoveď počasia, tlak a vietor, aby si mal vždy prehľad o podmienkach pri vode,</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>nastavovať si osobné ciele na novú sezónu a merať ich plnenie prostredníctvom prehľadných grafov,</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>porovnávať sa s priateľmi cez Fishing Battle, malú súťaž priamo v denníku.</span>
              </li>
            </ul>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="bg-background rounded-lg p-4 border border-border">
                <h3 className="font-semibold text-foreground mb-2">Verzia FREE</h3>
                <p className="text-muted-foreground">
                  K dispozícii máš jednu rybársku výpravu a 20 úlovkov.
                </p>
              </div>
              <div className="bg-background rounded-lg p-4 border border-primary">
                <h3 className="font-semibold text-primary mb-2">Verzia PREMIUM</h3>
                <p className="text-muted-foreground">
                  Získavaš neobmedzené výpravy a úlovky, pokročilé štatistiky, grafy a ďalšie bonusové funkcie.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Vision Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Naša vízia
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center p-6" data-testid="card-organizers">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-3">Organizátori</h3>
                <p className="text-muted-foreground">
                  Získajú profesionálny systém bez zbytočnej administratívy.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6" data-testid="card-teams">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-3">Tímy</h3>
                <p className="text-muted-foreground">
                  Majú férovú a prehľadnú súťaž s okamžitým zobrazením výsledkov.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6" data-testid="card-fans">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-3">Fanúšikovia</h3>
                <p className="text-muted-foreground">
                  Sledujú úlovky a rebríčky v reálnom čase.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6" data-testid="card-individuals">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-3">Jednotlivci</h3>
                <p className="text-muted-foreground">
                  Uchovávajú si rybárske spomienky, plnia si ciele a plánujú ďalšie úspechy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="text-center bg-muted/30 rounded-lg p-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-8 h-8 text-primary" />
          </div>
          <p className="text-xl font-semibold text-foreground" data-testid="text-tagline">
            Contestio stavia na vášni pre rybárstvo, inováciách a komunite. Sme tu preto, aby sme slovenským rybárom – súťažiacim aj rekreačným – dali nový rozmer zážitku pri vode.
          </p>
        </div>
      </div>
    </div>
  );
}