import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useUserMode, type UserMode } from "@/contexts/UserModeContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  Package
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

  const navItems = [
    { icon: BookOpen, label: "Denník", href: "/diary" },
    { icon: Fish, label: "Moje úlovky", href: "/diary/catches" },
    { icon: MapPin, label: "Rybárske výpravy", href: "/diary/trips" },
    { icon: Package, label: "Môj arzenál", href: "/diary/arsenal" },
    { icon: BarChart3, label: "Štatistiky", href: "/diary/stats" },
  ];

  const communityItems = [
    { icon: Users, label: "Priatelia", href: "/friends" },
    { icon: Swords, label: "Fishing Battle", href: isPremium ? "/diary/battles" : "/diary/battles/paywall", premium: true },
  ];

  const toolsItems = [
    { icon: Cloud, label: "Počasie", href: "/diary/weather-forecast" },
    { icon: Scale, label: "Rybársky poriadok", href: "/diary/fishing-rules" },
    { icon: Target, label: "Ciele", href: "/diary/seasonal-goals" },
    { icon: Award, label: "Odznaky", href: "/diary/badges" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0 bg-card">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100vh-60px)]">
          {/* Role Switcher (if has multiple roles) */}
          {hasMultipleRoles && (
            <div className="p-4 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Režim
              </p>
              <div className="space-y-1">
                {availableRoles.includes('user') && (
                  <button
                    onClick={() => handleModeChange('user')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      activeMode === 'user' 
                        ? "bg-cyan-500/10 text-cyan-500" 
                        : "hover:bg-muted"
                    )}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm">Denník</span>
                  </button>
                )}
                {availableRoles.includes('referee') && refereeCompetitions.length > 0 && (
                  <button
                    onClick={() => handleModeChange('referee', refereeCompetitions[0]?.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      activeMode === 'referee' 
                        ? "bg-orange-500/10 text-orange-500" 
                        : "hover:bg-muted"
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">Rozhodca</span>
                  </button>
                )}
                {availableRoles.includes('organizer') && (
                  <button
                    onClick={() => handleModeChange('organizer')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      activeMode === 'organizer' 
                        ? "bg-orange-500/10 text-orange-500" 
                        : "hover:bg-muted"
                    )}
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">Organizátor</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Môj rybársky život
            </p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavigation(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Community */}
          <div className="p-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Komunita
            </p>
            <div className="space-y-1">
              {communityItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavigation(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.premium && !isPremium && (
                      <Badge variant="secondary" className="ml-auto bg-amber-500/20 text-amber-500 text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        PREMIUM
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tools */}
          <div className="p-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Nástroje
            </p>
            <div className="space-y-1">
              {toolsItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavigation(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Competitions */}
          <div className="p-4 border-t border-border">
            <button
              onClick={() => handleNavigation('/categories/live')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                "bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
              )}
            >
              <Trophy className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-500">Oficiálne súťaže</span>
              <Badge className="ml-auto bg-emerald-500 text-white text-xs">LIVE</Badge>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
