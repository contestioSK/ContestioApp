import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Fish, Play, Plus } from "lucide-react";

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
    <Card className="relative overflow-hidden h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg">
      {/* Clean background without gradients */}
      
      <CardContent className="relative p-4 md:p-6 flex flex-col h-full min-h-[140px] md:min-h-[200px]">
        {/* Fish Icon - top-right decorative on mobile, left hero on desktop */}
        <div className="absolute right-2 top-2 md:-left-2 md:right-auto md:top-1/2 md:-translate-y-1/2 pointer-events-none">
          <Fish className="w-16 h-16 md:w-48 md:h-48 text-muted-foreground/20 md:text-muted-foreground/30" strokeWidth={1.75} />
        </div>
        
        {/* Text content - no margin on mobile (fish is top-right), shifted on desktop */}
        <div className="relative z-10 md:ml-40 mb-2 md:mb-0 md:flex-1">
          <h2 className="text-base md:text-2xl font-bold text-slate-800 dark:text-white mb-1 md:mb-2">
            Čo ideš dnes robiť?
          </h2>
          <p className="text-xs md:text-base text-slate-700 dark:text-slate-300 mb-2 md:mb-4 leading-relaxed">
            Začni rybačku alebo si rýchlo zapíš úlovok.
            <span className="hidden md:inline"><br />Contestio sa postará o zvyšok.</span>
          </p>
        </div>
        
        {/* CTA Buttons - full width of card */}
        <div className="relative z-10 grid grid-cols-2 gap-2 md:gap-3 mt-auto md:ml-40">
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
            className="h-10 md:h-14 text-xs md:text-base border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold shadow-md hover:shadow-lg transition-all"
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
