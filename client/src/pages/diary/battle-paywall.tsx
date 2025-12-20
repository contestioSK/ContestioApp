import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Crown, Trophy, Users, BarChart3, FileText, Share2, HelpCircle, Eye } from "lucide-react";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";

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

  const faqItems = [
    {
      question: "Musia mať všetci kamaráti Premium?",
      answer: "Nie, len zakladateľ battlu musí mať Premium. Pozvaní účastníci môžu byť aj FREE užívatelia - dostanú pozvánku a môžu sa plnohodnotne zúčastniť."
    },
    {
      question: "Čo sa stane keď mi vyprší Premium?",
      answer: "Vaše aktívne battly dobehnú normálne. Nebudete však môcť vytvárať nové súboje, kým si neobnovíte predplatné. História a štatistiky zostanú zachované."
    },
    {
      question: "Koľko battleov môžem vytvoriť?",
      answer: "S Premium môžete vytvoriť neobmedzený počet súbojov. Môžete mať aktívnych viacero battleov naraz s rôznymi skupinami priateľov."
    },
    {
      question: "Ako fungujú notifikácie počas battlu?",
      answer: "Všetci účastníci dostávajú push notifikácie v reálnom čase - keď niekto chytí rybu, keď sa zmení poradie v rebríčku, alebo keď sa blíži koniec súboja."
    },
    {
      question: "Môžem zrušiť Premium kedykoľvek?",
      answer: "Áno, predplatné môžete zrušiť kedykoľvek. Premium vám zostane aktívne do konca zaplateného obdobia bez automatického obnovenia."
    }
  ];

  // Mock leaderboard data for preview
  const mockLeaderboard = [
    { position: 1, name: "Peter K.", score: "12.5 kg", catches: 5, avatar: "🥇" },
    { position: 2, name: "Marek S.", score: "8.3 kg", catches: 4, avatar: "🥈" },
    { position: 3, name: "Jano M.", score: "6.1 kg", catches: 3, avatar: "🥉" },
    { position: 4, name: "Ty", score: "---", catches: 0, avatar: "👤" }
  ];

  return (
    <DiaryLayout>
      <div className="p-6" data-testid="paywall-fishing-battle">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <h1 className="text-4xl font-bold text-foreground">
                Fishing Battle
              </h1>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                <Crown className="w-4 h-4 mr-1" />
                PREMIUM
              </Badge>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Súťažte s kamarátmi v priateľských rybárskych dueloch a zistite, kto je najlepší rybár!
            </p>
          </div>

          {/* Premium Notice */}
          <Card className="mb-8 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
            <CardContent className="p-6 text-center">
              <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Fishing Battle je dostupné len pre Premium členov
              </h2>
              <p className="text-muted-foreground mb-6">
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

          {/* Live Preview - Blurred Leaderboard */}
          <Card className="mb-8 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-6 h-6" />
                Náhľad živého rebríčka
              </CardTitle>
              <CardDescription>
                Takto vyzerá rebríček počas aktívneho battlu
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              {/* Mock Leaderboard */}
              <div className="space-y-3 blur-[2px] select-none pointer-events-none">
                {mockLeaderboard.map((player, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      player.position === 1 
                        ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800" 
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{player.avatar}</span>
                      <div>
                        <div className="font-semibold">{player.name}</div>
                        <div className="text-sm text-muted-foreground">{player.catches} úlovkov</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{player.score}</div>
                      <div className="text-xs text-muted-foreground">celková váha</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Overlay with CTA */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/90 via-background/50 to-transparent">
                <div className="text-center p-6">
                  <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-lg font-semibold mb-2">Odomknite živý rebríček</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sledujte pozície v reálnom čase počas súboja
                  </p>
                  <Button 
                    size="sm"
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    onClick={() => setLocation('/pricing')}
                    data-testid="button-unlock-preview"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Získať Premium
                  </Button>
                </div>
              </div>
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
                    <div className="font-medium text-foreground">
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
                      <h3 className="font-semibold text-foreground mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6" />
                Časté otázky
              </CardTitle>
              <CardDescription>
                Všetko, čo potrebujete vedieť o Fishing Battle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left" data-testid={`faq-question-${index}`}>
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
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
              Začať s Premium za 5,90€
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Prvý mesiac zdarma • Kedykoľvek zrušiteľné
            </p>
          </div>
        </div>
      </div>
    </DiaryLayout>
  );
}