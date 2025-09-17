import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Plus, 
  MapPin, 
  Calendar, 
  Users, 
  UserCheck, 
  Award, 
  Settings,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  UserX,
  BarChart3,
  Activity
} from "lucide-react";
import type { Competition, Team, TeamMember } from "@shared/schema";

// Schema for competition creation
const competitionSchema = z.object({
  name: z.string().min(1, "Názov je povinný"),
  description: z.string().optional(),
  location: z.string().min(1, "Lokalita je povinná"),
  startDate: z.string().min(1, "Začiatok je povinný"),
  endDate: z.string().min(1, "Koniec je povinný"),
  registrationDeadline: z.string().min(1, "Deadline je povinný"),
  maxTeams: z.number().min(1, "Min 1 tím"),
  registrationFee: z.number().min(0, "Poplatok musí byť >= 0"),
  minWeight: z.number().min(0, "Min hmotnosť musí byť >= 0"),
  sideCompetitions: z.array(z.string()).default([]),
  prizes: z.array(z.string()).default([]),
  hasSectors: z.boolean().optional().default(false),
  scoringType: z.enum(["total", "avg3", "avg5"]).default("total"),
});

type CompetitionForm = z.infer<typeof competitionSchema>;

// Dashboard stats type
interface DashboardStats {
  totalUsers: number;
  totalCompetitions: number;
  activeCompetitions: number;
  totalTeams: number;
  totalCatches: number;
  pendingRegistrations: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string; // API returns string, not Date
    user?: string;
  }>;
  usersByRole: Array<{ role: string; count: number }>;
  competitionsByStatus: Array<{ status: string; count: number }>;
}

