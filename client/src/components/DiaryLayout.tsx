import { useState } from "react";
import { useAuthInit } from "@/hooks/useAuthInit";
import { useTheme } from "@/contexts/ThemeContext";
import { useFishingTimeGuard } from "@/hooks/useFishingTimeGuard";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CatchFormDialog from "@/components/diary/CatchFormDialog";
import { PremiumUpsellModal } from "@/components/PremiumUpsellModal";
import { queryClient } from "@/lib/queryClient";
import { 
  BookOpen, 
  BarChart3, 
  Target, 
  Trophy, 
  User,
  Users,
  Fish,
  Plus,
  Swords,
  MapPin,
  Cloud,
  Scale,
  Shield,
  CalendarDays,
  Award,
  Lock,
  Wrench
} from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";

type CatchLimits = {
  canCreate: boolean;
  currentCount: number;
  limit: number;
};

const HIDE_FAB_ROUTES = [
  '/diary',
  '/diary/battles',
  '/organizer',
  '/competition',
  '/referee',
  '/register-competition',
];

type PremiumStatus = {
  isPremium: boolean;
};

interface DiaryLayoutProps {
  children: React.ReactNode;
  fullBleed?: boolean;
}

const mainSection = [
  {
    icon: BookOpen,
    label: "Denník",
    href: "/diary",
    description: "Hlavný prehľad"
  }
];

const fishingLifeSection = [
  {
    icon: Fish,
    label: "Moje úlovky",
    href: "/diary/catches",
    description: "Správa úlovkov"
  },
  {
    icon: MapPin,
    label: "Moje rybárske výpravy",
    href: "/diary/trips",
    description: "Viacdenné výlety"
  },
  {
    icon: BarChart3,
    label: "Štatistiky", 
    href: "/diary/stats",
    description: "Analýzy úlovkov"
  }
];

const communitySection = [
  {
    icon: Users,
    label: "Priatelia",
    href: "/friends",
    description: "Správa priateľov"
  },
  {
    icon: Swords,
    label: "Fishing Battle",
    href: "/diary/battles",
    description: "Súťažné súboje",
    premium: true
  }
];

const toolsSection = [
  {
    icon: Cloud,
    label: "Predpoveď počasia",
    href: "/diary/weather-forecast",
    description: "3-dňová predpoveď"
  },
  {
    icon: Scale,
    label: "Rybársky poriadok",
    href: "/diary/fishing-rules",
    description: "Pravidlá a predpisy"
  },
  {
    icon: Target,
    label: "Ciele",
    href: "/diary/seasonal-goals", 
    description: "Sezónne ciele"
  },
  {
    icon: Award,
    label: "Moje Odznaky",
    href: "/diary/badges",
    description: "Zbieranie odznakov"
  }
];

const competitionNavigationItems = [
  {
    icon: CalendarDays,
    label: "Súťaže",
    href: "/competitions",
    description: "Registrácia a live výsledky",
    highlight: true
  }
];

