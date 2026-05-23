import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Plus, StopCircle, MapPin, Calendar } from "lucide-react";
import waterRaysBg from "@assets/water-rays-bg.png";
import carpImage from "@assets/Gemini_Generated_Image_kur5qpkur5qpkur5-Photoroom_1769878046486.png";
import type { DiaryTrip } from "@shared/schema";

interface FishingActionCardProps {
  onStartFishing: () => void;
  onAddCatch: () => void;
  canAddCatch?: boolean;
  activeTrip?: DiaryTrip;
  plannedTrip?: DiaryTrip;
  onEndTrip?: () => void;
  isEndingTrip?: boolean;
}

function formatTripStart(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === tomorrow.getTime()) return "Začína zajtra";
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays > 1 && diffDays <= 7) return `Začína o ${diffDays} dní`;
  return `Začína ${target.toLocaleDateString("sk-SK", { day: "numeric", month: "short" })}`;
}

export default function FishingActionCard({ 
  onStartFishing, 
  onAddCatch, 
  canAddCatch = true,
  activeTrip,
  plannedTrip,
  onEndTrip,
  isEndingTrip = false,
}: FishingActionCardProps) {
  return (
    <Card className="relative overflow-hidden h-full border border-slate-700 shadow-lg" style={{ backgroundColor: '#0B1C2F' }}>
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url(${waterRaysBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center left',
          transform: 'scaleX(-1)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-l from-[#0B1C2F] via-[#0B1C2F]/80 to-transparent pointer-events-none" />
      
      <CardContent className="relative p-4 md:p-6 flex flex-col h-full min-h-[140px] md:min-h-[200px]">
        <div className="absolute right-4 bottom-4 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:right-0 pointer-events-none md:pr-4">
          <img 
            src={carpImage} 
            alt="Kapor" 
            className="w-28 h-auto md:w-64 opacity-5 grayscale brightness-200"
          />
        </div>
        
        <div className="relative z-10 max-w-lg">
          {activeTrip ? (
            <>
              <div className="inline-flex items-center gap-2 bg-green-500/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-green-400 mb-3 md:mb-4 border border-green-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span>Výprava prebieha</span>
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3 leading-tight">
                {activeTrip.name}
              </h2>
              {activeTrip.location && (
                <p className="text-slate-300 font-medium text-base md:text-lg flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  {activeTrip.location}
                </p>
              )}
            </>
          ) : plannedTrip ? (
            <>
              <div className="inline-flex items-center gap-2 bg-amber-500/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-amber-400 mb-3 md:mb-4 border border-amber-500/30">
                <Calendar size={12} strokeWidth={2} />
                <span>{formatTripStart(new Date(plannedTrip.startDate))}</span>
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3 leading-tight">
                {plannedTrip.name}
              </h2>
              {plannedTrip.location && (
                <p className="text-slate-300 font-medium text-base md:text-lg flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  {plannedTrip.location}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-slate-300 mb-3 md:mb-4 border border-white/10">
                <Plus size={12} />
                <span>Rýchle akcie</span>
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3 leading-tight">
                Čo ideš dnes robiť?
              </h2>
              <p className="text-slate-300 font-medium text-base md:text-lg">
                Začni rybačku alebo si rýchlo zapíš úlovok.
                <span className="hidden md:inline"><br />PriVode sa postará o zvyšok.</span>
              </p>
            </>
          )}
        </div>
        
        <div className="relative z-10 flex flex-wrap gap-3 md:gap-4 mt-6 md:mt-8">
          {activeTrip ? (
            <Button
              onClick={onEndTrip}
              disabled={isEndingTrip}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 md:px-6 py-3 md:py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 h-auto text-sm md:text-base"
              data-testid="cta-end-trip"
            >
              <StopCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" strokeWidth={1.75} />
              <span>{isEndingTrip ? "Ukončujem..." : "Ukončiť výpravu"}</span>
            </Button>
          ) : (
            <Button
              onClick={onStartFishing}
              className="bg-[#28C6CE] hover:bg-[#1DB5BC] text-slate-900 font-bold px-5 md:px-6 py-3 md:py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 h-auto text-sm md:text-base"
              data-testid="cta-start-fishing"
            >
              <Play className="w-4 h-4 md:w-5 md:h-5 mr-2" strokeWidth={1.75} />
              <span>{plannedTrip ? "Začať teraz" : "Začať rybačku"}</span>
            </Button>
          )}
          <Button
            onClick={onAddCatch}
            disabled={!canAddCatch}
            variant="ghost"
            className="group/btn backdrop-blur-md border border-slate-600 bg-slate-800/80 text-white font-medium px-5 md:px-6 py-3 md:py-3.5 rounded-xl hover:bg-slate-700 transition-all h-auto text-sm md:text-base"
            data-testid="cta-add-catch"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" strokeWidth={1.75} />
            <span>Pridať úlovok</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