export default function AdminPanel() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedCompetition, setSelectedCompetition] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const form = useForm<CompetitionForm>({
    resolver: zodResolver(competitionSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      startDate: "",
      endDate: "",
      registrationDeadline: "",
      maxTeams: 50,
      registrationFee: 0,
      minWeight: 0,
      sideCompetitions: [],
      prizes: [],
      hasSectors: false,
      scoringType: "total",
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Načítavam...</p>
        </div>
      </div>
    );
  }

  // Auth guard
  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'organizer')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <Trophy className="mx-auto h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Prístup odmietnutý</h2>
            <p className="text-muted-foreground">
              Pre prístup do admin panelu potrebujete oprávnenia administrátora alebo organizátora.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Queries
  const { data: competitions, isLoading: competitionsLoading } = useQuery({
    queryKey: ["/api/competitions"],
    enabled: isAuthenticated,
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<(Team & { members: TeamMember[] })[]>({
    queryKey: ["/api/competitions", selectedCompetition, "teams"],
    enabled: isAuthenticated && !!selectedCompetition,
  });

  // Dashboard stats query
  const { data: dashboardStats, isLoading: dashboardLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
    enabled: isAuthenticated && isAdmin,
  });

  // Users query for user management
  const { data: allUsers, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  // User role update mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      refetchUsers();
      toast({
        title: "Úspech",
        description: "Rola používateľa bola aktualizovaná",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať rolu používateľa",
        variant: "destructive",
      });
    },
  });

  // User status update mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/status`, { active });
      return response.json();
    },
    onSuccess: () => {
      refetchUsers();
      toast({
        title: "Úspech",
        description: "Status používateľa bol aktualizovaný",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať status používateľa",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <Card className="w-full">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isAdmin ? "Správa systému" : "Správa súťaží"}
                </h1>
                <p className="text-muted-foreground">
                  {isAdmin ? "Celkový prehľad a správa platformy" : "Spravujte svoje súťaže a tímy"}
                </p>
              </div>
              
              {/* Competition Selector (for non-admin or admin with competitions) */}
              {(!isAdmin || competitions?.length > 0) && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="competition-select">Súťaž:</Label>
                    <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Vyberte súťaž" />
                      </SelectTrigger>
                      <SelectContent>
                        {competitions?.map((comp: Competition) => (
                          <SelectItem key={comp.id} value={comp.id}>
                            {comp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" />
                        Nová súťaž
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Vytvorenie novej súťaže</DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form className="space-y-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Názov súťaže</FormLabel>
                                <FormControl>
                                  <Input placeholder="Zadajte názov súťaže" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsCreateDialogOpen(false)}
                            >
                              Zrušiť
                            </Button>
                            <Button type="submit">
                              Vytvoriť súťaž
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          {competitionsLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          ) : !selectedCompetition && !isAdmin ? (
            <div className="text-center py-12">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {competitions?.length === 0 ? "Zatiaľ žiadne súťaže" : "Vyberte súťaž"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {competitions?.length === 0 
                  ? "Vytvorte svoju prvú súťaž a začnite spravovať tímy a udalosti." 
                  : "Vyberte súťaž z rozbaľovacieho menu vyššie pre správu jej detailov."
                }
              </p>
            </div>
          ) : (
            <Tabs defaultValue={isAdmin ? "dashboard" : (selectedCompetition ? "teams" : "dashboard")} className="w-full">
              
              {/* Tab Navigation */}
              <div className="border-b border-border">
                <TabsList className="flex space-x-8 px-6 bg-transparent">
                  {isAdmin && (
                    <>
                      <TabsTrigger value="dashboard" className="py-4 border-b-2 border-primary text-primary font-medium text-sm">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Dashboard
                      </TabsTrigger>
                      <TabsTrigger value="users" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <Users className="w-4 h-4 mr-2" />
                        Používatelia
                      </TabsTrigger>
                      <TabsTrigger value="registrations" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Registrácie
                      </TabsTrigger>
                    </>
                  )}
                  {selectedCompetition && (
                    <>
                      <TabsTrigger value="teams" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <Users className="w-4 h-4 mr-2" />
                        Tímy
                      </TabsTrigger>
                      <TabsTrigger value="referees" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <UserCheck className="w-4 h-4 mr-2" />
                        Rozhodcovia
                      </TabsTrigger>
                      <TabsTrigger value="sponsors" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <Award className="w-4 h-4 mr-2" />
                        Sponzori
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Nastavenia
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>
              </div>
              
              {/* Admin-only Tabs */}
              {isAdmin && (
                <>
                  <TabsContent value="dashboard" className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Prehľad systému</h2>
                        <p className="text-muted-foreground">Komplexný prehľad platformy a kľúčových metrík</p>
                      </div>

                      {dashboardLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {[...Array(8)].map((_, i) => (
                            <Card key={i} className="p-6">
                              <Skeleton className="h-8 w-24 mb-2" />
                              <Skeleton className="h-12 w-16 mb-1" />
                              <Skeleton className="h-4 w-32" />
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <>
                          {/* Statistics Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="p-6" data-testid="card-total-users">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Celkový počet užívateľov</p>
                                  <p className="text-3xl font-bold text-foreground">
                                    {dashboardStats?.totalUsers || 0}
                                  </p>
                                </div>
                                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <Users className="h-6 w-6 text-primary" />
                                </div>
                              </div>
                            </Card>

                            <Card className="p-6" data-testid="card-total-competitions">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Celkový počet súťaží</p>
                                  <p className="text-3xl font-bold text-foreground">
                                    {dashboardStats?.totalCompetitions || 0}
                                  </p>
                                </div>
                                <div className="h-12 w-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                                  <Trophy className="h-6 w-6 text-secondary" />
                                </div>
                              </div>
                            </Card>

                            <Card className="p-6" data-testid="card-active-competitions">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Aktívne súťaže</p>
                                  <p className="text-3xl font-bold text-foreground">
                                    {dashboardStats?.activeCompetitions || 0}
                                  </p>
                                </div>
                                <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center">
                                  <Activity className="h-6 w-6 text-accent" />
                                </div>
                              </div>
                            </Card>

                            <Card className="p-6" data-testid="card-pending-registrations">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Čakajúce registrácie</p>
                                  <p className="text-3xl font-bold text-foreground">
                                    {dashboardStats?.pendingRegistrations || 0}
                                  </p>
                                </div>
                                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <Clock className="h-6 w-6 text-orange-600" />
                                </div>
                              </div>
                            </Card>
                          </div>

                          {/* Charts Row */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Users by Role */}
                            <Card className="p-6">
                              <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-semibold">Užívatelia podľa rolí</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {dashboardStats?.usersByRole?.map((item, index) => (
                                    <div key={item.role} className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${
                                          item.role === 'admin' ? 'bg-red-500' :
                                          item.role === 'organizer' ? 'bg-blue-500' :
                                          item.role === 'referee' ? 'bg-green-500' : 'bg-gray-500'
                                        }`} />
                                        <span className="text-sm font-medium capitalize">
                                          {item.role === 'admin' ? 'Admin' :
                                           item.role === 'organizer' ? 'Organizátor' :
                                           item.role === 'referee' ? 'Rozhodca' : 'Verejnosť'}
                                        </span>
                                      </div>
                                      <span className="text-sm font-semibold">{item.count}</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Competitions by Status */}
                            <Card className="p-6">
                              <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-semibold">Súťaže podľa statusu</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {dashboardStats?.competitionsByStatus?.map((item) => (
                                    <div key={item.status} className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${
                                          item.status === 'live' ? 'bg-green-500' :
                                          item.status === 'registration' ? 'bg-yellow-500' :
                                          item.status === 'finished' ? 'bg-gray-500' : 'bg-blue-500'
                                        }`} />
                                        <span className="text-sm font-medium capitalize">
                                          {item.status === 'live' ? 'Živo' :
                                           item.status === 'registration' ? 'Registrácia' :
                                           item.status === 'finished' ? 'Ukončené' : item.status}
                                        </span>
                                      </div>
                                      <span className="text-sm font-semibold">{item.count}</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Recent Activity */}
                          <Card className="p-6">
                            <CardHeader className="pb-4">
                              <CardTitle className="text-lg font-semibold">Nedávna aktivita</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {dashboardStats?.recentActivity?.length ? (
                                  dashboardStats.recentActivity.map((activity, index) => (
                                    <div key={activity.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                                      <div className={`p-2 rounded-full ${
                                        activity.type === 'team_registration' ? 'bg-blue-100' :
                                        activity.type === 'catch_submission' ? 'bg-green-100' :
                                        'bg-yellow-100'
                                      }`}>
                                        {activity.type === 'team_registration' ? (
                                          <Users className="h-4 w-4 text-blue-600" />
                                        ) : activity.type === 'catch_submission' ? (
                                          <Trophy className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <FileText className="h-4 w-4 text-yellow-600" />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">{activity.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(activity.timestamp).toLocaleString('sk-SK')}
                                          {activity.user && ` • ${activity.user}`}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-center text-muted-foreground py-8">Žiadna nedávna aktivita</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="users" className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Správa používateľov</h2>
                        <p className="text-muted-foreground">Spravujte roly a oprávnenia používateľov</p>
                      </div>

                      {usersLoading ? (
                        <div className="space-y-4">
                          {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                              <Skeleton className="h-6 w-20" />
                              <Skeleton className="h-8 w-32" />
                            </div>
                          ))}
                        </div>
                      ) : allUsers?.length === 0 ? (
                        <div className="text-center py-12">
                          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground text-lg">Žiadni používatelia nenájdení</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {allUsers?.map((user: any) => (
                            <div key={user.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg bg-card">
                              {/* User Info */}
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground" data-testid={`text-user-name-${user.id}`}>
                                    {user.name || user.email}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                  {user.createdAt && (
                                    <p className="text-xs text-muted-foreground">
                                      Registrovaný {new Date(user.createdAt).toLocaleDateString('sk-SK')}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Status and Role Badges */}
                              <div className="flex items-center space-x-2">
                                <Badge variant={user.active ? 'default' : 'destructive'} data-testid={`badge-status-${user.id}`}>
                                  {user.active ? 'Aktívny' : 'Neaktívny'}
                                </Badge>
                                <Badge variant={
                                  user.role === 'admin' ? 'destructive' :
                                  user.role === 'organizer' ? 'default' :
                                  user.role === 'referee' ? 'secondary' : 'outline'
                                } data-testid={`badge-role-${user.id}`}>
                                  {user.role === 'admin' ? 'Admin' :
                                   user.role === 'organizer' ? 'Organizátor' :
                                   user.role === 'referee' ? 'Rozhodca' : 'Verejnosť'}
                                </Badge>
                              </div>

                              {/* Status Toggle and Role Change Select */}
                              <div className="flex items-center space-x-2">
                                {/* Status Toggle Switch */}
                                <div className="flex items-center space-x-2 min-w-[100px]">
                                  <Switch 
                                    checked={user.active}
                                    onCheckedChange={(active) => updateUserStatusMutation.mutate({ userId: user.id, active })}
                                    disabled={updateUserStatusMutation.isPending}
                                    data-testid={`switch-status-${user.id}`}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {user.active ? 'Aktívny' : 'Neaktívny'}
                                  </span>
                                </div>

                                {/* Role Change Select */}
                                <div className="min-w-[140px]">
                                  <Select 
                                    value={user.role} 
                                    onValueChange={(newRole) => updateUserRoleMutation.mutate({ userId: user.id, role: newRole })}
                                    disabled={updateUserRoleMutation.isPending}
                                  >
                                    <SelectTrigger data-testid={`select-role-${user.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="public">Verejnosť</SelectItem>
                                      <SelectItem value="referee">Rozhodca</SelectItem>
                                      <SelectItem value="organizer">Organizátor</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Additional Info */}
                              <div className="text-right min-w-[80px]">
                                <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="registrations" className="p-6">
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Registrácie súťaží budú implementované neskôr</p>
                    </div>
                  </TabsContent>
                </>
              )}

              {/* Competition-specific tabs */}
              {selectedCompetition && (
                <>
                  <TabsContent value="teams" className="p-6">
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Teams management príde skôr</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="referees" className="p-6">
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Správa rozhodcov príde skôr</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="sponsors" className="p-6">
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Správa sponzorov príde skôr</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="p-6">
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Nastavenia súťaže príde skôr</p>
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          )}

        </Card>
      </div>
    </div>
  );
}