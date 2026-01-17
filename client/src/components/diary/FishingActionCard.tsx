import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Plus, Fish } from "lucide-react";

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
    <Card className="bg-card border border-slate-200 shadow-sm dark:bg-transparent dark:bg-gradient-to-br dark:from-cyan-600/20 dark:via-teal-600/15 dark:to-emerald-600/20 dark:border-cyan-500/30 overflow-hidden">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
          {/* Fish Icon */}
          <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-xl bg-cyan-100 dark:bg-cyan-500/20">
            <Fish className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
          </div>
          
          {/* Content */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-lg md:text-xl font-bold text-foreground dark:text-white mb-1">
              Čo ideš dnes robiť?
            </h2>
            <p className="text-sm text-muted-foreground dark:text-slate-300">
              Začni rybačku alebo si rýchlo zapíš úlovok.
              <br className="hidden md:block" />
              <span className="hidden md:inline">Contestio sa postará o zvyšok.</span>
            </p>
          </div>
          
          {/* CTA Buttons - Equal weight using grid for guaranteed equal sizing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto md:min-w-[340px]">
            <Button
              onClick={onStartFishing}
              size="lg"
              className="bg-cyan-600 hover:bg-cyan-700 text-white border border-cyan-500/50 shadow-md hover:shadow-lg transition-all w-full"
              data-testid="cta-start-fishing"
            >
              <Play className="w-4 h-4 mr-2" />
              Začať rybačku
            </Button>
            <Button
              onClick={onAddCatch}
              disabled={!canAddCatch}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/50 shadow-md hover:shadow-lg transition-all w-full"
              data-testid="cta-add-catch"
            >
              <Plus className="w-4 h-4 mr-2" />
              Pridať úlovok
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
