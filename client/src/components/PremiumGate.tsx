import { Lock, TrendingUp, Trophy, PieChart, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

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
    icon: <TrendingUp className="w-12 h-12 text-muted-foreground/50" />,
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
    icon: <Trophy className="w-12 h-12 text-muted-foreground/50" />,
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
    icon: <PieChart className="w-12 h-12 text-muted-foreground/50" />,
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

  return (
    <div className="relative">
      {showPreview && children && (
        <div className="blur-sm opacity-40 pointer-events-none select-none">
          {children}
        </div>
      )}
      
      <div className={`${showPreview ? 'absolute inset-0' : ''} flex items-center justify-center`}>
        <div className="bg-background/95 backdrop-blur-sm rounded-2xl p-8 max-w-md text-center shadow-lg border border-border">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-muted/50 rounded-2xl">
              {content.icon}
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-amber-500" />
            <h3 className="text-xl font-bold text-foreground">{content.title}</h3>
          </div>
          
          <p className="text-muted-foreground mb-6">{content.description}</p>
          
          <ul className="text-left space-y-2 mb-6">
            {content.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-amber-500 mt-0.5">•</span>
                {benefit}
              </li>
            ))}
          </ul>
          
          <Button 
            onClick={() => setLocation('/diary/premium')}
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
      onClick={() => setLocation('/diary/premium')}
      data-testid={`teaser-card-${type}`}
    >
      <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 mb-3">
        <Lock className="w-4 h-4" />
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
