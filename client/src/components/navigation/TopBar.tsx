import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Menu, Search } from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import UserMenu from "./UserMenu";
import MobileMenu from "./MobileMenu";
import DiarySearch from "./DiarySearch";
import contestioLogo from "@assets/contestio logo_1760283270014.png";
import contestioLogoDark from "@assets/contestio_logo_black_1766308180088.png";

export default function TopBar() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const handleLogoClick = () => {
    setLocation('/diary');
  };

  if (!user) return null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl">
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
              <Menu className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
            </Button>

            {/* Logo */}
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              data-testid="topbar-logo"
            >
              <img 
                src={theme === 'dark' ? contestioLogo : contestioLogoDark} 
                alt="PriVode" 
                className="h-8 md:h-9" 
              />
            </button>
          </div>

          {/* Center Section - Global Search (Desktop only) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <DiarySearch className="w-full" />
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
              <Search className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
            </Button>

            {/* Notifications */}
            <NotificationsDropdown />


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
        <DiarySearch isMobile onClose={() => setIsMobileSearchOpen(false)} />
      )}
    </>
  );
}
