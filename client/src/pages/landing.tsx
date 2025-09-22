import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fish, Users, Trophy, MapPin, PlusCircle, Menu, X, Info, DollarSign, HelpCircle, BarChart3, Target, Zap, BookOpen, Crown } from "lucide-react";
import { ContestCategories } from "@/components/contest-categories";
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
  const leftSectionRef = useRef<HTMLDivElement>(null);
  const rightSectionRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const animationFrameRef = useRef<number>();
  const [hoveredSection, setHoveredSection] = useState<'left' | 'right' | null>(null);
  
  // Fetch real competitions from API
  const { data: competitions = [], isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"]
  });

  // RequestAnimationFrame-based parallax effect
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (!leftSectionRef.current || !rightSectionRef.current || !heroRef.current) return;
      
      const heroRect = heroRef.current.getBoundingClientRect();
      const isHeroVisible = heroRect.bottom >= 0 && heroRect.top <= window.innerHeight;
      
      if (!isHeroVisible) return;
      
      const scrollProgress = Math.max(0, Math.min(1, (window.innerHeight - heroRect.top) / (window.innerHeight + heroRect.height)));
      const leftOffset = Math.max(-80, Math.min(80, scrollProgress * window.scrollY * -0.25));
      const rightOffset = Math.max(-80, Math.min(80, scrollProgress * window.scrollY * 0.18));
      
      leftSectionRef.current.style.transform = `translate3d(0, ${leftOffset}px, 0)`;
      rightSectionRef.current.style.transform = `translate3d(0, ${rightOffset}px, 0)`;
    };

    const onScroll = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Set will-change property
    if (leftSectionRef.current) leftSectionRef.current.style.willChange = 'transform';
    if (rightSectionRef.current) rightSectionRef.current.style.willChange = 'transform';
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (leftSectionRef.current) leftSectionRef.current.style.willChange = 'auto';
      if (rightSectionRef.current) rightSectionRef.current.style.willChange = 'auto';
    };
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
      
      {/* Ensure header doesn't overlap hero */}
      <div className="h-0"></div>

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
                      <div className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors cursor-pointer">
                        <IconComponent className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
                
                <Link href="/about-us">
                  <div className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors cursor-pointer">
                    <Info className="w-4 h-4" />
                    <span className="text-sm font-medium">O nás</span>
                  </div>
                </Link>
                
                <Button 
                  onClick={() => window.location.href = '/api/login'}
                  className="bg-white text-blue-900 hover:bg-white/90 font-medium"
                  size="sm"
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
                  >
                    Prihlásiť sa
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center min-h-[calc(100vh-4rem)] pt-8 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              {/* Left Content */}
              <div className="text-white">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Súťaže na Slovensku
                </h1>
                <p className="text-lg md:text-xl text-white/90 mb-4 leading-relaxed">
                  Vytvor si svoj osobný rybársky denník
                </p>
                <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">
                  - všetko na jednom mieste
                </p>
                
                <p className="text-base md:text-lg text-white/80 mb-6">
                  Sleduj live úlovky a rebríčky tímov, alebo
                </p>
                <p className="text-base md:text-lg text-white/80 mb-8">
                  si zapisuj svoje úlovky a súťaž s kamarátmi.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    className="bg-white text-blue-900 hover:bg-white/90 font-semibold px-6 py-3"
                    size="lg"
                  >
                    Pozrieť prebiehajúce súťaže
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-2 border-blue-600 text-blue-600 bg-blue-600 hover:bg-blue-700 font-semibold px-6 py-3"
                    size="lg"
                  >
                    Začať zapisovať úlovky
                  </Button>
                </div>
              </div>
              
              {/* Right Content - Live Leaderboard */}
              <div className="relative">
                <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Live Rebríček</h3>
                      <Badge variant="destructive" className="bg-red-600 text-white">
                        LIVE
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Simulated live data */}
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">TA</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">Tyes´A</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">12,2 kg</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">TB</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">Team B</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">65,1 kg</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">TC</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">Team C</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">57,8 kg</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Chart placeholder */}
                    <div className="mt-6 h-20 bg-gradient-to-r from-blue-100 to-green-100 rounded-lg flex items-center justify-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                        <div className="w-10 h-10 bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
