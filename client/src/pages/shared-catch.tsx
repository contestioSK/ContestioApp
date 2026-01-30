import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useState } from "react";
import { 
  ChevronLeft, ChevronRight, X,
  MapPin, Calendar, Thermometer, Wind, Droplets, Gauge,
  Target, Ruler, Fish, Image
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { DiaryCatch } from "@shared/schema";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";

function SimpleRow({ 
  icon: Icon, 
  label, 
  value, 
  detail,
  valueColor = "text-foreground"
}: { 
  icon?: React.ElementType; 
  label: string; 
  value: string | number | null | undefined; 
  detail?: string;
  valueColor?: string;
}) {
  if (!value && value !== 0) return null;
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-3 text-muted-foreground text-sm font-medium">
        {Icon && <Icon size={16} strokeWidth={1.75} className="text-slate-400 dark:text-slate-500" />}
        {label}
      </div>
      <div className="text-right">
        <div className={`font-semibold ${valueColor}`}>{value}</div>
        {detail && <div className="text-xs text-muted-foreground font-medium">{detail}</div>}
      </div>
    </div>
  );
}

function getPhotoUrl(photo: string | { url?: string; id?: string } | undefined): string | null {
  if (!photo) return null;
  if (typeof photo === 'string') return photo;
  return photo.url || null;
}

