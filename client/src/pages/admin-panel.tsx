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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Edit, Eye, Users, UserCheck, UserX, Plus, Trophy, Trash2, MapPin, CheckCircle, XCircle, Clock, Calendar, Mail, Phone, Building2, FileText, Award } from "lucide-react";
import { getSideCompetitionLabels, getSideCompetitionLabel } from "@/lib/utils";
import type { Competition, Team, TeamMember, CompetitionRegistration } from "@shared/schema";

// Competition creation form schema
const competitionSchema = z.object({
  name: z.string().min(1, "Názov súťaže je povinný").max(255, "Názov je príliš dlhý"),
  description: z.string().optional(),
  location: z.string().min(1, "Miesto je povinné").max(255, "Miesto je príliš dlhé"),
  startDate: z.string().min(1, "Dátum začiatku je povinný"),
  endDate: z.string().min(1, "Dátum konca je povinný"),
  firstPlacePrize: z.string().optional(),
  secondPlacePrize: z.string().optional(),
  thirdPlacePrize: z.string().optional(),
  registrationFee: z.string().optional(),
  maxTeams: z.string().optional(),
  sectorPlaces: z.array(z.object({
    sectorName: z.string().min(1, "Názov sektoru je povinný"),
    places: z.array(z.string().min(1, "Názov miesta je povinný")).min(1, "Sektor musí mať aspoň jedno miesto")
  })).min(1, "Súťaž musí mať aspoň jeden sektor"),
  sideCompetitions: z.array(z.string()).optional().default([]),
  hasSectors: z.boolean().optional().default(false),
});

type CompetitionForm = z.infer<typeof competitionSchema>;

