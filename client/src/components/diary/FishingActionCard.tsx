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
    <Card className="relative overflow-hidden h-full bg-gradient-to-br from-cyan-200 via-teal-200/90 to-emerald-200/70 border-cyan-400/70 shadow-xl ring-1 ring-cyan-300/30 dark:bg-gradient-to-br dark:from-cyan-800/60 dark:via-teal-800/50 dark:to-emerald-800/40 dark:border-cyan-500/60 dark:shadow-cyan-900/40 dark:ring-cyan-600/20">
      {/* Background highlight overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/40 via-cyan-200/20 to-transparent dark:from-cyan-600/30 dark:via-cyan-700/15 dark:to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent dark:from-white/5 pointer-events-none" />
      
      <CardContent className="relative p-5 md:p-6 flex flex-col h-full min-h-[180px] md:min-h-[200px]">
        {/* Large Fish Icon - hero size, positioned left with bleed */}
        <div className="absolute -left-4 md:-left-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <Fish className="w-36 h-36 md:w-48 md:h-48 text-cyan-600/50 dark:text-cyan-400/40" strokeWidth={1} />
        </div>
        
        {/* Content - shifted right to accommodate fish */}
        <div className="relative z-10 ml-28 md:ml-40 flex flex-col h-full">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Čo ideš dnes robiť?
          </h2>
          <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
            Začni rybačku alebo si rýchlo zapíš úlovok.
            <br />
            <span className="hidden sm:inline">Contestio sa postará o zvyšok.</span>
          </p>
          
          {/* CTA Buttons - at bottom, prominent */}
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <Button
              onClick={onStartFishing}
              size="lg"
              className="h-12 md:h-14 text-sm md:text-base bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-lg hover:shadow-xl transition-all border border-cyan-500/50"
              data-testid="cta-start-fishing"
            >
              <Play className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Začať rybačku
            </Button>
            <Button
              onClick={onAddCatch}
              disabled={!canAddCatch}
              variant="outline"
              size="lg"
              className="h-12 md:h-14 text-sm md:text-base border-2 border-slate-400/80 bg-white/95 hover:bg-white text-slate-700 font-bold shadow-md hover:shadow-lg transition-all dark:border-slate-400 dark:bg-slate-700/90 dark:hover:bg-slate-700 dark:text-white"
              data-testid="cta-add-catch"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Pridať úlovok
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
