import { useParams, Link, useLocation } from "wouter";
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
import SideCompetitionStatsBar from "@/components/side-competition-stats-bar";
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
import { Users, UserPlus, Trash2, Fish, Award, BarChart3, Trophy, FileText, Heart, QrCode } from "lucide-react";
import { getSideCompetitionLabels } from "@/lib/utils";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import type { Competition, Team, Catch } from "@shared/schema";
import { useFavoriteCompetitions, useToggleFavoriteCompetition } from "@/hooks/useFavorites";
import { QRShareDialog } from "@/components/QRShareDialog";

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
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Favorite competitions (only for authenticated users)
  const { data: favoriteCompetitions } = useFavoriteCompetitions();
  const { addFavorite, removeFavorite, isAdding, isRemoving } = useToggleFavoriteCompetition();
  
  const isFavorite = isAuthenticated && favoriteCompetitions?.some(fav => fav.competitionId === id);
  
  const handleToggleFavorite = () => {
    if (!isAuthenticated || !id) return;
    if (isFavorite) {
      removeFavorite(id);
    } else {
      addFavorite(id);
    }
  };

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
        description: error.message || "Nepodarilo sa zaregistrovať tím. Prosím, skúste to znovu.",
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
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Neautorizovaný",
        description: "Ste odhlásený. Prihlasujem znovu...",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate("/auth/login");
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast, navigate]);

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
        navigate("/auth/login");
      }, 500);
    }
  }, [error, toast, navigate]);

  if (authLoading || competitionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="h-16" />
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
        <div className="h-16" />
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
      <div className="h-16" />

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
              
              {/* QR Share Button */}
              <QRShareDialog 
                type="competition" 
                id={id || ""} 
                name={competition.name}
                trigger={
                  <Button size="lg" variant="outline" data-testid="button-qr-competition">
                    <QrCode className="w-4 h-4 mr-2" />
                    QR kód
                  </Button>
                }
              />
              
              {/* Favorite Button */}
              {isAuthenticated && !authLoading && (
                <Button 
                  size="lg" 
                  variant={isFavorite ? "default" : "outline"}
                  onClick={handleToggleFavorite}
                  disabled={isAdding || isRemoving}
                  data-testid="button-toggle-favorite"
                  className={isFavorite ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-current" : ""}`} />
                  {isFavorite ? "Obľúbené" : "Pridať do obľúbených"}
                </Button>
              )}
              
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

        {/* Side Competition Statistics Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SideCompetitionStatsBar 
            catches={(catches || []).map(c => ({ ...c, team: c.team }))} 
            teams={teams || []}
            competition={competition}
            isLoading={catchesLoading || competitionLoading}
            isOrganizer={user?.role === 'admin' || user?.role === 'organizer'}
            userTeamId={null}
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Navigation Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Button
              variant={activeTab === "overview" ? "default" : "outline"}
              size="lg"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => setActiveTab("overview")}
              data-testid="button-overview"
            >
              <TacticalIconInline icon={Trophy} variant="amber" size="md" />
              <span className="text-sm font-medium">Priebežné výsledky</span>
            </Button>
            
            <Button
              variant={activeTab === "analytics" ? "default" : "outline"}
              size="lg"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => setActiveTab("analytics")}
              data-testid="button-analytics"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-medium">Štatistiky súťaže</span>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => window.location.href = `/competition/${id}/catches`}
              data-testid="button-catches"
            >
              <TacticalIconInline icon={Fish} variant="cyan" size="md" />
              <span className="text-sm font-medium">Zobraziť všetky úlovky</span>
            </Button>
            
            <Button
              variant={activeTab === "rules" ? "default" : "outline"}
              size="lg"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => setActiveTab("rules")}
              data-testid="button-rules"
            >
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium">Pravidlá</span>
            </Button>
          </div>

          {/* Content Sections */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            
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
            
            {/* Right Column: Live Catch Timeline */}
            <div className="space-y-6">
              
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
