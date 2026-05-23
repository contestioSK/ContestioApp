import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Heart } from "lucide-react";
import { NotificationCenter } from "@/components/diary/notification-center";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import privodeLogo from "@assets/privode_logo_cropped.png";

export default function NavigationHeader() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };

    setTimeout(updateHeaderHeight, 100);
    window.addEventListener('resize', updateHeaderHeight);
    
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  const navItems = [
    { href: "/about-us", label: "O nás" },
    { href: "/faq", label: "FAQ" },
    { href: "/pricing", label: "Cenník" },
    { href: "/contact", label: "Kontakt" },
  ];

  return (
    <header 
      ref={headerRef} 
      className="fixed top-0 left-0 right-0 z-[9999]"
      style={{ backgroundColor: '#0c1425' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center" data-testid="link-home">
              <img src={privodeLogo} alt="PriVode" className="h-7" />
            </Link>
          </div>
          
          {/* Desktop Navigation Links - Pill Container */}
          <nav className="hidden md:flex items-center">
            <div className="flex items-center space-x-1 px-2 py-1.5 rounded-full border border-white/20 bg-white/5">
              {navItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    location === item.href 
                      ? 'text-cyan-500' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                  data-testid={`nav-${item.href.slice(1) || 'home'}`}
                >
                  {item.label}
                </Link>
              ))}
              {isAuthenticated && (
                <Link 
                  href="/diary" 
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    location.startsWith('/diary') 
                      ? 'text-cyan-500' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                  data-testid="nav-diary"
                >
                  Denník
                </Link>
              )}
            </div>
          </nav>
          
          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user && (
              <div className="hidden sm:flex items-center space-x-2">
                <ModeSwitcher />
              </div>
            )}
            
            {user?.role === 'admin' && (
              <Button 
                className="bg-cyan-500 text-white hover:bg-cyan-600 text-sm"
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
                <Link 
                  href="/favorites"
                  className={`p-2 rounded-md transition-colors ${
                    location.startsWith('/favorites') 
                      ? 'text-red-500' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                  data-testid="nav-favorites"
                >
                  <Heart className={`h-5 w-5 ${location.startsWith('/favorites') ? 'fill-current' : ''}`} />
                </Link>
                <NotificationCenter />
                <Button 
                  variant="outline"
                  onClick={() => {
                    window.location.href = '/api/logout';
                  }}
                  data-testid="button-logout"
                  className="bg-transparent border-white/30 text-gray-300 hover:bg-white/10 hover:text-white text-sm"
                >
                  Odhlásiť sa
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Link href="/auth/login">
                  <Button 
                    data-testid="button-login"
                    className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white text-sm px-6 rounded-lg shadow-lg shadow-orange-500/25"
                  >
                    Prihlásiť sa
                  </Button>
                </Link>
                <Link href="/register">
                  <Button 
                    variant="outline"
                    data-testid="button-register"
                    className="bg-transparent border-white/20 text-white hover:bg-white/10 text-sm px-6 rounded-lg"
                  >
                    Zaregistrovať sa
                  </Button>
                </Link>
              </div>
            )}
            
            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              className="md:hidden text-gray-300 hover:bg-white/10 hover:text-white" 
              data-testid="button-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10" style={{ backgroundColor: '#0c1425' }}>
          <div className="px-4 py-4 space-y-3">
            {navItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href} 
                className={`block py-2 text-sm font-medium transition-colors ${
                  location === item.href 
                    ? 'text-cyan-500' 
                    : 'text-gray-300 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {isAuthenticated && (
              <Link 
                href="/diary" 
                className={`block py-2 text-sm font-medium transition-colors ${
                  location.startsWith('/diary') 
                    ? 'text-cyan-500' 
                    : 'text-gray-300 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Denník
              </Link>
            )}
            {!isAuthenticated && (
              <div className="pt-4 space-y-3 border-t border-white/10">
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    data-testid="button-login-mobile"
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white text-sm shadow-lg shadow-orange-500/25"
                  >
                    Prihlásiť sa
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant="outline"
                    data-testid="button-register-mobile"
                    className="w-full bg-transparent border-white/30 text-white hover:bg-white/10 text-sm"
                  >
                    Zaregistrovať sa
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
