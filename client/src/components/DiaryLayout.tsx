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
import { NotificationCenter } from "@/components/diary/notification-center";
import CatchFormDialog from "@/components/diary/CatchFormDialog";
import { PremiumUpsellModal } from "@/components/PremiumUpsellModal";
import { queryClient } from "@/lib/queryClient";
import { 
  BookOpen, 
  BarChart3, 
  Target, 
  Trophy, 
  LogOut, 
  User,
  Users,
  Fish,
  Calendar,
  Plus,
  Menu,
  X,
  Swords,
  MapPin,
  Cloud,
  Scale,
  Shield,
  CalendarDays,
  Award,
  Lock,
  Sun,
  Moon,
  Package,
  Wrench,
  Crown
} from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import contestioLogo from "@assets/contestio logo_1760283270014.png";
import contestioLogoDark from "@assets/contestio_logo_black_1766308180088.png";

// Type for catch limits response
type CatchLimits = {
  canCreate: boolean;
  currentCount: number;
  limit: number;
};

// Routes where FAB should be hidden (pages with their own primary CTA)
// Uses startsWith() so both exact matches and nested routes are covered
const HIDE_FAB_ROUTES = [
  '/diary/battles',       // Battle list, create, detail, edit, archive
  '/organizer',           // Competition management (dashboard, create, detail)
  '/competition',         // Competition pages (detail, setup, catches)
  '/referee',             // Referee interface
  '/register-competition', // Competition registration form
];

// Type for premium check
type PremiumStatus = {
  isPremium: boolean;
};

interface DiaryLayoutProps {
  children: React.ReactNode;
  fullBleed?: boolean;
}

// Navigation organized into logical sections
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
    icon: Package,
    label: "Môj arzenál",
    href: "/diary/arsenal",
    description: "Nástrahy a vybavenie"
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

// Competitions section - visually separated
const competitionNavigationItems = [
  {
    icon: CalendarDays,
    label: "Súťaže",
    href: "/categories/live",
    description: "Registrácia a live výsledky",
    highlight: true // Special styling for competitions
  }
];

