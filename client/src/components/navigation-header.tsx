import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fish, Menu, DollarSign, Bell, Sun, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function NavigationHeader() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const headerRef = useRef<HTMLElement>(null);

  // Dynamically measure header height and set CSS custom property
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };

    // Delay to ensure DOM is fully rendered
    setTimeout(updateHeaderHeight, 100);
    window.addEventListener('resize', updateHeaderHeight);
    
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'organizer':
        return 'Panel organizátora';
      case 'admin':
        return 'Admin panel';
      case 'referee':
        return 'Rozhranie rozhodcu';
      default:
        return 'Verejné zobrazenie';
    }
  };

  const handleRoleChange = (newRole: string) => {
    switch (newRole) {
      case 'public':
        setLocation('/');
        break;
      case 'organizer':
        setLocation('/admin-panel');
        break;
      case 'admin':
        setLocation('/admin-panel');
        break;
      case 'referee':
        setLocation('/referee-interface');
        break;
    }
  };

  return (
    <header ref={headerRef} className="bg-sidebar border-b border-sidebar-border shadow-lg fixed top-0 left-0 right-0 z-[9999]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
              <Fish className="text-sidebar-primary text-2xl" />
              <h1 className="text-xl font-bold text-sidebar-foreground">Contestio</h1>
            </Link>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/pricing" 
              className={`font-medium transition-colors ${
                location === '/pricing' ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              }`}
              data-testid="nav-pricing"
            >
              Cenník
            </Link>
            <Link 
              href="/faq" 
              className={`font-medium transition-colors ${
                location === '/faq' ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              }`}
              data-testid="nav-faq"
            >
              FAQ
            </Link>
            <Link 
              href="/about-us" 
              className={`font-medium transition-colors ${
                location === '/about-us' ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              }`}
              data-testid="nav-about-us"
            >
              O nás
            </Link>
            <Link 
              href="/contact" 
              className={`font-medium transition-colors ${
                location === '/contact' ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              }`}
              data-testid="nav-contact"
            >
              Kontakt
            </Link>
            {isAuthenticated && (
              <Link 
                href="/diary" 
                className={`font-medium transition-colors ${
                  location.startsWith('/diary') ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                }`}
                data-testid="nav-diary"
              >
                Denník
              </Link>
            )}
          </nav>
          
          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
              data-testid="button-theme-toggle"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
            {isAuthenticated && user && (
              <div className="hidden sm:flex items-center space-x-2">
                <Select 
                  value={user.role} 
                  onValueChange={handleRoleChange}
                  data-testid="select-role"
                >
                  <SelectTrigger className="w-40 bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
                    <SelectItem value="public" className="text-sidebar-foreground focus:bg-sidebar-primary focus:text-sidebar-primary-foreground">Verejné zobrazenie</SelectItem>
                    {user.role === 'organizer' && (
                      <SelectItem value="organizer" className="text-sidebar-foreground focus:bg-sidebar-primary focus:text-sidebar-primary-foreground">Panel organizátora</SelectItem>
                    )}
                    {user.role === 'admin' && (
                      <SelectItem value="admin" className="text-sidebar-foreground focus:bg-sidebar-primary focus:text-sidebar-primary-foreground">Admin panel</SelectItem>
                    )}
                    {user.role === 'referee' && (
                      <SelectItem value="referee" className="text-sidebar-foreground focus:bg-sidebar-primary focus:text-sidebar-primary-foreground">Rozhranie rozhodcu</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {(user?.role === 'organizer' || user?.role === 'admin') && (
              <Button 
                className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                onClick={() => setLocation('/admin-panel')}
                data-testid="button-admin-panel"
              >
                Admin panel
              </Button>
            )}
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                {user?.profileImageUrl && (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profil" 
                    className="w-8 h-8 rounded-full object-cover"
                    data-testid="img-profile"
                  />
                )}
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => setLocation('/notification-preferences')}
                  data-testid="button-notification-preferences"
                  title="Nastavenia notifikácií"
                  className="bg-transparent border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus:bg-sidebar-accent focus:text-sidebar-foreground"
                >
                  <Bell className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    try {
                      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                      window.location.href = '/';
                    } catch (error) {
                      console.error('Logout error:', error);
                      window.location.href = '/';
                    }
                  }}
                  data-testid="button-logout"
                  className="bg-transparent border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus:bg-sidebar-accent focus:text-sidebar-foreground"
                >
                  Odhlásiť sa
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/auth/login'}
                  data-testid="button-login"
                  className="bg-transparent border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus:bg-sidebar-accent focus:text-sidebar-foreground"
                >
                  Prihlásiť sa
                </Button>
                <Link href="/register">
                  <Button 
                    className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                    data-testid="button-register"
                  >
                    Zaregistrovať sa
                  </Button>
                </Link>
              </div>
            )}
            
            <Button variant="ghost" className="md:hidden text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
