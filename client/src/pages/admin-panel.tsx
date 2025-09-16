import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Edit, Eye, Users, UserCheck, UserX, Plus, Trophy, Trash2, MapPin } from "lucide-react";
import type { Competition, Team, TeamMember } from "@shared/schema";

// Competition creation form schema
const competitionSchema = z.object({
  name: z.string().min(1, "Názov súťaže je povinný").max(255, "Názov je príliš dlhý"),
  description: z.string().optional(),
  location: z.string().min(1, "Miesto je povinné").max(255, "Miesto je príliš dlhé"),
  startDate: z.string().min(1, "Dátum začiatku je povinný"),
  endDate: z.string().min(1, "Dátum konca je povinný"),
  prizePool: z.string().optional(),
  registrationFee: z.string().optional(),
  maxTeams: z.string().optional(),
  sectorPlaces: z.array(z.object({
    sectorName: z.string().min(1, "Názov sektoru je povinný"),
    places: z.array(z.string().min(1, "Názov miesta je povinný")).min(1, "Sektor musí mať aspoň jedno miesto")
  })).min(1, "Súťaž musí mať aspoň jeden sektor"),
});

type CompetitionForm = z.infer<typeof competitionSchema>;

export default function AdminPanel() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedCompetition, setSelectedCompetition] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Competition creation form
  const form = useForm<CompetitionForm>({
    resolver: zodResolver(competitionSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      startDate: "",
      endDate: "",
      prizePool: "",
      registrationFee: "",
      maxTeams: "",
      sectorPlaces: [
        { sectorName: "Sektor A", places: ["Place 1", "Place 2", "Place 3"] },
        { sectorName: "Sektor B", places: ["Place 1", "Place 2"] }
      ],
    },
  });

  // Competition creation mutation
  const createCompetitionMutation = useMutation({
    mutationFn: async (data: CompetitionForm) => {
      const competitionData = {
        ...data,
        prizePool: data.prizePool || undefined, // Keep as string for decimal type
        registrationFee: data.registrationFee || undefined, // Keep as string for decimal type
        maxTeams: data.maxTeams ? parseInt(data.maxTeams) : undefined,
        startDate: new Date(data.startDate), // Send Date object, not ISO string
        endDate: new Date(data.endDate), // Send Date object, not ISO string
        sectorPlaces: data.sectorPlaces || undefined, // Include sector places configuration
      };
      return apiRequest("POST", "/api/competitions", competitionData);
    },
    onSuccess: async (response) => {
      const newCompetition = await response.json();
      toast({
        title: "Súťaž bola úspešne vytvorená!",
        description: "Vaša nová súťaž je teraz dostupná pre registráciu tímov.",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      // Invalidate competitions query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      // Auto-select the new competition
      if (newCompetition?.id) {
        setSelectedCompetition(newCompetition.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Nepodarilo sa vytvoriť súťaž",
        description: error.message || "Prosím skontrolujte údaje a skúste znovu.",
        variant: "destructive",
      });
    },
  });

  const onSubmitCompetition = (data: CompetitionForm) => {
    createCompetitionMutation.mutate(data);
  };

  // Redirect if not authenticated or not organizer
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'organizer')) {
      toast({
        title: "Neautorizovaný",
        description: "Ste odhlásený. Prihlasujem znovu...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: competitions, isLoading: competitionsLoading, error } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
    enabled: isAuthenticated && user?.role === 'organizer',
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<(Team & { members: TeamMember[] })[]>({
    queryKey: ["/api/competitions", selectedCompetition, "teams"],
    enabled: isAuthenticated && !!selectedCompetition,
  });

  const updateTeamStatusMutation = useMutation({
    mutationFn: async ({ teamId, status, sector }: { teamId: string; status: string; sector?: string }) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/status`, { status, sector });
    },
    onSuccess: () => {
      toast({
        title: "Úspech",
        description: "Stav tímu bol úspešne aktualizovaný",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "teams"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Neautorizovaný",
          description: "Ste odhlásený. Prihlasujem znovu...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať stav tímu",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Neautorizovaný",
        description: "Ste odhlásený. Prihlasujem znovu...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  const handleApproveTeam = (teamId: string, sector: string) => {
    updateTeamStatusMutation.mutate({ teamId, status: 'approved', sector });
  };

  const handleRejectTeam = (teamId: string) => {
    updateTeamStatusMutation.mutate({ teamId, status: 'rejected' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-secondary text-secondary-foreground">Schválený</Badge>;
      case 'pending':
        return <Badge className="bg-accent text-accent-foreground">Čaká sa na schválenie</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive text-destructive-foreground">Zamietnutý</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="overflow-hidden">
          
          {/* Admin Header */}
          <div className="bg-gradient-to-r from-primary to-secondary text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">Admin panel</h1>
                <p className="text-white/80">Správa súťaží</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-white/80">Panel organizátora</span>
                <Button variant="outline" className="border-white/20 hover:bg-white/20 text-white">
                  Exportovať údaje
                </Button>
              </div>
            </div>
          </div>

          {/* Competition Selector */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-foreground">Vybrať súťaž:</label>
                <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
                  <SelectTrigger className="w-64" data-testid="select-competition">
                    <SelectValue placeholder="Vyberte súťaž" />
                  </SelectTrigger>
                  <SelectContent>
                    {competitions?.map((competition: Competition) => (
                      <SelectItem key={competition.id} value={competition.id}>
                        {competition.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Create Competition Button */}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-create-competition">
                    <Plus className="w-4 h-4 mr-2" />
                    Vytvoriť súťaž
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Vytvoriť novú súťaž</DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitCompetition)} className="space-y-6">
                      {/* Basic Information */}
                      <div className="space-y-4">
                        <h3 className="font-medium text-foreground">Základné informácie</h3>
                        
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Názov súťaže</FormLabel>
                              <FormControl>
                                <Input placeholder="Zadajte názov súťaže" {...field} data-testid="input-competition-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Popis (voliteľné)</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Krátky popis súťaže" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Miesto</FormLabel>
                              <FormControl>
                                <Input placeholder="Miesto konania súťaže" {...field} data-testid="input-competition-location" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Dates */}
                      <div className="space-y-4">
                        <h3 className="font-medium text-foreground">Rozvrh</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dátum začiatku</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} data-testid="input-start-date" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dátum konca</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} data-testid="input-end-date" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Competition Details */}
                      <div className="space-y-4">
                        <h3 className="font-medium text-foreground">Detaily súťaže</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="prizePool"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Výhra (€)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0.00" step="0.01" {...field} data-testid="input-prize-pool" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="registrationFee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Registračný poplatok (€)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0.00" step="0.01" {...field} data-testid="input-registration-fee" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="maxTeams"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maximálny počet tímov</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="Neobmedzene" {...field} data-testid="input-max-teams" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Sector Places Configuration */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">Konfigurácia sektorov a miest</h3>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const currentSectors = form.getValues("sectorPlaces") || [];
                              form.setValue("sectorPlaces", [...currentSectors, { sectorName: "", places: [""] }]);
                            }}
                            data-testid="button-add-sector"
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            Pridať sektor
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {(form.watch("sectorPlaces") || []).map((sector, sectorIndex) => (
                            <div key={sectorIndex} className="p-4 border border-border rounded-lg space-y-3">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1">
                                  <FormField
                                    control={form.control}
                                    name={`sectorPlaces.${sectorIndex}.sectorName`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Názov sektoru</FormLabel>
                                        <FormControl>
                                          <Input placeholder="napr. Sektor A" {...field} data-testid={`input-sector-name-${sectorIndex}`} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    const currentSectors = form.getValues("sectorPlaces") || [];
                                    const updatedSectors = currentSectors.filter((_, i) => i !== sectorIndex);
                                    form.setValue("sectorPlaces", updatedSectors);
                                  }}
                                  data-testid={`button-remove-sector-${sectorIndex}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <FormLabel>Miesta v sektore</FormLabel>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      const currentSectors = form.getValues("sectorPlaces") || [];
                                      const updatedSectors = [...currentSectors];
                                      updatedSectors[sectorIndex] = {
                                        ...updatedSectors[sectorIndex],
                                        places: [...updatedSectors[sectorIndex].places, ""]
                                      };
                                      form.setValue("sectorPlaces", updatedSectors);
                                    }}
                                    data-testid={`button-add-place-${sectorIndex}`}
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Pridať miesto
                                  </Button>
                                </div>
                                
                                <div className="space-y-2">
                                  {sector.places?.map((place, placeIndex) => (
                                    <div key={placeIndex} className="flex items-center space-x-2">
                                      <div className="flex-1">
                                        <FormField
                                          control={form.control}
                                          name={`sectorPlaces.${sectorIndex}.places.${placeIndex}`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <Input placeholder={`Place ${placeIndex + 1}`} {...field} data-testid={`input-place-${sectorIndex}-${placeIndex}`} />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                      {sector.places.length > 1 && (
                                        <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => {
                                            const currentSectors = form.getValues("sectorPlaces") || [];
                                            const updatedSectors = [...currentSectors];
                                            updatedSectors[sectorIndex] = {
                                              ...updatedSectors[sectorIndex],
                                              places: updatedSectors[sectorIndex].places.filter((_, i) => i !== placeIndex)
                                            };
                                            form.setValue("sectorPlaces", updatedSectors);
                                          }}
                                          data-testid={`button-remove-place-${sectorIndex}-${placeIndex}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {(!form.watch("sectorPlaces") || form.watch("sectorPlaces")?.length === 0) && (
                          <div className="text-center py-4 text-muted-foreground">
                            <MapPin className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
                            <p>Žiadne sektory nie sú definované. Kliknite na "Pridať sektor" pre začatie.</p>
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateDialogOpen(false)}
                          data-testid="button-cancel-competition"
                        >
                          Zrušiť
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createCompetitionMutation.isPending}
                          data-testid="button-submit-competition"
                        >
                          {createCompetitionMutation.isPending ? "Vytvára sa..." : "Vytvoriť súťaž"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Empty State or Competition Management */}
          {competitionsLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          ) : !selectedCompetition ? (
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
              {competitions?.length === 0 && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="button-create-first-competition"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Vytvoriť prvú súťaž
                </Button>
              )}
            </div>
          ) : (
            <Tabs defaultValue="teams" className="w-full">
              
              {/* Tab Navigation */}
              <div className="border-b border-border">
                <TabsList className="flex space-x-8 px-6 bg-transparent">
                  <TabsTrigger value="teams" className="py-4 border-b-2 border-primary text-primary font-medium text-sm">
                    Tímy
                  </TabsTrigger>
                  <TabsTrigger value="referees" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                    Rozhodcovia
                  </TabsTrigger>
                  <TabsTrigger value="sponsors" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                    Sponzori
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                    Nastavenia
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Team Management Tab */}
              <TabsContent value="teams" className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Správa tímov</h2>
                    <p className="text-muted-foreground">Schválte registrácie a pridelte sektory</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Všetky tímy</SelectItem>
                        <SelectItem value="pending">Čaká na schválenie</SelectItem>
                        <SelectItem value="approved">Schválené</SelectItem>
                        <SelectItem value="rejected">Zamietnuté</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Teams Table */}
                {teamsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : teams?.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-lg">Zatiaľ žiadne tímy nie sú zaregistrované</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/20">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Názov tímu</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Členovia</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Stav</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sektor</th>
                          <th className="text-right p-4 text-sm font-medium text-muted-foreground">Akcie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams?.map((team: Team & { members: TeamMember[] }) => (
                          <tr key={team.id} className="border-b border-border" data-testid={`row-team-${team.id}`}>
                            <td className="p-4">
                              <div className="font-medium text-foreground">{team.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Zaregistrovaný {new Date(team.createdAt!).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm text-foreground">
                                {team.members.map(m => m.name).join(', ')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {team.members.length} člen{team.members.length === 1 ? '' : team.members.length < 5 ? 'ovia' : 'ov'}
                              </div>
                            </td>
                            <td className="p-4">
                              {getStatusBadge(team.status)}
                            </td>
                            <td className="p-4">
                              {team.status === 'approved' ? (
                                <Select 
                                  value={team.sector || ''} 
                                  onValueChange={(sector) => handleApproveTeam(team.id, sector)}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue placeholder="Prideliť" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="A">Sektor A</SelectItem>
                                    <SelectItem value="B">Sektor B</SelectItem>
                                    <SelectItem value="C">Sektor C</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-muted-foreground text-sm">Neprideliť</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {team.status === 'pending' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                                      onClick={() => handleApproveTeam(team.id, 'A')}
                                      disabled={updateTeamStatusMutation.isPending}
                                      data-testid={`button-approve-${team.id}`}
                                    >
                                      <UserCheck className="w-4 h-4 mr-1" />
                                      Schváliť
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRejectTeam(team.id)}
                                      disabled={updateTeamStatusMutation.isPending}
                                      data-testid={`button-reject-${team.id}`}
                                    >
                                      <UserX className="w-4 h-4 mr-1" />
                                      Zamietnuť
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" variant="outline" data-testid={`button-edit-${team.id}`}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" data-testid={`button-view-${team.id}`}>
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Other tabs would be implemented similarly */}
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

            </Tabs>
          )}

          {!selectedCompetition && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground text-lg">Prosím vyberte súťaž na správu</p>
            </div>
          )}

        </Card>
      </div>
    </div>
  );
}
