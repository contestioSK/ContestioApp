import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Trophy, 
  Users, 
  BarChart3, 
  HelpCircle,
  Swords,
  Lock,
  Zap,
  Check,
  X
} from "lucide-react";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIconInline } from "@/components/ui/tactical-icon";

export default function BattlePaywall() {
  const [, setLocation] = useLocation();

  const premiumFeatures = [
    {
      icon: Swords,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      title: "Vlastná Aréna",
      description: "Založ Battle s vlastnými pravidlami. Ty určuješ, ako sa hrá."
    },
    {
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      title: "Squad Mode",
      description: "Pozvi kamošov jednoduchým odkazom. Aj FREE hráči sa môžu pridať."
    },
    {
      icon: BarChart3,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      title: "Live Rebríček",
      description: "Sleduj zmeny poradia v reálnom čase. Každý gram rozhoduje."
    },
    {
      icon: Crown,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      title: "Sieň Slávy",
      description: "Zbieraj digitálne trofeje a buduj si reputáciu šampióna."
    }
  ];

  const battleModes = [
    { title: "Big Fish", desc: "Vyhráva najťažší úlovok", icon: "⚖️" },
    { title: "Limit 3", desc: "Súčet váhy 3 najťažších rýb", icon: "🏆" },
    { title: "Total Mayhem", desc: "Celková váha všetkých úlovkov", icon: "Σ" },
    { title: "Speed Run", desc: "Najviac rýb za časový limit", icon: "⏱️" }
  ];

  const mockLeaderboard = [
    { position: 1, name: "Peter K.", score: "12.50 kg", isUser: false },
    { position: 2, name: "Marek S.", score: "8.35 kg", isUser: false },
    { position: 3, name: "Ty", score: "6.10 kg", isUser: true },
    { position: 4, name: "Jano M.", score: "4.20 kg", isUser: false }
  ];

  const faqItems = [
    { 
      q: "Musia mať Premium všetci v súboji?", 
      a: "Nie! Premium potrebuje len zakladateľ (Ty). Všetci tvoji kamoši sa môžu pripojiť zadarmo." 
    },
    { 
      q: "Koľko súbojov môžem vytvoriť?", 
      a: "Neobmedzene. Môžeš mať rozbehnutý Big Fish battle na jednej vode a Total Mayhem na druhej." 
    },
    { 
      q: "Ako funguje pozývanie?", 
      a: "Pošleš im unikátny kód alebo link. Jedno kliknutie a sú v hre." 
    }
  ];

  return (
    <DiaryLayout fullBleed={true}>
      <div className="relative pb-32" data-testid="paywall-fishing-battle">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-0 w-64 h-64 bg-orange-500/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto p-6 relative z-10">
          
          <div className="text-center mb-16 pt-8">
            <Badge className="mb-6 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1">
              <TacticalIconInline icon={Crown} variant="amber" size="sm" />
              <span className="ml-1.5">Contestio Battle League</span>
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-foreground mb-6 leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground via-muted-foreground to-muted-foreground/50">Vyzvi kamošov</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">Na súboj</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Adrenalín z pretekov priamo v tvojom mobile. Založ vlastnú ligu, nastav pravidlá a ukáž, kto je skutočný pán vody.
            </p>
          </div>

          <div className="relative max-w-sm mx-auto mb-20 group cursor-default">
            <div className="absolute -inset-1 bg-gradient-to-b from-border to-background rounded-[2.5rem] blur opacity-50" />
            
            <Card className="relative bg-card border-border shadow-2xl rounded-[2rem] overflow-hidden">
              <div className="bg-muted/50 p-4 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Live Battle</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">02:14:59</span>
              </div>

              <div className="p-4 space-y-3 relative">
                 {mockLeaderboard.map((p, i) => (
                   <div 
                     key={i} 
                     className={`flex items-center justify-between p-3 rounded-xl border ${
                       p.isUser 
                         ? 'bg-orange-500/10 border-orange-500/30' 
                         : 'bg-muted/30 border-border'
                     } blur-[3px] group-hover:blur-[2px] transition-all duration-500`}
                   >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-4">{p.position}.</span>
                        <div className="text-sm font-bold text-foreground">{p.name}</div>
                      </div>
                      <div className={`text-sm font-bold ${p.position === 1 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                        {p.score}
                      </div>
                   </div>
                 ))}
                 
                 <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px]">
                    <div className="bg-muted p-4 rounded-full border border-border shadow-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                      <TacticalIconInline icon={Lock} variant="rose" size="lg" />
                    </div>
                    <p className="text-sm font-bold text-foreground uppercase tracking-widest mb-1">Live Rebríček</p>
                    <p className="text-xs text-muted-foreground">Vidíš poradie, keď sa mení</p>
                 </div>
              </div>

              <div className="p-4 bg-muted/50 border-t border-border flex justify-center">
                 <Button 
                   size="sm" 
                   className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white border border-amber-400/20"
                   onClick={() => setLocation('/pricing?tab=diary')}
                   data-testid="button-unlock-battle"
                 >
                   Odomknúť Battle
                 </Button>
              </div>
            </Card>

            <div className="absolute -top-6 -right-12 rotate-12 -z-10 opacity-30">
              <Swords className="w-24 h-24 text-muted" />
            </div>
            <div className="absolute -bottom-6 -left-12 -rotate-12 -z-10 opacity-30">
              <Trophy className="w-24 h-24 text-muted" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-16">
            {premiumFeatures.map((feature, i) => (
              <Card key={i} className="p-6 hover:bg-muted/30 transition-colors group border-border">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${feature.bg}`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-bold uppercase text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>

          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
              <h2 className="text-xl font-bold uppercase tracking-widest text-muted-foreground">Herné Režimy</h2>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {battleModes.map((mode, i) => (
                <div 
                  key={i} 
                  className="p-4 bg-muted/30 border border-border rounded-2xl text-center hover:border-amber-500/30 transition-colors cursor-default relative"
                >
                  <Badge className="absolute -top-2 -right-2 bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0.5">
                    <Lock className="w-2.5 h-2.5 mr-0.5" />
                    Premium
                  </Badge>
                  <div className="text-lg mb-2">{mode.icon}</div>
                  <div className="text-sm font-bold text-foreground uppercase mb-1">{mode.title}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{mode.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-lg mx-auto mb-16 p-6 bg-muted/20 border border-border rounded-2xl">
            <h3 className="text-center text-lg font-bold uppercase text-foreground mb-6">FREE vs Premium</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase mb-3 text-center">FREE účet</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-foreground">Pripojiť sa do Battle</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-foreground">Súťažiť s kamošmi</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <X className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span className="text-muted-foreground">Založiť vlastný Battle</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <X className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span className="text-muted-foreground">Live rebríček</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase mb-3 text-center">Premium</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-foreground">Všetko z FREE</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-foreground">Založiť vlastný Battle</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-foreground">Live rebríček</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-foreground">Sieň slávy + štatistiky</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto space-y-4 mb-12">
            <h2 className="text-center text-xl font-bold uppercase text-foreground mb-8">Často kladené otázky</h2>
            {faqItems.map((item, i) => (
              <div 
                key={i} 
                className="bg-muted/20 border border-border rounded-2xl p-5 hover:bg-muted/30 transition-colors"
              >
                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  {item.q}
                </h3>
                <p className="text-xs text-muted-foreground pl-6 leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
            
          </div>

          <div className="text-center fixed bottom-20 md:bottom-6 left-0 right-0 z-40 px-3 md:px-6">
            <div className="inline-block p-1 md:p-1.5 rounded-xl md:rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl max-w-md md:max-w-none mx-auto">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 px-3 md:px-6 py-2 md:py-3">
                 <div className="text-left hidden md:block">
                   <div className="text-sm font-bold text-foreground uppercase">Contestio Premium</div>
                   <div className="text-[10px] text-muted-foreground">Zrušiteľné kedykoľvek</div>
                 </div>
                 
                 <Button 
                   size="default"
                   className="w-full md:w-auto md:min-w-[200px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold uppercase tracking-wider text-sm md:text-base py-2.5"
                   onClick={() => setLocation('/pricing?tab=diary')}
                   data-testid="button-get-premium-footer"
                 >
                   <Zap className="w-4 h-4 mr-2" />
                   Aktivovať Premium
                 </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DiaryLayout>
  );
}
