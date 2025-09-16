import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fish, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function NavigationHeader() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'organizer':
        return 'Panel organizátora';
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
      case 'referee':
        setLocation('/referee-interface');
        break;
    }
  };

  return (
    <header className="bg-white border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
              <Fish className="text-primary text-2xl" />
              <h1 className="text-xl font-bold text-primary">Contestio</h1>
            </Link>
            <div className="hidden md:flex items-center space-x-1 bg-muted/20 rounded-full px-3 py-1">
              <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-secondary">Živé súťaže</span>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className={`font-medium transition-colors ${
                location === '/' ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              }`}
              data-testid="nav-competitions"
            >
              Súťaže
            </Link>
            <a href="#archive" className="text-muted-foreground hover:text-primary transition-colors">
              Archív
            </a>
            <a href="#about" className="text-muted-foreground hover:text-primary transition-colors">
              O nás
            </a>
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
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Verejné zobrazenie</SelectItem>
                    {user.role === 'organizer' && (
                      <SelectItem value="organizer">Panel organizátora</SelectItem>
                    )}
                    {user.role === 'referee' && (
                      <SelectItem value="referee">Rozhranie rozhodcu</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {user?.role === 'organizer' && (
              <Button 
                className="bg-accent text-accent-foreground hover:bg-accent/90"
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
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-logout"
                >
                  Odhlásiť sa
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                data-testid="button-login"
              >
                Prihlásiť sa
              </Button>
            )}
            
            <Button variant="ghost" className="md:hidden" data-testid="button-menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
