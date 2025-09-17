import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, Trophy, UserPlus, ArrowRight, Clock } from "lucide-react";
import { Link } from "wouter";
import registrationImage from "@assets/FB_IMG_1710518342053_1758098361872.jpg";
import upcomingImage from "@assets/360_F_381579894_CiNFCkD3dVWVjOm5WzxGeYlD9B1Go1sr_1758098475555.jpg";
import liveImage from "@assets/image0000021(2)_1758098537265.jpg";

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
      gradient: "from-green-500 to-green-600",
      bgPattern: registrationImage,
      badge: "🔥 Aktívne",
      badgeVariant: "default" as const
    },
    {
      title: "Budúce preteky", 
      description: "Nadchádzajúce súťaže s ukončenou registráciou",
      count: registrationClosedFuture.length,
      icon: Calendar,
      route: "/categories/upcoming",
      gradient: "from-orange-500 to-orange-600",
      bgPattern: upcomingImage,
      badge: "📅 Nadchádzajúce",
      badgeVariant: "secondary" as const
    },
    {
      title: "Prebiehajúce preteky",
      description: "Sledujte živé súťaže a aktuálne výsledky v reálnom čase", 
      count: liveContests.length,
      icon: Eye,
      route: "/categories/live",
      gradient: "from-emerald-500 to-emerald-600",
      bgPattern: liveImage,
      badge: "🔴 Live",
      badgeVariant: "destructive" as const
    },
    {
      title: "Ukončené preteky",
      description: "Prezrite si výsledky a štatistiky zo skončených súťaží",
      count: finishedContests.length, 
      icon: Trophy,
      route: "/categories/finished",
      gradient: "from-amber-500 to-amber-600",
      bgPattern: null,
      badge: "🏆 Ukončené",
      badgeVariant: "outline" as const
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50/50 to-green-50/50 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/3 to-primary/5"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-pulse animation-delay-300"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 mb-6">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Kategórie súťaží
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Vyberte si kategóriu súťaží, ktorá vás zaujíma a preskúmajte dostupné turnaje v reálnom čase
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-primary to-secondary mx-auto mt-8 rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {categories.map((category, index) => (
            <Link key={category.route} href={category.route}>
              <Card 
                className="group cursor-pointer overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:rotate-1 bg-white dark:bg-card relative"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`category-card-${category.route.split('/').pop()}`}
              >
                <div className="relative h-56 overflow-hidden">
                  {category.bgPattern ? (
                    <>
                      <img 
                        src={category.bgPattern}
                        alt={category.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        loading="lazy"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-85 group-hover:opacity-75 transition-opacity duration-300`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-90`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                      {/* Pattern overlay for gradient backgrounds */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="w-full h-full" style={{
                          backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                                           radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
                          backgroundSize: '20px 20px'
                        }}></div>
                      </div>
                    </>
                  )}
                  
                  <div className="absolute top-4 left-4">
                    <Badge 
                      variant={category.badgeVariant} 
                      className="bg-white/95 text-black backdrop-blur-sm font-semibold px-3 py-1 shadow-lg border-0"
                    >
                      {category.badge}
                    </Badge>
                  </div>
                  
                  <div className="absolute top-4 right-4">
                    <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/35 transition-colors duration-300 shadow-lg">
                      <category.icon className="w-7 h-7 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center space-x-2">
                        <div className="text-3xl font-bold drop-shadow-lg">{category.count}</div>
                        <div className="text-sm opacity-90">súťaží</div>
                      </div>
                      <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg">
                        <span className="text-xs font-medium">Zobraziť</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Decorative corner element */}
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-colors duration-300"></div>
                </div>
                
                <CardContent className="p-6 bg-gradient-to-br from-white to-slate-50/50 dark:from-card dark:to-card/50">
                  <h3 className="font-bold text-xl text-foreground mb-3 group-hover:text-primary transition-colors duration-300 flex items-center space-x-2">
                    <span>{category.title}</span>
                    <Clock className={`w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity ${
                      category.title.includes('Registrácia') ? 'text-green-500' : 
                      category.title.includes('Prebiehajúce') ? 'text-red-500' : 
                      category.title.includes('Budúce') ? 'text-blue-500' : 'text-amber-500'
                    }`} />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {category.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      <span>Preskúmať všetky</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                    </div>
                  </div>
                  
                  {/* Progress bar for visual appeal */}
                  <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r transition-all duration-1000 delay-300 ${
                        category.title.includes('Registrácia') ? 'from-green-400 to-green-600' :
                        category.title.includes('Prebiehajúce') ? 'from-red-400 to-red-600' :
                        category.title.includes('Budúce') ? 'from-blue-400 to-blue-600' : 'from-amber-400 to-amber-600'
                      }`}
                      style={{ width: category.count > 0 ? `${Math.min(100, category.count * 20)}%` : '5%' }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        <div className="text-center mt-16">
          <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-border/50">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <p className="text-lg font-medium text-foreground">
                Pripravení na konkurenciu?
              </p>
              <div className="w-2 h-2 bg-secondary rounded-full animate-pulse animation-delay-150"></div>
            </div>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Kliknite na ktorúkoľvek kategóriu a preskúmajte všetky dostupné súťaže v danej kategórii. 
              Sledujte live výsledky, registrujte tímy a získajte ceny!
            </p>
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Otvorené registrácie</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Prebiehajúce súťaže</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Nadchádzajúce podujatia</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span>Ukončené turnaje</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}