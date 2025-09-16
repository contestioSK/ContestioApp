import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, Trophy, UserPlus, ArrowRight, Clock } from "lucide-react";
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

  const categories = [
    {
      title: "Registrácia prebieha",
      description: "Prihláste sa do aktuálnych súťaží s otvorenou registráciou",
      count: registrationOpen.length,
      icon: UserPlus,
      route: "/categories/registration-open",
      gradient: "from-primary to-primary/80",
      bgPattern: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      badge: "🔥 Aktívne",
      badgeVariant: "default" as const
    },
    {
      title: "Budúce preteky", 
      description: "Nadchádzajúce súťaže s ukončenou registráciou",
      count: registrationClosedFuture.length,
      icon: Calendar,
      route: "/categories/upcoming",
      gradient: "from-secondary to-secondary/80",
      bgPattern: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      badge: "📅 Nadchádzajúce",
      badgeVariant: "secondary" as const
    },
    {
      title: "Prebiehajúce preteky",
      description: "Sledujte živé súťaže a aktuálne výsledky v reálnom čase", 
      count: liveContests.length,
      icon: Eye,
      route: "/categories/live",
      gradient: "from-red-500 to-red-600",
      bgPattern: "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      badge: "🔴 Live",
      badgeVariant: "destructive" as const
    },
    {
      title: "Ukončené preteky",
      description: "Prezrite si výsledky a štatistiky zo skončených súťaží",
      count: finishedContests.length, 
      icon: Trophy,
      route: "/categories/finished",
      gradient: "from-accent to-accent/80",
      bgPattern: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      badge: "🏆 Ukončené",
      badgeVariant: "outline" as const
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Kategórie súťaží
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Vyberte si kategóriu súťaží, ktorá vás zaujíma a preskúmajte dostupné turnaje
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link key={category.route} href={category.route}>
              <Card className="group cursor-pointer overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white dark:bg-card" data-testid={`category-card-${category.route.split('/').pop()}`}>
                <div className="relative h-48">
                  <img 
                    src={category.bgPattern}
                    alt={category.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-80`} />
                  <div className="absolute inset-0 bg-black/20" />
                  
                  <div className="absolute top-4 left-4">
                    <Badge variant={category.badgeVariant} className="bg-white/90 text-black backdrop-blur-sm font-medium">
                      {category.badge}
                    </Badge>
                  </div>
                  
                  <div className="absolute top-4 right-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <category.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-between text-white">
                      <div className="text-2xl font-bold">{category.count}</div>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {category.description}
                  </p>
                  
                  <div className="mt-4 flex items-center text-sm font-medium text-primary">
                    <span>Preskúmať súťaže</span>
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Kliknite na ktorúkoľvek kategóriu a preskúmajte všetky dostupné súťaže v danej kategórii
          </p>
        </div>
      </div>
    </section>
  );
}