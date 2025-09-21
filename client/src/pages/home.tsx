import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import NavigationHeader from "@/components/navigation-header";
import CompetitionCard from "@/components/competition-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isUnauthorizedError } from "@/lib/authUtils";
import { PlusCircle, Eye, UserPlus, Trophy } from "lucide-react";
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

      {/* Competition Categories */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Preskúmajte súťaže</h2>
            <p className="text-muted-foreground text-lg">Vyberte si kategóriu, ktorá vás zaujíma</p>
          </div>
          
          {competitionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
                  <div className="p-8 text-center">
                    <Skeleton className="w-16 h-16 rounded-full mx-auto mb-6" />
                    <Skeleton className="h-8 w-3/4 mx-auto mb-4" />
                    <Skeleton className="h-4 w-full mb-6" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Live Competitions Card */}
              <div 
                className="group bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-2xl shadow-lg border border-red-200 dark:border-red-800 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => setLocation("/categories/live")}
                data-testid="card-category-live"
              >
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                    {(competitions?.filter((c: Competition) => c.status === 'live')?.length ?? 0)}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Súťaže naživo</h3>
                  <p className="text-muted-foreground mb-6">Sledujte priebeh a výsledky v reálnom čase</p>
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    data-testid="button-view-live"
                  >
                    Sledovať naživo
                  </Button>
                </div>
              </div>

              {/* Registration Open Card */}
              <div 
                className="group bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl shadow-lg border border-green-200 dark:border-green-800 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => setLocation("/categories/registration-open")}
                data-testid="card-category-registration"
              >
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {(competitions?.filter((c: Competition) => c.status === 'registration')?.length ?? 0)}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Môžete sa prihlásiť</h3>
                  <p className="text-muted-foreground mb-6">Zaregistrujte váš tím do nadchádzajúcich súťaží</p>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-view-registration"
                  >
                    Prihlásiť sa
                  </Button>
                </div>
              </div>

              {/* Finished Competitions Card */}
              <div 
                className="group bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl shadow-lg border border-blue-200 dark:border-blue-800 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => setLocation("/categories/finished")}
                data-testid="card-category-finished"
              >
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {(competitions?.filter((c: Competition) => c.status === 'finished')?.length ?? 0)}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Ukončené súťaže</h3>
                  <p className="text-muted-foreground mb-6">Prezrite si výsledky a štatistiky</p>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-view-finished"
                  >
                    Zobraziť výsledky
                  </Button>
                </div>
              </div>

            </div>
          )}
        </div>
      </section>
    </div>
  );
}
