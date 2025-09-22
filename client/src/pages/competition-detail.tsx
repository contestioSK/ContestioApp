import { useParams, Link } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import NavigationHeader from "@/components/navigation-header";
import LiveLeaderboard from "@/components/live-leaderboard";
import CatchTimeline from "@/components/catch-timeline";
import SectorLeaderboards from "@/components/sector-leaderboards";
import CompetitionStatsBar from "@/components/competition-stats-bar";
import StatsDashboard from "@/components/stats-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, UserPlus, Trash2, Fish, Award, BarChart3 } from "lucide-react";
import { getSideCompetitionLabels } from "@/lib/utils";
import type { Competition, Team, Catch } from "@shared/schema";

// Team registration form schema
const teamRegistrationSchema = z.object({
  name: z.string().min(1, "Názov tímu je povinný").max(100, "Názov tímu je príliš dlhý"),
  description: z.string().optional(),
  members: z.array(z.object({
    name: z.string().min(1, "Meno člena je povinné"),
    role: z.enum(["captain", "member"]),
    email: z.string().optional().refine((val) => !val || z.string().email().safeParse(val).success, "Zadajte platný e-mail"),
    phone: z.string().optional(),
  })).min(1, "Aspoň jeden člen tímu je povinný").max(6, "Maximálne 6 členov je povolených"),
});

type TeamRegistrationForm = z.infer<typeof teamRegistrationSchema>;