export default function AdminPanel() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Check if user is admin or organizer
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer';
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
      firstPlacePrize: "",
      secondPlacePrize: "",
      thirdPlacePrize: "",
      registrationFee: "",
      maxTeams: "",
      sectorPlaces: [
        { sectorName: "Sektor A", places: ["Place 1", "Place 2", "Place 3"] },
        { sectorName: "Sektor B", places: ["Place 1", "Place 2"] }
      ],
      sideCompetitions: [],
      hasSectors: false,
    },
  });

  // Competition creation mutation
  const createCompetitionMutation = useMutation({
    mutationFn: async (data: CompetitionForm) => {
      const competitionData = {
        ...data,
        firstPlacePrize: data.firstPlacePrize || undefined, // Keep as string for decimal type
        secondPlacePrize: data.secondPlacePrize || undefined, // Keep as string for decimal type
        thirdPlacePrize: data.thirdPlacePrize || undefined, // Keep as string for decimal type
        registrationFee: data.registrationFee || undefined, // Keep as string for decimal type
        maxTeams: data.maxTeams ? parseInt(data.maxTeams) : undefined,
        startDate: new Date(data.startDate), // Send Date object, not ISO string
        endDate: new Date(data.endDate), // Send Date object, not ISO string
        sectorPlaces: data.sectorPlaces || undefined, // Include sector places configuration
        sideCompetitions: data.sideCompetitions || [],
        hasSectors: data.hasSectors || false,
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

  // Redirect if not authenticated or not admin/organizer
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user?.role !== 'organizer' && user?.role !== 'admin'))) {
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
    enabled: isAuthenticated && (isAdmin || isOrganizer),
  });

  // Competition registrations queries (admin only)
  const { data: registrations, isLoading: registrationsLoading } = useQuery<CompetitionRegistration[]>({
    queryKey: ["/api/competition-registrations"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: submittedRegistrations } = useQuery<CompetitionRegistration[]>({
    queryKey: ["/api/competition-registrations", { status: "submitted" }],
    queryFn: () => apiRequest("GET", "/api/competition-registrations?status=submitted").then(res => res.json()),
    enabled: isAuthenticated && isAdmin,
  });

  const { data: selectedCompetitionData } = useQuery<Competition>({
    queryKey: ["/api/competitions", selectedCompetition],
    enabled: isAuthenticated && !!selectedCompetition,
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<(Team & { members: TeamMember[] })[]>({
    queryKey: ["/api/competitions", selectedCompetition, "teams"],
    enabled: isAuthenticated && !!selectedCompetition,
  });

  const updateTeamStatusMutation = useMutation({
    mutationFn: async ({ teamId, status, sectorName, placeName, sector }: { 
      teamId: string; 
      status: string; 
      sectorName?: string; 
      placeName?: string;
      sector?: string; // Keep for backward compatibility
    }) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/status`, { 
        status, 
        sectorName, 
        placeName,
        sector: sector || sectorName?.split(' ')[1] // Fallback: extract letter from "Sektor A"
      });
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

  // Competition registration mutations (admin only)
  const approveRegistrationMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      return apiRequest("PATCH", `/api/competition-registrations/${registrationId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Registrácia schválená!",
        description: "Súťaž bola vytvorená a je dostupná pre registráciu tímov.",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/competition-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Nepodarilo sa schváliť registráciu",
        description: error.message || "Skúste to znovu.",
        variant: "destructive",
      });
    },
  });

  const declineRegistrationMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      return apiRequest("PATCH", `/api/competition-registrations/${registrationId}/decline`, {});
    },
    onSuccess: () => {
      toast({
        title: "Registrácia zamietnutá",
        description: "Registrácia súťaže bola zamietnutá.",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/competition-registrations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Nepodarilo sa zamietnuť registráciu",
        description: error.message || "Skúste to znovu.",
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

  const handleApproveTeam = (teamId: string, sectorName: string, placeName: string) => {
    updateTeamStatusMutation.mutate({ 
      teamId, 
      status: 'approved', 
      sectorName, 
      placeName,
      sector: sectorName?.split(' ')[1] // Extract letter for backward compatibility
    });
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
                            name="firstPlacePrize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Výhry: 1. miesto (€)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0.00" step="0.01" {...field} data-testid="input-first-place-prize" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="secondPlacePrize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>2. miesto (€)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0.00" step="0.01" {...field} data-testid="input-second-place-prize" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="thirdPlacePrize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>3. miesto (€)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0.00" step="0.01" {...field} data-testid="input-third-place-prize" />
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

                      {/* Optional Side Competitions */}
                      <div className="space-y-4">
                        <h3 className="font-medium text-foreground">Voliteľné vedľajšie súťaže</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Vyberte dodatočné súťaže, ktoré sa budú konať spolu s hlavnou súťažou:
                        </p>
                        
                        <FormField
                          control={form.control}
                          name="sideCompetitions"
                          render={({ field }) => (
                            <FormItem>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                  { id: "big-fish-overall", label: getSideCompetitionLabel("big-fish-overall") },
                                  { id: "big-common-carp", label: getSideCompetitionLabel("big-common-carp") },
                                  { id: "big-mirror-carp", label: getSideCompetitionLabel("big-mirror-carp") },
                                  { id: "first-catch", label: getSideCompetitionLabel("first-catch") },
                                  { id: "last-catch", label: getSideCompetitionLabel("last-catch") },
                                  { id: "most-fish-caught", label: getSideCompetitionLabel("most-fish-caught") },
                                  { id: "best-5-fish", label: getSideCompetitionLabel("best-5-fish") },
                                  { id: "best-3-fish", label: getSideCompetitionLabel("best-3-fish") },
                                  { id: "daily-big-fish", label: getSideCompetitionLabel("daily-big-fish") },
                                  { id: "first-fish-over-15kg", label: getSideCompetitionLabel("first-fish-over-15kg") },
                                  { id: "first-fish-over-20kg", label: getSideCompetitionLabel("first-fish-over-20kg") },
                                  { id: "first-fish-over-25kg", label: getSideCompetitionLabel("first-fish-over-25kg") },
                                ].map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <Checkbox
                                      checked={field.value?.includes(item.id) || false}
                                      onCheckedChange={(checked) => {
                                        const currentValue = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentValue, item.id]);
                                        } else {
                                          field.onChange(currentValue.filter((value) => value !== item.id));
                                        }
                                      }}
                                      data-testid={`checkbox-side-competition-${item.id}`}
                                    />
                                    <label className="text-sm font-normal cursor-pointer" htmlFor={item.id}>
                                      {item.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Sectors Toggle */}
                        <FormField
                          control={form.control}
                          name="hasSectors"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Rozdeliť súťaž na sektory
                                </FormLabel>
                                <FormDescription>
                                  Súťaž bude rozdelená na geografické sektory s oddelenými výsledkami
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-has-sectors"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
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
                  {isAdmin && (
                    <TabsTrigger value="registrations" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                      Registrácie
                    </TabsTrigger>
                  )}
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
                                  value={team.sectorName && team.placeName ? `${team.sectorName}|${team.placeName}` : ''} 
                                  onValueChange={(value) => {
                                    const [sectorName, placeName] = value.split('|');
                                    handleApproveTeam(team.id, sectorName, placeName);
                                  }}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Prideliť miesto" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedCompetitionData?.sectorPlaces?.map((sector) => 
                                      sector.places.map((place) => (
                                        <SelectItem key={`${sector.sectorName}|${place}`} value={`${sector.sectorName}|${place}`}>
                                          {sector.sectorName} - {place}
                                        </SelectItem>
                                      ))
                                    ) || [
                                      <SelectItem key="A|Place 1" value="Sektor A|Place 1">Sektor A - Place 1</SelectItem>,
                                      <SelectItem key="B|Place 1" value="Sektor B|Place 1">Sektor B - Place 1</SelectItem>,
                                      <SelectItem key="C|Place 1" value="Sektor C|Place 1">Sektor C - Place 1</SelectItem>
                                    ]}
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
                                      onClick={() => {
                                        // Use first available sector place as default
                                        const firstSector = selectedCompetitionData?.sectorPlaces?.[0];
                                        const defaultSectorName = firstSector?.sectorName || 'Sektor A';
                                        const defaultPlaceName = firstSector?.places?.[0] || 'Place 1';
                                        handleApproveTeam(team.id, defaultSectorName, defaultPlaceName);
                                      }}
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

              {/* Competition Registrations Tab (Admin Only) */}
              {isAdmin && (
                <TabsContent value="registrations" className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Registrácie súťaží</h2>
                      <p className="text-muted-foreground">Schváľte alebo zamietnite žiadosti o nové súťaže</p>
                    </div>
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {submittedRegistrations?.length || 0} čaká na schválenie
                    </div>
                  </div>

                  {registrationsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-6 border border-border rounded-lg">
                          <Skeleton className="h-5 w-64 mb-2" />
                          <Skeleton className="h-4 w-32 mb-4" />
                          <Skeleton className="h-16 w-full mb-4" />
                          <div className="flex space-x-2">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : registrations?.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Žiadne registrácie</h3>
                      <p className="text-muted-foreground">Zatiaľ neboli odoslané žiadne žiadosti o registráciu súťaže.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {registrations?.map((registration) => (
                        <div key={registration.id} className="p-6 border border-border rounded-lg bg-card">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-foreground mb-1" data-testid={`text-competition-name-${registration.id}`}>
                                {registration.name}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {new Date(registration.startDate).toLocaleDateString('sk-SK')} - {new Date(registration.endDate).toLocaleDateString('sk-SK')}
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span>{registration.location}</span>
                                <span>•</span>
                                <span>Max {registration.maxTeams} tímov</span>
                                <span>•</span>
                                <span>{registration.registrationFee}€ poplatok</span>
                              </div>
                            </div>
                            <div className="ml-4">
                              {getStatusBadge(registration.status)}
                            </div>
                          </div>

                          {registration.description && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground leading-relaxed">{registration.description}</p>
                            </div>
                          )}

                          {/* Side Competitions */}
                          {registration.sideCompetitions && registration.sideCompetitions.length > 0 && (
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Award className="w-4 h-4 text-muted-foreground" />
                                <h4 className="text-sm font-medium text-foreground">Špeciálne súťaže:</h4>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {getSideCompetitionLabels(registration.sideCompetitions).map((label, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="outline" 
                                    className="bg-muted/20 text-foreground border-muted text-xs"
                                    data-testid={`badge-registration-side-competition-${index}`}
                                  >
                                    {label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sector Places */}
                          {registration.sectorPlaces && registration.sectorPlaces.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-foreground mb-2">Sektory a miesta:</h4>
                              <div className="flex flex-wrap gap-2">
                                {registration.sectorPlaces.map((sector: any, index: number) => (
                                  <div key={index} className="bg-secondary px-2 py-1 rounded text-xs">
                                    {sector.sectorName}: {sector.places.length} miest
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {registration.status === 'submitted' && (
                            <div className="flex space-x-2 pt-4 border-t border-border">
                              <Button
                                size="sm"
                                onClick={() => approveRegistrationMutation.mutate(registration.id)}
                                disabled={approveRegistrationMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                data-testid={`button-approve-${registration.id}`}
                              >
                                {approveRegistrationMutation.isPending ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                )}
                                Schváliť
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => declineRegistrationMutation.mutate(registration.id)}
                                disabled={declineRegistrationMutation.isPending}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                data-testid={`button-decline-${registration.id}`}
                              >
                                {declineRegistrationMutation.isPending ? (
                                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                                ) : (
                                  <XCircle className="w-4 h-4 mr-2" />
                                )}
                                Zamietnuť
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}

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
