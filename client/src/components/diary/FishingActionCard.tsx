import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Plus } from "lucide-react";
import waterRaysBg from "@assets/water-rays-bg.png";
import carpImage from "@assets/Gemini_Generated_Image_kur5qpkur5qpkur5-Photoroom_1769878046486.png";

interface FishingActionCardProps {
  onStartFishing: () => void;
  onAddCatch: () => void;
  canAddCatch?: boolean;
}

export default function FishingActionCard({ 
  onStartFishing, 
  onAddCatch, 
  canAddCatch = true 
}: FishingActionCardProps) {
  return (
    <Card className="relative overflow-hidden h-full border border-slate-700 shadow-lg" style={{ backgroundColor: '#0B1C2F' }}>
      <div 
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage: `url(${waterRaysBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center left',
          transform: 'scaleX(-1)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-l from-[#0B1C2F] via-[#0B1C2F]/80 to-transparent pointer-events-none" />
      
      <CardContent className="relative p-4 md:p-6 flex flex-col h-full min-h-[140px] md:min-h-[200px]">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none pr-2 md:pr-4">
          <img 
            src={carpImage} 
            alt="Kapor" 
            className="w-32 h-auto md:w-80 opacity-20 grayscale brightness-200"
          />
        </div>
        
        <div className="relative z-10 mb-2 md:mb-0 md:flex-1">
          <h2 className="text-base md:text-2xl font-bold text-white mb-1 md:mb-2">
            Čo ideš dnes robiť?
          </h2>
          <p className="text-xs md:text-base text-slate-300 mb-2 md:mb-4 leading-relaxed">
            Začni rybačku alebo si rýchlo zapíš úlovok.
            <span className="hidden md:inline"><br />Contestio sa postará o zvyšok.</span>
          </p>
        </div>
        
        <div className="relative z-10 grid grid-cols-2 gap-2 md:gap-3 mt-auto">
          <Button
            onClick={onStartFishing}
            size="lg"
            className="h-10 md:h-14 text-xs md:text-base bg-[#F97316] hover:bg-[#EA580C] text-white font-bold shadow-lg hover:shadow-xl transition-all"
            data-testid="cta-start-fishing"
          >
            <Play className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" strokeWidth={1.75} />
            Začať rybačku
          </Button>
          <Button
            onClick={onAddCatch}
            disabled={!canAddCatch}
            variant="outline"
            size="lg"
            className="h-10 md:h-14 text-xs md:text-base border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-white font-bold shadow-md hover:shadow-lg transition-all"
            data-testid="cta-add-catch"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" strokeWidth={1.75} />
            Pridať úlovok
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
