import { useState, useRef, memo } from "react";
import { 
  Trophy, 
  Crown, 
  Share2, 
  Fish, 
  Weight, 
  Download,
  Loader2,
  Star,
  Lock
} from "lucide-react";
import html2canvas from "html2canvas";
import contestioLogo from "@assets/contestio logo_1760283270014.png";

export interface BattleVictoryStats {
  rank: number;
  totalWeight: number;
  fishCount: number;
  bigFishWeight?: number;
  bigFishSpecies?: string; 
  battleName: string;
  participantCount: number;
  winnerName: string;
  winnerAvatar?: string;
  isPremium: boolean;
}

interface BattleVictoryModalProps {
  stats: BattleVictoryStats;
  onClose: () => void;
}

const VictoryConfetti = memo(() => {
  const particles = Array.from({ length: 50 }).map((_, i) => {
    const left = Math.random() * 100;
    const animDelay = Math.random() * 0.8;
    const animDuration = 2 + Math.random() * 1.5;
    const colors = ['#f59e0b', '#fcd34d', '#a855f7', '#ffffff', '#84cc16'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 6 + Math.random() * 6;
    
    return (
      <div 
        key={i}
        className="absolute top-[-20px] rounded-full pointer-events-none"
        style={{
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          boxShadow: `0 0 ${size}px ${color}`,
          animation: `victory-fall ${animDuration}s linear forwards`,
          animationDelay: `${animDelay}s`,
        }}
      />
    );
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
      <style>{`
        @keyframes victory-fall {
          0% { transform: translateY(-50px) translateX(0px); opacity: 1; }
          40% { transform: translateY(40vh) translateX(20px); }
          100% { transform: translateY(110vh) translateX(-20px); opacity: 0; }
        }
      `}</style>
      {particles}
    </div>
  );
});

VictoryConfetti.displayName = "VictoryConfetti";

export function BattleVictoryModal({ stats, onClose }: BattleVictoryModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  const getDynamicHeadline = () => {
    if (stats.participantCount > 10) return { line1: "Totálna", line2: "Dominancia!" };
    if (stats.participantCount > 4) return { line1: "Rozdrvil si", line2: "Konkurenciu!" };
    return { line1: "Zaslúžené", line2: "Víťazstvo!" };
  };

  const headline = getDynamicHeadline();

  const isTouchDevice = typeof window !== 'undefined' && (
    'ontouchstart' in window || 
    navigator.maxTouchPoints > 0
  );

  const generateShareImage = async (): Promise<Blob | null> => {
    if (!shareCardRef.current) return null;
    
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      });
    } catch (error) {
      console.error('Error generating share image:', error);
      return null;
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      const blob = await generateShareImage();
      if (!blob) {
        throw new Error('Failed to generate image');
      }

      const safeBattleName = stats.battleName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const fileName = `contestio-victory-${safeBattleName}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (isTouchDevice && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `🏆 Vyhral som ${stats.battleName}!`,
          text: `Práve som vyhral fishing battle "${stats.battleName}" s ${stats.fishCount} rybami a celkovou váhou ${stats.totalWeight.toFixed(1)} kg!`
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-500"
      data-testid="battle-victory-modal"
    >
      <VictoryConfetti />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-purple-900/40 to-transparent rounded-full blur-[80px] pointer-events-none" />

      <div className="relative w-full max-w-sm text-center z-[101] animate-in zoom-in-90 slide-in-from-bottom-8 duration-500">
        
        {/* Header Context */}
        <div className="mb-6 relative flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 mb-2">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-200">
              {stats.battleName}
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 bg-slate-900/50 p-2 pr-4 rounded-full border border-white/5 backdrop-blur-md mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-amber-500/50">
              {stats.winnerAvatar ? (
                <img src={stats.winnerAvatar} alt="Winner" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-black text-slate-400">{getInitials(stats.winnerName)}</span>
              )}
            </div>
            <span className="text-white font-bold text-sm">{stats.winnerName}</span>
          </div>

          <h2 className="text-5xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 drop-shadow-[0_0_25px_rgba(245,158,11,0.6)] transform -rotate-1 mb-2">
            {headline.line1}<br/>{headline.line2}
          </h2>
          
          <div className="absolute -top-2 -right-2 text-purple-500 opacity-80 animate-bounce">
            <Crown className="w-10 h-10 fill-current rotate-12" />
          </div>
        </div>

        {/* Shareable Card */}
        <div 
          ref={shareCardRef}
          className="relative mx-auto mb-6 p-5 rounded-2xl"
          style={{ backgroundColor: '#0f172a' }}
        >
          {/* Big Fish Showcase */}
          <div className="relative mx-auto w-44 h-44 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-dashed border-amber-500/30 animate-[spin_12s_linear_infinite]" />
            <div className="absolute inset-4 rounded-full border border-purple-500/20 animate-[spin_15s_linear_infinite_reverse]" />
            
            <div className="relative z-10 w-36 h-36 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
              <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center overflow-hidden relative border-4 border-slate-900">
                
                <Fish className="absolute w-24 h-24 text-slate-800/50 -rotate-12 z-0" strokeWidth={1} />
                
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    Big Fish
                  </span>
                  
                  {stats.bigFishWeight ? (
                    <>
                      <div className="text-4xl font-black text-white italic tracking-tighter drop-shadow-lg leading-none">
                        {stats.bigFishWeight.toFixed(1)}
                        <span className="text-base text-slate-400 ml-1">kg</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                        {stats.bigFishSpecies || "Úlovok"}
                      </div>
                    </>
                  ) : (
                    <span className="text-xl font-black text-slate-600 uppercase">N/A</span>
                  )}
                </div>

                <div className="absolute bottom-1.5 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full border-2 border-slate-900 z-20 shadow-lg flex items-center gap-1 whitespace-nowrap">
                  <Star className="w-2.5 h-2.5 fill-slate-900" />
                  1. z {stats.participantCount}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/60 border border-white/5 p-3 rounded-xl">
              <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">
                <Weight className="w-3 h-3" /> Celkovo
              </div>
              <div className="text-lg font-black text-white italic">
                {stats.totalWeight.toFixed(1)} <span className="text-xs not-italic text-slate-600">kg</span>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-white/5 p-3 rounded-xl">
              <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">
                <Fish className="w-3 h-3" /> Počet
              </div>
              <div className="text-lg font-black text-white italic">
                {stats.fishCount} <span className="text-xs not-italic text-slate-600">ks</span>
              </div>
            </div>
          </div>

          {/* Contestio Branding */}
          <div className="flex items-center justify-center pt-3 border-t border-slate-800">
            <img 
              src={contestioLogo} 
              alt="Contestio" 
              className="h-5 opacity-70 brightness-0 invert"
              crossOrigin="anonymous"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleShare}
            disabled={isSharing}
            className="relative w-full h-14 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 group overflow-hidden disabled:opacity-50"
            data-testid="button-share-victory"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
            {isSharing ? (
              <Loader2 className="w-5 h-5 animate-spin relative z-10" />
            ) : isTouchDevice ? (
              <Share2 className="w-5 h-5 relative z-10" />
            ) : (
              <Download className="w-5 h-5 relative z-10" />
            )}
            <span className="relative z-10">
              {isSharing ? 'Pripravujem...' : isTouchDevice ? 'Zdieľať víťazstvo' : 'Stiahnuť obrázok'}
            </span>
          </button>
          
          {!stats.isPremium && (
            <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5 opacity-70">
              <Lock className="w-3 h-3" />
              <span>Zdieľané s Contestio vodoznakom</span>
            </div>
          )}
          
          <button 
            onClick={onClose}
            className="w-full h-10 flex items-center justify-center gap-2 text-slate-500 hover:text-white font-bold uppercase text-[10px] tracking-wider transition-colors mt-2"
            data-testid="button-close-victory"
          >
            Späť na Rebríček
          </button>
        </div>

      </div>
    </div>
  );
}
