import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useState, useEffect } from "react";
import { PhotoLightbox } from "@/components/diary/PhotoLightbox";
import { 
  ChevronLeft, ChevronDown, ChevronUp, X, 
  MapPin, Calendar, Thermometer, Wind, Droplets, Gauge,
  Target, Ruler, Share2, Copy, Check, Lock, Settings2,
  MoreVertical, Fish
} from "lucide-react";
import { SiFacebook } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { DiaryCatch } from "@shared/schema";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";

// --- HELPER: SimpleRow for data display ---
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

// --- HELPER: Get photo URL from photo object or string ---
function getPhotoUrl(photo: string | { url?: string; id?: string } | undefined): string | null {
  if (!photo) return null;
  if (typeof photo === 'string') return photo;
  return photo.url || null;
}

export default function CatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // UI State
  const [activeImage, setActiveImage] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [lightboxState, setLightboxState] = useState<{ photos: string[], currentIndex: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Privacy settings
  const defaultPrivacy = { hideGps: true, hideBait: true, hideSpot: false };
  const userPrivacy = user?.preferences?.privacySettings || defaultPrivacy;
  const [shareOverrides, setShareOverrides] = useState({
    hideGps: true,
    hideBait: true,
    hideSpot: false,
  });
  
  // Sync shareOverrides when user preferences load
  useEffect(() => {
    const privacy = user?.preferences?.privacySettings;
    setShareOverrides({
      hideGps: privacy?.hideGps ?? true,
      hideBait: privacy?.hideBait ?? true,
      hideSpot: privacy?.hideSpot ?? false,
    });
  }, [user?.preferences?.privacySettings]);

  // State for public share link
  const [publicShareUrl, setPublicShareUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Generate public share link
  const generateShareLink = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/diary/catches/${id}/share`, shareOverrides);
      return res.json();
    },
    onSuccess: (data) => {
      setPublicShareUrl(data.fullUrl);
    },
    onError: (error) => {
      console.error("Error generating share link:", error);
      toast({ title: "Chyba", description: "Nepodarilo sa vytvoriť link na zdieľanie", variant: "destructive" });
    }
  });

  // Generate link when sharing
  const handleShare = async () => {
    setIsGeneratingLink(true);
    try {
      const data = await generateShareLink.mutateAsync();
      return data.fullUrl as string;
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Fetch catch data
  const { data: catch_, isLoading } = useQuery<DiaryCatch>({
    queryKey: ['/api/diary/catches', id],
    enabled: !!id
  });

  // Get photos array
  const photos = catch_?.photos || [];
  const photoUrls = photos.map(p => getPhotoUrl(p)).filter(Boolean) as string[];

  // Image navigation
  const nextImage = () => {
    if (photoUrls.length > 1) {
      setActiveImage((prev) => (prev + 1) % photoUrls.length);
    }
  };
  
  const prevImage = () => {
    if (photoUrls.length > 1) {
      setActiveImage((prev) => (prev - 1 + photoUrls.length) % photoUrls.length);
    }
  };


  // Build share text based on privacy settings
  const buildShareText = (overrides: typeof shareOverrides, catchData: DiaryCatch) => {
    let text = `🎣 ${getFishTypeLabel(catchData.fishType)}`;
    
    if (catchData.weight) text += ` - ${catchData.weight} kg`;
    if (catchData.lengthCm) text += ` / ${catchData.lengthCm} cm`;
    if (!overrides.hideSpot && catchData.spot) text += `\n📍 ${catchData.spot}`;
    if (!overrides.hideGps && catchData.latitude && catchData.longitude) {
      text += `\n🗺️ GPS: ${Number(catchData.latitude).toFixed(5)}, ${Number(catchData.longitude).toFixed(5)}`;
    }
    if (!overrides.hideBait && catchData.bait) text += `\n🎯 Návnada: ${catchData.bait}`;
    
    text += `\n\nZdieľané cez PriVode`;
    return text;
  };

  // Loading state
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

  // Not found state
  if (!catch_) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Fish className="h-16 w-16 mx-auto text-muted-foreground" strokeWidth={1.25} />
          <h2 className="text-xl font-bold text-foreground">Úlovok sa nenašiel</h2>
          <p className="text-muted-foreground">Tento úlovok neexistuje alebo bol odstránený.</p>
          <Button onClick={() => setLocation("/diary")} className="mt-4">
            Späť na denník
          </Button>
        </div>
      </div>
    );
  }

  const hasWeatherData = catch_.airTemp || catch_.waterTemp || catch_.windSpeed || catch_.airPressure;
  const hasGpsData = catch_.latitude || catch_.longitude;
  const hasTechnicalData = hasWeatherData || hasGpsData || catch_.bait;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pb-20 font-sans text-foreground selection:bg-slate-200 dark:selection:bg-slate-700">

      {/* --- HERO SECTION --- */}
      <div
        className="relative h-[500px] md:h-[650px] bg-slate-900 group cursor-zoom-in"
        onClick={() => photoUrls.length > 0 && setLightboxState({ photos: photoUrls, currentIndex: activeImage })}
      >
        {/* Back Button - Glassmorphism */}
        <div className="fixed top-6 left-4 z-50" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => setLocation("/diary/catches")}
            className="bg-black/20 hover:bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-lg h-12 w-12 flex items-center justify-center rounded-full transition-all"
            data-testid="button-back-to-diary"
          >
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
        </div>

        {/* More Menu - Glassmorphism */}
        <div className="fixed top-6 right-4 z-50" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="bg-black/20 hover:bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-lg h-12 w-12 flex items-center justify-center rounded-full transition-all">
                <MoreVertical size={24} strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                Zdieľať
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Image Slider */}
        <div className="absolute inset-0">
          {photoUrls.length > 0 ? (
            photoUrls.map((url, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  idx === activeImage ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img 
                  src={url} 
                  alt={getFishTypeLabel(catch_.fishType)} 
                  className="w-full h-full object-cover"
                  data-testid="catch-photo"
                />
                <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
              </div>
            ))
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-950 flex items-center justify-center">
              <Fish className="h-32 w-32 text-slate-700" strokeWidth={1} />
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        {photoUrls.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white z-20 transition-opacity hover:opacity-80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            >
              <ChevronLeft size={28} strokeWidth={2.5} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white z-20 transition-opacity hover:opacity-80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            >
              <ChevronLeft size={28} strokeWidth={2.5} className="rotate-180" />
            </button>
            <div className="absolute bottom-32 md:bottom-40 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-white text-xs font-medium z-20">
              {activeImage + 1} / {photoUrls.length}
            </div>
          </>
        )}

        {/* Hero Content */}
        <div 
          className="absolute bottom-0 left-0 right-0 px-6 pt-8 pb-20 md:px-10 md:pt-12 md:pb-28 cursor-default" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-3xl mx-auto">
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-white/60 text-sm font-medium tracking-wide mb-4">
              <span className="flex items-center gap-2">
                <Calendar size={14} className="opacity-70" strokeWidth={1.75} />
                {catch_.capturedAt 
                  ? format(new Date(catch_.capturedAt), "d. MMMM yyyy", { locale: sk })
                  : 'Dátum neuvedený'
                }
              </span>
              {catch_.spot && (
                <>
                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                  <span className="flex items-center gap-2">
                    <MapPin size={14} className="opacity-70" strokeWidth={1.75} />
                    {catch_.spot}
                  </span>
                </>
              )}
            </div>

            {/* Fish Species - Editorial Typography */}
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[0.95] mb-3 drop-shadow-lg">
              {getFishTypeLabel(catch_.fishType)}
            </h1>

            {/* Nickname if exists */}
            {catch_.nickname && (
              <p className="text-xl md:text-2xl text-blue-200 font-serif italic opacity-90 mb-4">
                "{catch_.nickname}"
              </p>
            )}

            {/* Weight and Length */}
            <div className="flex flex-wrap items-end gap-6 md:gap-10 mt-4">
              {catch_.weight && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl md:text-7xl font-black text-white tracking-tighter font-mono">
                    {catch_.weight}
                  </span>
                  <span className="text-lg md:text-xl font-medium text-white/50 mb-2">kg</span>
                </div>
              )}
              
              {catch_.lengthCm && (
                <div className="flex flex-col items-start pb-2 opacity-80">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-0.5">Dĺžka</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl md:text-3xl font-bold text-white font-mono">{catch_.lengthCm}</span>
                    <span className="text-sm font-medium text-white/60">cm</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTENT BODY --- */}
      <div className="max-w-2xl mx-auto px-6 md:px-0 -mt-6 relative z-30">
        <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 md:p-10 shadow-[0_-20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-20px_40px_rgba(0,0,0,0.3)]">
          
          {/* Story/Notes Section with Expand */}
          {catch_.notes ? (
            <>
              <div className={`relative transition-all duration-700 ease-in-out overflow-hidden ${
                storyExpanded ? 'max-h-[2000px]' : 'max-h-[140px]'
              }`}>
                <p className="text-lg md:text-xl text-foreground leading-relaxed font-serif">
                  {catch_.notes}
                </p>
                {!storyExpanded && catch_.notes.length > 200 && (
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-slate-900 via-white/90 dark:via-slate-900/90 to-transparent" />
                )}
              </div>

              {catch_.notes.length > 200 && (
                <div className="flex justify-center mt-3">
                  <button
                    onClick={() => setStoryExpanded(!storyExpanded)}
                    className="group flex flex-col items-center gap-1 p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {storyExpanded ? "Skryť príbeh" : "Čítať celý príbeh"}
                    </span>
                    {storyExpanded ? (
                      <ChevronUp size={16} className="animate-bounce" />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground italic text-center py-4">
              Žiadne poznámky k tomuto úlovku
            </p>
          )}
        </div>

        {/* Technical Details Section */}
        {hasTechnicalData && (
          <div className="bg-white dark:bg-slate-900 px-6 md:px-10 pb-8">
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full flex items-center justify-between group py-2"
              >
                <div className="text-left">
                  <h3 className="text-lg font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Technické údaje
                  </h3>
                  <p className="text-sm text-muted-foreground">Počasie, výbava a podmienky</p>
                </div>
                <ChevronDown 
                  size={20} 
                  className={`text-muted-foreground transition-transform duration-300 ${detailsOpen ? 'rotate-180' : ''}`} 
                />
              </button>

              <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                detailsOpen ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'
              }`}>
                <div className="overflow-hidden space-y-6">
                  
                  {/* Bait/Equipment */}
                  {catch_.bait && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Target size={14} strokeWidth={1.75} /> Výbava
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                        <SimpleRow icon={Target} label="Nástraha" value={catch_.bait} />
                      </div>
                    </div>
                  )}

                  {/* Weather Conditions */}
                  {hasWeatherData && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Thermometer size={14} strokeWidth={1.75} /> Podmienky
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 space-y-0">
                        <SimpleRow 
                          icon={Thermometer} 
                          label="Teplota vzduchu" 
                          value={catch_.airTemp ? `${Number(catch_.airTemp).toFixed(1)}°C` : null}
                          valueColor="font-mono text-[#F97316]"
                        />
                        <SimpleRow 
                          icon={Droplets} 
                          label="Teplota vody" 
                          value={catch_.waterTemp ? `${Number(catch_.waterTemp).toFixed(1)}°C` : null}
                          valueColor="font-mono text-[#F97316]"
                        />
                        <SimpleRow 
                          icon={Wind} 
                          label="Rýchlosť vetra" 
                          value={catch_.windSpeed ? `${Number(catch_.windSpeed).toFixed(1)} km/h` : null}
                          valueColor="font-mono text-[#F97316]"
                        />
                        <SimpleRow 
                          icon={Gauge} 
                          label="Tlak vzduchu" 
                          value={catch_.airPressure ? `${Number(catch_.airPressure).toFixed(0)} hPa` : null}
                          valueColor="font-mono text-[#F97316]"
                        />
                      </div>
                    </div>
                  )}

                  {/* GPS Location */}
                  {hasGpsData && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <MapPin size={14} strokeWidth={1.75} /> Lokalita
                      </div>
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Share Section */}
        <div className="bg-white dark:bg-slate-900 px-6 md:px-10 pb-10 rounded-b-3xl">
          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            {/* Privacy indicator */}
            <div className="text-center mb-4">
              <button
                onClick={() => setShowShareDialog(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-privacy-settings"
              >
                <Lock className="w-3 h-3" />
                <span>
                  {(() => {
                    const hiddenItems = [];
                    if (shareOverrides.hideGps) hiddenItems.push("GPS");
                    if (shareOverrides.hideBait) hiddenItems.push("návnada");
                    if (shareOverrides.hideSpot) hiddenItems.push("revír");
                    
                    if (hiddenItems.length === 0) return "Všetko viditeľné";
                    if (hiddenItems.length === 3) return "Všetko skryté";
                    return `${hiddenItems.join(", ")} skryté`;
                  })()}
                </span>
                <Settings2 className="w-3 h-3" />
              </button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Native Share (Mobile) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={isGeneratingLink}
                  onClick={async () => {
                    try {
                      const shareUrl = await handleShare();
                      const shareText = buildShareText(shareOverrides, catch_);
                      await navigator.share({
                        title: `Môj úlovok: ${getFishTypeLabel(catch_.fishType)}`,
                        text: shareText,
                        url: shareUrl,
                      });
                      toast({ title: "Zdieľané!", description: "Úlovok bol úspešne zdieľaný." });
                    } catch (err) {
                      if ((err as Error).name !== 'AbortError') {
                        console.error('Error sharing:', err);
                      }
                    }
                  }}
                  data-testid="button-share-native"
                >
                  <Share2 className="w-4 h-4" />
                  {isGeneratingLink ? "Generujem..." : "Zdieľať"}
                </Button>
              )}

              {/* Share to Facebook */}
              <Button
                variant="outline"
                className="gap-2"
                disabled={isGeneratingLink}
                onClick={async () => {
                  try {
                    const shareUrl = await handleShare();
                    const url = encodeURIComponent(shareUrl);
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
                  } catch (err) {
                    console.error('Error sharing to Facebook:', err);
                  }
                }}
                data-testid="button-share-facebook"
              >
                <SiFacebook className="w-4 h-4 text-[#1877F2]" />
                Facebook
              </Button>

              {/* Copy Link */}
              <Button
                variant="outline"
                className="gap-2"
                disabled={isGeneratingLink}
                onClick={async () => {
                  try {
                    const shareUrl = await handleShare();
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    toast({ title: "Odkaz skopírovaný!", description: "Verejný odkaz na úlovok bol skopírovaný do schránky." });
                    setTimeout(() => setCopied(false), 2000);
                  } catch (err) {
                    console.error('Error copying:', err);
                  }
                }}
                data-testid="button-copy-link"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "Skopírované!" : "Kopírovať odkaz"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {lightboxState && (
        <PhotoLightbox
          photos={lightboxState.photos}
          currentIndex={lightboxState.currentIndex}
          onClose={() => setLightboxState(null)}
          onNavigate={(newIndex) => {
            setLightboxState(prev => prev ? { ...prev, currentIndex: newIndex } : null);
            setActiveImage(newIndex);
          }}
        />
      )}

      {/* --- SHARE PRIVACY DIALOG --- */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Súkromie pri zdieľaní
            </DialogTitle>
            <DialogDescription>
              Uprav čo sa zobrazí pri zdieľaní tohto úlovku. Tieto nastavenia platia len pre toto jedno zdieľanie.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Skryť GPS polohu</div>
                <div className="text-xs text-muted-foreground">Presné súradnice nebudú viditeľné</div>
              </div>
              <Switch
                checked={shareOverrides.hideGps}
                onCheckedChange={(checked) => setShareOverrides(prev => ({ ...prev, hideGps: checked }))}
                data-testid="switch-override-gps"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Skryť návnadu</div>
                <div className="text-xs text-muted-foreground">Použitá návnada nebude viditeľná</div>
              </div>
              <Switch
                checked={shareOverrides.hideBait}
                onCheckedChange={(checked) => setShareOverrides(prev => ({ ...prev, hideBait: checked }))}
                data-testid="switch-override-bait"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Skryť revír</div>
                <div className="text-xs text-muted-foreground">Názov revíru nebude viditeľný</div>
              </div>
              <Switch
                checked={shareOverrides.hideSpot}
                onCheckedChange={(checked) => setShareOverrides(prev => ({ ...prev, hideSpot: checked }))}
                data-testid="switch-override-spot"
              />
            </div>
            
            {/* Preview */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-2">Náhľad zdieľaného textu:</div>
              <div className="text-sm whitespace-pre-wrap">{buildShareText(shareOverrides, catch_)}</div>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShareOverrides({
                  hideGps: userPrivacy.hideGps ?? true,
                  hideBait: userPrivacy.hideBait ?? true,
                  hideSpot: userPrivacy.hideSpot ?? false,
                });
              }}
            >
              Obnoviť predvolené
            </Button>
            <Button onClick={() => setShowShareDialog(false)}>Hotovo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
