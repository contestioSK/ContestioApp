import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, Eye, Award } from "lucide-react";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 main-content-wrapper">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-about-title">
            O nás
          </h1>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
        </div>

        {/* Main Content */}
        <div className="prose prose-lg max-w-none text-foreground mb-12">
          <p className="text-lg leading-relaxed mb-6">
            Contestio je moderná digitálna platforma, ktorá mení spôsob, akým sa organizujú a sledujú rybárske súťaže na Slovensku. Naším cieľom je priniesť do športového rybárstva prehľadnosť, profesionalitu a zážitok v reálnom čase – pre organizátorov, tímy aj fanúšikov.
          </p>
          
          <p className="text-lg leading-relaxed mb-6">
            Pomáhame organizátorom jednoducho spravovať celé podujatie – od registrácie tímov až po online výsledky. Rozhodcom poskytujeme rýchle a spoľahlivé nástroje na zapisovanie úlovkov priamo z brehu. A divákom prinášame atraktívne live sledovanie s tabuľkami, mapami a fotkami úlovkov.
          </p>
        </div>

        {/* Vision Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Naša vízia je jasná:
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  Sledujú dianie v reálnom čase, nech sú kdekoľvek.
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
          <p className="text-lg leading-relaxed mb-6 text-foreground">
            Contestio stavia na vášni pre rybárstvo, inováciách a komunite. Sme tu preto, aby sme slovenským rybárskym súťažiam dali nový rozmer.
          </p>
          <p className="text-xl font-semibold text-primary" data-testid="text-tagline">
            Contestio – profesionálna správa rybárskych súťaží.
          </p>
        </div>
      </div>
    </div>
  );
}