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
      
      <CardContent className="relative p-4 md:p-6 flex flex-col h-full min-h-[140px] md:min-h-[200px]">
        {/* Fish Icon - top-right decorative on mobile, left hero on desktop */}
        <div className="absolute right-2 top-2 md:-left-2 md:right-auto md:top-1/2 md:-translate-y-1/2 pointer-events-none">
          <Fish className="w-16 h-16 md:w-48 md:h-48 text-cyan-600/25 md:text-cyan-600/50 dark:text-cyan-400/20 md:dark:text-cyan-400/40" strokeWidth={1} />
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
            className="h-10 md:h-14 text-xs md:text-base bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-lg hover:shadow-xl transition-all border border-cyan-500/50"
            data-testid="cta-start-fishing"
          >
            <Play className="w-3.5 h-3.5 md:w-5 md:h-5 mr-1.5 md:mr-2" />
            Začať rybačku
          </Button>
          <Button
            onClick={onAddCatch}
            disabled={!canAddCatch}
            variant="outline"
            size="lg"
            className="h-10 md:h-14 text-xs md:text-base border-2 border-slate-400/80 bg-white/95 hover:bg-white text-slate-700 font-bold shadow-md hover:shadow-lg transition-all dark:border-slate-400 dark:bg-slate-700/90 dark:hover:bg-slate-700 dark:text-white"
            data-testid="cta-add-catch"
          >
            <Plus className="w-3.5 h-3.5 md:w-5 md:h-5 mr-1.5 md:mr-2" />
            Pridať úlovok
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
