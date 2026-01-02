import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  LayoutDashboard,
  Trophy,
  Plus,
  LogOut, 
  User,
  Menu,
  X,
  Sun,
  Moon,
  ArrowLeft
} from "lucide-react";
import { TacticalIconInline } from "@/components/ui/tactical-icon";
import contestioLogo from "@assets/contestio logo_1760283270014.png";
import contestioLogoDark from "@assets/contestio_logo_black_1766308180088.png";

interface OrganizerLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    icon: LayoutDashboard,
    label: "Prehľad",
    href: "/organizer",
    description: "Hlavný dashboard"
  },
  {
    icon: Trophy,
    label: "Moje súťaže",
    href: "/organizer/competitions",
    description: "Zoznam vašich súťaží"
  },
  {
    icon: Plus,
    label: "Vytvoriť súťaž",
    href: "/organizer/create",
    description: "Nová súťaž"
  }
];

export default function OrganizerLayout({ children }: OrganizerLayoutProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const isActivePath = (href: string) => {
    if (href === "/organizer") {
      return location === "/organizer";
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
              <div className="flex items-center space-x-2 md:space-x-3 p-2">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-sidebar-accent rounded-full flex items-center justify-center">
                  <TacticalIconInline icon={User} variant="amber" size="md" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs md:text-sm font-medium text-sidebar-foreground truncate">
                    {user?.email || "Organizátor"}
                  </p>
                  <p className="text-[10px] md:text-xs text-sidebar-foreground/60">
                    Organizátor súťaží
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  data-testid="button-organizer-theme-toggle"
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
              {/* Section Header */}
              <div className="pb-2">
                <div className="px-2 md:px-3 flex items-center gap-1.5">
                  <TacticalIconInline icon={Trophy} variant="amber" size="sm" />
                  <p className="text-[10px] md:text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                    Správa súťaží
                  </p>
                </div>
              </div>

              {navigationItems.map((item) => {
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
                            ? 'bg-primary dark:bg-transparent text-primary-foreground dark:bg-gradient-to-r dark:from-amber-600/30 dark:to-orange-600/30 dark:text-white border border-primary/50 dark:border-amber-500/50 shadow-sm dark:shadow-lg dark:shadow-amber-500/20' 
                            : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                          }
                        `}
                        data-testid={`nav-organizer-${item.label.toLowerCase().replace(' ', '-')}`}
                      >
                        <TacticalIconInline icon={Icon} variant={isActive ? "amber" : "slate"} size="md" className="mr-2 md:mr-3 flex-shrink-0" />
                        <span className="font-medium text-xs md:text-sm">{item.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-md">
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Divider */}
              <div className="pt-4 pb-2">
                <div className="px-2 md:px-3">
                  <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent"></div>
                </div>
              </div>

              {/* Back to Diary */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setLocation('/diary');
                      setSidebarOpen(false);
                    }}
                    className="w-full flex items-center px-2 md:px-3 py-2 md:py-3 text-sm font-medium rounded-lg transition-all text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    data-testid="nav-back-to-diary"
                  >
                    <TacticalIconInline icon={ArrowLeft} variant="slate" size="md" className="mr-2 md:mr-3 flex-shrink-0" />
                    <span className="font-medium text-xs md:text-sm">Späť do denníka</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground border shadow-md">
                  <p>Vrátiť sa do rybárskeho denníka</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </nav>

          {/* Logout */}
          <div className="p-6 border-t border-sidebar-border">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              data-testid="button-organizer-logout"
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
              className="text-sidebar-foreground"
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <img src={theme === 'dark' ? contestioLogo : contestioLogoDark} alt="Contestio" className="h-8" />
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-sidebar-foreground"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
