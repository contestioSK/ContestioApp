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
                className="group relative rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-500 hover:scale-105 cursor-pointer h-80"
                onClick={() => setLocation("/categories/live")}
                data-testid="card-category-live"
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img 
                    src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
                    alt="Live fishing competition"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-red-900/90 via-red-800/60 to-red-600/40"></div>
                </div>
                
                {/* Content */}
                <div className="relative z-10 p-8 h-full flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                    <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                      NAŽIVO
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2 drop-shadow-lg">
                      {(competitions?.filter((c: Competition) => c.status === 'live')?.length ?? 0)}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 drop-shadow-lg">Súťaže naživo</h3>
                    <p className="text-red-100 mb-6 drop-shadow">Sledujte priebeh a výsledky v reálnom čase</p>
                    <Button 
                      className="w-full bg-white/90 hover:bg-white text-red-700 font-semibold backdrop-blur-sm border-0 group-hover:scale-105 transition-transform"
                      data-testid="button-view-live"
                    >
                      Sledovať naživo
                    </Button>
                  </div>
                </div>
              </div>

              {/* Registration Open Card */}
              <div 
                className="group relative rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-500 hover:scale-105 cursor-pointer h-80"
                onClick={() => setLocation("/categories/registration-open")}
                data-testid="card-category-registration"
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img 
                    src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
                    alt="Fishing registration"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-green-900/90 via-green-800/60 to-green-600/40"></div>
                </div>
                
                {/* Content */}
                <div className="relative z-10 p-8 h-full flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      OTVORENÉ
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2 drop-shadow-lg">
                      {(competitions?.filter((c: Competition) => c.status === 'registration')?.length ?? 0)}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 drop-shadow-lg">Môžete sa prihlásiť</h3>
                    <p className="text-green-100 mb-6 drop-shadow">Zaregistrujte váš tím do nadchádzajúcich súťaží</p>
                    <Button 
                      className="w-full bg-white/90 hover:bg-white text-green-700 font-semibold backdrop-blur-sm border-0 group-hover:scale-105 transition-transform"
                      data-testid="button-view-registration"
                    >
                      Prihlásiť sa
                    </Button>
                  </div>
                </div>
              </div>

              {/* Finished Competitions Card */}
              <div 
                className="group relative rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-500 hover:scale-105 cursor-pointer h-80"
                onClick={() => setLocation("/categories/finished")}
                data-testid="card-category-finished"
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img 
                    src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
                    alt="Fishing trophy and awards"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-800/60 to-blue-600/40"></div>
                </div>
                
                {/* Content */}
                <div className="relative z-10 p-8 h-full flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      ARCHÍV
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2 drop-shadow-lg">
                      {(competitions?.filter((c: Competition) => c.status === 'finished')?.length ?? 0)}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 drop-shadow-lg">Ukončené súťaže</h3>
                    <p className="text-blue-100 mb-6 drop-shadow">Prezrite si výsledky a štatistiky</p>
                    <Button 
                      className="w-full bg-white/90 hover:bg-white text-blue-700 font-semibold backdrop-blur-sm border-0 group-hover:scale-105 transition-transform"
                      data-testid="button-view-finished"
                    >
                      Zobraziť výsledky
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </section>
    </div>
  );
}
