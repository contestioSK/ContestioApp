import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Fish, Weight, Ruler, MapPin, Target, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DiaryLayout from "@/components/DiaryLayout";
import type { DiaryCatch } from "@shared/schema";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";

// Function to get fish icon color based on fish type
const getFishIconColor = (fishType?: string) => {
  if (!fishType) return "text-blue-400";
  
  if (fishType.includes("kapor")) return "text-yellow-400";
  if (fishType.includes("stuka")) return "text-green-400";
  if (fishType.includes("sumec")) return "text-purple-400";
  if (fishType.includes("amur")) return "text-emerald-400";
  if (fishType.includes("pstruh")) return "text-pink-400";
  if (fishType.includes("zubac")) return "text-orange-400";
  
  return "text-blue-400"; // default
};

export default function CatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: catch_, isLoading } = useQuery<DiaryCatch>({
    queryKey: [`/api/diary/catches/${id}`],
    enabled: !!id
  });

  if (isLoading) {
    return (
      <DiaryLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </DiaryLayout>
    );
  }

  if (!catch_) {
    return (
      <DiaryLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Úlovok sa nenašiel</p>
              <Button onClick={() => setLocation("/diary")} className="mt-4">
                Späť na denník
              </Button>
            </CardContent>
          </Card>
        </div>
      </DiaryLayout>
    );
  }

  return (
    <DiaryLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/diary")}
          className="mb-4"
          data-testid="button-back-to-diary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Späť
        </Button>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent mb-2 drop-shadow-lg">
            🏆 Môj osobný rekord 🏆
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 rounded-full"></div>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 space-y-6">
            {/* Photo Display */}
            {catch_.photos && catch_.photos.length > 0 && (
              <div className="rounded-lg overflow-hidden bg-muted">
                <img 
                  src={typeof catch_.photos[0] === 'string' ? catch_.photos[0] : catch_.photos[0].url}
                  alt={getFishTypeLabel(catch_.fishType)}
                  className="w-full h-96 object-cover"
                  data-testid="catch-photo"
                />
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center">
                  <Weight className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Váha</div>
                  <div className="font-semibold text-white" data-testid="detail-weight">
                    {catch_.weight ? `${catch_.weight} kg` : 'Neuvedené'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Dĺžka</div>
                  <div className="font-semibold text-white">
                    {catch_.lengthCm ? `${catch_.lengthCm} cm` : 'Neuvedené'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Revír</div>
                  <div className="font-semibold text-white">
                    {catch_.spot || 'Neuvedené'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Nástraha</div>
                  <div className="font-semibold text-white">
                    {catch_.bait || 'Neuvedené'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 md:col-span-2">
                <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Dátum úlovku</div>
                  <div className="font-semibold text-white">
                    {catch_.capturedAt ? format(new Date(catch_.capturedAt), "EEEE, d. MMMM yyyy 'o' HH:mm", { locale: sk }) : 'Neuvedené'}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {catch_.notes && (
              <div>
                <div className="text-sm text-slate-400 mb-2">Poznámky</div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-sm text-white">
                  {catch_.notes}
                </div>
              </div>
            )}

            {/* GPS Coordinates */}
            {(catch_.latitude || catch_.longitude) && (
              <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                <div className="text-sm font-semibold text-slate-300 mb-3">📍 GPS Súradnice</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {catch_.latitude && (
                    <div>
                      <div className="text-slate-400">Zem. šírka</div>
                      <div className="font-medium text-white">{Number(catch_.latitude).toFixed(6)}°</div>
                    </div>
                  )}
                  {catch_.longitude && (
                    <div>
                      <div className="text-slate-400">Zem. dĺžka</div>
                      <div className="font-medium text-white">{Number(catch_.longitude).toFixed(6)}°</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DiaryLayout>
  );
}
