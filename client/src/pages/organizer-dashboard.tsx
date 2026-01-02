import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  Fish,
  Zap,
  Timer,
  ArrowRight,
  Radio
} from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { PulsingDot } from "@/components/ui/pulsing-dot";
import type { Competition } from "@shared/schema";

function formatTimeRemaining(endDate: string | Date, _tick?: Date): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Ukončené";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function OrganizerDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: competitions, isLoading: competitionsLoading } = useQuery<Competition[]>({
    queryKey: ['/api/organizer/competitions'],
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registration':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-700">
            <Clock className="w-3 h-3 mr-1" />Registrácia
          </Badge>
        );
      case 'live':
        return (
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg shadow-green-500/25">
            <PulsingDot color="green" />
            <span className="ml-2">Živá</span>
          </Badge>
        );
      case 'finished':
        return <Badge variant="outline" className="text-slate-500"><AlertCircle className="w-3 h-3 mr-1" />Ukončená</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading) {
    return (
      <OrganizerLayout>
        <Skeleton className="h-48 w-full mb-6 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </OrganizerLayout>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-orange-200 dark:border-orange-900/50">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <CardTitle>Prihlásenie potrebné</CardTitle>
            <CardDescription>
              Pre prístup k organizátorskému panelu sa musíte prihlásiť.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button 
              onClick={() => setLocation('/auth/login')} 
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/25"
            >
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

  const liveCompetitions = competitions?.filter(c => c.status === 'live') || [];
  const registrationCompetitions = competitions?.filter(c => c.status === 'registration') || [];
  const finishedCompetitions = competitions?.filter(c => c.status === 'finished') || [];
  const totalCompetitions = competitions?.length || 0;
  
  const heroCompetition = liveCompetitions[0] || registrationCompetitions[0];

  return (
    <OrganizerLayout>
      {/* Hero Section - Live Competition Banner (Softened Design) */}
      {heroCompetition ? (
        <div className="relative mb-8 p-6 md:p-8 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              {heroCompetition.status === 'live' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Práve prebieha</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Registrácia otvorená</span>
                </>
              )}
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                {heroCompetition.imageUrl ? (
                  <img 
                    src={heroCompetition.imageUrl} 
                    alt={heroCompetition.name}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-600 shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600">
                    <TacticalIconInline icon={Trophy} variant="amber" size="lg" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {heroCompetition.name}
                  </h1>
                  <div className="flex items-center gap-4 mt-2 text-slate-600 dark:text-slate-300 text-sm flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{heroCompetition.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                        {heroCompetition.status === 'live' 
                          ? `Končí o ${formatTimeRemaining(heroCompetition.endDate, currentTime)}`
                          : `Štart o ${formatTimeRemaining(heroCompetition.startDate, currentTime)}`
                        }
                      </span>
                    </div>
                    {heroCompetition.maxTeams && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>Max. {heroCompetition.maxTeams} tímov</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                  onClick={() => setLocation(`/organizer/competition/${heroCompetition.id}`)}
                  data-testid="button-hero-manage"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Spravovať súťaž
                </Button>
                <Button 
                  variant="outline" 
                  className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setLocation(`/competition/${heroCompetition.id}`)}
                  data-testid="button-hero-view"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Live náhľad
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative mb-8 p-6 md:p-8 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-4 border border-orange-200 dark:border-orange-800/30">
              <TacticalIconInline icon={Trophy} variant="amber" size="lg" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Vytvorte svoju prvú súťaž</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Začnite organizovať rybárske súťaže a sledujte výsledky v reálnom čase.
            </p>
            <Button 
              className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
              onClick={() => setLocation('/register-competition')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Vytvoriť súťaž
            </Button>
          </div>
        </div>
      )}

      {/* Statistics Cards with Live Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                  <TacticalIconInline icon={Trophy} variant="amber" size="md" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Celkom</p>
                  <p className="text-2xl font-black text-foreground">{totalCompetitions}</p>
                </div>
              </div>
              <TacticalIconInline icon={BarChart3} variant="slate" size="sm" className="opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-green-200 dark:border-green-900/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
                  <TacticalIconInline icon={Zap} variant="emerald" size="md" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Živé</p>
                    {liveCompetitions.length > 0 && <PulsingDot color="green" />}
                  </div>
                  <p className="text-2xl font-black text-foreground">{liveCompetitions.length}</p>
                </div>
              </div>
              {liveCompetitions.length > 0 && (
                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                  ● prebieha
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-blue-200 dark:border-blue-900/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30">
                  <TacticalIconInline icon={Clock} variant="blue" size="md" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Registrácia</p>
                  <p className="text-2xl font-black text-foreground">{registrationCompetitions.length}</p>
                </div>
              </div>
              {registrationCompetitions.length > 0 && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                  čaká
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                  <TacticalIconInline icon={CheckCircle} variant="slate" size="md" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ukončené</p>
                  <p className="text-2xl font-black text-foreground">{finishedCompetitions.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header for Recent Competitions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Vaše súťaže</h2>
          {liveCompetitions.length > 0 && (
            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              {liveCompetitions.length} aktívna
            </Badge>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation('/organizer/competitions')}
          className="text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
          data-testid="button-view-all-competitions"
        >
          Zobraziť všetky
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Recent Competitions with Enhanced Cards */}
      {competitionsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : competitions && competitions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitions.slice(0, 6).map((competition) => (
            <Card 
              key={competition.id} 
              className={`bg-card shadow-sm hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden ${
                competition.status === 'live' 
                  ? 'border-2 border-green-500/50 dark:border-green-500/30' 
                  : competition.status === 'registration'
                  ? 'border border-blue-200 dark:border-blue-900/50'
                  : 'border border-slate-200 dark:border-slate-700'
              }`}
              onClick={() => setLocation(`/organizer/competition/${competition.id}`)}
              data-testid={`card-competition-${competition.id}`}
            >
              {/* Status ribbon at top */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                competition.status === 'live' 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                  : competition.status === 'registration'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`} />
              
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {competition.imageUrl ? (
                      <img 
                        src={competition.imageUrl} 
                        alt={competition.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        competition.status === 'live' 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                          : 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30'
                      }`}>
                        <TacticalIconInline 
                          icon={Trophy} 
                          variant={competition.status === 'live' ? 'emerald' : 'amber'} 
                          size="md" 
                          className={competition.status === 'live' ? 'text-white' : ''}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-bold truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {competition.name}
                      </CardTitle>
                      <div className="mt-1">{getStatusBadge(competition.status)}</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-2 space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <TacticalIconInline icon={MapPin} variant="emerald" size="sm" className="mr-2 flex-shrink-0" />
                  <span className="truncate">{competition.location}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <TacticalIconInline icon={Calendar} variant="indigo" size="sm" className="mr-2 flex-shrink-0" />
                    {new Date(competition.startDate).toLocaleDateString('sk-SK')}
                  </div>
                  {competition.status !== 'finished' && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      competition.status === 'live' 
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      <Timer className="w-3 h-3 inline mr-1" />
                      {competition.status === 'live' 
                        ? formatTimeRemaining(competition.endDate, currentTime)
                        : formatTimeRemaining(competition.startDate, currentTime)
                      }
                    </span>
                  )}
                </div>
                
                {/* Progress bar for registration */}
                {competition.status === 'registration' && competition.maxTeams && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Registrácia</span>
                      <span>0/{competition.maxTeams}</span>
                    </div>
                    <Progress value={0} className="h-1.5" />
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
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
                    size="sm" 
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/organizer/competition/${competition.id}`);
                    }}
                    data-testid={`button-manage-${competition.id}`}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Spravovať súťaž
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
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-600/10 flex items-center justify-center border border-orange-500/20">
                <TacticalIconInline icon={Trophy} variant="amber" size="lg" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Žiadne súťaže</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Zatiaľ nemáte žiadne súťaže. Vytvorte svoju prvú súťaž a začnite organizovať!
            </p>
            <Button 
              onClick={() => setLocation('/register-competition')}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg shadow-orange-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Vytvoriť súťaž
            </Button>
          </CardContent>
        </Card>
      )}
    </OrganizerLayout>
  );
}
