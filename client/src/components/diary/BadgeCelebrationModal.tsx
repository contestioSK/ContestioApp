import { Share2 } from "lucide-react";
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

const ConfettiEffect = () => {
  const particles = Array.from({ length: 120 }).map((_, i) => {
    const left = Math.random() * 100;
    const animDelay = Math.random() * 1.5;
    const animDuration = 2 + Math.random() * 2;
    const colors = ['#84cc16', '#f59e0b', '#a855f7', '#ec4899', '#3b82f6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 6 + Math.random() * 8;
    
    return (
      <div 
        key={i}
        className="absolute top-[-20px] rounded-sm pointer-events-none"
        style={{
          left: `${left}%`,
          width: `${size}px`,
          height: `${size * 0.6}px`,
          backgroundColor: color,
          opacity: 0.8,
          animation: `confetti-fall ${animDuration}s linear forwards`,
          animationDelay: `${animDelay}s`,
          transform: `rotate(${Math.random() * 360}deg)`
        }}
      />
    );
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-50px) rotate(0deg) translateX(0px); opacity: 1; }
          25% { transform: translateY(25vh) rotate(90deg) translateX(20px); }
          50% { transform: translateY(50vh) rotate(180deg) translateX(-20px); }
          75% { transform: translateY(75vh) rotate(270deg) translateX(20px); }
          100% { transform: translateY(110vh) rotate(360deg) translateX(0px); opacity: 0; }
        }
      `}</style>
      {particles}
    </div>
  );
};

export function BadgeCelebrationModal({ badge, onClose }: BadgeCelebrationModalProps) {
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
      <ConfettiEffect />

      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 ${theme.bg}`} />

      <div className="relative w-full max-w-sm text-center animate-in zoom-in-50 slide-in-from-bottom-10 duration-500 z-[101]">
        
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
