import { useState, useRef, memo } from "react";
import { 
  Share2, 
  Download, 
  Loader2, 
  Medal,
  Calendar,
  Crosshair,
  Target,
  Crown,
  Dna,
  Moon,
  FileText,
  Snowflake,
  Trophy,
  type LucideIcon
} from "lucide-react";
import html2canvas from "html2canvas";
import { BADGE_DEFINITIONS, BadgeTier } from "@shared/badges";
import privodeLogo from "@assets/Suleyman765_vektorizacia_TRANSPARENT_1779341042153.png";

const BADGE_ICONS: Record<string, LucideIcon> = {
  Calendar,
  Crosshair,
  Target,
  Crown,
  Dna,
  Moon,
  FileText,
  Snowflake,
  Trophy
};

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

const BadgeConfetti = memo(() => {
  const particles = Array.from({ length: 30 }).map((_, i) => {
    const left = Math.random() * 100;
    const animDelay = Math.random() * 0.5;
    const animDuration = 2 + Math.random() * 2;
    const colors = ['#d97706', '#fbbf24', '#94a3b8', '#ea580c', '#f8fafc'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 5 + Math.random() * 4;

    return (
      <div
        key={i}
        className="absolute top-[-20px] rounded-full pointer-events-none"
        style={{
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          opacity: 0.7,
          animation: `badge-fall ${animDuration}s linear forwards`,
          animationDelay: `${animDelay}s`,
        }}
      />
    );
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
      <style>{`
        @keyframes badge-fall {
          0% { transform: translateY(-50px) translateX(0px); opacity: 0; }
          10% { opacity: 0.8; }
          100% { transform: translateY(100vh) translateX(-10px); opacity: 0; }
        }
      `}</style>
      {particles}
    </div>
  );
});
BadgeConfetti.displayName = "BadgeConfetti";

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
      border: "border-amber-500/20",
      gradient: "from-amber-400/20 via-transparent to-transparent",
      ringColor: "border-amber-500/20",
      hex: "#f59e0b"
    },
    silver: {
      text: "text-slate-300",
      bg: "bg-slate-400",
      border: "border-slate-400/20",
      gradient: "from-slate-400/20 via-transparent to-transparent",
      ringColor: "border-slate-400/20",
      hex: "#94a3b8"
    },
    bronze: {
      text: "text-orange-400",
      bg: "bg-orange-500",
      border: "border-orange-500/20",
      gradient: "from-orange-500/20 via-transparent to-transparent",
      ringColor: "border-orange-500/20",
      hex: "#f97316"
    }
  };

  const theme = tierColors[badge.tier] || tierColors.bronze;
  const tierLabel = badge.tier === 'gold' ? 'Zlatý' : badge.tier === 'silver' ? 'Strieborný' : 'Bronzový';
  const badgeName = badge.badgeName || badgeDef?.name || "Nový Odznak";
  const resolveIconName = (): string => {
    if (badge.icon && badge.icon in BADGE_ICONS) return badge.icon;
    if (badgeDef?.icon && badgeDef.icon in BADGE_ICONS) return badgeDef.icon;
    return "Trophy";
  };
  const BadgeIconComponent = BADGE_ICONS[resolveIconName()] || Trophy;

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

  const isTouchDevice = typeof window !== 'undefined' && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );

  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `privode-${badge.badgeType}-${badge.tier}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    setIsSharing(true);

    try {
      const imageBlob = await generateShareImage();
      const shareText = `🏆 Práve som získal odznak "${badgeName}" na PriVode!`;

      if (!isTouchDevice) {
        if (imageBlob) {
          downloadImage(imageBlob);
        }
        return;
      }

      if (navigator.share && imageBlob) {
        let canShareFiles = false;
        try {
          const testFile = new File([imageBlob], 'test.png', { type: 'image/png' });
          canShareFiles = navigator.canShare?.({ files: [testFile] }) ?? false;
        } catch {
          canShareFiles = false;
        }

        if (canShareFiles) {
          const file = new File([imageBlob], 'privode-badge.png', { type: 'image/png' });
          await navigator.share({
            title: 'Môj nový odznak na PriVode',
            text: shareText,
            files: [file],
          });
        } else {
          await navigator.share({
            title: 'Môj nový odznak na PriVode',
            text: shareText,
          });
        }
      } else if (imageBlob) {
        downloadImage(imageBlob);
      }
    } catch (error) {
      console.log('Share cancelled or failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300"
      data-testid="badge-celebration-modal"
    >
      <BadgeConfetti />

      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] rounded-full blur-[100px] opacity-10 pointer-events-none ${theme.bg}`} />

      <div className="relative w-full max-w-sm text-center animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 z-[101]">

        {/* HEADER */}
        <div className="mb-8 relative flex flex-col items-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 bg-slate-900/50 backdrop-blur-sm ${theme.border}`}>
            <Medal className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
              {badgeName}
            </span>
          </div>

          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-md">
            Odomknuté
          </h2>
        </div>

        {/* CENTRAL VISUAL - Shareable Card */}
        <div
          ref={shareCardRef}
          className="relative mx-auto mb-8 p-6"
          style={{ backgroundColor: '#0f172a' }}
        >
          <div className="relative mx-auto w-48 h-48 mb-6 flex items-center justify-center">
            <style>{`
              @keyframes slow-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
            
            <div 
              className={`absolute inset-0 rounded-full border border-dashed ${theme.ringColor} opacity-50`}
              style={{ animation: 'slow-spin 20s linear infinite' }}
            />

            <div className={`relative z-10 w-36 h-36 rounded-full bg-gradient-to-b ${theme.gradient} flex items-center justify-center border border-white/5`}>
              <BadgeIconComponent
                className={`relative z-10 w-16 h-16 ${theme.text} stroke-[1.5]`}
                style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' }}
              />

              <div
                className={`absolute -bottom-3 px-3 py-1 rounded-full bg-slate-900 border ${theme.border} z-20 shadow-lg`}
              >
                <span className={`text-[10px] font-black uppercase tracking-widest ${theme.text}`}>
                  {tierLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Badge Name & Description for Share Image */}
          <h3 
            className="text-xl font-black uppercase italic mb-1"
            style={{ color: theme.hex }}
          >
            {badgeName}
          </h3>
          <p className="text-slate-400 text-xs mb-3">
            {tierInfo?.description || badgeDef?.description || "Gratulujeme k dosiahnutiu tohto míľnika!"}
          </p>

          {/* PriVode Branding */}
          <div className="flex items-center justify-center pt-3 border-t border-slate-800">
            <img
              src={privodeLogo}
              alt="PriVode"
              className="h-5 opacity-70 brightness-0 invert"
              crossOrigin="anonymous"
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col gap-3 px-4">
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="relative w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-white bg-orange-500 hover:bg-orange-400 disabled:opacity-50"
            data-testid="badge-share-button"
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
            ) : isTouchDevice ? (
              <Share2 className="w-4 h-4" strokeWidth={1.75} />
            ) : (
              <Download className="w-4 h-4" strokeWidth={1.75} />
            )}
            <span>{isSharing ? 'Pripravujem...' : 'Pochváľ sa a zdieľaj'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full h-10 flex items-center justify-center gap-2 text-slate-500 hover:text-white font-bold uppercase text-[10px] tracking-wider transition-colors"
            data-testid="badge-continue-button"
          >
            Pokračovať
          </button>
        </div>

      </div>
    </div>
  );
}
