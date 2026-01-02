import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Play,
  Pause,
  StopCircle,
  Fish,
  UserPlus,
  MessageSquare,
  BarChart3,
  QrCode,
  Share2,
  Edit
} from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import type { Competition, Team } from "@shared/schema";

export default function CompetitionManage() {
  const [, params] = useRoute("/organizer/competition/:id");
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const competitionId = params?.id ? parseInt(params.id) : null;

  const { data: competition, isLoading: competitionLoading } = useQuery<Competition>({
    queryKey: ['/api/competitions', competitionId],
    enabled: !!competitionId,
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['/api/competitions', competitionId, 'teams'],
    enabled: !!competitionId,
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

  if (competitionLoading) {
    return (
      <OrganizerLayout>
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </OrganizerLayout>
    );
  }

  if (!competition) {
    return (
      <OrganizerLayout>
        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="text-center py-12">
            <div className="flex justify-center mb-4">
              <TacticalIcon icon={Trophy} variant="amber" size="lg" showLabel={false} />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Súťaž nenájdená</h3>
            <p className="text-muted-foreground mb-6">
              Táto súťaž neexistuje alebo k nej nemáte prístup.
            </p>
            <Button onClick={() => setLocation('/organizer/competitions')}>
              Späť na zoznam súťaží
            </Button>
          </CardContent>
        </Card>
      </OrganizerLayout>
    );
  }

  const teamsCount = teams?.length || 0;

  return (
    <OrganizerLayout>
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-start gap-4">
          {competition.imageUrl ? (
            <img 
              src={competition.imageUrl} 
              alt={competition.name}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <TacticalIconInline icon={Trophy} variant="amber" size="lg" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{competition.name}</h1>
              {getStatusBadge(competition.status)}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center">
                <TacticalIconInline icon={MapPin} variant="emerald" size="sm" className="mr-1" />
                {competition.location}
              </div>
              <div className="flex items-center">
                <TacticalIconInline icon={Calendar} variant="indigo" size="sm" className="mr-1" />
                {new Date(competition.startDate).toLocaleDateString('sk-SK')} - {new Date(competition.endDate).toLocaleDateString('sk-SK')}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation(`/competition/${competition.id}`)}
            data-testid="button-view-public"
          >
            <Eye className="w-4 h-4 mr-1" />
            Verejný pohľad
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation(`/competition/${competition.id}/setup`)}
            data-testid="button-edit-competition"
          >
            <Edit className="w-4 h-4 mr-1" />
            Upraviť
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <TacticalIconInline icon={Users} variant="orange" size="md" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tímy</p>
                <p className="text-xl font-bold text-foreground">{teamsCount}{competition.maxTeams ? `/${competition.maxTeams}` : ''}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <TacticalIconInline icon={Fish} variant="cyan" size="md" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Úlovky</p>
                <p className="text-xl font-bold text-foreground">0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TacticalIconInline icon={BarChart3} variant="emerald" size="md" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Celková váha</p>
                <p className="text-xl font-bold text-foreground">0 kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TacticalIconInline icon={Trophy} variant="purple" size="md" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Najväčší úlovok</p>
                <p className="text-xl font-bold text-foreground">- kg</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {competition.status === 'registration' && (
          <Button className="h-auto py-4 flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700">
            <Play className="w-5 h-5" />
            <span>Spustiť súťaž</span>
          </Button>
        )}
        {competition.status === 'live' && (
          <>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
              <Pause className="w-5 h-5" />
              <span>Pozastaviť</span>
            </Button>
            <Button variant="destructive" className="h-auto py-4 flex flex-col items-center gap-2">
              <StopCircle className="w-5 h-5" />
              <span>Ukončiť súťaž</span>
            </Button>
          </>
        )}
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
          <QrCode className="w-5 h-5" />
          <span>QR kód</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
          <Share2 className="w-5 h-5" />
          <span>Zdieľať</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="teams" data-testid="tab-teams">
            <Users className="w-4 h-4 mr-1" />
            Tímy
          </TabsTrigger>
          <TabsTrigger value="catches" data-testid="tab-catches">
            <Fish className="w-4 h-4 mr-1" />
            Úlovky
          </TabsTrigger>
          <TabsTrigger value="referees" data-testid="tab-referees">
            <UserPlus className="w-4 h-4 mr-1" />
            Rozhodcovia
          </TabsTrigger>
          <TabsTrigger value="announcements" data-testid="tab-announcements">
            <MessageSquare className="w-4 h-4 mr-1" />
            Oznamy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-6">
          <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
            <CardHeader>
              <CardTitle>Registrované tímy</CardTitle>
              <CardDescription>Zoznam všetkých prihlásených tímov</CardDescription>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : teams && teams.length > 0 ? (
                <div className="space-y-3">
                  {teams.map(team => (
                    <div 
                      key={team.id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-muted/50 cursor-pointer"
                      onClick={() => setLocation(`/team/${team.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <TacticalIconInline icon={Users} variant="amber" size="md" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{team.name}</p>
                          <p className="text-sm text-muted-foreground">Sektor: {team.sector || 'Nepriradený'}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TacticalIcon icon={Users} variant="slate" size="lg" showLabel={false} className="mx-auto mb-4" />
                  <p className="text-muted-foreground">Zatiaľ žiadne registrované tímy</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catches" className="mt-6">
          <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
            <CardHeader>
              <CardTitle>Úlovky</CardTitle>
              <CardDescription>Všetky zaznamenané úlovky v súťaži</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TacticalIcon icon={Fish} variant="cyan" size="lg" showLabel={false} className="mx-auto mb-4" />
                <p className="text-muted-foreground">Zatiaľ žiadne úlovky</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referees" className="mt-6">
          <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Rozhodcovia</CardTitle>
                <CardDescription>Správa rozhodcov súťaže</CardDescription>
              </div>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-1" />
                Pridať rozhodcu
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TacticalIcon icon={UserPlus} variant="purple" size="lg" showLabel={false} className="mx-auto mb-4" />
                <p className="text-muted-foreground">Zatiaľ žiadni rozhodcovia</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="mt-6">
          <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Oznamy</CardTitle>
                <CardDescription>Komunikácia s účastníkmi</CardDescription>
              </div>
              <Button size="sm">
                <MessageSquare className="w-4 h-4 mr-1" />
                Nový oznam
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TacticalIcon icon={MessageSquare} variant="blue" size="lg" showLabel={false} className="mx-auto mb-4" />
                <p className="text-muted-foreground">Zatiaľ žiadne oznamy</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </OrganizerLayout>
  );
}
