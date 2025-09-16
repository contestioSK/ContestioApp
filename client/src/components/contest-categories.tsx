import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, Trophy, UserPlus, Clock, MapPin, Users, Star } from "lucide-react";
import { Link } from "wouter";

interface Contest {
  id: string;
  name: string;
  description: string;
  status: 'registration' | 'live' | 'finished';
  startDate: string;
  endDate: string;
  location: string;
}

interface ContestCategoriesProps {
  contests: Contest[];
}

// Competition images for visual appeal
const competitionImages = [
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300",
  "https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300", 
  "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300",
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300",
  "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"
];

export function ContestCategories({ contests }: ContestCategoriesProps) {
  // Filter contests into categories
  const categorizeContests = () => {
    const now = new Date();
    
    // Registration open: status is 'registration' and start date is in future
    const registrationOpen = contests.filter(contest => 
      contest.status === 'registration' && new Date(contest.startDate) > now
    );
    
    // Registration closed but future: status is 'registration' but start date is very close (within 3 days)
    const registrationClosedFuture = contests.filter(contest => {
      const startDate = new Date(contest.startDate);
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      return contest.status === 'registration' && startDate <= threeDaysFromNow && startDate > now;
    });
    
    const liveContests = contests.filter(contest => 
      contest.status === 'live'
    );
    
    const finishedContests = contests.filter(contest => 
      contest.status === 'finished'
    );
    
    return {
      registrationOpen,
      registrationClosedFuture,
      liveContests,
      finishedContests
    };
  };

  const { registrationOpen, registrationClosedFuture, liveContests, finishedContests } = categorizeContests();

  const CategorySection = ({ 
    title, 
    subtitle,
    contests, 
    ctaText, 
    ctaAction, 
    icon: Icon, 
    badgeVariant = "default",
    accentColor = "primary"
  }: {
    title: string;
    subtitle: string;
    contests: Contest[];
    ctaText: string;
    ctaAction: (contestId: string) => string;
    icon: any;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline";
    accentColor?: string;
  }) => (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-${accentColor}/10`}>
            <Icon className={`w-8 h-8 text-${accentColor}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Badge variant={badgeVariant} className="px-3 py-1">
          {contests.length} súťaží
        </Badge>
      </div>
      
      {contests.length === 0 ? (
        <Card className="p-8 text-center bg-muted/30">
          <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Žiadne súťaže v tejto kategórii
          </h3>
          <p className="text-sm text-muted-foreground">
            Momentálne sa v tejto kategórii nenachádzajú žiadne súťaže
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.slice(0, 6).map((contest, index) => (
            <Card key={contest.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border-0 shadow-lg">
              <div className="relative">
                <img 
                  src={competitionImages[index % competitionImages.length]}
                  alt={contest.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-3 left-3">
                  <Badge variant={badgeVariant} className="bg-white/90 text-black backdrop-blur-sm">
                    {contest.status === 'live' && '🔴 ŽIVO'}
                    {contest.status === 'registration' && '📝 REGISTRÁCIA'}
                    {contest.status === 'finished' && '🏆 UKONČENÁ'}
                  </Badge>
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-bold text-lg mb-1" data-testid={`text-contest-title-${contest.id}`}>
                    {contest.name}
                  </h3>
                </div>
              </div>
              
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {contest.description}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{contest.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(contest.startDate).toLocaleDateString('sk-SK')}</span>
                  </div>
                  {contest.status === 'live' && (
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <Users className="w-4 h-4" />
                      <span>24 aktívnych tímov</span>
                    </div>
                  )}
                  {contest.status === 'finished' && (
                    <div className="flex items-center gap-2 text-sm text-accent">
                      <Star className="w-4 h-4" />
                      <span>Víťaz: Team Champions</span>
                    </div>
                  )}
                </div>
                
                <Link href={ctaAction(contest.id)}>
                  <Button 
                    className={`w-full transition-all ${
                      contest.status === 'live' 
                        ? 'bg-secondary hover:bg-secondary/90 text-secondary-foreground' 
                        : contest.status === 'finished'
                        ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    }`}
                    data-testid={`button-cta-${contest.id}`}
                  >
                    {ctaText}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {contests.length > 6 && (
        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            Zobraziť všetkých {contests.length} súťaží
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <section className="py-16 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Rybárske <span className="text-primary">Súťaže</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Objavte pestrosť rybárskych turnajov - od aktuálnych registrácií až po živé súťaže a výsledky
          </p>
        </div>
        
        <CategorySection
          title="🔥 Registrácia prebieha"
          subtitle="Prihláste sa do najnovších súťaží s otvorenou registráciou"
          contests={registrationOpen}
          ctaText="Prihlásiť tím"
          ctaAction={(contestId) => `/competition/${contestId}/register`}
          icon={UserPlus}
          badgeVariant="default"
          accentColor="primary"
        />
        
        <CategorySection
          title="📅 Budúce preteky"
          subtitle="Nadchádzajúce súťaže s ukončenou registráciou"
          contests={registrationClosedFuture}
          ctaText="Pridať do kalendára"
          ctaAction={(contestId) => `/competition/${contestId}`}
          icon={Calendar}
          badgeVariant="secondary"
          accentColor="secondary"
        />
        
        <CategorySection
          title="🔴 Prebiehajúce preteky"
          subtitle="Sledujte živé súťaže a aktuálne výsledky v reálnom čase"
          contests={liveContests}
          ctaText="Sledovať live"
          ctaAction={(contestId) => `/competition/${contestId}/live`}
          icon={Eye}
          badgeVariant="destructive"
          accentColor="secondary"
        />
        
        <CategorySection
          title="🏆 Ukončené preteky"
          subtitle="Prezrite si výsledky a štatistiky zo skončených súťaží"
          contests={finishedContests}
          ctaText="Prezrieť výsledky"
          ctaAction={(contestId) => `/competition/${contestId}/results`}
          icon={Trophy}
          badgeVariant="outline"
          accentColor="accent"
        />
      </div>
    </section>
  );
}