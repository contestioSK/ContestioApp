import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationCenter } from "@/components/diary/notification-center";
import CatchFormDialog from "@/components/diary/CatchFormDialog";
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
  Award
} from "lucide-react";
import contestioLogo from "@assets/contestio logo_1760283270014.png";

// Type for premium check
type PremiumStatus = {
  isPremium: boolean;
};

interface DiaryLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    icon: BookOpen,
    label: "Denník",
    href: "/diary",
    description: "Hlavný prehľad"
  },
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
    icon: Cloud,
    label: "Predpoveď počasia",
    href: "/diary/weather-forecast",
    description: "3-dňová predpoveď"
  },
  {
    icon: BarChart3,
    label: "Štatistiky", 
    href: "/diary/stats",
    description: "Analýzy úlovkov"
  },
  {
    icon: Target,
    label: "Ciele",
    href: "/diary/seasonal-goals", 
    description: "Sezónne ciele"
  },
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
  },
  {
    icon: Scale,
    label: "Rybársky poriadok",
    href: "/diary/fishing-rules",
    description: "Pravidlá a predpisy"
  },
  {
    icon: Trophy,
    label: "Arzenál",
    href: "/diary/arsenal",
    description: "Vybavenie a návnady"
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

export default function DiaryLayout({ children }: DiaryLayoutProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreateCatchOpen, setIsCreateCatchOpen] = useState(false);

  // Check premium status
  const { data: premiumStatus } = useQuery<PremiumStatus>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id
  });

  const isPremium = premiumStatus?.isPremium || false;

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
        w-[280px] md:w-[240px] lg:w-[280px]
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
              <img src={contestioLogo} alt="Contestio" className="h-10 md:h-12" />
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
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setLocation("/diary/profile");
                  setSidebarOpen(false);
                }}
                className="flex-1 flex items-center space-x-2 md:space-x-3 hover:bg-sidebar-accent rounded-lg p-2 transition-colors group"
                data-testid="button-profile"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 bg-sidebar-accent rounded-full flex items-center justify-center group-hover:bg-sidebar-primary/20">
                  <User className="h-4 w-4 md:h-6 md:w-6 text-sidebar-accent-foreground group-hover:text-sidebar-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs md:text-sm font-medium text-sidebar-foreground truncate">
                    {user?.email || "Používateľ"}
                  </p>
                  {isPremium && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-sidebar-primary/20 text-sidebar-primary border-sidebar-primary/30 text-xs">
                        PREMIUM
                      </Badge>
                    </div>
                  )}
                </div>
              </button>
              <NotificationCenter />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 md:px-3 py-4 md:py-6 space-y-1 overflow-y-auto">
            {/* Diary Section */}
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    // Handle premium routing for Fishing Battle
                    if (item.premium && item.label === "Fishing Battle") {
                      const targetHref = isPremium ? "/diary/battles" : "/diary/battles/paywall";
                      setLocation(targetHref);
                    } else {
                      setLocation(item.href);
                    }
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center px-2 md:px-3 py-2 md:py-3 text-sm font-medium rounded-lg transition-all
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-white border border-blue-500/50 shadow-lg shadow-blue-500/20' 
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                    }
                  `}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-medium text-xs md:text-sm flex items-center gap-2">
                      {item.label}
                      {item.premium && !isPremium && (
                        <Badge variant="secondary" className="bg-sidebar-primary/20 text-sidebar-primary border-sidebar-primary/30 text-xs px-1 py-0">
                          PREMIUM
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-sidebar-foreground/50 hidden md:block">{item.description}</div>
                  </div>
                </button>
              );
            })}

            {/* Section Divider */}
            <div className="pt-4 pb-2">
              <div className="px-2 md:px-3 mb-2">
                <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
              </div>
              <div className="px-2 md:px-3">
                <p className="text-[10px] md:text-xs font-bold text-emerald-500/80 uppercase tracking-wider">
                  Oficiálne Súťaže
                </p>
              </div>
            </div>

            {/* Competition Section */}
            {competitionNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    setLocation(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center px-2 md:px-3 py-2 md:py-3 text-sm font-medium rounded-lg transition-all
                    border-2
                    ${isActive 
                      ? 'bg-gradient-to-r from-emerald-600/40 to-green-600/40 text-white border-emerald-500 shadow-lg shadow-emerald-500/30' 
                      : 'text-sidebar-foreground bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50'
                    }
                  `}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5 flex-shrink-0 text-emerald-400" />
                  <div className="text-left flex-1">
                    <div className="font-medium text-xs md:text-sm flex items-center gap-2">
                      {item.label}
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] px-1.5 py-0">
                        LIVE
                      </Badge>
                    </div>
                    <div className="text-xs text-sidebar-foreground/70 hidden md:block">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Admin Panel Button (only for admin users) */}
          {user?.role === 'admin' && (
            <div className="px-6 pb-4">
              <Button
                variant="default"
                onClick={() => {
                  setLocation('/admin-panel');
                  setSidebarOpen(false);
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
      <div className="flex-1 w-full max-w-full overflow-x-hidden">
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
        <main className="min-h-screen bg-background pb-16 md:pb-0 w-full max-w-full">
          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 overflow-x-auto">
          <div className="flex min-w-max">
            {navigationItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    // Handle premium routing for Fishing Battle
                    if (item.premium && item.label === "Fishing Battle") {
                      const targetHref = isPremium ? "/diary/battles" : "/diary/battles/paywall";
                      setLocation(targetHref);
                    } else {
                      setLocation(item.href);
                    }
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
                  onClick={() => setLocation(item.href)}
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
        <Button
          onClick={() => setIsCreateCatchOpen(true)}
          className="fixed bottom-20 right-6 md:bottom-6 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 z-50 transition-all hover:scale-110"
          data-testid="fab-add-catch"
          aria-label="Pridať úlovok"
        >
          <Plus className="h-6 w-6 text-white" />
        </Button>

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
      </div>
    </div>
  );
}