export default function CompetitionDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Team registration form
  const form = useForm<TeamRegistrationForm>({
    resolver: zodResolver(teamRegistrationSchema),
    defaultValues: {
      name: "",
      description: "",
      members: [
        { name: user?.firstName + " " + user?.lastName || "", role: "captain", email: user?.email || "", phone: "" }
      ],
    },
  });

  // Team registration mutation
  const registerTeamMutation = useMutation({
    mutationFn: async (data: TeamRegistrationForm) => {
      return apiRequest("POST", `/api/competitions/${id}/teams`, data);
    },
    onSuccess: () => {
      toast({
        title: "Tím bol úspešne zaregistrovaný!",
        description: "Registrácia vášho tímu čaká na schválenie organizátorom.",
      });
      setIsRegistrationDialogOpen(false);
      form.reset();
      // Invalidate teams query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", id, "teams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Registrácia zlyhala",
        description: error.message || "Nepodarilo sa zaregistrovať tím. Prosím skúste znovu.",
        variant: "destructive",
      });
    },
  });

  const addMember = () => {
    const currentMembers = form.getValues("members");
    if (currentMembers.length < 6) {
      form.setValue("members", [...currentMembers, { name: "", role: "member", email: "", phone: "" }]);
    }
  };

  const removeMember = (index: number) => {
    const currentMembers = form.getValues("members");
    if (currentMembers.length > 1) {
      form.setValue("members", currentMembers.filter((_, i) => i !== index));
    }
  };

  const onSubmitRegistration = (data: TeamRegistrationForm) => {
    registerTeamMutation.mutate(data);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: competition, isLoading: competitionLoading, error } = useQuery<Competition>({
    queryKey: ["/api/competitions", id],
    enabled: isAuthenticated && !!id,
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<(Team & { members?: any[] })[]>({
    queryKey: ["/api/competitions", id, "teams"],
    enabled: isAuthenticated && !!id,
  });

  const { data: catches, isLoading: catchesLoading } = useQuery<(Catch & { team?: Team; referee?: any })[]>({
    queryKey: ["/api/competitions", id, "catches"],
    enabled: isAuthenticated && !!id,
  });

  // WebSocket for real-time updates
  useWebSocket((data) => {
    if (data.type === 'new_catch' && data.competitionId === id) {
      // Invalidate and refetch relevant queries for real-time stats updates
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", id, "catches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", id, "teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", id, "sectors", "leaderboards"] });
    }
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

  if (isLoading || competitionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Súťaž nebola nájdená</h1>
            <p className="text-muted-foreground">Súťaž, ktorú hľadáte, neexistuje.</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />

      {/* Competition Header */}
      <section className="py-16 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            
            {/* Competition Logo */}
            {competition.imageUrl && (
              <div className="mb-8">
                <div className="w-full max-w-md mx-auto">
                  <img 
                    src={competition.imageUrl} 
                    alt={`Logo súťaže ${competition.name}`}
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '300px' }}
                    data-testid="img-competition-logo"
                  />
                </div>
              </div>
            )}
            
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-competition-name">
              {competition.name}
            </h1>
            <p className="text-muted-foreground" data-testid="text-competition-location">
              {competition.location}
            </p>
            {competition.description && (
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                {competition.description}
              </p>
            )}
            
            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              
              {/* Team Registration Button */}
              {competition.status === 'registration' && (
                <Dialog open={isRegistrationDialogOpen} onOpenChange={setIsRegistrationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-register-team">
                      <Users className="w-4 h-4 mr-2" />
                      Registrovať váš tím
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Registrovať tím pre {competition.name}</DialogTitle>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmitRegistration)} className="space-y-6">
                        {/* Team Name */}
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Názov tímu</FormLabel>
                              <FormControl>
                                <Input placeholder="Zadajte názov vášho tímu" {...field} data-testid="input-team-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Team Description */}
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Popis tímu (voliteľné)</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Krátky popis vášho tímu" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Team Members */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <FormLabel>Členovia tímu</FormLabel>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={addMember}
                              disabled={form.watch("members").length >= 6}
                              data-testid="button-add-member"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Pridať člena
                            </Button>
                          </div>

                          {form.watch("members").map((member, index) => (
                            <div key={index} className="space-y-4 p-4 border border-border rounded-lg mb-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">
                                  {index === 0 ? "Kapitán tímu" : `Člen ${index + 1}`}
                                </h4>
                                {index > 0 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMember(index)}
                                    data-testid={`button-remove-member-${index}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`members.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Celé meno</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Meno člena" {...field} data-testid={`input-member-name-${index}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name={`members.${index}.email`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Email (voliteľné)</FormLabel>
                                      <FormControl>
                                        <Input type="email" placeholder="clen@email.com" {...field} data-testid={`input-member-email-${index}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <FormField
                                control={form.control}
                                name={`members.${index}.phone`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Telefón (voliteľné)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Telefónne číslo" {...field} data-testid={`input-member-phone-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Registration Info */}
                        <div className="bg-muted/20 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Informácie o registrácii</h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {competition.registrationFee && (
                              <p>Štartovné na tím: ${parseFloat(competition.registrationFee)}</p>
                            )}
                            {competition.maxTeams && (
                              <p>Maximálny počet tímov: {competition.maxTeams}</p>
                            )}
                            <p>Registrácia vášho tímu bude čakať na schválenie organizátorom.</p>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsRegistrationDialogOpen(false)}
                            data-testid="button-cancel-registration"
                          >
                            Zrušiť
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={registerTeamMutation.isPending}
                            data-testid="button-submit-registration"
                          >
                            {registerTeamMutation.isPending ? "Registrujem..." : "Registrovať tím"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
              
            </div>
          </div>
          
        </div>
        
        {/* Competition Statistics Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CompetitionStatsBar 
            catches={(catches || []).map(c => ({ ...c, team: c.team }))} 
            isLoading={catchesLoading} 
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Tabs Container */}
          <Tabs value={activeTab} onValueChange={(value) => {
            if (value === "catches") {
              window.location.href = `/competition/${id}/catches`;
            } else {
              setActiveTab(value);
            }
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-gradient-to-r from-card via-background to-card border border-border/50 shadow-lg backdrop-blur-sm p-2 rounded-xl">
              <TabsTrigger value="overview" data-testid="tab-overview" className="font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 hover:bg-primary/10">Priebežné výsledky</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics" className="font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 hover:bg-primary/10">
                <BarChart3 className="w-4 h-4 mr-2" />
                Štatistiky súťaže
              </TabsTrigger>
              <TabsTrigger value="catches" data-testid="tab-catches" className="font-semibold data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-md transition-all duration-200 hover:bg-secondary/10">
                <Fish className="w-4 h-4 mr-2" />
                Zobraziť všetky úlovky
              </TabsTrigger>
              <TabsTrigger value="rules" data-testid="tab-rules" className="font-semibold data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md transition-all duration-200 hover:bg-accent/10">Pravidlá</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Left Column: Leaderboard & Interactive Map */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Live Leaderboard */}
              <LiveLeaderboard teams={(teams || []).map(team => ({ ...team, members: team.members || [] }))} isLoading={teamsLoading} competitionId={id!} />
              
              {/* Sector Leaderboards - only show if competition has teams with sectors */}
              {teams && teams.some(team => team.sector && team.status === 'approved') && (
                <SectorLeaderboards competitionId={id!} />
              )}
              
            </div>
            
            {/* Right Column: Live Catch Timeline & Special Contests */}
            <div className="space-y-6">
              
              {/* Special Contests - only show if side competitions are active */}
              {competition.sideCompetitions && competition.sideCompetitions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Špeciálne súťaže</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {catches && catches.length > 0 ? (
                        <>
                          {competition.sideCompetitions.map((sideCompetitionId) => {
                            switch (sideCompetitionId) {
                              case 'big-fish-overall':
                                return (() => {
                                  const biggestCatch = catches.reduce((max: any, current: any) => 
                                    parseFloat(current.weight) > parseFloat(max.weight) ? current : max
                                  );
                                  return (
                                    <div key={sideCompetitionId} className="flex items-center justify-between p-3 bg-accent/5 rounded-lg" data-testid="special-contest-biggest">
                                      <div>
                                        <div className="font-medium text-foreground">Najväčší úlovok súťaže</div>
                                        <div className="text-sm text-muted-foreground">{biggestCatch.team?.name}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono font-bold text-accent">{biggestCatch.weight} kg</div>
                                      </div>
                                    </div>
                                  );
                                })();

                              case 'most-fish-caught':
                                return (() => {
                                  const teamCatchCounts = teams?.map((team: any) => ({
                                    team,
                                    count: catches.filter((c: any) => c.teamId === team.id).length
                                  })) || [];
                                  const mostFishTeam = teamCatchCounts.reduce((max, current) => 
                                    current.count > max.count ? current : max, { team: null, count: 0 }
                                  );
                                  
                                  return mostFishTeam.team ? (
                                    <div key={sideCompetitionId} className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg" data-testid="special-contest-most-fish">
                                      <div>
                                        <div className="font-medium text-foreground">Najväčší počet ulovených rýb</div>
                                        <div className="text-sm text-muted-foreground">{mostFishTeam.team.name}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono font-bold text-secondary">{mostFishTeam.count}</div>
                                      </div>
                                    </div>
                                  ) : null;
                                })();

                              case 'big-common-carp':
                                return (() => {
                                  const scalyCatches = catches.filter((c: any) => c.fishType === 'scaly');
                                  if (scalyCatches.length === 0) return null;
                                  const biggestScaly = scalyCatches.reduce((max: any, current: any) => 
                                    parseFloat(current.weight) > parseFloat(max.weight) ? current : max
                                  );
                                  return (
                                    <div key={sideCompetitionId} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg" data-testid="special-contest-biggest-scaly">
                                      <div>
                                        <div className="font-medium text-foreground">Najväčší šupináč</div>
                                        <div className="text-sm text-muted-foreground">{biggestScaly.team?.name}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono font-bold text-green-600 dark:text-green-400">{biggestScaly.weight} kg</div>
                                      </div>
                                    </div>
                                  );
                                })();

                              case 'big-mirror-carp':
                                return (() => {
                                  const mirrorCatches = catches.filter((c: any) => c.fishType === 'mirror');
                                  if (mirrorCatches.length === 0) return null;
                                  const biggestMirror = mirrorCatches.reduce((max: any, current: any) => 
                                    parseFloat(current.weight) > parseFloat(max.weight) ? current : max
                                  );
                                  return (
                                    <div key={sideCompetitionId} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg" data-testid="special-contest-biggest-mirror">
                                      <div>
                                        <div className="font-medium text-foreground">Najväčší lysec</div>
                                        <div className="text-sm text-muted-foreground">{biggestMirror.team?.name}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono font-bold text-blue-600 dark:text-blue-400">{biggestMirror.weight} kg</div>
                                      </div>
                                    </div>
                                  );
                                })();

                              case 'first-catch':
                                return (() => {
                                  const firstCatch = catches.reduce((earliest: any, current: any) => {
                                    const currentTime = new Date(current.submittedAt).getTime();
                                    const earliestTime = new Date(earliest.submittedAt).getTime();
                                    return currentTime < earliestTime ? current : earliest;
                                  });
                                  return (
                                    <div key={sideCompetitionId} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg" data-testid="special-contest-first-fish">
                                      <div>
                                        <div className="font-medium text-foreground">Prvá ryba súťaže</div>
                                        <div className="text-sm text-muted-foreground">{firstCatch.team?.name}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono font-bold text-yellow-600 dark:text-yellow-400">{firstCatch.weight} kg</div>
                                      </div>
                                    </div>
                                  );
                                })();

                              case 'last-catch':
                                return (() => {
                                  const lastCatch = catches.reduce((latest: any, current: any) => {
                                    const currentTime = new Date(current.submittedAt).getTime();
                                    const latestTime = new Date(latest.submittedAt).getTime();
                                    return currentTime > latestTime ? current : latest;
                                  });
                                  return (
                                    <div key={sideCompetitionId} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg" data-testid="special-contest-last-fish">
                                      <div>
                                        <div className="font-medium text-foreground">Posledná ryba súťaže</div>
                                        <div className="text-sm text-muted-foreground">{lastCatch.team?.name}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-mono font-bold text-orange-600 dark:text-orange-400">{lastCatch.weight} kg</div>
                                      </div>
                                    </div>
                                  );
                                })();

                              default:
                                return null;
                            }
                          }).filter(Boolean)}
                        </>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          Zatiaľ žiadne úlovky
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Live Catch Timeline */}
              <CatchTimeline catches={(catches || []).map(c => ({ ...c, team: c.team || { id: '', name: 'Neznámy tím', status: '', createdAt: null, updatedAt: null, competitionId: '', sector: null, sectorName: null, placeName: null, position: null, totalWeight: null, fishCount: null, photoUrl: null, country: null }, referee: c.referee || { id: '', userId: '', competitionId: '', assignedSector: '', isActive: true, createdAt: null } }))} isLoading={catchesLoading} competitionId={id!} />
              
            </div>
          </div>
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-6">
              {activeTab === "analytics" && <StatsDashboard competitionId={id!} />}
            </TabsContent>
            
            <TabsContent value="rules" className="mt-6">
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Pravidlá súťaže</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {competition.rules ? (
                      <div 
                        className="prose dark:prose-invert max-w-none whitespace-pre-wrap"
                        data-testid="competition-rules-content"
                      >
                        {competition.rules}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground" data-testid="no-rules-message">
                        <p>Pre túto súťaž nie sú zadefinované žiadne pravidlá.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
