import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fish, Users, Trophy, MapPin, PlusCircle, Menu, X, Info, DollarSign, HelpCircle, BarChart3, Target, Zap, BookOpen, Crown } from "lucide-react";
import { ContestCategories } from "@/components/contest-categories";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import heroImage from "@assets/Carp_Fishing_1600x500_crop_center_6bc11ee9-9096-425e-8946-560290a33987_2016x630_1758061236097.webp";
interface Competition {
  id: string;
  name: string;
  description: string;
  location: string;
  status: 'registration' | 'live' | 'finished';
  startDate: string;
  endDate: string;
}

export default function Landing() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  
  // Fetch real competitions from API
  const { data: competitions = [], isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"]
  });

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      description: "Prestížna súťaž na jednom z najväčších jazier v Severnej Amerike. Súťaž je otvorená pre všetky kategórie rybárov.",
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
      description: "Završená súťaž na atlantickom pobreží s vysokou účasťou profesionálnych rybárov z celého sveta.",
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
      description: "Ukončená súťaž na Stredozemnom mori s účasťou najlepších európskych rybárov.",
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

      {/* Diagonal Hero Section */}
      <section className="relative h-[480px] sm:h-[560px] md:h-[600px] lg:h-[640px] overflow-hidden">
        {/* Background with 75° diagonal split */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(165deg, 
              rgb(29, 78, 216) 0%, 
              rgb(29, 78, 216) 49.8%, 
              rgb(34, 197, 94) 50.2%, 
              rgb(34, 197, 94) 100%
            )`
          }}
        />
        
        {/* Content Container */}
        <div className="relative z-10 h-full flex flex-col md:flex-row">
          {/* Competition Section */}
          <div 
            className="flex-1 flex items-center justify-center md:justify-start text-white px-4 sm:px-6 md:px-8 py-8"
            style={{
              transform: `translateY(${scrollY * -0.3}px)`,
            }}
            data-testid="hero-competitions-section"
          >
            <div className="max-w-sm text-center md:text-left">
              {/* Competition Icons */}
              <div className="flex justify-center md:justify-start gap-3 mb-4 md:mb-6">
                <div className="p-2 md:p-3 bg-white/20 rounded-full">
                  <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-300" />
                </div>
                <div className="p-2 md:p-3 bg-white/20 rounded-full">
                  <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-blue-200" />
                </div>
                <div className="p-2 md:p-3 bg-white/20 rounded-full">
                  <Target className="w-5 h-5 md:w-6 md:h-6 text-orange-300" />
                </div>
              </div>
              
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
                Súťaže
              </h2>
              <p className="text-blue-100 text-base md:text-lg mb-6 md:mb-8 leading-relaxed">
                Chceš organizovať alebo sledovať profesionálne rybárske súťaže na Slovensku? 
                Sleduj live výsledky, rebríčky a úlovky tímov v reálnom čase.
              </p>
              
              <div className="flex flex-col gap-3 md:gap-4">
                <Link href="/live">
                  <Button 
                    size="lg"
                    className="w-full bg-white text-blue-800 hover:bg-blue-50 font-semibold transition-all duration-300 transform hover:scale-105"
                    data-testid="button-view-competitions"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Prehľad súťaží
                  </Button>
                </Link>
                <Link href="/register-competition">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-2 border-white text-white hover:bg-white hover:text-blue-800 font-semibold transition-all duration-300"
                    data-testid="button-register-competition-hero"
                  >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Zaregistruj súťaž
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Fishing Diary Section */}
          <div 
            className="flex-1 flex items-center justify-center md:justify-end text-white px-4 sm:px-6 md:px-8 py-8"
            style={{
              transform: `translateY(${scrollY * 0.2}px)`,
            }}
            data-testid="hero-diary-section"
          >
            <div className="max-w-sm text-center md:text-left">
              {/* Diary Icons */}
              <div className="flex justify-center md:justify-start gap-3 mb-4 md:mb-6">
                <div className="p-2 md:p-3 bg-white/20 rounded-full">
                  <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-green-100" />
                </div>
                <div className="p-2 md:p-3 bg-white/20 rounded-full">
                  <Fish className="w-5 h-5 md:w-6 md:h-6 text-blue-200" />
                </div>
                <div className="p-2 md:p-3 bg-white/20 rounded-full">
                  <Crown className="w-5 h-5 md:w-6 md:h-6 text-yellow-300" />
                </div>
              </div>
              
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
                Rybársky denník
              </h2>
              <p className="text-green-100 text-base md:text-lg mb-6 md:mb-8 leading-relaxed">
                Zaznamenávaj svoje úlovky, porovnávaj ich s kamarátmi a súťažte medzi sebou 
                o najlepšie výsledky v Fishing Battle.
              </p>
              
              <div className="flex flex-col gap-3 md:gap-4">
                <Link href="/diary">
                  <Button 
                    size="lg"
                    className="w-full bg-white text-green-800 hover:bg-green-50 font-semibold transition-all duration-300 transform hover:scale-105"
                    data-testid="button-start-diary"
                  >
                    <BookOpen className="w-5 h-5 mr-2" />
                    Začať zapisovať
                  </Button>
                </Link>
                <a href="/api/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-2 border-white text-white hover:bg-white hover:text-green-800 font-semibold transition-all duration-300"
                    data-testid="button-try-battle"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    Vyskúšať Battle
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Diagonal Highlight Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(165deg, transparent 49%, rgba(255,255,255,0.1) 49.8%, rgba(255,255,255,0.2) 50.2%, transparent 51%)',
          }}
        />
      </section>

      {/* Contest Categories */}
      <ContestCategories contests={competitions} />

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
