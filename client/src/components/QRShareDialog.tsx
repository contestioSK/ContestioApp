import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, Download, Copy, Check, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRShareDialogProps {
  type: "competition" | "battle";
  id: string;
  name: string;
  trigger?: React.ReactNode;
}

export function QRShareDialog({ type, id, name, trigger }: QRShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const endpoint = type === "competition" 
    ? `/api/competitions/${id}/qr/data`
    : `/api/diary/battles/${id}/qr/data`;

  const { data, isLoading } = useQuery<{ qrDataUrl: string; url: string }>({
    queryKey: [endpoint],
    enabled: open,
  });

  const handleCopyLink = async () => {
    if (data?.url) {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      toast({
        title: "Link skopírovaný!",
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
        title: "QR kód stiahnutý!",
        description: "Môžeš ho vytlačiť alebo zdieľať.",
      });
    }
  };

  const handleShare = async () => {
    if (data?.url && navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: type === "competition" 
            ? `Pridaj sa do súťaže: ${name}` 
            : `Pridaj sa do battle: ${name}`,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Zdieľať cez QR kód
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            {isLoading ? (
              <Skeleton className="w-48 h-48" />
            ) : data?.qrDataUrl ? (
              <img 
                src={data.qrDataUrl} 
                alt="QR kód" 
                className="w-48 h-48"
                data-testid="img-qr-code"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-muted-foreground">
                Chyba pri načítaní
              </div>
            )}
          </div>
          
          <p className="text-sm text-center text-muted-foreground max-w-xs">
            {type === "competition" 
              ? "Naskenuj QR kód a prihlás sa do súťaže"
              : "Naskenuj QR kód a pridaj sa do battle"
            }
          </p>
          
          <div className="flex flex-wrap gap-2 justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyLink}
              disabled={!data?.url}
              data-testid="button-copy-link"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Kopírovať link
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              disabled={!data?.qrDataUrl}
              data-testid="button-download-qr"
            >
              <Download className="h-4 w-4 mr-2" />
              Stiahnuť
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleShare}
              disabled={!data?.url}
              data-testid="button-share"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Zdieľať
            </Button>
          </div>
          
          {data?.url && (
            <div className="w-full p-2 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground text-center break-all">
                {data.url}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
