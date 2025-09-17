import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Camera, LogOut, Check, Clock } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Competition, Team, Referee, Catch } from "@shared/schema";
import { formatSectorPlace } from "@/lib/utils";

const catchSubmissionSchema = z.object({
  teamId: z.string().min(1, "Prosím vyberte tím"),
  weight: z.number().min(0.1, "Váha musí byť najmenej 0,1 kg"),
  fishType: z.enum(["scaly", "mirror"], { required_error: "Prosím vyberte typ ryby" }),
  competitionId: z.string().min(1),
});

type CatchSubmissionForm = z.infer<typeof catchSubmissionSchema>;

export default function RefereeInterface() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<string>("");

  // DEMO MODE - Temporarily disabled for demonstration
  // Redirect if not authenticated or not referee
  // useEffect(() => {
  //   if (!isLoading && (!isAuthenticated || user?.role !== 'referee')) {
  //     toast({
  //       title: "Neautorizovaný",
  //       description: "Ste odhlásený. Prihlasujem znovu...",
  //       variant: "destructive",
  //     });
  //     setTimeout(() => {
  //       window.location.href = "/api/login";
  //     }, 500);
  //     return;
  //   }
  // }, [isAuthenticated, isLoading, user, toast]);

  const form = useForm<CatchSubmissionForm>({
    resolver: zodResolver(catchSubmissionSchema),
    defaultValues: {
      weight: 0,
      fishType: "scaly",
      competitionId: "",
      teamId: "",
    },
  });

  const { data: competitions, isLoading: competitionsLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
    enabled: true, // DEMO MODE - Always enabled for demonstration
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/competitions", selectedCompetition, "teams"],
    enabled: !!selectedCompetition, // DEMO MODE - Enabled when competition selected
  });

  const { data: recentCatches } = useQuery<(Catch & { team: Team })[]>({
    queryKey: ["/api/competitions", selectedCompetition, "catches"],
    enabled: !!selectedCompetition, // DEMO MODE - Enabled when competition selected
  });

  // DEMO MODE - Mock referee assignment for demonstration
  const refereeAssignment = {
    assignedSector: 'A',
    userId: 'demo_referee_001',
    competitionId: selectedCompetition
  };
  
  // Get referee assignment for the current user and selected competition
  // const { data: refereeAssignment } = useQuery<Referee>({
  //   queryKey: ["/api/competitions", selectedCompetition, "referees", user?.id],
  //   enabled: isAuthenticated && !!selectedCompetition && user?.role === 'referee',
  // });

  const submitCatchMutation = useMutation({
    mutationFn: async (data: CatchSubmissionForm & { photo?: File }) => {
      const formData = new FormData();
      formData.append('teamId', data.teamId);
      formData.append('competitionId', data.competitionId);
      formData.append('weight', (data.weight / 1000).toString()); // Convert grams to kg
      formData.append('fishType', data.fishType);
      // Note: sector is now set server-side from referee assignment for security
      
      if (data.photo) {
        formData.append('photo', data.photo);
      }

      const response = await fetch('/api/catches', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Úspech",
        description: "Záber bol úspešne odoslaný",
      });
      form.reset();
      setSelectedPhoto(null);
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "catches"] });
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
        description: "Nepodarilo sa odoslať záber",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (selectedCompetition) {
      form.setValue('competitionId', selectedCompetition);
    }
  }, [selectedCompetition, form]);

  const onSubmit = (data: CatchSubmissionForm) => {
    submitCatchMutation.mutate({ ...data, photo: selectedPhoto || undefined });
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  // Find active competitions where user is a referee
  const activeCompetitions = competitions?.filter((comp: Competition) => 
    comp.status === 'live' || comp.status === 'registration'
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-8">
        <Card className="shadow-lg border border-border overflow-hidden">
          
          {/* Header */}
          <CardHeader className="bg-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-semibold">Rozhranie rozhodcu</CardTitle>
                <p className="text-sm text-primary-foreground/80">
                  Peter Rozhodca - {
                    refereeAssignment?.assignedSector && selectedCompetition ? (
                      <Link href={`/competition/${selectedCompetition}/sector/${refereeAssignment.assignedSector}`} data-testid="link-referee-sector">
                        <span className="underline hover:text-primary-foreground cursor-pointer transition-colors">
                          Sektor {refereeAssignment.assignedSector}
                        </span>
                      </Link>
                    ) : (
                      `Sektor ${refereeAssignment?.assignedSector || 'Nepridelený'}`
                    )
                  }
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => window.location.href = '/api/logout'}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          {/* Competition Selection */}
          <CardContent className="p-6">
            {activeCompetitions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">Žiadne aktívne súťaže nie sú pridelené</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    Vybrať súťaž
                  </Label>
                  <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
                    <SelectTrigger data-testid="select-competition">
                      <SelectValue placeholder="Vyberte súťaž" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCompetitions.map((competition: Competition) => (
                        <SelectItem key={competition.id} value={competition.id}>
                          {competition.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCompetition && (
                  <>
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Odoslať nový záber</h3>
                      <p className="text-sm text-muted-foreground">Zadajte detaily záberu a nahrajte fotku</p>
                    </div>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        
                        {/* Team Selection */}
                        <FormField
                          control={form.control}
                          name="teamId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vybrať tím</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger data-testid="select-team">
                                    <SelectValue placeholder="Vyberte tím" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {teams?.filter((team: Team) => team.status === 'approved').map((team: Team) => (
                                      <SelectItem key={team.id} value={team.id}>
                                        {team.name} - {formatSectorPlace(team) || `Sektor ${team.sector}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Weight Input */}
                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Váha (gramy)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type="number" 
                                    placeholder="2850" 
                                    className="font-mono pr-12"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    data-testid="input-weight"
                                  />
                                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                                    g
                                  </span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Fish Type */}
                        <FormField
                          control={form.control}
                          name="fishType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Typ ryby</FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    type="button"
                                    variant={field.value === "scaly" ? "default" : "outline"}
                                    className={field.value === "scaly" ? "bg-primary text-primary-foreground" : ""}
                                    onClick={() => field.onChange("scaly")}
                                    data-testid="button-scaly-carp"
                                  >
                                    Šupináč
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={field.value === "mirror" ? "default" : "outline"}
                                    className={field.value === "mirror" ? "bg-primary text-primary-foreground" : ""}
                                    onClick={() => field.onChange("mirror")}
                                    data-testid="button-mirror-carp"
                                  >
                                    Lysec
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Photo Upload */}
                        <div>
                          <Label className="block text-sm font-medium text-foreground mb-2">Fotka ryby</Label>
                          <div 
                            className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/10"
                            onClick={() => document.getElementById('photo-input')?.click()}
                          >
                            <input
                              id="photo-input"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handlePhotoSelect}
                              data-testid="input-photo"
                            />
                            {selectedPhoto ? (
                              <div className="space-y-2">
                                <Check className="mx-auto h-6 w-6 text-secondary" />
                                <div className="text-sm text-foreground">Fotka vybraná: {selectedPhoto.name}</div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Camera className="mx-auto h-6 w-6 text-muted-foreground" />
                                <div className="text-sm text-muted-foreground">Kliknite pre vytvorenie fotky</div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Submit Button */}
                        <Button 
                          type="submit" 
                          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          disabled={submitCatchMutation.isPending}
                          data-testid="button-submit-catch"
                        >
                          {submitCatchMutation.isPending ? "Odosíla sa..." : "Odoslať záber"}
                        </Button>
                        
                      </form>
                    </Form>
                  </>
                )}
              </>
            )}
          </CardContent>
          
          {/* Recent Submissions */}
          {selectedCompetition && recentCatches && (
            <div className="border-t border-border p-4">
              <h4 className="font-medium text-foreground mb-3">Posledné odosílania</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentCatches.slice(0, 5).map((catch_: Catch & { team: Team }) => (
                  <div key={catch_.id} className="flex items-center justify-between text-sm" data-testid={`catch-${catch_.id}`}>
                    <span className="text-muted-foreground">
                      {catch_.team?.name} - {catch_.weight}kg
                    </span>
                    <Badge className="bg-secondary text-secondary-foreground">
                      <Check className="w-3 h-3 mr-1" />
                      Potvrdený
                    </Badge>
                  </div>
                ))}
                {recentCatches.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    Zatiaľ žiadne zábery neboli odoslané
                  </div>
                )}
              </div>
            </div>
          )}
          
        </Card>
      </div>
    </div>
  );
}