export default function SharedCatch() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [activeImage, setActiveImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const { data: catch_, isLoading, error } = useQuery<DiaryCatch>({
    queryKey: [`/api/public/catches/${shareToken}`],
    enabled: !!shareToken,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !catch_) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Fish className="h-16 w-16 mx-auto text-slate-500" strokeWidth={1.25} />
          <h2 className="text-xl font-bold text-white">Zdieľaný úlovok sa nenašiel</h2>
          <p className="text-slate-400">Tento link mohol expirovať alebo bol odstránený.</p>
          <Button 
            onClick={() => window.location.href = '/'}
            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
          >
            Prejsť na Contestio
          </Button>
        </div>
      </div>
    );
  }

  const photoUrls = catch_.photos
    ? (catch_.photos as any[])
        .map(p => getPhotoUrl(p))
        .filter((url): url is string => url !== null)
    : [];

  const hasWeatherData = catch_.airTemp || catch_.waterTemp || catch_.windSpeed || catch_.airPressure;
  const hasGpsData = catch_.latitude || catch_.longitude;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header with photo */}
      <div className="relative">
        {/* Photo Section */}
        <div className="relative aspect-[4/3] bg-slate-900">
          {photoUrls.length > 0 ? (
            <>
              <img
                src={photoUrls[activeImage]}
                alt={getFishTypeLabel(catch_.fishType)}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setIsLightboxOpen(true)}
              />
              
              {/* Photo navigation */}
              {photoUrls.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImage((prev) => (prev === 0 ? photoUrls.length - 1 : prev - 1));
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-md z-20 transition-colors"
                  >
                    <ChevronLeft size={24} strokeWidth={2} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImage((prev) => (prev === photoUrls.length - 1 ? 0 : prev + 1));
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-md z-20 transition-colors"
                  >
                    <ChevronRight size={24} strokeWidth={2} />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-white text-xs font-medium z-20">
                    {activeImage + 1} / {photoUrls.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="w-24 h-24 text-slate-700" strokeWidth={1} />
            </div>
          )}
        </div>

        {/* Contestio branding */}
        <div className="absolute top-4 left-4 z-30">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full text-white text-sm font-bold hover:bg-black/50 transition-colors"
          >
            <Fish size={16} className="text-orange-500" />
            Contestio
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl -mt-6 relative z-10 pb-20">
        <div className="px-6 py-8 max-w-2xl mx-auto">
          {/* Fish name and date */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black italic text-foreground mb-2">
              {getFishTypeLabel(catch_.fishType)}
            </h1>
            <p className="text-muted-foreground text-sm">
              {format(new Date(catch_.capturedAt), "d. MMMM yyyy 'o' HH:mm", { locale: sk })}
            </p>
          </div>

          {/* Weight & Length - Hero numbers */}
          <div className="flex justify-center gap-12 mb-8">
            {catch_.weight && (
              <div className="text-center">
                <div className="text-4xl font-mono font-medium text-[#F97316]">
                  {Number(catch_.weight).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">kg</div>
              </div>
            )}
            {catch_.lengthCm && (
              <div className="text-center">
                <div className="text-4xl font-mono font-medium text-[#F97316]">
                  {catch_.lengthCm}
                </div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">cm</div>
              </div>
            )}
          </div>

          {/* Details Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-4">
            {/* Spot */}
            {catch_.spot && (
              <SimpleRow 
                icon={MapPin} 
                label="Revír" 
                value={catch_.spot}
              />
            )}
            
            {/* Bait */}
            {catch_.bait && (
              <SimpleRow 
                icon={Target} 
                label="Návnada" 
                value={catch_.bait}
              />
            )}

          </div>

          {/* Weather Section */}
          {hasWeatherData && (
            <div className="mt-8">
              <h3 className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Thermometer size={14} strokeWidth={1.75} /> Počasie
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {catch_.airTemp && (
                  <div className="bg-orange-500/10 rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">Teplota vzduchu</div>
                    <div className="text-xl font-mono font-medium text-[#F97316]">{Number(catch_.airTemp).toFixed(1)}°C</div>
                  </div>
                )}
                {catch_.waterTemp && (
                  <div className="bg-blue-500/10 rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">Teplota vody</div>
                    <div className="text-xl font-mono font-medium text-blue-500">{Number(catch_.waterTemp).toFixed(1)}°C</div>
                  </div>
                )}
                {catch_.windSpeed && (
                  <div className="bg-slate-500/10 rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">Rýchlosť vetra</div>
                    <div className="text-xl font-mono font-medium text-slate-500">{Number(catch_.windSpeed).toFixed(1)} km/h</div>
                  </div>
                )}
                {catch_.airPressure && (
                  <div className="bg-purple-500/10 rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">Tlak vzduchu</div>
                    <div className="text-xl font-mono font-medium text-purple-500">{Number(catch_.airPressure).toFixed(0)} hPa</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GPS Section */}
          {hasGpsData && (
            <div className="mt-8">
              <h3 className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <MapPin size={14} strokeWidth={1.75} /> GPS Súradnice
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  {catch_.latitude && (
                    <div>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Zem. šírka</div>
                      <div className="font-mono font-medium text-[#F97316]">{Number(catch_.latitude).toFixed(6)}°</div>
                    </div>
                  )}
                  {catch_.longitude && (
                    <div>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Zem. dĺžka</div>
                      <div className="font-mono font-medium text-[#F97316]">{Number(catch_.longitude).toFixed(6)}°</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {catch_.notes && (
            <div className="mt-8">
              <h3 className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Príbeh
              </h3>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{catch_.notes}</p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              Zdieľané cez Contestio - rybársky denník
            </p>
            <a 
              href="/" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
            >
              <Fish size={18} />
              Vyskúšať Contestio
            </a>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {isLightboxOpen && photoUrls.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md z-50 transition-colors"
          >
            <X size={24} strokeWidth={2} />
          </button>
          
          <img
            src={photoUrls[activeImage]}
            alt={getFishTypeLabel(catch_.fishType)}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          {photoUrls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImage((prev) => (prev === 0 ? photoUrls.length - 1 : prev - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md z-50 transition-colors"
              >
                <ChevronLeft size={28} strokeWidth={2} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImage((prev) => (prev === photoUrls.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md z-50 transition-colors"
              >
                <ChevronRight size={28} strokeWidth={2} />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white text-sm font-medium">
                {activeImage + 1} / {photoUrls.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
