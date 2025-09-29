import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fish, Menu, DollarSign, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function NavigationHeader() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

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
    <header className="bg-[#012a36] border-b border-slate-600 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
              <Fish className="text-blue-400 text-2xl" />
              <h1 className="text-xl font-bold text-white">Contestio</h1>
            </Link>
            <div className="hidden md:flex items-center space-x-1 bg-slate-700/50 rounded-full px-3 py-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-green-400">Živé súťaže</span>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className={`font-medium transition-colors ${
                location === '/' ? 'text-blue-400' : 'text-slate-300 hover:text-white'
              }`}
              data-testid="nav-competitions"
            >
              Súťaže
            </Link>
            <Link 
              href="/pricing" 
              className={`font-medium transition-colors ${
                location === '/pricing' ? 'text-blue-400' : 'text-slate-300 hover:text-white'
              }`}
              data-testid="nav-pricing"
            >
              Cenník
            </Link>
            <Link 
              href="/faq" 
              className={`font-medium transition-colors ${
                location === '/faq' ? 'text-blue-400' : 'text-slate-300 hover:text-white'
              }`}
              data-testid="nav-faq"
            >
              FAQ
            </Link>
            <Link 
              href="/about-us" 
              className={`font-medium transition-colors ${
                location === '/about-us' ? 'text-blue-400' : 'text-slate-300 hover:text-white'
              }`}
              data-testid="nav-about-us"
            >
              O nás
            </Link>
            <Link 
              href="/contact" 
              className={`font-medium transition-colors ${
                location === '/contact' ? 'text-blue-400' : 'text-slate-300 hover:text-white'
              }`}
              data-testid="nav-contact"
            >
              Kontakt
            </Link>
            {isAuthenticated && (
              <Link 
                href="/diary" 
                className={`font-medium transition-colors ${
                  location.startsWith('/diary') ? 'text-blue-400' : 'text-slate-300 hover:text-white'
                }`}
                data-testid="nav-diary"
              >
                Denník
              </Link>
            )}
          </nav>
          
          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user && (
              <div className="hidden sm:flex items-center space-x-2">
                <Select 
                  value={user.role} 
                  onValueChange={handleRoleChange}
                  data-testid="select-role"
                >
                  <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    <SelectItem value="public" className="text-white focus:bg-slate-600 focus:text-white">Verejné zobrazenie</SelectItem>
                    {user.role === 'organizer' && (
                      <SelectItem value="organizer" className="text-white focus:bg-slate-600 focus:text-white">Panel organizátora</SelectItem>
                    )}
                    {user.role === 'admin' && (
                      <SelectItem value="admin" className="text-white focus:bg-slate-600 focus:text-white">Admin panel</SelectItem>
                    )}
                    {user.role === 'referee' && (
                      <SelectItem value="referee" className="text-white focus:bg-slate-600 focus:text-white">Rozhranie rozhodcu</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {(user?.role === 'organizer' || user?.role === 'admin') && (
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700"
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
                  className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white focus:bg-slate-700 focus:text-white"
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
                  className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white focus:bg-slate-700 focus:text-white"
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
                  className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white focus:bg-slate-700 focus:text-white"
                >
                  Prihlásiť sa
                </Button>
                <Link href="/register">
                  <Button 
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    data-testid="button-register"
                  >
                    Zaregistrovať sa
                  </Button>
                </Link>
              </div>
            )}
            
            <Button variant="ghost" className="md:hidden text-slate-300 hover:bg-slate-700 hover:text-white" data-testid="button-menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
