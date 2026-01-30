import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Fish, 
  Edit2, 
  Trash2, 
  Target,
  Maximize2
} from "lucide-react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { DiaryCatch } from "@shared/schema";
import { SimplePhotoSlider } from "@/components/diary/SimplePhotoSlider";

export interface CatchDetailSheetProps {
  catchData: DiaryCatch | null;
  onClose: () => void;
  onEdit?: (catch_: DiaryCatch) => void;
  onDelete?: (catch_: DiaryCatch) => void;
  onOpenFullPage: (catchId: string) => void;
  onOpenLightbox: (photos: string[], index: number) => void;
}

export function CatchDetailSheet({
  catchData,
  onClose,
  onEdit,
  onDelete,
  onOpenFullPage,
  onOpenLightbox,
}: CatchDetailSheetProps) {
  if (!catchData) return null;

  const handlePhotoClick = (photo: any, index: number) => {
    const photoUrls = (catchData.photos || []).map((p: any) => 
      typeof p === 'string' ? p : (p.variants?.find((v: any) => v.width === 800 && v.format === 'webp')?.url || p.url || p.originalUrl || '')
    );
    onOpenLightbox(photoUrls, index);
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md p-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto" data-testid="catch-detail-panel">
        <div className="flex flex-col min-h-full pt-6">
          {/* Hero Photo Section */}
          <div className="relative h-64 bg-slate-900 rounded-t-lg overflow-hidden">
            {catchData.photos && catchData.photos.length > 0 ? (
              <SimplePhotoSlider 
                photos={catchData.photos} 
                onPhotoClick={handlePhotoClick}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center">
                <Fish className="h-20 w-20 text-slate-700" strokeWidth={1} />
              </div>
            )}
          </div>

          {/* Content Body */}
          <div className="flex-1 p-5 space-y-5">
            {/* Weight & Length - Editorial Numbers */}
            <div className="flex items-end gap-6 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Váha</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black font-mono text-[#F97316]" data-testid="detail-weight">
                    {catchData.weight || '—'}
                  </span>
                  {catchData.weight && <span className="text-sm text-muted-foreground">kg</span>}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Dĺžka</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-foreground">
                    {catchData.lengthCm || '—'}
                  </span>
                  {catchData.lengthCm && <span className="text-sm text-muted-foreground">cm</span>}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="space-y-3">
              {/* Spot */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <MapPin size={14} strokeWidth={1.75} />
                  <span>Revír</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground text-sm">
                    {(catchData as any).spotName || (catchData as any).tripLocation || catchData.spot || 'Neuvedené'}
                  </p>
                  {catchData.spot && (catchData as any).spotName && (
                    <p className="text-xs text-muted-foreground">{catchData.spot}</p>
                  )}
                </div>
              </div>

              {/* Bait */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Target size={14} strokeWidth={1.75} />
                  <span>Nástraha</span>
                </div>
                <p className="font-semibold text-foreground text-sm">
                  {catchData.bait || 'Neuvedené'}
                </p>
              </div>

              {/* Date */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <CalendarIcon size={14} strokeWidth={1.75} />
                  <span>Dátum</span>
                </div>
                <p className="font-semibold text-foreground text-sm">
                  {catchData.capturedAt 
                    ? format(new Date(catchData.capturedAt), "EEEE, d. MMM", { locale: sk })
                    : 'Neuvedené'
                  }
                </p>
              </div>
            </div>

            {/* Notes */}
            {catchData.notes && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">Poznámky</p>
                <p className="text-sm text-foreground leading-relaxed font-serif">
                  {catchData.notes}
                </p>
              </div>
            )}

            {/* Weather Conditions - Collapsible Style */}
            {((catchData.waterTemp !== null && catchData.waterTemp !== undefined) || 
              (catchData.airTemp !== null && catchData.airTemp !== undefined) || 
              (catchData.windSpeed !== null && catchData.windSpeed !== undefined) || 
              (catchData.airPressure !== null && catchData.airPressure !== undefined)) && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">Podmienky</p>
                <div className="grid grid-cols-2 gap-3">
                  {(catchData.waterTemp !== null && catchData.waterTemp !== undefined) && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Voda</p>
                      <p className="font-mono font-medium text-[#F97316]" data-testid="detail-water-temp">{catchData.waterTemp}°C</p>
                    </div>
                  )}
                  {(catchData.airTemp !== null && catchData.airTemp !== undefined) && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Vzduch</p>
                      <p className="font-mono font-medium text-[#F97316]" data-testid="detail-air-temp">{catchData.airTemp}°C</p>
                    </div>
                  )}
                  {(catchData.windSpeed !== null && catchData.windSpeed !== undefined) && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Vietor</p>
                      <p className="font-mono font-medium text-foreground" data-testid="detail-wind-speed">{catchData.windSpeed} km/h</p>
                    </div>
                  )}
                  {(catchData.airPressure !== null && catchData.airPressure !== undefined) && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Tlak</p>
                      <p className="font-mono font-medium text-foreground" data-testid="detail-air-pressure">{catchData.airPressure} hPa</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GPS Coordinates */}
            {(catchData.latitude || catchData.longitude) && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">GPS Súradnice</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {catchData.latitude && (
                    <div>
                      <p className="text-xs text-muted-foreground">Šírka</p>
                      <p className="font-mono font-medium text-[#F97316]">{Number(catchData.latitude).toFixed(5)}°</p>
                    </div>
                  )}
                  {catchData.longitude && (
                    <div>
                      <p className="text-xs text-muted-foreground">Dĺžka</p>
                      <p className="font-mono font-medium text-[#F97316]">{Number(catchData.longitude).toFixed(5)}°</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-5 mt-auto space-y-3">
              <Button 
                variant="outline"
                className="w-full h-11 border-slate-200 dark:border-slate-700"
                onClick={() => onOpenFullPage(catchData.id)}
                data-testid="button-view-full-page"
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Zobraziť celú stránku
              </Button>
              {onEdit && (
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
                  onClick={() => onEdit(catchData)}
                  data-testid="button-edit-catch"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Upraviť
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="outline"
                  className="w-full border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 h-11"
                  onClick={() => onDelete(catchData)}
                  data-testid="button-delete-catch"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Zmazať
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
