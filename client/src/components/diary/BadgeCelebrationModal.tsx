import { useEffect } from "react";
import { Share2 } from "lucide-react";
import confetti from "canvas-confetti";
import { BADGE_DEFINITIONS, BadgeTier } from "@shared/badges";

interface BadgeInfo {
  badgeType: string;
  badgeName: string;
  tier: BadgeTier;
  icon: string;
}

interface BadgeCelebrationModalProps {
  badge: BadgeInfo | null;
  onClose: () => void;
}

export function BadgeCelebrationModal({ badge, onClose }: BadgeCelebrationModalProps) {
  // Fire confetti bursts when badge changes
  useEffect(() => {
    if (!badge) return;
    
    // Create custom canvas with very high z-index
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    
    const myConfetti = confetti.create(canvas, { resize: true, useWorker: true });
    
    // Fire multiple bursts
    const fireBurst = () => {
      const positions = [
        { x: 0.2, y: 0.4 },
        { x: 0.8, y: 0.4 },
        { x: 0.5, y: 0.3 },
        { x: 0.3, y: 0.6 },
        { x: 0.7, y: 0.6 }
      ];

      positions.forEach((position, index) => {
        setTimeout(() => {
          myConfetti({
            particleCount: 60,
            spread: 80,
            origin: position,
            colors: ['#fbbf24', '#f59e0b', '#d97706', '#84cc16', '#22c55e', '#ffffff'],
          });
        }, index * 120);
      });
    };
    
    // Fire immediately and after delay
    fireBurst();
    const timer = setTimeout(fireBurst, 700);
    
    // Cleanup after 5 seconds
    const cleanupTimer = setTimeout(() => {
      document.body.removeChild(canvas);
    }, 5000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(cleanupTimer);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    };
  }, [badge]);

  if (!badge) return null;

  const badgeDef = BADGE_DEFINITIONS[badge.badgeType];
  const tierInfo = badgeDef?.tiers?.[badge.tier];

  const tierColors = {
    gold: { 
      text: "text-amber-400", 
      bg: "bg-amber-500", 
      border: "border-amber-500/30",
      gradient: "from-amber-400 via-yellow-200 to-amber-600",
      glow: "shadow-amber-500/30"
    },
    silver: { 
      text: "text-slate-300", 
      bg: "bg-slate-400", 
      border: "border-slate-400/30",
      gradient: "from-slate-300 via-white to-slate-500",
      glow: "shadow-slate-400/30"
    },
    bronze: { 
      text: "text-orange-400", 
      bg: "bg-orange-500", 
      border: "border-orange-500/30",
      gradient: "from-orange-400 via-red-200 to-orange-600",
      glow: "shadow-orange-500/30"
    }
  };

  const theme = tierColors[badge.tier] || tierColors.bronze;
  const tierLabel = badge.tier === 'gold' ? 'Zlatý' : badge.tier === 'silver' ? 'Strieborný' : 'Bronzový';

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300"
      data-testid="badge-celebration-modal"
    >
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 ${theme.bg}`} />

      <div className="relative w-full max-w-sm text-center animate-in zoom-in-50 slide-in-from-bottom-10 duration-500">
        
        <div className="mb-8">
          <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            Epické!
          </h2>
          <p className="text-slate-400 font-medium uppercase tracking-widest text-xs mt-2">
            Práve si odomkol nový odznak
          </p>
        </div>

        <div className="relative mx-auto w-48 h-48 mb-8 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full border-2 border-dashed ${theme.text} opacity-30 animate-[spin_10s_linear_infinite]`} />
          <div className={`absolute inset-4 rounded-full border border-white/10 ${theme.bg} opacity-10 animate-pulse`} />
          
          <div className="relative z-10 text-8xl filter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] transform hover:scale-110 transition-transform duration-300">
            {badge.icon || badgeDef?.icon || "🏆"}
          </div>

          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full border shadow-xl ${theme.bg} text-slate-950 font-black uppercase text-xs tracking-widest`}>
            {tierLabel}
          </div>
        </div>

        <div className={`bg-slate-900/50 border ${theme.border} rounded-2xl p-6 backdrop-blur-md shadow-2xl ${theme.glow} mb-8`}>
          <h3 className={`text-2xl font-black uppercase italic mb-2 bg-clip-text text-transparent bg-gradient-to-r ${theme.gradient}`}>
            {badge.badgeName || badgeDef?.name || "Nový Odznak"}
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            {tierInfo?.description || badgeDef?.description || "Gratulujeme k dosiahnutiu tohto míľnika!"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onClose}
            className="w-full h-14 bg-lime-500 hover:bg-lime-400 text-slate-950 rounded-xl font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(132,204,22,0.4)] transition-all active:scale-95"
            data-testid="badge-continue-button"
          >
            Pokračovať v love
          </button>
          
          <button 
            className="w-full h-12 flex items-center justify-center gap-2 text-slate-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors"
            data-testid="badge-share-button"
          >
            <Share2 className="w-4 h-4" />
            Zdieľať úspech
          </button>
        </div>

      </div>
    </div>
  );
}
