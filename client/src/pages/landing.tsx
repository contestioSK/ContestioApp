import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fish, Users, Trophy, MapPin, PlusCircle, Menu, X, Info, DollarSign, HelpCircle, BarChart3, Target, Zap, BookOpen, Crown, Phone } from "lucide-react";
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
  const heroRef = useRef<HTMLElement>(null);
  
  // Fetch real competitions from API
  const { data: competitions = [], isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"]
  });


  // Main navigation items
  const navItems = [
    { href: "/about-us", label: "O nás", icon: Info },
    { href: "/faq", label: "FAQ", icon: HelpCircle },
    { href: "/pricing", label: "Cenník", icon: DollarSign },
    { href: "/contact", label: "Kontakt", icon: Phone },
    { href: "/register-competition", label: "Zaregistrovať súťaž", icon: Trophy },
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

      {/* Hero Section */}
      <section 
        ref={heroRef} 
        className="relative h-[600px] overflow-hidden"
        style={{
          backgroundImage: `url(${heroBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-background/20"></div>
        
        {/* Integrated Navigation */}
        <div className="relative z-20 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/">
                <div className="flex items-center space-x-2 text-primary-foreground">
                  <Fish className="text-2xl" />
                  <span className="text-xl font-bold">Contestio</span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-6">
                {/* Main Navigation */}
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className="flex items-center space-x-1 text-primary-foreground/90 hover:text-primary-foreground transition-colors cursor-pointer" data-testid={`nav-${item.href.slice(1) || 'home'}`}>
                        <IconComponent className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
                
                {/* CTA Buttons */}
                <div className="flex items-center space-x-3">
                  <Button asChild
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                    size="sm"
                    data-testid="button-register"
                  >
                    <Link href="/auth/register">
                      Zaregistrovať sa
                    </Link>
                  </Button>
                  <Button asChild
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-medium"
                    size="sm"
                    data-testid="button-login"
                  >
                    <Link href="/auth/login">
                      Prihlásiť sa
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                  data-testid="button-mobile-menu"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden border-t border-primary-foreground/20 mt-2 pt-4 pb-6">
                <div className="space-y-2">
                  {/* Main Navigation */}
                  {navItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div 
                          className="flex items-center space-x-3 px-3 py-3 rounded-lg text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 cursor-pointer transition-all duration-200"
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid={`mobile-nav-${item.href.slice(1) || 'home'}`}
                        >
                          <IconComponent className="w-5 h-5" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                  
                  <div className="border-t border-primary-foreground/20 my-4"></div>
                  
                  {/* CTA Buttons */}
                  <div className="space-y-2">
                    <Button asChild
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                      data-testid="mobile-button-register"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link href="/auth/register">
                        Zaregistrovať sa
                      </Link>
                    </Button>
                    <Button asChild
                      className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-medium"
                      data-testid="mobile-button-login"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link href="/auth/login">
                        Prihlásiť sa
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 flex items-center h-full">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-primary-foreground" data-testid="hero-title">
              Súťaže na Slovensku
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-4 leading-relaxed" data-testid="hero-subtitle">
              Vytvor si svoj osobný rybársky denník
            </p>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 leading-relaxed" data-testid="hero-subtitle-2">
              - všetko na jednom mieste
            </p>
            
            <p className="text-base md:text-lg text-primary-foreground/80 mb-6" data-testid="hero-description">
              Sleduj live úlovky a rebríčky tímov, alebo
            </p>
            <p className="text-base md:text-lg text-primary-foreground/80 mb-8" data-testid="hero-description-2">
              si zapisuj svoje úlovky a súťaž s kamarátmi.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/live">
                <Button 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 py-3 w-full sm:w-auto"
                  size="lg"
                  data-testid="button-view-live-competitions"
                >
                  Pozrieť prebiehajúce súťaže
                </Button>
              </Link>
              <Link href="/diary">
                <Button 
                  variant="outline"
                  className="border-2 border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold px-6 py-3 w-full sm:w-auto"
                  size="lg"
                  data-testid="button-start-diary-hero"
                >
                  Začať zapisovať úlovky
                </Button>
              </Link>
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
