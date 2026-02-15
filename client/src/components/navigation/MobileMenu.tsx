import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useUserMode, type UserMode } from "@/contexts/UserModeContext";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import contestioLogo from "@assets/contestio logo_1760283270014.png";
import contestioLogoDark from "@assets/contestio_logo_black_1766308180088.png";
import { 
  BookOpen, 
  Fish, 
  MapPin, 
  BarChart3, 
  Users, 
  Swords, 
  Cloud, 
  Scale, 
  Target, 
  Award, 
  Trophy,
  Shield,
  Building2,
  Crown,
  Package,
  X,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

type PremiumStatus = {
  isPremium: boolean;
};

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { 
    activeMode, 
    setActiveMode, 
    hasMultipleRoles, 
    availableRoles,
    refereeCompetitions 
  } = useUserMode();

  const { data: premiumStatus } = useQuery<PremiumStatus>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id
  });

  const isPremium = premiumStatus?.isPremium || false;

  const handleNavigation = (href: string) => {
    setLocation(href);
    onClose();
  };

  const handleModeChange = async (mode: UserMode, competitionId?: string) => {
    await setActiveMode(mode, competitionId);
    onClose();
    
    switch (mode) {
      case 'referee':
        setLocation('/referee-interface');
        break;
      case 'organizer':
        setLocation('/organizer');
        break;
      default:
        setLocation('/diary');
    }
  };

  const isActivePath = (href: string) => {
    if (href === "/diary") return location === "/diary";
    return location.startsWith(href);
  };

  const mainItem = { icon: BookOpen, label: "Denník", href: "/diary", color: "blue" };

  const fishingLifeItems = [
    { icon: Fish, label: "Moje úlovky", href: "/diary/catches", color: "cyan" },
    { icon: MapPin, label: "Rybárske výpravy", href: "/diary/trips", color: "cyan" },
    { icon: BarChart3, label: "Štatistiky", href: "/diary/stats", color: "cyan" },
  ];

  const communityItems = [
    { icon: Users, label: "Priatelia", href: "/friends", color: "amber", premium: false },
    { icon: Swords, label: "Fishing Battle", href: isPremium ? "/diary/battles" : "/diary/battles/paywall", premium: true, color: "amber" },
  ];

  const toolsItems = [
    { icon: Cloud, label: "Počasie", href: "/diary/weather-forecast", color: "orange" },
    { icon: Scale, label: "Rybársky poriadok", href: "/diary/fishing-rules", color: "orange" },
    { icon: Target, label: "Ciele", href: "/diary/seasonal-goals", color: "orange" },
    { icon: Award, label: "Odznaky", href: "/diary/badges", color: "orange" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">
        <SheetHeader className="p-4 pb-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-row items-center justify-between shrink-0">
          <div className="flex flex-col gap-1">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <img 
              src={contestioLogo} 
              alt="Contestio" 
              className="h-7 w-auto hidden dark:block" 
            />
            <img 
              src={contestioLogoDark} 
              alt="Contestio" 
              className="h-7 w-auto dark:hidden" 
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tvoj rybársky spoločník</p>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950">
          {hasMultipleRoles && (
            <div className="px-4 pt-2 pb-2">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-1">
                Režim aplikácie
              </p>
              <div className="grid grid-cols-2 gap-2">
                {availableRoles.includes('user') && (
                  <button
                    onClick={() => handleModeChange('user')}
                    className={cn(
                      "relative w-full flex flex-col items-center gap-1 p-2 rounded-xl transition-all border",
                      activeMode === 'user' 
                        ? "bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800/60 shadow-sm ring-1 ring-blue-500/20" 
                        : "bg-white/50 dark:bg-slate-900/40 border-transparent dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center transition-colors", 
                      activeMode === 'user' ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    )}>
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                    <span className={cn(
                      "text-[11px] font-bold", 
                      activeMode === 'user' ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
                    )}>Rybár</span>
                    {activeMode === 'user' && <div className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />}
                  </button>
                )}

                {availableRoles.includes('referee') && refereeCompetitions.length > 0 && (
                  <button
                    onClick={() => handleModeChange('referee', refereeCompetitions[0]?.id)}
                    className={cn(
                      "relative w-full flex flex-col items-center gap-1 p-2 rounded-xl transition-all border",
                      activeMode === 'referee'
                        ? "bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-800/60 shadow-sm ring-1 ring-orange-500/20" 
                        : "bg-white/50 dark:bg-slate-900/40 border-transparent dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center transition-colors", 
                      activeMode === 'referee' ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    )}>
                      <Shield className="h-3.5 w-3.5" />
                    </div>
                    <span className={cn(
                      "text-[11px] font-bold", 
                      activeMode === 'referee' ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
                    )}>Rozhodca</span>
                    {activeMode === 'referee' && <div className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]" />}
                  </button>
                )}

                {availableRoles.includes('organizer') && (
                  <button
                    onClick={() => handleModeChange('organizer')}
                    className={cn(
                      "relative w-full flex flex-col items-center gap-1 p-2 rounded-xl transition-all border",
                      activeMode === 'organizer'
                        ? "bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800/60 shadow-sm ring-1 ring-purple-500/20" 
                        : "bg-white/50 dark:bg-slate-900/40 border-transparent dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center transition-colors", 
                      activeMode === 'organizer' ? "bg-purple-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    )}>
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <span className={cn(
                      "text-[11px] font-bold", 
                      activeMode === 'organizer' ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
                    )}>Organizátor</span>
                    {activeMode === 'organizer' && <div className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]" />}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="p-4 pt-0 space-y-4">
            {/* Main Section - Denník (blue) */}
            <div>
              <div className="space-y-0">
                {(() => {
                  const isActive = isActivePath(mainItem.href);
                  return (
                    <button
                      onClick={() => handleNavigation(mainItem.href)}
                      className={cn(
                        "group w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                        isActive 
                          ? "bg-white dark:bg-slate-900 shadow-sm border border-blue-200 dark:border-blue-800/50" 
                          : "hover:bg-white/60 dark:hover:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        isActive 
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                          : "bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:bg-blue-500/10 dark:group-hover:bg-blue-900/20"
                      )}>
                        <mainItem.icon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        isActive ? "text-blue-600 dark:text-blue-400 font-bold" : ""
                      )}>
                        {mainItem.label}
                      </span>
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Fishing Life Section (cyan) */}
            <div>
              <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-500 uppercase tracking-widest mb-2 pl-3">
                Môj rybársky život
              </p>
              <div className="space-y-0">
                {fishingLifeItems.map((item) => {
                  const isActive = isActivePath(item.href);
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "group w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                        isActive 
                          ? "bg-white dark:bg-slate-900 shadow-sm border border-cyan-200 dark:border-cyan-800/50" 
                          : "hover:bg-white/60 dark:hover:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        isActive 
                          ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/20" 
                          : "bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 group-hover:bg-cyan-500/10 dark:group-hover:bg-cyan-900/20"
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        isActive ? "text-cyan-600 dark:text-cyan-400 font-bold" : ""
                      )}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Community Section (amber) */}
            <div>
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2 pl-3">
                Súťaže & Komunita
              </p>
              <div className="space-y-0">
                {communityItems.map((item) => {
                  const isActive = isActivePath(item.href);
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "group w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                        isActive 
                          ? "bg-white dark:bg-slate-900 shadow-sm border border-amber-200 dark:border-amber-800/50" 
                          : "hover:bg-white/60 dark:hover:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        isActive 
                          ? "bg-amber-600 text-white shadow-md shadow-amber-500/20" 
                          : "bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:bg-amber-500/10 dark:group-hover:bg-amber-900/20"
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        isActive ? "text-amber-600 dark:text-amber-400 font-bold" : ""
                      )}>
                        {item.label}
                      </span>
                      
                      {item.premium && !isPremium && (
                        <Badge variant="secondary" className="ml-auto flex items-center gap-1 border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                          <Crown className="h-3 w-3" />
                          PRO
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tools Section (orange) */}
            <div>
              <p className="text-[10px] font-bold text-orange-600 dark:text-orange-500 uppercase tracking-widest mb-2 pl-3">
                Nástroje & Progres
              </p>
              <div className="grid grid-cols-2 gap-2 px-1">
                {toolsItems.map((item) => {
                  const isActive = isActivePath(item.href);
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "group flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl transition-all duration-200 border",
                        isActive 
                          ? "bg-white dark:bg-slate-900 shadow-sm border-orange-200 dark:border-orange-800/50" 
                          : "bg-white/40 dark:bg-slate-900/40 border-transparent dark:border-slate-800/30 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                        isActive 
                          ? "bg-orange-600 text-white" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-orange-500 dark:group-hover:text-orange-400 group-hover:bg-orange-500/10 dark:group-hover:bg-orange-900/20"
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-xs font-medium text-center",
                        isActive ? "text-orange-600 dark:text-orange-400 font-bold" : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"
                      )}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
          <button
            onClick={() => handleNavigation('/categories/live')}
            className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 p-[1px] shadow-lg shadow-emerald-500/20 group transition-all hover:shadow-emerald-500/30 hover:scale-[1.01]"
          >
            <div className="relative flex items-center gap-3 bg-white dark:bg-slate-950/90 rounded-[11px] p-2.5 transition-colors group-hover:bg-opacity-90">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-pulse">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <span className="block text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Oficiálne súťaže</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  Práve prebieha
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors" />
            </div>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
