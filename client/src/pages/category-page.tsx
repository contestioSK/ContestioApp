import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Star, ArrowLeft, Trophy, Clock } from "lucide-react";
import { Link, useLocation } from "wouter";
import NavigationHeader from "@/components/navigation-header";

interface Competition {
  id: string;
  name: string;
  description: string;
  location: string;
  status: 'registration' | 'live' | 'finished';
  startDate: string;
  endDate: string;
  firstPlacePrize?: string;
  registrationFee?: string;
  maxTeams?: number;
  imageUrl?: string;
}

interface CategoryPageProps {
  category: 'registration-open' | 'upcoming' | 'live' | 'finished';
  title: string;
  description: string;
}

const competitionImages = [
  "https://images.unsplash.com/photo-1580623557890-2e7e88b73b31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300",
  "https://images.unsplash.com/photo-1606189934846-8b4b0c7ad8e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300", 
  "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300",
  "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300",
  "https://images.unsplash.com/photo-1522540621023-50aa8a89a32e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300",
  "https://images.unsplash.com/photo-1593865433578-36e8e6f32e3c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"
];

export default function CategoryPage({ category, title, description }: CategoryPageProps) {
  const { data: competitions, isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"]
  });

  const filterCompetitions = (competitions: Competition[] = []) => {
    const now = new Date();
    
    switch (category) {
      case 'registration-open':
        return competitions.filter(comp => 
          comp.status === 'registration' && new Date(comp.startDate) > now
        );
      case 'upcoming':
        const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
        return competitions.filter(comp => {
          const startDate = new Date(comp.startDate);
          return comp.status === 'registration' && startDate <= threeDaysFromNow && startDate > now;
        });
      case 'live':
        return competitions.filter(comp => comp.status === 'live');
      case 'finished':
        return competitions.filter(comp => comp.status === 'finished');
      default:
        return [];
    }
  };

  const filteredCompetitions = filterCompetitions(competitions);

  const getStatusBadge = (status: string, category: string) => {
    switch (category) {
      case 'registration-open':
        return { text: "🔥 Registrácia otvorená", variant: "default" as const };
      case 'upcoming':
        return { text: "📅 Nadchádzajúce", variant: "secondary" as const };
      case 'live':
        return { text: "🔴 Živo", variant: "destructive" as const };
      case 'finished':
        return { text: "🏆 Ukončená", variant: "outline" as const };
      default:
        return { text: status, variant: "outline" as const };
    }
  };

  const getActionButton = (competition: Competition, category: string) => {
    switch (category) {
      case 'registration-open':
        return { text: "Prihlásiť tím", href: `/competition/${competition.id}`, color: "primary" };
      case 'upcoming':
        return { text: "Zobraziť detaily", href: `/competition/${competition.id}`, color: "secondary" };
      case 'live':
        return { text: "Sledovať live", href: `/competition/${competition.id}`, color: "secondary" };
      case 'finished':
        return { text: "Prezrieť výsledky", href: `/competition/${competition.id}`, color: "accent" };
      default:
        return { text: "Zobraziť", href: `/competition/${competition.id}`, color: "primary" };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="h-16" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-border overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-muted" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                  <div className="h-10 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="h-16" />
      
      {/* Header Section */}
      <section className="py-12 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Späť na hlavnú
              </Button>
            </Link>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {title}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              {description}
            </p>
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-sm">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {filteredCompetitions.length} {filteredCompetitions.length === 1 ? 'súťaž' : 'súťaží'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Competitions Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredCompetitions.length === 0 ? (
            <Card className="p-12 text-center bg-muted/30">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-muted-foreground mb-4">
                Žiadne súťaže
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                V tejto kategórii sa momentálne nenachádzajú žiadne súťaže.
              </p>
              <Link href="/">
                <Button>
                  Preskúmať iné kategórie
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCompetitions.map((competition, index) => {
                const statusBadge = getStatusBadge(competition.status, category);
                const actionButton = getActionButton(competition, category);
                
                return (
                  <Card key={competition.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-0 shadow-lg">
                    <Link href={`/competition/${competition.id}`}>
                      <div className="relative cursor-pointer">
                        <img 
                          src={competition.imageUrl || competitionImages[index % competitionImages.length]}
                          alt={competition.name}
                          className={`w-full h-48 rounded-t-lg group-hover:scale-105 transition-transform duration-300 ${
                            competition.imageUrl 
                              ? 'object-contain bg-white' // Pre nahrané logá - zobrazí celé logo s bielym pozadím
                              : 'object-cover' // Pre predvolené obrázky - pokryje celú plochu
                          }`}
                          onError={(e) => {
                            // Ak sa custom obrázok nepodarí načítať, použije fallback
                            if (competition.imageUrl) {
                              console.error('Failed to load custom image, using fallback:', competition.imageUrl);
                              e.currentTarget.src = competitionImages[index % competitionImages.length];
                              e.currentTarget.className = e.currentTarget.className.replace('object-contain bg-white', 'object-cover');
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {category !== 'live' && (
                          <div className="absolute top-3 left-3 pointer-events-none">
                            <Badge variant={statusBadge.variant} className="bg-card/95 backdrop-blur-sm text-foreground shadow-sm border border-slate-200/50">
                              {statusBadge.text}
                            </Badge>
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                          <h3 className="font-bold text-lg mb-1" data-testid={`text-contest-title-${competition.id}`}>
                            {competition.name}
                          </h3>
                        </div>
                      </div>
                    </Link>
                    
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {competition.description}
                      </p>
                      
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{competition.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(competition.startDate).toLocaleDateString('sk-SK')}</span>
                        </div>
                        
                        {category === 'registration-open' && competition.registrationFee && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>Štartovné: €{parseFloat(competition.registrationFee)}</span>
                          </div>
                        )}
                        
                        {category === 'live' && (
                          <div className="flex items-center gap-2 text-sm text-secondary">
                            <Users className="w-4 h-4" />
                            <span>{Math.floor(Math.random() * 20) + 10} aktívnych tímov</span>
                          </div>
                        )}
                        
                        {category === 'finished' && competition.firstPlacePrize && (
                          <div className="flex items-center gap-2 text-sm text-accent">
                            <Star className="w-4 h-4" />
                            <span>Výhra: €{parseFloat(competition.firstPlacePrize)}</span>
                          </div>
                        )}
                      </div>
                      
                      <Link href={actionButton.href}>
                        <Button 
                          className={`w-full transition-all ${
                            actionButton.color === 'secondary' 
                              ? 'bg-secondary hover:bg-secondary/90 text-secondary-foreground' 
                              : actionButton.color === 'accent'
                              ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                          }`}
                          data-testid={`button-action-${competition.id}`}
                        >
                          {actionButton.text}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}