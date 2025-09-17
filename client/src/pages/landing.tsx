import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fish, Users, Trophy, MapPin, PlusCircle, Menu, X, Info, DollarSign, HelpCircle } from "lucide-react";
import { ContestCategories } from "@/components/contest-categories";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import heroImage from "@assets/Carp_Fishing_1600x500_crop_center_6bc11ee9-9096-425e-8946-560290a33987_2016x630_1758061236097.webp";
export default function Landing() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navigation items
  const navItems = [
    { href: "/register-competition", label: "Zaregistrovať súťaž", icon: Trophy },
    { href: "/register-team", label: "Zaregistrovať tím", icon: Users },
  ];

  // Sample contests data to showcase different categories
  const sampleContests = [
    {
      id: "1",
      name: "Lake Michigan Championship",
      description: "Prestížny turnaj na jednom z najväčších jazier v Severnej Amerike. Súťaž je otvorená pre všetky kategórie rybárov.",
      status: "live" as const,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Michigan, USA"
    },
    {
      id: "2", 
      name: "Rocky Mountain Trophy Hunt",
      description: "Horská súťaž v nádhernom prostredí Rocky Mountains. Registrácia je stále otvorená pre všetky tímy.",
      status: "registration" as const,
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Colorado, USA"
    },
    {
      id: "3",
      name: "Atlantic Coast Masters", 
      description: "Završený turnaj na atlantickom pobreží s vysokou účasťou profesionálnych rybárov z celého sveta.",
      status: "finished" as const,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      location: "North Carolina, USA"
    },
    {
      id: "4",
      name: "European Carp Masters",
      description: "Európska súťaž zameraná na chytanie kaprov. Registrácia je uzavretá, súťaž sa blíži.",
      status: "registration" as const,
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Maďarsko"
    },
    {
      id: "5",
      name: "Northern Pike Challenge",
      description: "Špecializovaná súťaž na chytanie štík v severských jazerách s bohatými cenami.",
      status: "registration" as const,
      startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Fínsko"
    },
    {
      id: "6",
      name: "Mediterranean Bass Tournament",
      description: "Ukončený turnaj na Stredozemnom mori s účasťou najlepších európskych rybárov.",
      status: "finished" as const,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Španielsko"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-white border-b border-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
                  <Fish className="text-primary text-2xl" />
                  <h1 className="text-xl font-bold text-primary">Contestio</h1>
                </div>
              </Link>
              <div className="hidden md:flex items-center space-x-1 bg-muted/20 rounded-full px-3 py-1">
                <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-secondary">Súťaže naživo</span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/about-us">
                  <span 
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 relative after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-primary after:left-0 after:bottom-[-4px] after:transition-all after:duration-200 hover:after:w-full cursor-pointer"
                    data-testid="button-about-us"
                  >
                    O nás
                  </span>
                </Link>
                <Link href="/pricing">
                  <span 
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 relative after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-primary after:left-0 after:bottom-[-4px] after:transition-all after:duration-200 hover:after:w-full cursor-pointer"
                    data-testid="button-pricing"
                  >
                    Cenník
                  </span>
                </Link>
                <Link href="/faq">
                  <span 
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 relative after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-primary after:left-0 after:bottom-[-4px] after:transition-all after:duration-200 hover:after:w-full cursor-pointer"
                    data-testid="button-faq"
                  >
                    FAQ
                  </span>
                </Link>
                <Link href="/contact">
                  <span 
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors duration-200 relative after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-primary after:left-0 after:bottom-[-4px] after:transition-all after:duration-200 hover:after:w-full cursor-pointer"
                    data-testid="button-contact"
                  >
                    Kontakt
                  </span>
                </Link>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                const IconComponent = item.icon;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={`
                      flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                      ${isActive 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }
                    `} data-testid={`nav-${item.href.slice(1)}`}>
                      <IconComponent className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
              
              <div className="w-px h-6 bg-border mx-2"></div>
              
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
                data-testid="button-login"
              >
                Prihlásiť sa
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-border bg-white">
              <div className="px-4 py-3 space-y-2">
                {navItems.map((item) => {
                  const isActive = location === item.href;
                  const IconComponent = item.icon;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <div 
                        className={`
                          flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                          ${isActive 
                            ? 'bg-primary text-primary-foreground shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }
                        `}
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid={`mobile-nav-${item.href.slice(1)}`}
                      >
                        <IconComponent className="w-5 h-5" />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
                
                <Link href="/about-us">
                  <div 
                    className="flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid="mobile-nav-about-us"
                  >
                    <Info className="w-5 h-5" />
                    <span>O nás</span>
                  </div>
                </Link>
                
                <div className="border-t border-border my-2"></div>
                
                <Button 
                  onClick={() => {
                    window.location.href = '/api/login';
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
                  data-testid="mobile-button-login"
                >
                  Prihlásiť sa
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 lg:py-20">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Carp angler casting at sunset with dramatic sky reflection" 
            className="w-full h-full object-cover opacity-40" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-secondary/40"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Rybárske <span className="text-primary">Súťaže</span> Naživo
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Organizujte rybárske súťaže jednoducho a profesionálne
            </p>
            
            {/* Live Stats Banner */}
            <div className="inline-flex items-center space-x-8 bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-lg mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-live-competitions">3</div>
                <div className="text-sm text-muted-foreground">Práve teraz</div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary" data-testid="text-active-teams">127</div>
                <div className="text-sm text-muted-foreground">Aktívne tímy</div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent" data-testid="text-recent-catches">1,843</div>
                <div className="text-sm text-muted-foreground">Úlovkov dnes</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-get-started"
              >
                Začať
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.location.href = '/register-competition'}
                className="border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground font-semibold"
                data-testid="button-register-competition-landing"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Zaregistrovať súťaž
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4 max-w-2xl mx-auto">
              <strong>Organizujete rybársku súťaž?</strong> Zaregistrujte ju u nás a využite profesionálne nástroje 
              pre sledovanie úlovkov, rebríčky a správu tímov v reálnom čase.
            </p>
          </div>
        </div>
      </section>

      {/* Contest Categories */}
      <ContestCategories contests={sampleContests} />

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Fish className="text-2xl" />
              <h3 className="text-xl font-bold">Contestio</h3>
            </div>
            <p className="text-primary-foreground/80 mb-4">
              Najlepšia platforma pre rybárske súťaže naživo.
            </p>
            <div className="text-primary-foreground/80 text-sm">
              © 2024 Contestio. Všetky práva vyhradené.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
