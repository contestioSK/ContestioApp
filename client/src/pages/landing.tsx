import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fish, Users, Trophy, MapPin, PlusCircle, Menu, X, Info, DollarSign, HelpCircle, BarChart3, Target, Zap, BookOpen, Crown } from "lucide-react";
import { ContestCategories } from "@/components/contest-categories";
import LiveLeaderboard from "@/components/live-leaderboard";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import heroImage from "@assets/Carp_Fishing_1600x500_crop_center_6bc11ee9-9096-425e-8946-560290a33987_2016x630_1758061236097.webp";
import fishingImage2 from "@assets/360_F_381579894_CiNFCkD3dVWVjOm5WzxGeYlD9B1Go1sr_1758061127573.jpg";
import lakeImage from "@assets/zemplinska-sirava-6_1758098736505.avif";
import heroBackgroundImage from "@assets/stock_images/fishing_lake_landsca_8a0b7214.jpg";
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
  const heroRef = useRef<HTMLElement>(null);
  
  // Fetch real competitions from API
  const { data: competitions = [], isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"]
  });
  
  // Get first live competition for leaderboard
  const liveCompetition = competitions.find(comp => comp.status === 'live');
  
  // Fetch teams for live leaderboard
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["/api/competitions", liveCompetition?.id, "teams"],
    enabled: !!liveCompetition?.id,
  });


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

      {/* Full-Screen Hero Section */}
      <section 
        ref={heroRef} 
        className="relative min-h-screen overflow-hidden"
        style={{
          backgroundImage: `url(${heroBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Integrated Navigation */}
        <div className="relative z-20 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/">
                <div className="flex items-center space-x-2 text-white">
                  <Fish className="text-2xl" />
                  <span className="text-xl font-bold">Contestio</span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors cursor-pointer" data-testid={`nav-${item.href.slice(1)}`}>
                        <IconComponent className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
                
                <Link href="/about-us">
                  <div className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors cursor-pointer" data-testid="nav-about-us">
                    <Info className="w-4 h-4" />
                    <span className="text-sm font-medium">O nás</span>
                  </div>
                </Link>
                
                <Button 
                  onClick={() => window.location.href = '/api/login'}
                  className="bg-white text-blue-900 hover:bg-white/90 font-medium"
                  size="sm"
                  data-testid="button-login"
                >
                  Prihlásiť sa
                </Button>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-white hover:bg-white/10"
                  data-testid="button-mobile-menu"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden border-t border-white/20 mt-2 pt-4 pb-6">
                <div className="space-y-2">
                  {navItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div 
                          className="flex items-center space-x-3 px-3 py-3 rounded-lg text-white/90 hover:text-white hover:bg-white/10 cursor-pointer transition-all duration-200"
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid={`mobile-nav-${item.href.slice(1)}`}
                        >
                          <IconComponent className="w-5 h-5" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                  
                  <Link href="/about-us">
                    <div 
                      className="flex items-center space-x-3 px-3 py-3 rounded-lg text-white/90 hover:text-white hover:bg-white/10 cursor-pointer transition-all duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                      data-testid="mobile-nav-about-us"
                    >
                      <Info className="w-5 h-5" />
                      <span className="text-sm font-medium">O nás</span>
                    </div>
                  </Link>
                  
                  <div className="border-t border-white/20 my-4"></div>
                  
                  <Button 
                    onClick={() => {
                      window.location.href = '/api/login';
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-white text-blue-900 hover:bg-white/90 font-medium"
                    data-testid="mobile-button-login"
                  >
                    Prihlásiť sa
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center min-h-screen pt-8 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              {/* Left Content */}
              <div className="text-white">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight" data-testid="hero-title">
                  Súťaže na Slovensku
                </h1>
                <p className="text-lg md:text-xl text-white/90 mb-4 leading-relaxed" data-testid="hero-subtitle">
                  Vytvor si svoj osobný rybársky denník
                </p>
                <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed" data-testid="hero-subtitle-2">
                  - všetko na jednom mieste
                </p>
                
                <p className="text-base md:text-lg text-white/80 mb-6" data-testid="hero-description">
                  Sleduj live úlovky a rebríčky tímov, alebo
                </p>
                <p className="text-base md:text-lg text-white/80 mb-8" data-testid="hero-description-2">
                  si zapisuj svoje úlovky a súťaž s kamarátmi.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/live">
                    <Button 
                      className="bg-white text-blue-900 hover:bg-white/90 font-semibold px-6 py-3 w-full sm:w-auto"
                      size="lg"
                      data-testid="button-view-live-competitions"
                    >
                      Pozrieť prebiehajúce súťaže
                    </Button>
                  </Link>
                  <Link href="/diary">
                    <Button 
                      variant="outline"
                      className="border-2 border-white text-white hover:bg-white hover:text-blue-900 font-semibold px-6 py-3 w-full sm:w-auto"
                      size="lg"
                      data-testid="button-start-diary-hero"
                    >
                      Začať zapisovať úlovky
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Right Content - Live Leaderboard */}
              <div className="relative">
                <div className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-lg overflow-hidden">
                  <div className="p-4 border-b bg-white/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900" data-testid="live-leaderboard-title">Live Rebríček</h3>
                      {liveCompetition && (
                        <Badge variant="destructive" className="bg-red-600 text-white" data-testid="live-badge">
                          LIVE
                        </Badge>
                      )}
                    </div>
                    {liveCompetition && (
                      <p className="text-sm text-gray-600 mt-1" data-testid="live-competition-name">
                        {liveCompetition.name}
                      </p>
                    )}
                  </div>
                  
                  <div className="max-h-80 overflow-hidden">
                    {liveCompetition ? (
                      <LiveLeaderboard 
                        teams={teams} 
                        isLoading={teamsLoading} 
                        competitionId={liveCompetition.id}
                        compact={true}
                        showTop={3}
                      />
                    ) : (
                      <div className="p-6">
                        {isLoading ? (
                          <div className="space-y-3">
                            {[1,2,3].map(i => (
                              <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg animate-pulse">
                                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                                <div className="flex-1">
                                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                </div>
                                <div className="w-16 h-4 bg-gray-300 rounded"></div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm" data-testid="no-live-competitions-message">Momentálne neprebieha žiadna súťaž</p>
                            <p className="text-xs mt-1" data-testid="upcoming-competitions-hint">Pozrite si nadchádzajúce súťaže</p>
                            <Link href="/" className="mt-3 inline-block">
                              <Button variant="outline" size="sm" data-testid="button-view-upcoming">
                                Pozrieť súťaže
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
