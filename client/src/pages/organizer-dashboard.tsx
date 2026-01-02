import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import OrganizerLayout from "@/components/OrganizerLayout";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Settings,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  LogIn,
  BarChart3,
  Fish
} from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import type { Competition } from "@shared/schema";

export default function OrganizerDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: competitions, isLoading: competitionsLoading } = useQuery<Competition[]>({
    queryKey: ['/api/organizer/competitions'],
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registration':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><Clock className="w-3 h-3 mr-1" />Registrácia</Badge>;
      case 'live':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" />Živá</Badge>;
      case 'finished':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Ukončená</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading) {
    return (
      <OrganizerLayout>
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </OrganizerLayout>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Prihlásenie potrebné</CardTitle>
            <CardDescription>
              Pre prístup k organizátorskému panelu sa musíte prihlásiť.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => setLocation('/auth/login')} className="w-full">
              Prihlásiť sa
            </Button>
            <Button variant="outline" onClick={() => setLocation('/auth/register')} className="w-full">
              Registrovať sa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const liveCompetitions = competitions?.filter(c => c.status === 'live').length || 0;
  const registrationCompetitions = competitions?.filter(c => c.status === 'registration').length || 0;
  const finishedCompetitions = competitions?.filter(c => c.status === 'finished').length || 0;
  const totalCompetitions = competitions?.length || 0;

  return (
    <OrganizerLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Prehľad</h1>
          <p className="text-muted-foreground mt-1">
            Vitajte v organizátorskom paneli
          </p>
        </div>
        <Button onClick={() => setLocation('/register-competition')} data-testid="button-create-competition">
          <Plus className="w-4 h-4 mr-2" />
          Vytvoriť súťaž
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <TacticalIconInline icon={Trophy} variant="amber" size="lg" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Celkom súťaží</p>
                <p className="text-2xl font-bold text-foreground">{totalCompetitions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TacticalIconInline icon={CheckCircle} variant="emerald" size="lg" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Živé súťaže</p>
                <p className="text-2xl font-bold text-foreground">{liveCompetitions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <TacticalIconInline icon={Clock} variant="blue" size="lg" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">V registrácii</p>
                <p className="text-2xl font-bold text-foreground">{registrationCompetitions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <TacticalIconInline icon={AlertCircle} variant="slate" size="lg" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ukončené</p>
                <p className="text-2xl font-bold text-foreground">{finishedCompetitions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Competitions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Posledné súťaže</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation('/organizer/competitions')}
            data-testid="button-view-all-competitions"
          >
            Zobraziť všetky
          </Button>
        </div>

        {competitionsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : competitions && competitions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {competitions.slice(0, 6).map((competition) => (
              <Card 
                key={competition.id} 
                className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setLocation(`/organizer/competition/${competition.id}`)}
                data-testid={`card-competition-${competition.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {competition.imageUrl ? (
                        <img 
                          src={competition.imageUrl} 
                          alt={competition.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <TacticalIconInline icon={Trophy} variant="amber" size="md" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{competition.name}</CardTitle>
                        <div className="mt-1">{getStatusBadge(competition.status)}</div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <TacticalIconInline icon={MapPin} variant="emerald" size="sm" className="mr-2 flex-shrink-0" />
                    <span className="truncate">{competition.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <TacticalIconInline icon={Calendar} variant="indigo" size="sm" className="mr-2 flex-shrink-0" />
                    {new Date(competition.startDate).toLocaleDateString('sk-SK')}
                  </div>
                  
                  <div className="flex gap-2 pt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/competition/${competition.id}`);
                      }}
                      data-testid={`button-view-${competition.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Zobraziť
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/organizer/competition/${competition.id}`);
                      }}
                      data-testid={`button-manage-${competition.id}`}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Spravovať
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
            <CardContent className="text-center py-12">
              <div className="flex justify-center mb-4">
                <TacticalIcon icon={Trophy} variant="amber" size="lg" showLabel={false} />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Žiadne súťaže</h3>
              <p className="text-muted-foreground mb-6">
                Zatiaľ nemáte žiadne súťaže. Vytvorte svoju prvú súťaž!
              </p>
              <Button onClick={() => setLocation('/register-competition')}>
                <Plus className="w-4 h-4 mr-2" />
                Vytvoriť súťaž
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </OrganizerLayout>
  );
}
