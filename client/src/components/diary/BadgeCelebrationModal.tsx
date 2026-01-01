import { useState, useRef } from "react";
import { Share2, Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { BADGE_DEFINITIONS, BadgeTier } from "@shared/badges";
import contestioLogo from "@assets/contestio logo_1760283270014.png";

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
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  if (!badge) return null;

  const badgeDef = BADGE_DEFINITIONS[badge.badgeType];
  const tierInfo = badgeDef?.tiers?.[badge.tier];

  const tierColors = {
    gold: { 
      text: "text-amber-400", 
      bg: "bg-amber-500", 
      border: "border-amber-500/30",
      gradient: "from-amber-400 via-yellow-200 to-amber-600",
      glow: "shadow-amber-500/30",
      hex: "#f59e0b"
    },
    silver: { 
      text: "text-slate-300", 
      bg: "bg-slate-400", 
      border: "border-slate-400/30",
      gradient: "from-slate-300 via-white to-slate-500",
      glow: "shadow-slate-400/30",
      hex: "#94a3b8"
    },
    bronze: { 
      text: "text-orange-400", 
      bg: "bg-orange-500", 
      border: "border-orange-500/30",
      gradient: "from-orange-400 via-red-200 to-orange-600",
      glow: "shadow-orange-500/30",
      hex: "#f97316"
    }
  };

  const theme = tierColors[badge.tier] || tierColors.bronze;
  const tierLabel = badge.tier === 'gold' ? 'Zlatý' : badge.tier === 'silver' ? 'Strieborný' : 'Bronzový';
  const badgeName = badge.badgeName || badgeDef?.name || "Nový Odznak";
  const badgeIcon = badge.icon || badgeDef?.icon || "🏆";

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

  // Detect if device is truly mobile (not just has share API)
  const isTouchDevice = typeof window !== 'undefined' && (
    'ontouchstart' in window || 
    navigator.maxTouchPoints > 0
  );

  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contestio-${badge.badgeType}-${badge.tier}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      const imageBlob = await generateShareImage();
      const shareText = `🏆 Práve som získal odznak "${badgeName}" (${tierLabel}) na Contestio!`;
      
      // Desktop: Always download image
      if (!isTouchDevice) {
        if (imageBlob) {
          downloadImage(imageBlob);
        }
        return;
      }
      
      // Mobile: Try Web Share API with file support
      if (navigator.share && imageBlob) {
        // Check if file sharing is supported (wrapped in try/catch)
        let canShareFiles = false;
        try {
          const testFile = new File([imageBlob], 'test.png', { type: 'image/png' });
          canShareFiles = navigator.canShare?.({ files: [testFile] }) ?? false;
        } catch {
          canShareFiles = false;
        }
        
        if (canShareFiles) {
          // Share with image
          const file = new File([imageBlob], 'contestio-badge.png', { type: 'image/png' });
          await navigator.share({
            title: 'Môj nový odznak na Contestio',
            text: shareText,
            files: [file],
          });
        } else {
          // Share text only
          await navigator.share({
            title: 'Môj nový odznak na Contestio',
            text: shareText,
          });
        }
      } else if (imageBlob) {
        // Fallback: Download image
        downloadImage(imageBlob);
      }
    } catch (error) {
      // User cancelled share or error occurred
      console.log('Share cancelled or failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

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

        {/* Shareable Card - This will be captured for sharing */}
        <div 
          ref={shareCardRef}
          className="relative mx-auto mb-8 p-6 rounded-2xl"
          style={{ backgroundColor: '#0f172a' }}
        >
          <div className="relative mx-auto w-32 h-32 mb-6">
            <div 
              className="absolute inset-0 rounded-full border-2 border-dashed opacity-30"
              style={{ borderColor: theme.hex }}
            />
            <div 
              className="absolute inset-3 rounded-full border opacity-10"
              style={{ borderColor: theme.hex, backgroundColor: theme.hex }}
            />
            
            <span 
              className="absolute inset-0 flex items-center justify-center text-5xl z-10"
              style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' }}
            >
              {badgeIcon}
            </span>

            <div 
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border shadow-xl font-black uppercase text-[10px] tracking-widest z-20 whitespace-nowrap"
              style={{ backgroundColor: theme.hex, color: '#0f172a' }}
            >
              {tierLabel}
            </div>
          </div>

          <h3 
            className="text-xl font-black uppercase italic mb-1"
            style={{ color: theme.hex }}
          >
            {badgeName}
          </h3>
          <p className="text-slate-400 text-xs mb-3">
            {tierInfo?.description || badgeDef?.description || "Gratulujeme k dosiahnutiu tohto míľnika!"}
          </p>
          
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

        <div className="flex flex-col gap-3">
          <button 
            onClick={onClose}
            className="w-full h-14 bg-lime-500 hover:bg-lime-400 text-slate-950 rounded-xl font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(132,204,22,0.4)] transition-all active:scale-95"
            data-testid="badge-continue-button"
          >
            Pokračovať v love
          </button>
          
          <button 
            onClick={handleShare}
            disabled={isSharing}
            className="w-full h-12 flex items-center justify-center gap-2 text-slate-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors disabled:opacity-50"
            data-testid="badge-share-button"
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isTouchDevice ? (
              <Share2 className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isSharing ? 'Pripravujem...' : isTouchDevice ? 'Zdieľať úspech' : 'Stiahnuť obrázok'}
          </button>
        </div>

      </div>
    </div>
  );
}
