import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  BarChart3, 
  Target, 
  Trophy, 
  LogOut, 
  User,
  Fish,
  Calendar,
  Plus,
  Menu,
  X,
  Swords
} from "lucide-react";

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
    icon: Swords,
    label: "Fishing Battle",
    href: "/diary/battle/archive",
    description: "Súťažné súboje",
    premium: true
  },
  {
    icon: Trophy,
    label: "Arzenál",
    href: "/diary/arsenal",
    description: "Vybavenie a návnady"
  }
];

export default function DiaryLayout({ children }: DiaryLayoutProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check premium status
  const { data: premiumStatus } = useQuery<PremiumStatus>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user
  });

  const isPremium = premiumStatus?.isPremium || false;

  const handleLogout = () => {
    // TODO: Implement logout functionality
    setLocation("/");
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
        fixed inset-y-0 left-0 z-50 bg-sidebar transform transition-transform duration-300 ease-in-out
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
              className="flex items-center space-x-2 md:space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
              data-testid="link-home-logo"
            >
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <Fish className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <h1 className="text-lg md:text-xl font-bold text-sidebar-foreground">Contestio</h1>
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
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-sidebar-accent rounded-full flex items-center justify-center">
                <User className="h-4 w-4 md:h-6 md:w-6 text-sidebar-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-sidebar-foreground truncate">
                  {user?.email || "Používateľ"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-sidebar-primary/20 text-sidebar-primary border-sidebar-primary/30 text-xs">
                    PREMIUM
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 md:px-3 py-4 md:py-6 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    // Handle premium routing for Fishing Battle
                    if (item.premium && item.label === "Fishing Battle") {
                      const targetHref = isPremium ? "/diary/battle/archive" : "/diary/battle/paywall";
                      setLocation(targetHref);
                    } else {
                      setLocation(item.href);
                    }
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center px-2 md:px-3 py-2 md:py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/30' 
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                    }
                  `}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-medium text-xs md:text-sm flex items-center gap-2">
                      {item.label}
                      {item.premium && (
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
          </nav>

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
      <div className="flex-1 lg:ml-0">
        {/* Mobile header */}
        <div className="md:hidden bg-sidebar border-b border-sidebar-border p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-sidebar-foreground">Môj rybársky denník</h1>
            <div className="w-8" /> {/* Spacer */}
          </div>
        </div>

        {/* Content area */}
        <main className="min-h-screen bg-background pb-16 md:pb-0">
          {children}
        </main>
        
        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#012a36] border-t border-white/10 z-50">
          <div className="grid grid-cols-4 h-16">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.href);
              
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    // Handle premium routing for Fishing Battle
                    if (item.premium && item.label === "Fishing Battle") {
                      const targetHref = isPremium ? "/diary/battle/archive" : "/diary/battle/paywall";
                      setLocation(targetHref);
                    } else {
                      setLocation(item.href);
                    }
                  }}
                  className={`
                    flex flex-col items-center justify-center space-y-1 transition-colors
                    ${isActive 
                      ? 'text-blue-400' 
                      : 'text-white/70 hover:text-white'
                    }
                  `}
                  data-testid={`mobile-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}