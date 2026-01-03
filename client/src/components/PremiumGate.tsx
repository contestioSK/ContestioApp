import { Lock, TrendingUp, Trophy, PieChart, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";

type PremiumGateType = 'trends' | 'achievements' | 'analysis';

interface PremiumGateProps {
  type: PremiumGateType;
  children?: React.ReactNode;
  showPreview?: boolean;
}

const gateContent: Record<PremiumGateType, {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
  cta: string;
}> = {
  trends: {
    icon: <TacticalIcon icon={TrendingUp} variant="amber" size="lg" showLabel={false} />,
    title: "Trendy úlovkov",
    description: "Zisti, kedy ryby berú najčastejšie podľa času, počasia a sezóny.",
    benefits: [
      "Najlepší čas dňa na lov",
      "Vplyv tlaku, teploty a mesiaca",
      "Skutočné dáta z tvojich výprav"
    ],
    cta: "Odomknúť trendy v PREMIUM"
  },
  achievements: {
    icon: <TacticalIcon icon={Trophy} variant="amber" size="lg" showLabel={false} />,
    title: "Úspechy a progres",
    description: "Sleduj, ako sa zlepšuješ a v čom máš rezervy.",
    benefits: [
      "Osobné rekordy",
      "Porovnanie sezón",
      "Dlhodobý progres"
    ],
    cta: "Zobraziť úspechy v PREMIUM"
  },
  analysis: {
    icon: <TacticalIcon icon={PieChart} variant="purple" size="lg" showLabel={false} />,
    title: "Pokročilé analýzy",
    description: "Toto je nástroj pre rybárov, ktorí chcú chytať viac, nie len zapisovať.",
    benefits: [
      "Ktoré techniky fungujú najlepšie",
      "Úspešnosť lokalít",
      "Dátové vzory, ktoré si inak nevšimneš"
    ],
    cta: "Získať výhodu s PREMIUM"
  }
};

export function PremiumGate({ type, children, showPreview = false }: PremiumGateProps) {
  const [, setLocation] = useLocation();
  const content = gateContent[type];

  if (showPreview && children) {
    return (
      <div className="relative">
        <div className="max-h-[300px] overflow-hidden blur-sm opacity-50 pointer-events-none select-none">
          {children}
        </div>
        
        <div className="relative -mt-16 z-10 bg-gradient-to-t from-background via-background to-transparent pt-16">
          <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-6 md:p-8 max-w-lg mx-auto text-center shadow-lg border border-amber-500/20">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl">
                {content.icon}
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-3">
              <TacticalIconInline icon={Lock} variant="rose" size="sm" />
              <h3 className="text-xl font-bold text-foreground">{content.title}</h3>
            </div>
            
            <p className="text-muted-foreground mb-5 text-sm">{content.description}</p>
            
            <ul className="text-left space-y-2 mb-5 max-w-xs mx-auto">
              {content.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {benefit}
                </li>
              ))}
            </ul>
            
            <Button 
              onClick={() => setLocation('/pricing?tab=diary')}
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
              data-testid={`button-premium-gate-${type}`}
            >
              <Crown className="w-4 h-4" />
              {content.cta}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-6 md:p-8 max-w-md text-center shadow-lg border border-border">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-muted/50 rounded-2xl">
            {content.icon}
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-3">
          <TacticalIconInline icon={Lock} variant="rose" size="sm" />
          <h3 className="text-xl font-bold text-foreground">{content.title}</h3>
        </div>
        
        <p className="text-muted-foreground mb-5 text-sm">{content.description}</p>
        
        <ul className="text-left space-y-2 mb-5">
          {content.benefits.map((benefit, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-foreground">
              <span className="text-amber-500 mt-0.5">•</span>
              {benefit}
            </li>
          ))}
        </ul>
        
        <Button 
          onClick={() => setLocation('/pricing?tab=diary')}
          className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
          data-testid={`button-premium-gate-${type}`}
        >
          <Crown className="w-4 h-4" />
          {content.cta}
        </Button>
      </div>
    </div>
  );
}

interface PremiumTeaserCardProps {
  type: PremiumGateType;
  previewValue?: string;
  previewLabel?: string;
}

export function PremiumTeaserCard({ type, previewValue, previewLabel }: PremiumTeaserCardProps) {
  const [, setLocation] = useLocation();
  const content = gateContent[type];
  
  const IconComponent = type === 'trends' ? TrendingUp : type === 'achievements' ? Trophy : PieChart;

  return (
    <div 
      className="bg-muted/30 border border-dashed border-amber-500/30 rounded-xl p-5 hover:border-amber-500/50 transition-colors cursor-pointer group"
      onClick={() => setLocation('/pricing?tab=diary')}
      data-testid={`teaser-card-${type}`}
    >
      <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 mb-3">
        <TacticalIconInline icon={Lock} variant="rose" size="sm" />
        <span className="text-xs font-bold uppercase tracking-widest">{content.title}</span>
      </div>
      
      <div className="flex items-center gap-4 mb-3">
        <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
          <IconComponent className="w-6 h-6 text-amber-500/50" />
        </div>
        <div className="flex-1">
          {previewLabel && (
            <p className="text-xs text-muted-foreground">{previewLabel}</p>
          )}
          <p className="text-sm text-muted-foreground italic">
            {content.description.split(' ').slice(0, 6).join(' ')}...
          </p>
        </div>
      </div>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 text-xs group-hover:bg-amber-500/10"
      >
        <Crown className="w-3 h-3 mr-1" />
        Odomknúť v PREMIUM
      </Button>
    </div>
  );
}
