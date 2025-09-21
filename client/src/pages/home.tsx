import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import NavigationHeader from "@/components/navigation-header";
import ContestCategories from "@/components/contest-categories";
import { Button } from "@/components/ui/button";
import { isUnauthorizedError } from "@/lib/authUtils";
import { PlusCircle } from "lucide-react";
import type { Competition } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Nepovolený prístup",
        description: "Ste odhlásený. Prihlasujeme vás znovu...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: competitions, isLoading: competitionsLoading, error } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Nepovolený prístup",
        description: "Ste odhlásený. Prihlasujeme vás znovu...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />

      {/* Hero Section */}
      <section className="relative py-12 lg:py-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
            alt="Pokojné jazero s rybárskymi člnmi za svitania" 
            className="w-full h-full object-cover opacity-20" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20"></div>
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
                <div className="text-2xl font-bold text-primary" data-testid="text-live-competitions">
                  {(competitions?.filter((c: Competition) => c.status === 'live')?.length ?? 0)}
                </div>
                <div className="text-sm text-muted-foreground">Práve teraz</div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary" data-testid="text-total-competitions">
                  {competitions?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Celkom súťaží</div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent" data-testid="text-registration-open">
                  {(competitions?.filter((c: Competition) => c.status === 'registration')?.length ?? 0)}
                </div>
                <div className="text-sm text-muted-foreground">Registrácia otvorená</div>
              </div>
            </div>
            
            {/* Register Competition Button */}
            <div className="mt-8">
              <Button
                onClick={() => setLocation("/register-competition")}
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground font-semibold px-8 py-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105"
                data-testid="button-register-competition"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Zaregistrujte svoju súťaž
              </Button>
              <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
                Chystáte rybársku súťaž? Zverte ju Contestiu – registrácie, výsledky aj štatistiky zvládnete na pár klikov. Spustite ju ešte dnes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contest Categories */}
      <ContestCategories contests={competitions || []} />
    </div>
  );
}
