import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OrganizerLayout from "@/components/OrganizerLayout";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  StopCircle,
  Fish,
  UserPlus,
  MessageSquare,
  BarChart3,
  QrCode,
  Share2,
  Edit,
  Trash2,
  Send,
  Loader2,
  Mail
} from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import type { Competition, Team, Referee, Announcement } from "@shared/schema";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export default function CompetitionManage() {
  const [, params] = useRoute("/organizer/competition/:id");
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const competitionId = params?.id ? parseInt(params.id) : null;

  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showAddRefereeDialog, setShowAddRefereeDialog] = useState(false);
  const [showAddAnnouncementDialog, setShowAddAnnouncementDialog] = useState(false);
  const [refereeEmail, setRefereeEmail] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");

  const { data: competition, isLoading: competitionLoading } = useQuery<Competition>({
    queryKey: ['/api/competitions', competitionId],
    enabled: !!competitionId,
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['/api/competitions', competitionId, 'teams'],
    enabled: !!competitionId,
  });

  const { data: referees, isLoading: refereesLoading } = useQuery<Referee[]>({
    queryKey: ['/api/competitions', competitionId, 'referees'],
    enabled: !!competitionId,
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements'],
    select: (data) => data?.filter(a => a.competitionId === competitionId) || [],
    enabled: !!competitionId,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest('PATCH', `/api/competitions/${competitionId}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizer/competitions'] });
      toast({
        title: "Stav súťaže bol zmenený",
        description: "Zmena stavu bola úspešne uložená.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa zmeniť stav súťaže.",
        variant: "destructive",
      });
    },
  });

  const addRefereeMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest('POST', `/api/competitions/${competitionId}/referees`, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId, 'referees'] });
      setRefereeEmail("");
      setShowAddRefereeDialog(false);
      toast({
        title: "Rozhodca pridaný",
        description: "Rozhodca bol úspešne pridaný do súťaže.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa pridať rozhodcu.",
        variant: "destructive",
      });
    },
  });

  const removeRefereeMutation = useMutation({
    mutationFn: async (refereeId: string) => {
      return apiRequest('DELETE', `/api/competitions/${competitionId}/referees/${refereeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId, 'referees'] });
      toast({
        title: "Rozhodca odstránený",
        description: "Rozhodca bol odstránený zo súťaže.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa odstrániť rozhodcu.",
        variant: "destructive",
      });
    },
  });

  const addAnnouncementMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      return apiRequest('POST', '/api/announcements', {
        title: data.title,
        content: data.content,
        competitionId: competitionId,
        published: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setShowAddAnnouncementDialog(false);
      toast({
        title: "Oznam odoslaný",
        description: "Oznam bol úspešne zverejnený.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa vytvoriť oznam.",
        variant: "destructive",
      });
    },
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

  const handleStartCompetition = () => {
    statusMutation.mutate('live');
    setShowStartDialog(false);
  };

  const handleEndCompetition = () => {
    statusMutation.mutate('finished');
    setShowEndDialog(false);
  };

  const handleAddReferee = () => {
    if (refereeEmail.trim()) {
      addRefereeMutation.mutate(refereeEmail.trim());
    }
  };

  const handleAddAnnouncement = () => {
    if (announcementTitle.trim() && announcementContent.trim()) {
      addAnnouncementMutation.mutate({
        title: announcementTitle.trim(),
        content: announcementContent.trim(),
      });
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
  const refereesCount = referees?.length || 0;

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
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TacticalIconInline icon={UserPlus} variant="purple" size="md" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rozhodcovia</p>
                <p className="text-xl font-bold text-foreground">{refereesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <TacticalIconInline icon={MessageSquare} variant="blue" size="md" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Oznamy</p>
                <p className="text-xl font-bold text-foreground">{announcements?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {competition.status === 'registration' && (
          <Button 
            className="h-auto py-4 flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => setShowStartDialog(true)}
            disabled={statusMutation.isPending}
            data-testid="button-start-competition"
          >
            {statusMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            <span>Spustiť súťaž</span>
          </Button>
        )}
        {competition.status === 'live' && (
          <Button 
            variant="destructive" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => setShowEndDialog(true)}
            disabled={statusMutation.isPending}
            data-testid="button-end-competition"
          >
            {statusMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <StopCircle className="w-5 h-5" />
            )}
            <span>Ukončiť súťaž</span>
          </Button>
        )}
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => setShowAddAnnouncementDialog(true)}
          data-testid="button-new-announcement"
        >
          <MessageSquare className="w-5 h-5" />
          <span>Nový oznam</span>
        </Button>
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
              <Button size="sm" onClick={() => setShowAddRefereeDialog(true)} data-testid="button-add-referee">
                <UserPlus className="w-4 h-4 mr-1" />
                Pridať rozhodcu
              </Button>
            </CardHeader>
            <CardContent>
              {refereesLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : referees && referees.length > 0 ? (
                <div className="space-y-3">
                  {referees.map(referee => (
                    <div 
                      key={referee.id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <TacticalIconInline icon={UserPlus} variant="purple" size="md" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{(referee as any).user?.email || 'Rozhodca'}</p>
                          <p className="text-sm text-muted-foreground">
                            {referee.assignedSector ? `Sektor: ${referee.assignedSector}` : 'Všetky sektory'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeRefereeMutation.mutate(referee.id)}
                        disabled={removeRefereeMutation.isPending}
                        data-testid={`button-remove-referee-${referee.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TacticalIcon icon={UserPlus} variant="purple" size="lg" showLabel={false} className="mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Zatiaľ žiadni rozhodcovia</p>
                  <Button size="sm" onClick={() => setShowAddRefereeDialog(true)}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Pridať prvého rozhodcu
                  </Button>
                </div>
              )}
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
              <Button size="sm" onClick={() => setShowAddAnnouncementDialog(true)} data-testid="button-add-announcement">
                <MessageSquare className="w-4 h-4 mr-1" />
                Nový oznam
              </Button>
            </CardHeader>
            <CardContent>
              {announcementsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : announcements && announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map(announcement => (
                    <div 
                      key={announcement.id} 
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground">{announcement.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {announcement.createdAt ? format(new Date(announcement.createdAt), "d. MMM yyyy, HH:mm", { locale: sk }) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{announcement.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TacticalIcon icon={MessageSquare} variant="blue" size="lg" showLabel={false} className="mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Zatiaľ žiadne oznamy</p>
                  <Button size="sm" onClick={() => setShowAddAnnouncementDialog(true)}>
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Vytvoriť prvý oznam
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Start Competition Dialog */}
      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Spustiť súťaž?</AlertDialogTitle>
            <AlertDialogDescription>
              Súťaž "{competition.name}" bude spustená. Tímy budú môcť začať zaznamenávať úlovky.
              Registrácia nových tímov bude uzavretá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStartCompetition}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-1" />
              Spustiť súťaž
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Competition Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ukončiť súťaž?</AlertDialogTitle>
            <AlertDialogDescription>
              Súťaž "{competition.name}" bude ukončená. Zaznamenávanie úlovkov bude zastavené
              a výsledky budú finálne. Táto akcia sa nedá vrátiť späť.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEndCompetition}
              className="bg-destructive hover:bg-destructive/90"
            >
              <StopCircle className="w-4 h-4 mr-1" />
              Ukončiť súťaž
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Referee Dialog */}
      <Dialog open={showAddRefereeDialog} onOpenChange={setShowAddRefereeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pridať rozhodcu</DialogTitle>
            <DialogDescription>
              Zadajte email používateľa, ktorého chcete pridať ako rozhodcu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="referee-email">Email rozhodcu</Label>
              <div className="flex gap-2">
                <Mail className="w-4 h-4 mt-3 text-muted-foreground" />
                <Input
                  id="referee-email"
                  type="email"
                  placeholder="rozhodca@example.com"
                  value={refereeEmail}
                  onChange={(e) => setRefereeEmail(e.target.value)}
                  data-testid="input-referee-email"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRefereeDialog(false)}>
              Zrušiť
            </Button>
            <Button 
              onClick={handleAddReferee}
              disabled={!refereeEmail.trim() || addRefereeMutation.isPending}
              data-testid="button-confirm-add-referee"
            >
              {addRefereeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-1" />
              )}
              Pridať rozhodcu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Announcement Dialog */}
      <Dialog open={showAddAnnouncementDialog} onOpenChange={setShowAddAnnouncementDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nový oznam</DialogTitle>
            <DialogDescription>
              Vytvorte oznam pre účastníkov súťaže.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Nadpis</Label>
              <Input
                id="announcement-title"
                placeholder="Napr. Zmena pravidiel"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                data-testid="input-announcement-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-content">Obsah oznamu</Label>
              <Textarea
                id="announcement-content"
                placeholder="Napíšte text oznamu..."
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                rows={4}
                data-testid="input-announcement-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAnnouncementDialog(false)}>
              Zrušiť
            </Button>
            <Button 
              onClick={handleAddAnnouncement}
              disabled={!announcementTitle.trim() || !announcementContent.trim() || addAnnouncementMutation.isPending}
              data-testid="button-confirm-add-announcement"
            >
              {addAnnouncementMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Odoslať oznam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OrganizerLayout>
  );
}
