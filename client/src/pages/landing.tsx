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

      {/* Revolutionary Hero Section */}
      <section ref={heroRef} className="relative min-h-[600px] md:min-h-[720px] overflow-hidden">
        {/* Central Hero Text */}
        <div className="absolute top-0 left-0 right-0 z-30 pt-8 md:pt-12 pb-6">
          <div className="text-center text-white px-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-blue-100 via-white to-green-100 bg-clip-text text-transparent">
              Zažite rybolov naplno
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto font-medium">
              Každý úlovok má svoj príbeh
            </p>
          </div>
        </div>

        {/* Flowing Diagonal Divider */}
        <div className="hidden md:block absolute top-0 bottom-0 left-[60%] z-20 transform -translate-x-1/2">
          {/* Main flowing line */}
          <div className="relative h-full w-4">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-transparent transform -skew-x-12"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/80 to-white/20 blur-md transform -skew-x-12"></div>
            {/* Flowing water effect */}
            <div className="absolute top-1/4 left-1/2 w-6 h-6 bg-white/30 rounded-full animate-ping"></div>
            <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white/40 rounded-full animate-pulse"></div>
            <div className="absolute top-3/4 left-1/2 w-5 h-5 bg-white/25 rounded-full animate-bounce"></div>
          </div>
        </div>
        
        {/* Enhanced Connecting Visual Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Cross-section connecting elements */}
          <div className="absolute top-1/2 left-[20%] w-32 h-px bg-gradient-to-r from-blue-300/60 via-white/80 to-transparent animate-pulse"></div>
          <div className="absolute top-1/3 right-[15%] w-24 h-px bg-gradient-to-l from-green-300/60 via-white/80 to-transparent animate-pulse" style={{animationDelay: '1s'}}></div>
          
          {/* Swimming fish elements crossing sections */}
          <div className="absolute top-1/4 left-[10%] text-2xl text-white/40 animate-bounce">🐟</div>
          <div className="absolute bottom-1/3 right-[10%] text-xl text-white/30 animate-pulse" style={{animationDelay: '2s'}}>🎣</div>
          
          {/* Dynamic floating elements */}
          <div className="absolute top-20 left-[15%] w-3 h-3 bg-blue-400/30 rounded-full animate-ping" style={{animationDelay: '0s', animationDuration: '4s'}}></div>
          <div className="absolute top-40 left-[45%] w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{animationDelay: '1s', animationDuration: '3s'}}></div>
          <div className="absolute bottom-32 left-[25%] w-4 h-4 bg-blue-300/20 rounded-full animate-pulse" style={{animationDelay: '2s', animationDuration: '5s'}}></div>
          
          <div className="absolute top-24 right-[20%] w-2 h-2 bg-green-400/30 rounded-full animate-ping" style={{animationDelay: '0.5s', animationDuration: '3.5s'}}></div>
          <div className="absolute top-48 right-[5%] w-3 h-3 bg-white/30 rounded-full animate-bounce" style={{animationDelay: '1.5s', animationDuration: '4s'}}></div>
          <div className="absolute bottom-28 right-[30%] w-3 h-3 bg-green-300/25 rounded-full animate-pulse" style={{animationDelay: '3s', animationDuration: '6s'}}></div>
          
          {/* Water ripple effects */}
          <div className="absolute top-[60%] left-[55%] w-16 h-16 border border-white/20 rounded-full animate-ping" style={{animationDelay: '0s', animationDuration: '4s'}}></div>
          <div className="absolute top-[65%] left-[58%] w-12 h-12 border border-white/15 rounded-full animate-ping" style={{animationDelay: '1s', animationDuration: '3s'}}></div>
        </div>

        {/* Content Container with Asymmetric Split */}
        <div className="relative z-10 h-full flex flex-col md:flex-row min-h-[600px] md:min-h-[720px] pt-32 md:pt-40">
          {/* Competition Section - 60% width */}
          <div 
            ref={leftSectionRef}
            className="relative md:w-[60%] flex items-center justify-center md:justify-start text-white px-4 sm:px-6 md:px-8 py-8 md:py-12"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center left',
              backgroundRepeat: 'no-repeat'
            }}
            data-testid="hero-competitions-section"
          >
            {/* Background overlays for text readability */}
            <div className="absolute inset-0 bg-blue-900/45"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-800/40 via-blue-700/20 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/10 to-blue-900/30"></div>
            <div className="relative z-10 max-w-sm text-center md:text-left">
              {/* Competition Icons with floating animation */}
              <div className="flex justify-center md:justify-start gap-3 mb-4 md:mb-6">
                <div className="p-2 md:p-3 bg-white/20 rounded-full transition-all duration-500 hover:bg-white/30 hover:scale-110 hover:shadow-lg hover:shadow-yellow-300/20 animate-pulse">
                  <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-300" />
                </div>
                <div className="p-2 md:p-3 bg-white/20 rounded-full transition-all duration-500 hover:bg-white/30 hover:scale-110 hover:shadow-lg hover:shadow-blue-200/20 animate-pulse" style={{animationDelay: '0.5s'}}>
                  <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-blue-200" />
                </div>
                <div className="p-2 md:p-3 bg-white/20 rounded-full transition-all duration-500 hover:bg-white/30 hover:scale-110 hover:shadow-lg hover:shadow-orange-300/20 animate-pulse" style={{animationDelay: '1s'}}>
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
                    className="w-full bg-white text-blue-800 hover:bg-blue-50 font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 relative overflow-hidden group"
                    data-testid="button-view-competitions"
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                    <Zap className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Prehľad súťaží
                  </Button>
                </Link>
                <Link href="/register-competition">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-2 border-white text-blue-800 bg-white/90 hover:bg-white hover:text-blue-800 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-white/25 relative overflow-hidden group"
                    data-testid="button-register-competition-hero"
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                    <PlusCircle className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                    Zaregistruj súťaž
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Fishing Diary Section - 40% width */}
          <div 
            ref={rightSectionRef}
            className="relative md:w-[40%] flex items-center justify-center md:justify-end text-white px-4 sm:px-6 md:px-8 py-8 md:py-12"
            style={{
              backgroundImage: `url(${lakeImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center right',
              backgroundRepeat: 'no-repeat'
            }}
            data-testid="hero-diary-section"
          >
            {/* Background overlays for text readability */}
            <div className="absolute inset-0 bg-green-800/45"></div>
            <div className="absolute inset-0 bg-gradient-to-l from-green-700/40 via-green-600/20 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-800/10 to-green-900/30"></div>
            <div className="relative z-10 max-w-sm text-center md:text-left">
              {/* Diary Icons with floating animation */}
              <div className="flex justify-center md:justify-start gap-3 mb-4 md:mb-6">
                <div className="p-2 md:p-3 bg-white/20 rounded-full transition-all duration-500 hover:bg-white/30 hover:scale-110 hover:shadow-lg hover:shadow-green-100/20 animate-pulse">
                  <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-green-100" />
                </div>
                <div className="p-2 md:p-3 bg-white/20 rounded-full transition-all duration-500 hover:bg-white/30 hover:scale-110 hover:shadow-lg hover:shadow-blue-200/20 animate-pulse" style={{animationDelay: '0.5s'}}>
                  <Fish className="w-5 h-5 md:w-6 md:h-6 text-blue-200" />
                </div>
                <div className="p-2 md:p-3 bg-white/20 rounded-full transition-all duration-500 hover:bg-white/30 hover:scale-110 hover:shadow-lg hover:shadow-yellow-300/20 animate-pulse" style={{animationDelay: '1s'}}>
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
                    className="w-full bg-white text-green-800 hover:bg-green-50 font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-green-500/25 relative overflow-hidden group"
                    data-testid="button-start-diary"
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                    <BookOpen className="w-5 h-5 mr-2 group-hover:-rotate-12 transition-transform duration-300" />
                    Začať zapisovať
                  </Button>
                </Link>
                <a href="/api/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-2 border-white text-green-800 bg-white/90 hover:bg-white hover:text-green-800 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-white/25 relative overflow-hidden group"
                    data-testid="button-try-battle"
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                    <Trophy className="w-5 h-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                    Vyskúšať Battle
                  </Button>
                </a>
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
