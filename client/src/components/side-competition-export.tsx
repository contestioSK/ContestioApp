import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Trophy, Fish, Crown, Target, Medal } from "lucide-react";
import { getSideCompetitionLabel } from "@/lib/utils";
import html2canvas from "html2canvas";
import type { Competition, Catch, Team } from "@shared/schema";
import { TeamFlag } from "@/components/team-flag";

interface SideCompetitionExportProps {
  competition: Competition;
  sideCompetitionId: string;
  winningCatch: Catch & { team?: Team };
  canExport: boolean;
}

export default function SideCompetitionExport({
  competition,
  sideCompetitionId,
  winningCatch,
  canExport
}: SideCompetitionExportProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  if (!canExport || !winningCatch) {
    return null;
  }

  const handleExport = async () => {
    if (!exportRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      const link = document.createElement('a');
      link.download = `${competition.name}-${getSideCompetitionLabel(sideCompetitionId)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getIcon = () => {
    switch (sideCompetitionId) {
      case 'biggestFish':
      case 'big-fish-overall':
        return <Trophy className="w-8 h-8 text-yellow-400" />;
      case 'biggestScaly':
      case 'biggestMirror':
      case 'big-common-carp':
      case 'big-mirror-carp':
        return <Fish className="w-8 h-8 text-blue-400" />;
      case 'dailyBigFish':
      case 'daily-big-fish':
        return <Crown className="w-8 h-8 text-amber-400" />;
      case 'firstOver20':
      case 'firstOver25':
      case 'firstOver30':
      case 'first-fish-over-15kg':
      case 'first-fish-over-20kg':
      case 'first-fish-over-25kg':
        return <Target className="w-8 h-8 text-green-400" />;
      default:
        return <Medal className="w-8 h-8 text-purple-400" />;
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('sk-SK', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 opacity-60 hover:opacity-100"
          data-testid={`button-export-${sideCompetitionId}`}
        >
          <Share2 className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportovať výsledok</DialogTitle>
        </DialogHeader>
        
        <div 
          ref={exportRef}
          className="rounded-lg overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            padding: '24px'
          }}
        >
          <div className="mb-4">
            {competition.imageUrl ? (
              <img 
                src={competition.imageUrl} 
                alt={competition.name}
                className="h-12 w-auto object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="h-12 w-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white/60" />
              </div>
            )}
          </div>

          <h3 className="text-white font-bold text-lg mb-1">
            {getSideCompetitionLabel(sideCompetitionId)}
          </h3>
          <p className="text-white/60 text-sm mb-4">{competition.name}</p>

          {winningCatch.photoUrl && (
            <div className="rounded-lg overflow-hidden mb-4 aspect-video bg-black/20">
              <img 
                src={winningCatch.photoUrl} 
                alt="Víťazný úlovok"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            </div>
          )}

          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm">Tím</span>
              <span className="text-white font-semibold flex items-center gap-1">
                <TeamFlag country={winningCatch.team?.country} size="xs" />{winningCatch.team?.name || 'Neznámy tím'}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm">Váha</span>
              <span className="text-yellow-400 font-bold text-xl">
                {parseFloat(winningCatch.weight).toFixed(3)} kg
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm">Typ ryby</span>
              <span className="text-white">
                {winningCatch.fishType === 'scaly' ? 'Šupináč' : 
                 winningCatch.fishType === 'mirror' ? 'Lysec' : winningCatch.fishType}
              </span>
            </div>
            {winningCatch.submittedAt && (
              <div className="flex items-center justify-between">
                <span className="text-white/80 text-sm">Dátum</span>
                <span className="text-white/90 text-sm">
                  {formatDate(winningCatch.submittedAt)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-center">
            <span className="text-white/40 text-xs">privode.eu</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="flex-1"
            data-testid="button-download-export"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Generujem...' : 'Stiahnuť obrázok'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
