import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fish, Users, Trophy, MapPin, PlusCircle } from "lucide-react";
import { ContestCategories } from "@/components/contest-categories";
import { useState, useEffect } from "react";

// Hero rotating background component
function HeroRotatingBackground({ images, intervalMs = 6000 }: { images: string[], intervalMs?: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Preload images
  useEffect(() => {
    let loadedCount = 0;
    let errorCount = 0;
    
    const checkComplete = () => {
      if (loadedCount + errorCount === images.length) {
        setImagesLoaded(true);
      }
    };

    const imagePromises = images.map(src => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          checkComplete();
          resolve(true);
        };
        img.onerror = () => {
          errorCount++;
          checkComplete();
          resolve(false);
        };
        img.src = src;
      });
    });
    
    // Fallback timeout to start rotation even if images are slow
    const fallbackTimeout = setTimeout(() => {
      if (!imagesLoaded) {
        setImagesLoaded(true);
      }
    }, 5000);
    
    Promise.all(imagePromises).then(() => {
      clearTimeout(fallbackTimeout);
    });

    return () => clearTimeout(fallbackTimeout);
  }, [images, imagesLoaded]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Rotation logic
  useEffect(() => {
    if (!imagesLoaded || prefersReducedMotion) return;

    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % images.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [images.length, intervalMs, imagesLoaded, prefersReducedMotion]);

  return (
    <div className="absolute inset-0 z-0">
      {images.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={`Carp fishing background ${index + 1}`}
          className={`absolute inset-0 w-full h-full object-cover will-change-opacity ${
            prefersReducedMotion 
              ? 'transition-none' 
              : 'transition-opacity duration-1000 ease-in-out'
          } ${index === activeIndex ? 'opacity-40' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-secondary/40"></div>
    </div>
  );
}

export default function Landing() {
  // Carp fishing hero images - distinctly different scenes
  const heroImages = [
    "https://images.unsplash.com/photo-1580623557890-2e7e88b73b31?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80", // Close-up carp
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80", // Lake sunset fishing
    "https://images.unsplash.com/photo-1522540621023-50aa8a89a32e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"  // Angler by water
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
              <div className="flex items-center space-x-2">
                <Fish className="text-primary text-2xl" />
                <h1 className="text-xl font-bold text-primary">Contestio</h1>
              </div>
              <div className="hidden md:flex items-center space-x-1 bg-muted/20 rounded-full px-3 py-1">
                <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-secondary">Súťaže naživo</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                data-testid="button-login"
              >
                Prihlásiť sa
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 lg:py-20">
        <HeroRotatingBackground images={heroImages} />
        
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