export default function DiaryLayout({ children, fullBleed = false }: DiaryLayoutProps) {
  const { user, isPremium, catchLimits } = useAuthInit();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  
  // Fishing Time Guard - automatic notification 30 min before closing time
  useFishingTimeGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreateCatchOpen, setIsCreateCatchOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [premiumTrigger, setPremiumTrigger] = useState<string | undefined>();

  // Check friend requests count for notification badge
  const { data: friendRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/friend-requests'],
    enabled: !!user?.id,
  });

  // Check if user organizes any competitions
  const { data: organizedCompetitions = [] } = useQuery<any[]>({
    queryKey: ['/api/organizer/competitions'],
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const hasFriendRequests = (friendRequests || []).length > 0;
  const isOrganizer = (organizedCompetitions || []).length > 0;
  
  // Handle FAB click - check limits before opening catch dialog
  const handleFabClick = () => {
    if (!isPremium && catchLimits && !catchLimits.canCreate) {
      setPremiumTrigger("catch_limit");
      setIsPremiumModalOpen(true);
    } else {
      setIsCreateCatchOpen(true);
    }
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const isActivePath = (href: string) => {
    if (href === "/diary") {
      return location === "/diary";
    }
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out
        w-[280px] md:w-[240px] lg:w-[280px] flex-shrink-0
        lg:translate-x-0 lg:static lg:inset-0
        md:translate-x-0 md:static md:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-sidebar-border">
            <Link 
              href="/" 
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
              data-testid="link-home-logo"
            >
              <img src={theme === 'dark' ? contestioLogo : contestioLogoDark} alt="Contestio" className="h-10 md:h-12" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Profile */}
          <div className="p-4 md:p-6 border-b border-sidebar-border">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setLocation("/diary/profile");
                  setSidebarOpen(false);
                  window.scrollTo(0, 0);
                }}
                className="flex items-center space-x-2 md:space-x-3 hover:bg-sidebar-accent rounded-lg p-2 transition-colors group"
                data-testid="button-profile"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 bg-sidebar-accent rounded-full flex items-center justify-center group-hover:bg-sidebar-primary/20">
                  <TacticalIconInline icon={User} variant="blue" size="md" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs md:text-sm font-medium text-sidebar-foreground truncate">
                    {user?.email || "Používateľ"}
                  </p>
                  {isPremium && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs">
                        PREMIUM
                      </Badge>
                    </div>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-1">
                <NotificationCenter />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  data-testid="button-diary-theme-toggle"
                >
                  {theme === 'light' ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 md:px-3 py-4 md:py-6 space-y-1 overflow-y-auto">
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
                        setSidebarOpen(false);
                        window.scrollTo(0, 0);
                      }}
                      className={`
                        w-full flex items-center px-2 md:px-3 py-2 md:py-3 text-sm font-medium rounded-lg transition-all
                        ${isActive 
                          ? 'bg-primary dark:bg-transparent text-primary-foreground dark:bg-gradient-to-r dark:from-blue-600/30 dark:to-purple-600/30 dark:text-white border border-primary/50 dark:border-blue-500/50 shadow-sm dark:shadow-lg dark:shadow-blue-500/20' 
                          : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                        }
                      `}
                      data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    >
                      <TacticalIconInline icon={Icon} variant={isActive ? "lime" : "slate"} size="md" className="mr-2 md:mr-3 flex-shrink-0" />
                      <span className="font-medium text-xs md:text-sm">{item.label}</span>
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
              <div className="px-2 md:px-3 mb-2">
                <div className="h-px bg-gradient-to-r from-transparent via-primary dark:via-blue-500/30 to-transparent"></div>
              </div>
              <div className="px-2 md:px-3 flex items-center gap-1.5">
                <TacticalIconInline icon={Fish} variant="cyan" size="sm" />
                <p className="text-[10px] md:text-xs font-bold text-primary dark:text-cyan-500 uppercase tracking-wider">
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
                        setSidebarOpen(false);
                        window.scrollTo(0, 0);
                      }}
                      className={`
                        w-full flex items-center px-2 md:px-3 py-2 md:py-3 text-sm font-medium rounded-lg transition-all
                        ${isActive 
                          ? 'bg-primary dark:bg-transparent text-primary-foreground dark:bg-gradient-to-r dark:from-blue-600/30 dark:to-purple-600/30 dark:text-white border border-primary/50 dark:border-blue-500/50 shadow-sm dark:shadow-lg dark:shadow-blue-500/20' 
                          : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                        }
                      `}
                      data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    >
                      <TacticalIconInline icon={Icon} variant={isActive ? "cyan" : "slate"} size="md" className="mr-2 md:mr-3 flex-shrink-0" />
                      <span className="font-medium text-xs md:text-sm">{item.label}</span>
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
              <div className="px-2 md:px-3 mb-2">
                <div className="h-px bg-gradient-to-r from-transparent via-amber-600 dark:via-amber-500/30 to-transparent"></div>
              </div>
              <div className="px-2 md:px-3 flex items-center gap-1.5">
                <TacticalIconInline icon={Swords} variant="amber" size="sm" />
                <p className="text-[10px] md:text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                  Súťaže & Komunita
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
                        // Handle premium routing for Fishing Battle
                        if (item.premium && item.label === "Fishing Battle") {
                          const targetHref = isPremium ? "/diary/battles" : "/diary/battles/paywall";
                          setLocation(targetHref);
                        } else {
                          setLocation(item.href);
                        }
                        setSidebarOpen(false);
                        window.scrollTo(0, 0);
                      }}
                      className={`
                        w-full flex items-center px-2 md:px-3 py-2 md:py-3 text-sm font-medium rounded-lg transition-all relative
                        ${isActive 
                          ? 'bg-primary dark:bg-transparent text-primary-foreground dark:bg-gradient-to-r dark:from-blue-600/30 dark:to-purple-600/30 dark:text-white border border-primary/50 dark:border-blue-500/50 shadow-sm dark:shadow-lg dark:shadow-blue-500/20' 
                          : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                        }
                      `}
                      data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    >
                      <TacticalIconInline icon={Icon} variant={isActive ? "amber" : "slate"} size="md" className="mr-2 md:mr-3 flex-shrink-0" />
                      <span className="font-medium text-xs md:text-sm flex items-center gap-2">
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
              <div className="px-2 md:px-3 mb-2">
                <div className="h-px bg-gradient-to-r from-transparent via-amber-600 dark:via-orange-500/30 to-transparent"></div>
              </div>
              <div className="px-2 md:px-3 flex items-center gap-1.5">
                <TacticalIconInline icon={Wrench} variant="orange" size="sm" />
                <p className="text-[10px] md:text-xs font-bold text-orange-600 dark:text-orange-500 uppercase tracking-wider">
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
                        setSidebarOpen(false);
                        window.scrollTo(0, 0);
                      }}
                      className={`
                        w-full flex items-center px-2 md:px-3 py-2 md:py-3 text-sm font-medium rounded-lg transition-all
                        ${isActive 
                          ? 'bg-primary dark:bg-transparent text-primary-foreground dark:bg-gradient-to-r dark:from-blue-600/30 dark:to-purple-600/30 dark:text-white border border-primary/50 dark:border-blue-500/50 shadow-sm dark:shadow-lg dark:shadow-blue-500/20' 
                          : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                        }
                      `}
                      data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    >
                      <TacticalIconInline icon={Icon} variant={isActive ? "orange" : "slate"} size="md" className="mr-2 md:mr-3 flex-shrink-0" />
                      <span className="font-medium text-xs md:text-sm">{item.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-md">
                    <p>{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Section Divider - OFICIÁLNE SÚŤAŽE */}
            <div className="pt-4 pb-2">
              <div className="px-2 md:px-3 mb-2">
                <div className="h-px bg-gradient-to-r from-transparent via-emerald-600 dark:via-emerald-500/50 to-transparent"></div>
              </div>
              <div className="px-2 md:px-3 flex items-center gap-1.5">
                <TacticalIconInline icon={Trophy} variant="emerald" size="sm" />
                <p className="text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">
                  Oficiálne Súťaže
                </p>
              </div>
            </div>

            {/* Competition Section */}
            {competitionNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setLocation(item.href);
                        setSidebarOpen(false);
                        window.scrollTo(0, 0);
                      }}
                      className={`
                        w-full flex items-center px-2 md:px-3 py-2 md:py-3 text-sm font-medium rounded-lg transition-all
                        border-2
                        ${isActive 
                          ? 'bg-emerald-600 dark:bg-transparent text-white dark:bg-gradient-to-r dark:from-emerald-600/40 dark:to-green-600/40 border-emerald-700 dark:border-emerald-500 shadow-sm dark:shadow-lg dark:shadow-emerald-500/30' 
                          : 'text-emerald-800 dark:text-sidebar-foreground bg-emerald-100 dark:bg-emerald-500/5 border-emerald-500 dark:border-emerald-500/30 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 hover:border-emerald-600 dark:hover:border-emerald-500/50'
                        }
                      `}
                      data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    >
                      <TacticalIconInline icon={Icon} variant="emerald" size="md" className="mr-2 md:mr-3 flex-shrink-0" />
                      <span className="font-medium text-xs md:text-sm flex items-center gap-2">
                        {item.label}
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] px-1.5 py-0">
                          LIVE
                        </Badge>
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-md">
                    <p>{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Moje súťaže - only for organizers */}
            {isOrganizer && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setLocation("/organizer");
                      setSidebarOpen(false);
                      window.scrollTo(0, 0);
                    }}
                    className={`
                      w-full flex items-center px-2 md:px-3 py-2 md:py-3 text-sm font-medium rounded-lg transition-all
                      ${isActivePath("/organizer")
                        ? 'bg-primary dark:bg-transparent text-primary-foreground dark:bg-gradient-to-r dark:from-blue-600/30 dark:to-purple-600/30 dark:text-white border border-primary/50 dark:border-blue-500/50 shadow-sm dark:shadow-lg dark:shadow-blue-500/20' 
                        : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                      }
                    `}
                    data-testid="nav-moje-sutaze"
                  >
                    <TacticalIconInline icon={Crown} variant={isActivePath("/organizer") ? "amber" : "slate"} size="md" className="mr-2 md:mr-3 flex-shrink-0" />
                    <span className="font-medium text-xs md:text-sm">Moje súťaže</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-md">
                  <p>Správa mojich súťaží</p>
                </TooltipContent>
              </Tooltip>
            )}
            </TooltipProvider>
          </nav>

          {/* Admin Panel Button (only for admin users) */}
          {user?.role === 'admin' && (
            <div className="px-6 pb-4">
              <Button
                variant="default"
                onClick={() => {
                  setLocation('/admin-panel');
                  setSidebarOpen(false);
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

          {/* Logout */}
          <div className="p-6 border-t border-sidebar-border">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              data-testid="button-logout"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Odhlásiť sa
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 w-full overflow-x-hidden">
        {/* Mobile header */}
        <div className="md:hidden bg-sidebar border-b border-sidebar-border p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base font-semibold text-sidebar-foreground truncate px-2">Môj rybársky denník</h1>
            <div className="w-8" /> {/* Spacer */}
          </div>
        </div>

        {/* Content area */}
        <main className="min-h-screen bg-background pb-16 md:pb-0 w-full">
          <div className={fullBleed ? "w-full" : "w-full max-w-screen-xl mx-auto px-4 md:px-6 py-4 md:py-6"}>
            {children}
          </div>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 overflow-x-auto">
          <div className="flex min-w-max">
            {/* Top 4 most important items for mobile */}
            {[...mainSection, ...fishingLifeSection.slice(0, 2), ...communitySection.slice(0, 1)].map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    setLocation(item.href);
                    window.scrollTo(0, 0);
                  }}
                  className={`
                    flex flex-col items-center justify-center space-y-1 transition-colors px-4 py-2 min-w-[20%] flex-1
                    ${isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                  data-testid={`mobile-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-[10px] font-medium truncate max-w-full">{item.label}</span>
                </button>
              );
            })}
            
            {/* Competition button with special styling */}
            {competitionNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    setLocation(item.href);
                    window.scrollTo(0, 0);
                  }}
                  className={`
                    flex flex-col items-center justify-center space-y-1 transition-colors px-4 py-2 min-w-[20%] flex-1
                    ${isActive 
                      ? 'text-emerald-400 bg-emerald-500/20' 
                      : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                    }
                  `}
                  data-testid={`mobile-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-[10px] font-medium truncate max-w-full">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Floating Action Button for Quick Catch Entry */}
        {/* Hidden on pages with their own primary CTA (battle detail, organizer, competition) */}
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
            // Invalidate all diary-related queries to ensure UI updates everywhere
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