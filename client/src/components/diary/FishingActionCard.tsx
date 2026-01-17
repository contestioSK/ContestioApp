import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Plus } from "lucide-react";

interface FishingActionCardProps {
  onStartFishing: () => void;
  onAddCatch: () => void;
  canAddCatch?: boolean;
}

const FishIllustration = () => (
  <svg
    viewBox="0 0 160 110"
    className="w-48 h-32 md:w-64 md:h-44"
    fill="none"
  >
    <defs>
      <linearGradient id="fishBodyLight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0891B2" stopOpacity="0.85" />
        <stop offset="40%" stopColor="#0D9488" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id="fishBodyDark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.6" />
        <stop offset="40%" stopColor="#2DD4BF" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#34D399" stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id="finGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0E7490" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#0D9488" stopOpacity="0.6" />
      </linearGradient>
    </defs>
    
    {/* Main body */}
    <ellipse cx="70" cy="55" rx="55" ry="36" className="fill-[url(#fishBodyLight)] dark:fill-[url(#fishBodyDark)]" />
    
    {/* Tail */}
    <polygon points="120,55 150,25 150,85" className="fill-[url(#fishBodyLight)] dark:fill-[url(#fishBodyDark)]" />
    
    {/* Top fin */}
    <path d="M55 19 Q70 0 90 19 Q75 22 55 19" className="fill-[url(#finGradient)] dark:fill-cyan-400/50" />
    <path d="M50 22 Q60 10 72 22" className="fill-[url(#finGradient)] dark:fill-cyan-400/40" opacity="0.7" />
    
    {/* Bottom fin */}
    <path d="M55 91 Q70 105 85 91 Q70 88 55 91" className="fill-[url(#finGradient)] dark:fill-cyan-400/40" opacity="0.8" />
    
    {/* Side fin */}
    <ellipse cx="50" cy="60" rx="12" ry="6" className="fill-cyan-700/50 dark:fill-cyan-300/40" transform="rotate(-20 50 60)" />
    
    {/* Eye */}
    <circle cx="30" cy="48" r="10" className="fill-slate-800/80 dark:fill-slate-200/70" />
    <circle cx="27" cy="45" r="4" className="fill-white/90 dark:fill-white/80" />
    <circle cx="33" cy="50" r="2" className="fill-white/50 dark:fill-white/40" />
    
    {/* Stripe details */}
    <path d="M40 32 Q75 18 110 35" stroke="#0E7490" strokeWidth="5" fill="none" opacity="0.5" className="dark:stroke-cyan-300/40" />
    <path d="M38 48 Q75 32 112 50" stroke="#0E7490" strokeWidth="4" fill="none" opacity="0.4" className="dark:stroke-cyan-300/35" />
    <path d="M38 62 Q75 46 112 64" stroke="#0E7490" strokeWidth="4" fill="none" opacity="0.3" className="dark:stroke-cyan-300/30" />
    <path d="M40 76 Q75 60 110 78" stroke="#0E7490" strokeWidth="3" fill="none" opacity="0.25" className="dark:stroke-cyan-300/25" />
    
    {/* Gill detail */}
    <path d="M42 38 Q38 55 45 72" stroke="#0E7490" strokeWidth="3" fill="none" opacity="0.5" className="dark:stroke-cyan-300/40" />
  </svg>
);

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
        {/* Large Fish Illustration - hero size, positioned left with bleed */}
        <div className="absolute -left-8 md:-left-6 top-1/2 -translate-y-1/2 pointer-events-none">
          <FishIllustration />
        </div>
        
        {/* Content - shifted right to accommodate fish */}
        <div className="relative z-10 ml-36 md:ml-52 flex flex-col h-full">
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
