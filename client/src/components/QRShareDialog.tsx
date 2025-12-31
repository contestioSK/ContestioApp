import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  X, 
  Trophy, 
  Swords,
  Calendar,
  MapPin,
  Users,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRShareDialogProps {
  type: "competition" | "battle";
  id: string;
  name: string;
  date?: string;
  location?: string;
  participants?: number;
  trigger?: React.ReactNode;
}

export function QRShareDialog({ 
  type, 
  id, 
  name, 
  date,
  location,
  participants,
  trigger 
}: QRShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const endpoint = type === "competition" 
    ? `/api/competitions/${id}/qr/data`
    : `/api/diary/battles/${id}/qr/data`;

  const { data, isLoading, isError } = useQuery<{ qrDataUrl: string; url: string; competitionName?: string; battleName?: string }>({
    queryKey: [endpoint],
    enabled: open,
  });

  const displayName = name || data?.competitionName || data?.battleName || "Zdieľať";
  const shortCode = id.slice(0, 8).toUpperCase();
  const isCompetition = type === "competition";

  const handleCopyLink = async () => {
    if (data?.url) {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      toast({
        title: "✅ Link skopírovaný!",
        description: "Môžeš ho zdieľať s priateľmi.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (data?.qrDataUrl) {
      const link = document.createElement("a");
      link.href = data.qrDataUrl;
      link.download = `qr-${type}-${id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "📥 QR kód stiahnutý!",
        description: "Môžeš ho vytlačiť alebo zdieľať.",
      });
    }
  };

  const handleShare = async () => {
    if (data?.url && navigator.share) {
      try {
        await navigator.share({
          title: displayName,
          text: isCompetition 
            ? `Pridaj sa do súťaže: ${displayName}` 
            : `Pridaj sa do battle: ${displayName}`,
          url: data.url,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid="button-qr-share">
            <QrCode className="h-4 w-4 mr-2" />
            QR kód
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 bg-transparent border-0 shadow-none">
        <div className={`relative w-full bg-slate-900 dark:bg-slate-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          
          {/* Ambient Glow */}
          {isCompetition ? (
            <div className="absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none bg-rose-500/20" />
          ) : (
            <div className="absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none bg-amber-500/20" />
          )}
          
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5 relative z-10">
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              {isCompetition ? (
                <>
                  <Trophy className="w-5 h-5 text-rose-500" />
                  Scan & Register
                </>
              ) : (
                <>
                  <Swords className="w-5 h-5 text-amber-500" />
                  Scan & Fight
                </>
              )}
            </h2>
            <button 
              onClick={() => setOpen(false)} 
              className="p-2 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/5"
              data-testid="button-close-qr-dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col items-center relative z-10">
            
            {/* Ticket Card */}
            <div className="relative w-full bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              
              {/* Top Gradient Stripe */}
              {isCompetition ? (
                <div className="h-2 w-full bg-gradient-to-r from-rose-500 via-red-500 to-rose-600" />
              ) : (
                <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
              )}
              
              <div className="p-5 text-center">
                {/* QR Code Container */}
                <div className="relative w-44 h-44 mx-auto mb-5 bg-white rounded-xl border-2 border-dashed border-slate-600 p-2 flex items-center justify-center">
                  {isLoading ? (
                    <Skeleton className="w-full h-full rounded-lg" />
                  ) : isError ? (
                    <div className="text-slate-500 text-sm text-center px-2">
                      Chyba pri načítaní
                    </div>
                  ) : data?.qrDataUrl ? (
                    <img 
                      src={data.qrDataUrl} 
                      alt="QR kód" 
                      className="w-full h-full object-contain rounded-lg"
                      data-testid="img-qr-code"
                    />
                  ) : (
                    <QrCode className="w-16 h-16 text-slate-600" />
                  )}
                  
                  {/* Floating Label Badge */}
                  {isCompetition ? (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-950 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-rose-500 text-rose-500 shadow-lg whitespace-nowrap">
                      Registrácia
                    </div>
                  ) : (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-950 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-amber-500 text-amber-500 shadow-lg whitespace-nowrap">
                      Pripojiť sa
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-3 leading-tight px-2 line-clamp-2">
                  {displayName}
                </h3>
                
                {/* Metadata */}
                <div className="space-y-1.5 mb-5 flex flex-col items-center">
                  {isCompetition ? (
                    <>
                      {date && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" /> {date}
                        </div>
                      )}
                      {location && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" /> {location}
                        </div>
                      )}
                      {!date && !location && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                          <Trophy className="w-3.5 h-3.5 text-rose-500" /> Turnajová registrácia
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {participants !== undefined && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                          <Users className="w-3.5 h-3.5 text-amber-500" /> {participants} rybárov v battle
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                        <Zap className="w-3.5 h-3.5 text-yellow-500" /> Okamžité pripojenie
                      </div>
                    </>
                  )}
                </div>

                {/* Code Box */}
                <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5 flex items-center justify-between gap-3">
                  <div className="text-left overflow-hidden">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                      {isCompetition ? "ID Súťaže" : "Battle Kód"}
                    </div>
                    {isCompetition ? (
                      <div className="text-base font-mono font-bold tracking-widest truncate text-rose-500">
                        {shortCode}
                      </div>
                    ) : (
                      <div className="text-base font-mono font-bold tracking-widest truncate text-amber-500">
                        {shortCode}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={handleCopyLink}
                    disabled={!data?.url}
                    className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-slate-300 transition-colors shrink-0"
                    data-testid="button-copy-code"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Ticket Notch Cutouts */}
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-900 dark:bg-slate-950 rounded-full" />
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-900 dark:bg-slate-950 rounded-full" />
            </div>

            {/* Helper Text */}
            <p className="mt-5 text-xs text-slate-500 text-center max-w-xs leading-relaxed">
              {isCompetition 
                ? "Naskenovaním kódu sa otvorí registračný formulár pre túto súťaž."
                : "Kamoši sa naskenovaním kódu okamžite pripoja do tvojho Battle."
              }
            </p>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-white/5 bg-slate-900/50 dark:bg-slate-950/50 flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
              onClick={handleDownload}
              disabled={!data?.qrDataUrl || isLoading}
              data-testid="button-download-qr"
            >
              <Download className="w-4 h-4 mr-2" />
              {isCompetition ? "Plagát" : "Stiahnuť"}
            </Button>
            {isCompetition ? (
              <Button 
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white"
                onClick={handleShare}
                disabled={!data?.url || isLoading}
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Zdieľať
              </Button>
            ) : (
              <Button 
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleShare}
                disabled={!data?.url || isLoading}
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Zdieľať
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