export default function DiaryLayout({ children, fullBleed = false }: DiaryLayoutProps) {
  const { user, isPremium, catchLimits } = useAuthInit();
  const { theme } = useTheme();
  const [location, setLocation] = useLocation();
  
  useFishingTimeGuard();
  const [isCreateCatchOpen, setIsCreateCatchOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [premiumTrigger, setPremiumTrigger] = useState<string | undefined>();

  const { data: friendRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/friend-requests'],
    enabled: !!user?.id,
  });

  const hasFriendRequests = (friendRequests || []).length > 0;
  
  const handleFabClick = () => {
    if (!isPremium && catchLimits && !catchLimits.canCreate) {
      setPremiumTrigger("catch_limit");
      setIsPremiumModalOpen(true);
    } else {
      setIsCreateCatchOpen(true);
    }
  };

  const isActivePath = (href: string) => {
    if (href === "/diary") {
      return location === "/diary";
    }
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar - hidden on mobile (navigation is in TopBar MobileMenu) */}
      <div className="hidden md:flex fixed inset-y-0 left-0 z-40 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-[240px] lg:w-[280px] flex-shrink-0 pt-16">
        <div className="flex flex-col h-full w-full">
          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            <TooltipProvider delayDuration={300}>
              {/* HLAVNÉ Section */}
              {mainSection.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setLocation(item.href);
                          window.scrollTo(0, 0);
                        }}
                        className={`
                          w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all
                          ${isActive 
                            ? 'bg-primary/10 dark:bg-blue-600/20 text-primary dark:text-blue-400 border border-primary/30 dark:border-blue-500/40' 
                            : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                          }
                        `}
                        data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      >
                        <TacticalIconInline icon={Icon} variant={isActive ? "lime" : "slate"} size="md" className="mr-3 flex-shrink-0" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-md">
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Section Divider - MÔJ RYBÁRSKY ŽIVOT */}
              <div className="pt-4 pb-2">
                <div className="px-3 mb-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-primary dark:via-blue-500/30 to-transparent"></div>
                </div>
                <div className="px-3 flex items-center gap-1.5">
                  <TacticalIconInline icon={Fish} variant="cyan" size="sm" />
                  <p className="text-xs font-bold text-primary dark:text-cyan-500 uppercase tracking-wider">
                    Môj Rybársky Život
                  </p>
                </div>
              </div>

              {/* Fishing Life Section */}
              {fishingLifeSection.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setLocation(item.href);
                          window.scrollTo(0, 0);
                        }}
                        className={`
                          w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all
                          ${isActive 
                            ? 'bg-cyan-500/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 dark:border-cyan-500/40' 
                            : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                          }
                        `}
                        data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      >
                        <TacticalIconInline icon={Icon} variant={isActive ? "cyan" : "slate"} size="md" className="mr-3 flex-shrink-0" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-md">
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Section Divider - SÚŤAŽE & KOMUNITA */}
              <div className="pt-4 pb-2">
                <div className="px-3 mb-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-amber-600 dark:via-amber-500/30 to-transparent"></div>
                </div>
                <div className="px-3 flex items-center gap-1.5">
                  <TacticalIconInline icon={Swords} variant="amber" size="sm" />
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                    Battle & Komunita
                  </p>
                </div>
              </div>

              {/* Community Section */}
              {communitySection.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (item.premium && item.label === "Fishing Battle") {
                            const targetHref = isPremium ? "/diary/battles" : "/diary/battles/paywall";
                            setLocation(targetHref);
                          } else {
                            setLocation(item.href);
                          }
                          window.scrollTo(0, 0);
                        }}
                        className={`
                          w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all relative
                          ${isActive 
                            ? 'bg-amber-500/10 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 dark:border-amber-500/40' 
                            : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                          }
                        `}
                        data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      >
                        <TacticalIconInline icon={Icon} variant={isActive ? "amber" : "slate"} size="md" className="mr-3 flex-shrink-0" />
                        <span className="font-medium text-sm flex items-center gap-2">
                          {item.label}
                          {item.label === "Priatelia" && hasFriendRequests && (
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          )}
                          {item.premium && !isPremium && (
                            <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs px-1 py-0">
                              PREMIUM
                            </Badge>
                          )}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-md">
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Section Divider - NÁSTROJE & PROGRES */}
              <div className="pt-4 pb-2">
                <div className="px-3 mb-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-amber-600 dark:via-orange-500/30 to-transparent"></div>
                </div>
                <div className="px-3 flex items-center gap-1.5">
                  <TacticalIconInline icon={Wrench} variant="orange" size="sm" />
                  <p className="text-xs font-bold text-cyan-600 dark:text-cyan-500 uppercase tracking-wider">
                    Nástroje & Progres
                  </p>
                </div>
              </div>

              {/* Tools Section */}
              {toolsSection.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setLocation(item.href);
                          window.scrollTo(0, 0);
                        }}
                        className={`
                          w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all
                          ${isActive 
                            ? 'bg-cyan-500/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 dark:border-cyan-500/40' 
                            : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                          }
                        `}
                        data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      >
                        <TacticalIconInline icon={Icon} variant={isActive ? "orange" : "slate"} size="md" className="mr-3 flex-shrink-0" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-md">
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

            </TooltipProvider>
          </nav>

          {/* Admin Panel Button (only for admin users) */}
          {user?.role === 'admin' && (
            <div className="px-6 pb-4">
              <Button
                variant="default"
                onClick={() => {
                  setLocation('/admin-panel');
                  window.scrollTo(0, 0);
                }}
                className="w-full justify-start bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                data-testid="button-admin-panel"
              >
                <Shield className="mr-3 h-5 w-5" />
                Admin panel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 w-full overflow-x-hidden md:ml-[240px] lg:ml-[280px]">
        {/* Content area - with padding for TopBar on mobile, sidebar offset on desktop */}
        <main className="min-h-screen bg-background dark:bg-slate-900 pb-16 md:pb-0 w-full">
          <div className={fullBleed ? "w-full" : "w-full max-w-screen-xl mx-auto px-4 md:px-6 py-4 md:py-6"}>
            {children}
          </div>
        </main>
        
        {/* Mobile Bottom Navigation - 5 items: Denník, Úlovky, Počasie, Štatistiky, Súťaže */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="flex w-full">
            {/* Denník */}
            <button
              onClick={() => {
                setLocation("/diary");
                window.scrollTo(0, 0);
              }}
              className={`
                flex flex-col items-center justify-center py-2 flex-1 min-w-0 transition-colors
                ${isActivePath("/diary") && location === "/diary"
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              data-testid="mobile-nav-dennik"
            >
              <BookOpen className="h-5 w-5 flex-shrink-0" />
              <span className="text-[10px] font-medium truncate">Denník</span>
            </button>

            {/* Moje úlovky */}
            <button
              onClick={() => {
                setLocation("/diary/catches");
                window.scrollTo(0, 0);
              }}
              className={`
                flex flex-col items-center justify-center py-2 flex-1 min-w-0 transition-colors
                ${isActivePath("/diary/catches")
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              data-testid="mobile-nav-ulovky"
            >
              <Fish className="h-5 w-5 flex-shrink-0" />
              <span className="text-[10px] font-medium truncate">Úlovky</span>
            </button>

            {/* Počasie */}
            <button
              onClick={() => {
                setLocation("/diary/weather-forecast");
                window.scrollTo(0, 0);
              }}
              className={`
                flex flex-col items-center justify-center py-2 flex-1 min-w-0 transition-colors
                ${isActivePath("/diary/weather-forecast")
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              data-testid="mobile-nav-pocasie"
            >
              <Cloud className="h-5 w-5 flex-shrink-0" />
              <span className="text-[10px] font-medium truncate">Počasie</span>
            </button>

            {/* Štatistiky */}
            <button
              onClick={() => {
                setLocation("/diary/stats");
                window.scrollTo(0, 0);
              }}
              className={`
                flex flex-col items-center justify-center py-2 flex-1 min-w-0 transition-colors
                ${isActivePath("/diary/stats")
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              data-testid="mobile-nav-statistiky"
            >
              <BarChart3 className="h-5 w-5 flex-shrink-0" />
              <span className="text-[10px] font-medium truncate">Štatistiky</span>
            </button>

          </div>
        </div>

        {/* Floating Action Button for Quick Catch Entry */}
        {!HIDE_FAB_ROUTES.some(route => location.startsWith(route)) && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleFabClick}
                  className="fixed bottom-20 right-6 md:bottom-6 z-50 transition-all duration-200 hover:scale-110 animate-in fade-in zoom-in-95"
                  data-testid="fab-add-catch"
                  aria-label="Pridať úlovok"
                >
                  {!isPremium && catchLimits && !catchLimits.canCreate ? (
                    <TacticalIcon icon={Lock} variant="slate" size="lg" showLabel={false} />
                  ) : (
                    <TacticalIcon icon={Plus} variant="cyan" size="lg" showLabel={false} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-popover text-popover-foreground border shadow-md px-3 py-2">
                <p className="font-medium">{!isPremium && catchLimits && !catchLimits.canCreate 
                  ? "Limit dosiahnutý" 
                  : "Pridať úlovok"}</p>
                {!isPremium && catchLimits && !catchLimits.canCreate && (
                  <p className="text-xs text-muted-foreground mt-0.5">Klikni pre Premium</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Global Catch Creation Dialog */}
        <CatchFormDialog
          isOpen={isCreateCatchOpen}
          onClose={() => setIsCreateCatchOpen(false)}
          editingCatch={null}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/all"] });
            queryClient.invalidateQueries({ queryKey: ["/api/diary/catches/recent"] });
            queryClient.invalidateQueries({ queryKey: ["/api/diary/catch-limits"] });
            queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
            queryClient.invalidateQueries({ queryKey: ["/api/diary/dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["/api/diary/stats"] });
          }}
        />

        {/* Premium Upsell Modal */}
        <PremiumUpsellModal
          isOpen={isPremiumModalOpen}
          onClose={() => {
            setIsPremiumModalOpen(false);
            setPremiumTrigger(undefined);
          }}
          trigger={premiumTrigger}
        />
      </div>
    </div>
  );
}
