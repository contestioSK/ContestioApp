import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search, X } from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import RoleSwitcher from "./RoleSwitcher";
import UserMenu from "./UserMenu";
import MobileMenu from "./MobileMenu";
import contestioLogo from "@assets/contestio logo_1760283270014.png";
import contestioLogoDark from "@assets/contestio_logo_black_1766308180088.png";

export default function TopBar() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { activeMode, hasMultipleRoles } = useUserMode();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogoClick = () => {
    switch (activeMode) {
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

  const getModeLabel = () => {
    switch (activeMode) {
      case 'referee':
        return 'Rozhodca';
      case 'organizer':
        return 'Organizátor';
      default:
        return 'Denník';
    }
  };

  const getModeColor = () => {
    switch (activeMode) {
      case 'referee':
      case 'organizer':
        return 'text-orange-500';
      default:
        return 'text-cyan-500';
    }
  };

  if (!user) return null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between h-full px-4 md:px-6">
          {/* Left Section - Mobile Menu + Logo + Mode */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Logo */}
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              data-testid="topbar-logo"
            >
              <img 
                src={theme === 'dark' ? contestioLogo : contestioLogoDark} 
                alt="Contestio" 
                className="h-8 md:h-9" 
              />
              <span className={`hidden md:inline-block text-sm font-medium ${getModeColor()}`}>
                {getModeLabel()}
              </span>
            </button>
          </div>

          {/* Center Section - Global Search (Desktop only) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Hľadať súťaže, revíry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border/50 focus:border-primary/50 h-10"
                data-testid="topbar-search"
              />
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Mobile Search Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileSearchOpen(true)}
              data-testid="button-mobile-search"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Notifications */}
            <NotificationsDropdown />

            {/* Role Switcher (only if has multiple roles) */}
            {hasMultipleRoles && (
              <div className="hidden md:block">
                <RoleSwitcher />
              </div>
            )}

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSearchOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <Input
              type="text"
              placeholder="Hľadať súťaže, revíry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              autoFocus
              data-testid="mobile-search-input"
            />
          </div>
          <div className="p-4 text-center text-muted-foreground">
            <p className="text-sm">Vyhľadávanie bude dostupné čoskoro</p>
          </div>
        </div>
      )}
    </>
  );
}
