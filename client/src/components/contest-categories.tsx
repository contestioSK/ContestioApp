import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, Trophy, UserPlus, Clock } from "lucide-react";
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

  const CategoryCard = ({ 
    title, 
    description, 
    contests, 
    ctaText, 
    ctaAction, 
    icon: Icon, 
    badgeVariant = "default",
    badgeText 
  }: {
    title: string;
    description: string;
    contests: Contest[];
    ctaText: string;
    ctaAction: (contestId: string) => string;
    icon: any;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline";
    badgeText: string;
  }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border bg-white dark:bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          <Badge variant={badgeVariant} className="text-xs">
            {badgeText}
          </Badge>
        </div>
        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 mb-4">
          {contests.slice(0, 2).map((contest) => (
            <div key={contest.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <h4 className="font-medium text-sm text-foreground mb-1" data-testid={`text-contest-title-${contest.id}`}>
                {contest.name}
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                {contest.description?.substring(0, 80)}{contest.description && contest.description.length > 80 ? '...' : ''}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {contest.location} • {new Date(contest.startDate).toLocaleDateString('sk-SK')}
              </p>
            </div>
          ))}
          {contests.length > 2 && (
            <p className="text-xs text-muted-foreground text-center">
              +{contests.length - 2} ďalších súťaží
            </p>
          )}
          {contests.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Žiadne súťaže v tejto kategórii
            </p>
          )}
        </div>
        
        {contests.length > 0 && (
          <Link href={ctaAction(contests[0]?.id || '')}>
            <Button 
              className="w-full group-hover:shadow-md transition-all" 
              variant="default"
              data-testid={`button-cta-${title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {ctaText}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );

  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Kategórie súťaží
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Objavte rybárske súťaže podľa aktuálneho stavu a nájdite si tie, ktoré vás zaujímajú
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CategoryCard
            title="Registrácia prebieha"
            description="Prihláste sa do aktuálnych súťaží, ktoré majú otvorenú registráciu"
            contests={registrationOpen}
            ctaText="Prihlásiť tím"
            ctaAction={(contestId) => `/competition/${contestId}/register`}
            icon={UserPlus}
            badgeVariant="default"
            badgeText={`${registrationOpen.length} aktívnych`}
          />
          
          <CategoryCard
            title="Budúce preteky"
            description="Nadchádzajúce súťaže s ukončenou registráciou"
            contests={registrationClosedFuture}
            ctaText="Pridať do kalendára"
            ctaAction={(contestId) => `/competition/${contestId}`}
            icon={Calendar}
            badgeVariant="secondary"
            badgeText={`${registrationClosedFuture.length} nadchádzajúcich`}
          />
          
          <CategoryCard
            title="Prebiehajúce preteky"
            description="Sledujte živé súťaže a aktuálne výsledky v reálnom čase"
            contests={liveContests}
            ctaText="Sledovať live"
            ctaAction={(contestId) => `/competition/${contestId}/live`}
            icon={Eye}
            badgeVariant="destructive"
            badgeText={`${liveContests.length} live`}
          />
          
          <CategoryCard
            title="Ukončené preteky"
            description="Prezrite si výsledky a štatistiky zo skončených súťaží"
            contests={finishedContests}
            ctaText="Prezrieť výsledky"
            ctaAction={(contestId) => `/competition/${contestId}/results`}
            icon={Trophy}
            badgeVariant="outline"
            badgeText={`${finishedContests.length} ukončených`}
          />
        </div>
      </div>
    </section>
  );
}