import { useEffect, useState, useRef, useCallback } from "react";
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
import { Camera, LogOut, Check, Clock, Loader2, Wifi, WifiOff, Upload } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Competition, Team, Referee, Catch } from "@shared/schema";
import { formatSectorPlace } from "@/lib/utils";

// Dynamic schema based on competition's minimum weight
const createCatchSubmissionSchema = (minWeight: number = 2) => z.object({
  teamId: z.string().min(1, "Prosím vyberte tím"),
  weight: z.number().min(minWeight, `Váha musí byť najmenej ${minWeight} kg`),
  fishType: z.enum(["scaly", "mirror"], { required_error: "Prosím vyberte typ ryby" }),
  competitionId: z.string().min(1),
});

const defaultCatchSubmissionSchema = createCatchSubmissionSchema(2);

type CatchSubmissionForm = z.infer<typeof defaultCatchSubmissionSchema>;

// Haptic feedback function for mobile devices - shared across components
const triggerHaptic = (type: 'success' | 'warning' | 'selection' = 'selection') => {
  if ('vibrate' in navigator) {
    switch (type) {
      case 'success':
        navigator.vibrate([100, 50, 100]); // Double pulse for success
        break;
      case 'warning':
        navigator.vibrate([200]); // Single long pulse for warning
        break;
      case 'selection':
      default:
        navigator.vibrate([50]); // Quick pulse for selection
        break;
    }
  }
};

// Separate form component that can be remounted with key prop
interface CatchSubmissionFormProps {
  selectedCompetition: string;
  selectedCompetitionDetails: Competition | undefined;
  teams: Team[] | undefined;
  onSuccess: () => void;
  onSubmitFormRef: (submitHandle: { submit: () => void; isPending: boolean }) => void;
  isOffline: boolean;
  onSaveDraft: (data: any) => Promise<string>;
}

function CatchSubmissionFormComponent({ selectedCompetition, selectedCompetitionDetails, teams, onSuccess, onSubmitFormRef, isOffline, onSaveDraft }: CatchSubmissionFormProps) {
  const { toast } = useToast();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [recentTeams, setRecentTeams] = useState<string[]>([]);
  const [currentSchema, setCurrentSchema] = useState(() => {
    const minWeight = selectedCompetitionDetails?.minWeight ? parseFloat(selectedCompetitionDetails.minWeight) : 2;
    return createCatchSubmissionSchema(minWeight);
  });
  
  const form = useForm<CatchSubmissionForm>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      weight: 0,
      fishType: "scaly",
      competitionId: selectedCompetition,
      teamId: "",
    },
  });

  // Update form validation when competition changes
  useEffect(() => {
    if (selectedCompetitionDetails?.minWeight) {
      const minWeight = parseFloat(selectedCompetitionDetails.minWeight);
      const newSchema = createCatchSubmissionSchema(minWeight);
      setCurrentSchema(newSchema);
      
      // Reset form with new values
      form.reset({
        weight: 0,
        fishType: "scaly",
        competitionId: selectedCompetition,
        teamId: "",
      });
    }
  }, [selectedCompetitionDetails, selectedCompetition, form]);

  const submitCatchMutation = useMutation({
    mutationFn: async (data: CatchSubmissionForm & { photo?: File }) => {
      const formData = new FormData();
      formData.append('teamId', data.teamId);
      formData.append('competitionId', data.competitionId);
      formData.append('weight', data.weight.toString()); // Weight already in kg from form validation
      formData.append('fishType', data.fishType);
      
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
      triggerHaptic('success');
      toast({
        title: "Úspech",
        description: "Úlovok bol úspešne odoslaný",
      });
      form.reset();
      setSelectedPhoto(null);
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "catches"] });
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Neautorizovaný",
          description: "Ste odhlásený. Prihlasujem znovu...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 500);
        return;
      }
      triggerHaptic('warning');
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odoslať úlovok",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (selectedCompetition) {
      form.setValue('competitionId', selectedCompetition);
    }
  }, [selectedCompetition, form]);

  const onSubmit = useCallback(async (data: CatchSubmissionForm) => {
    if (isOffline) {
      // Save as draft when offline
      try {
        const draftId = await onSaveDraft({ ...data, photo: selectedPhoto || undefined });
        triggerHaptic('success');
        toast({
          title: "Uložené offline",
          description: "Úlovok sa odošle automaticky po obnovení pripojenia",
          variant: "default",
        });
        form.reset();
        setSelectedPhoto(null);
        onSuccess();
      } catch (error) {
        console.error('Failed to save draft:', error);
        toast({
          title: "Chyba",
          description: "Nepodarilo sa uložiť úlovok offline",
          variant: "destructive",
        });
      }
    } else {
      submitCatchMutation.mutate({ ...data, photo: selectedPhoto || undefined });
    }
  }, [submitCatchMutation, selectedPhoto, isOffline, onSaveDraft, toast, form, onSuccess]);

  const handleSubmitForm = useCallback(() => {
    form.handleSubmit(onSubmit)();
  }, [form, onSubmit]);

  // Expose form submission to parent with loading state
  useEffect(() => {
    onSubmitFormRef({
      submit: handleSubmitForm,
      isPending: submitCatchMutation.isPending
    });
  }, [onSubmitFormRef, handleSubmitForm, submitCatchMutation.isPending]);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      triggerHaptic('success');
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-foreground mb-2">Nový úlovok</h3>
        <p className="text-base text-foreground/80 font-medium">Zadajte detaily úlovku a nahrajte fotku</p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Team Selection with Quick Access */}
          <FormField
            control={form.control}
            name="teamId"
            render={({ field }) => {
              const approvedTeams = teams?.filter((team: Team) => team.status === 'approved') || [];
              const quickSelectTeams = recentTeams.length > 0 
                ? approvedTeams.filter(team => recentTeams.includes(team.id)).slice(0, 3)
                : approvedTeams.slice(0, 3);
                
              return (
                <FormItem>
                  <FormLabel className="text-lg font-semibold text-foreground">Vybrať tím</FormLabel>
                  
                  {/* Quick Select Buttons */}
                  {quickSelectTeams.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm text-foreground font-semibold">Rýchly výber:</div>
                      <div className="grid grid-cols-1 gap-2">
                        {quickSelectTeams.map((team) => (
                          <Button
                            key={team.id}
                            type="button"
                            variant={field.value === team.id ? "default" : "outline"}
                            className={`h-12 text-left text-base justify-start ${field.value === team.id ? 'bg-primary text-primary-foreground' : ''}`}
                            onClick={() => {
                              field.onChange(team.id);
                              triggerHaptic('selection');
                              // Update recent teams
                              setRecentTeams(prev => {
                                const updated = [team.id, ...prev.filter(id => id !== team.id)];
                                return updated.slice(0, 5);
                              });
                            }}
                            data-testid={`quick-select-team-${team.id}`}
                          >
                            <div className="truncate">
                              <div className="font-medium">{team.name}</div>
                              <div className="text-xs opacity-80">{formatSectorPlace(team) || `Sektor ${team.sector}`}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                      <div className="text-sm text-foreground/70 text-center font-medium">alebo vyberte zo všetkých:</div>
                    </div>
                  )}
                  
                  <FormControl>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      triggerHaptic('selection');
                      // Update recent teams
                      setRecentTeams(prev => {
                        const updated = [value, ...prev.filter(id => id !== value)];
                        return updated.slice(0, 5);
                      });
                    }} value={field.value}>
                      <SelectTrigger data-testid="select-team" className="h-14 text-lg font-medium">
                        <SelectValue placeholder="Vyberte tím" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedTeams.map((team: Team) => (
                          <SelectItem key={team.id} value={team.id} className="h-14 text-lg font-medium py-4">
                            {team.name} - {formatSectorPlace(team) || `Sektor ${team.sector}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          
          {/* Weight Input */}
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => {
              const minWeightKg = selectedCompetitionDetails?.minWeight ? parseFloat(selectedCompetitionDetails.minWeight) : 2;
              const placeholderWeight = minWeightKg + 0.5; // Slight buffer above minimum
              
              return (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-foreground">Váha (kg) - min. {minWeightKg} kg</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type="number" 
                      step="0.1"
                      inputMode="decimal"
                      placeholder={placeholderWeight.toString()} 
                      className="font-mono pr-12 h-14 text-lg font-semibold"
                      autoFocus
                      {...field}
                      onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                      data-testid="input-weight"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground/60 text-base font-medium">
                      kg
                    </span>
                  </div>
                </FormControl>
                <FormDescription className="text-sm font-medium text-foreground/70">
                  Úlovky pod {minWeightKg} kg nebudú započítané do výsledkov
                </FormDescription>
                <FormMessage />
              </FormItem>
              );
            }}
          />
          
          {/* Fish Type */}
          <FormField
            control={form.control}
            name="fishType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-foreground">Typ ryby</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={field.value === "scaly" ? "default" : "outline"}
                      className={`h-14 text-lg font-bold ${field.value === "scaly" ? "bg-primary text-primary-foreground" : ""}`}
                      onClick={() => {
                        field.onChange("scaly");
                        triggerHaptic('selection');
                      }}
                      data-testid="button-scaly-carp"
                    >
                      Šupináč
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "mirror" ? "default" : "outline"}
                      className={`h-14 text-lg font-bold ${field.value === "mirror" ? "bg-primary text-primary-foreground" : ""}`}
                      onClick={() => {
                        field.onChange("mirror");
                        triggerHaptic('selection');
                      }}
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
            <Label className="block text-lg font-semibold text-foreground mb-3">Fotka ryby</Label>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/10 active:bg-muted/20 min-h-[80px] flex items-center justify-center transition-colors"
              onClick={() => document.getElementById('photo-input')?.click()}
            >
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoSelect}
                data-testid="input-photo"
              />
              {selectedPhoto ? (
                <div className="space-y-2">
                  <Check className="mx-auto h-8 w-8 text-green-600" />
                  <div className="text-lg font-bold text-green-700">Fotka pripravená</div>
                  <div className="text-sm text-foreground/70 font-medium">{selectedPhoto.name}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Camera className="mx-auto h-8 w-8 text-muted-foreground" />
                  <div className="text-lg font-bold text-foreground">Otvoriť fotoaparát</div>
                  <div className="text-sm text-foreground/70 font-medium">Kliknite pre vytvorenie fotky ryby</div>
                </div>
              )}
            </div>
          </div>
          
          
        </form>
      </Form>
    </>
  );
}

// IndexedDB for photo storage
const openDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('CatchPhotos', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
    };
  });
};

const savePhotoToDB = async (id: string, photo: File) => {
  const db = await openDB();
  const tx = db.transaction(['photos'], 'readwrite');
  return new Promise<void>((resolve, reject) => {
    const request = tx.objectStore('photos').put({ id, photo });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getPhotoFromDB = async (id: string): Promise<File | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(['photos'], 'readonly');
    return new Promise<File | null>((resolve, reject) => {
      const request = tx.objectStore('photos').get(id);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.photo || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get photo from DB:', e);
    return null;
  }
};

const removePhotoFromDB = async (id: string) => {
  const db = await openDB();
  const tx = db.transaction(['photos'], 'readwrite');
  return new Promise<void>((resolve, reject) => {
    const request = tx.objectStore('photos').delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Offline capabilities
const useOffline = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCatches, setPendingCatches] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load pending catches from localStorage and reconcile photos
    const stored = localStorage.getItem('pendingCatches');
    if (stored) {
      try {
        const parsedCatches = JSON.parse(stored);
        setPendingCatches(parsedCatches);
        
        // Reconcile with IndexedDB for missing photos
        parsedCatches.forEach(async (catch_: any) => {
          if (catch_.hasPhoto && !catch_.photoMissing) {
            const photo = await getPhotoFromDB(catch_.id);
            if (!photo) {
              // Photo is missing, update the state
              setPendingCatches(prev => prev.map(c => 
                c.id === catch_.id ? { ...c, photoMissing: true } : c
              ));
            }
          }
        });
      } catch (e) {
        console.error('Failed to parse pending catches:', e);
      }
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveDraft = useCallback(async (catchData: any) => {
    const draftId = Date.now().toString();
    const { photo, ...metadataOnly } = catchData;
    
    const draft = {
      id: draftId,
      timestamp: new Date().toISOString(),
      hasPhoto: !!photo,
      photoMissing: false,
      ...metadataOnly
    };
    
    // Save photo to IndexedDB if present
    if (photo instanceof File) {
      try {
        await savePhotoToDB(draftId, photo);
      } catch (e) {
        console.error('Failed to save photo to IndexedDB:', e);
      }
    }
    
    // Use functional setState to avoid race conditions
    setPendingCatches(prev => {
      const updated = [...prev, draft];
      localStorage.setItem('pendingCatches', JSON.stringify(updated));
      return updated;
    });
    
    return draftId;
  }, []);

  const removeDraft = useCallback(async (draftId: string) => {
    // Remove photo from IndexedDB
    try {
      await removePhotoFromDB(draftId);
    } catch (e) {
      console.error('Failed to remove photo from IndexedDB:', e);
    }
    
    // Use functional setState
    setPendingCatches(prev => {
      const updated = prev.filter(c => c.id !== draftId);
      localStorage.setItem('pendingCatches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateDraft = useCallback((draftId: string, patch: any) => {
    setPendingCatches(prev => {
      const updated = prev.map(c => c.id === draftId ? { ...c, ...patch } : c);
      localStorage.setItem('pendingCatches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { isOffline, pendingCatches, saveDraft, removeDraft, updateDraft };
};

export default function RefereeInterface() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedCompetition, setSelectedCompetition] = useState<string>("");
  const [submitHandle, setSubmitHandle] = useState<{ submit: () => void; isPending: boolean } | null>(null);
  const { isOffline, pendingCatches, saveDraft, removeDraft, updateDraft } = useOffline();

  // Sync pending catches when back online
  const syncPendingCatches = useCallback(async () => {
    if (isOffline || pendingCatches.length === 0) return;
    
    for (const catchData of pendingCatches) {
      try {
        const formData = new FormData();
        formData.append('teamId', catchData.teamId);
        formData.append('competitionId', catchData.competitionId);
        formData.append('weight', catchData.weight.toString());
        formData.append('fishType', catchData.fishType);
        
        // Get photo from IndexedDB if it was supposed to have one
        if (catchData.hasPhoto) {
          const photo = await getPhotoFromDB(catchData.id);
          if (photo instanceof File) {
            formData.append('photo', photo);
          } else {
            // Mark as photo missing for UI feedback
            updateDraft(catchData.id, { photoMissing: true });
            continue; // Skip this draft until photo is resolved
          }
        }
        
        const response = await fetch('/api/catches', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (response.ok) {
          await removeDraft(catchData.id);
          toast({
            title: "Úspech",
            description: `Úlovok z ${new Date(catchData.timestamp).toLocaleTimeString()} bol úspešne synchronizovaný`,
          });
        } else if (response.status === 401) {
          // Handle unauthorized - redirect to login like online mutation
          toast({
            title: "Neautorizovaný",
            description: "Ste odhlásený. Prihlasujem znovu...",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/auth/login";
          }, 500);
          return; // Stop syncing
        } else {
          // Handle other errors with user feedback
          const errorText = await response.text();
          toast({
            title: "Chyba synchronizácie",
            description: `Úlovok z ${new Date(catchData.timestamp).toLocaleTimeString()}: ${errorText}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Failed to sync catch:', error);
        toast({
          title: "Chyba synchronizácie", 
          description: `Problém s pripojením. Skúste neskôr.`,
          variant: "destructive",
        });
      }
    }
  }, [isOffline, pendingCatches, removeDraft, toast]);

  // Auto-sync when connection is restored
  useEffect(() => {
    if (!isOffline && pendingCatches.length > 0) {
      const timeout = setTimeout(() => {
        syncPendingCatches();
      }, 1000); // Wait 1s after reconnection
      return () => clearTimeout(timeout);
    }
  }, [isOffline, pendingCatches.length, syncPendingCatches]);

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

  const { data: competitions, isLoading: competitionsLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
    enabled: true, // DEMO MODE - Always enabled for demonstration
  });

  const { data: selectedCompetitionDetails } = useQuery<Competition>({
    queryKey: ["/api/competitions", selectedCompetition],
    enabled: !!selectedCompetition,
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
  // In production, this would come from API based on logged-in user
  const refereeAssignment = {
    assignedSector: 'A',
    userId: 'demo_referee_001',
    competitionId: competitions?.[0]?.id || ''
  };
  
  // Auto-select assigned competition (referee is assigned by organizer)
  useEffect(() => {
    if (competitions && competitions.length > 0 && !selectedCompetition) {
      // In production: find competition where user is assigned as referee
      // For demo: auto-select first active competition
      const activeComp = competitions.find((comp: Competition) => 
        comp.status === 'live' || comp.status === 'registration'
      );
      if (activeComp) {
        setSelectedCompetition(activeComp.id);
      }
    }
  }, [competitions, selectedCompetition]);
  
  // Filter teams by referee's assigned sector
  // Fallback to all teams if no sector filtering is possible or no teams match
  const sectorFilteredTeams = (() => {
    if (!teams || teams.length === 0) return [];
    
    // Check if competition uses sectors
    const competitionUsesSectors = selectedCompetitionDetails?.hasSectors;
    if (!competitionUsesSectors) {
      // No sector system - show all approved teams
      return teams.filter((team: Team) => team.status === 'approved');
    }
    
    // Filter by referee's assigned sector
    const filtered = teams.filter((team: Team) => 
      (team.sector === refereeAssignment.assignedSector || 
       team.sectorName?.includes(refereeAssignment.assignedSector)) &&
      team.status === 'approved'
    );
    
    // Fallback: if no teams match sector filter, show all approved teams
    // (may happen with data inconsistency or demo mode)
    return filtered.length > 0 ? filtered : teams.filter((t: Team) => t.status === 'approved');
  })();


  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  // Find active competitions where user is a referee
  const activeCompetitions = competitions?.filter((comp: Competition) => 
    comp.status === 'live' || comp.status === 'registration'
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-4 pb-safe">
        {/* Add bottom padding when submit button is present to prevent overlap */}
        <div className={`${selectedCompetition ? 'pb-24' : ''}`}>
          <Card className="shadow-lg border border-border overflow-hidden">
          
          {/* Header */}
          <CardHeader className="bg-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-semibold truncate max-w-[200px]">
                    {selectedCompetitionDetails?.name || "Rozhranie rozhodcu"}
                  </CardTitle>
                  {/* Offline/Online Status */}
                  <div className="flex items-center gap-1">
                    {isOffline ? (
                      <WifiOff className="w-4 h-4 text-yellow-300" />
                    ) : (
                      <Wifi className="w-4 h-4 text-green-300" />
                    )}
                    {pendingCatches.length > 0 && (
                      <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded text-xs">
                        <Upload className="w-3 h-3" />
                        {pendingCatches.length}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-primary-foreground/80">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ""}` : (user?.nickname || "Rozhodca")} - {
                    refereeAssignment?.assignedSector && selectedCompetition ? (
                      <Link href={`/competition/${selectedCompetition}/sector/${refereeAssignment.assignedSector}`} data-testid="link-referee-sector">
                        <span className="underline hover:text-primary-foreground cursor-pointer transition-colors inline-block py-1 px-2 -mx-2 min-h-[44px] flex items-center">
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
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 h-12 w-12 p-0"
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                    window.location.href = '/';
                  } catch (error) {
                    console.error('Logout error:', error);
                    window.location.href = '/';
                  }
                }}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          {/* Form Content */}
          <CardContent className="p-4">
            {!selectedCompetition || activeCompetitions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">Žiadne aktívne súťaže nie sú pridelené</p>
                <p className="text-muted-foreground text-sm mt-2">Kontaktujte organizátora súťaže</p>
              </div>
            ) : (
              <>
                <CatchSubmissionFormComponent
                  key={`${selectedCompetition}-${selectedCompetitionDetails?.minWeight || 2}`}
                  selectedCompetition={selectedCompetition}
                  selectedCompetitionDetails={selectedCompetitionDetails}
                  teams={sectorFilteredTeams}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "catches"] });
                  }}
                  onSubmitFormRef={setSubmitHandle}
                  isOffline={isOffline}
                  onSaveDraft={saveDraft}
                />
              </>
            )}
          </CardContent>
          
          {/* Pending Catches (Offline) */}
          {pendingCatches.length > 0 && (
            <div className="border-t border-border p-4 bg-yellow-50 dark:bg-yellow-900/10">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Čakajúce na odoslanie ({pendingCatches.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {pendingCatches.map((catch_) => (
                  <div key={catch_.id} className="flex items-center justify-between text-sm" data-testid={`pending-catch-${catch_.id}`}>
                    <span className="text-foreground">
                      {catch_.weight}kg - {catch_.fishType === 'scaly' ? 'Šupináč' : 'Lysec'}
                      {catch_.hasPhoto && catch_.photoMissing && (
                        <span className="text-red-500 ml-2 text-xs">(foto chýba)</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {catch_.hasPhoto && catch_.photoMissing && (
                        <Badge className="bg-red-500 text-red-50">
                          <Camera className="w-3 h-3 mr-1" />
                          Foto?
                        </Badge>
                      )}
                      <Badge className="bg-yellow-500 text-yellow-50">
                        <Clock className="w-3 h-3 mr-1" />
                        Offline
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {!isOffline && (
                <Button 
                  onClick={syncPendingCatches} 
                  size="sm" 
                  className="w-full mt-3"
                  data-testid="button-sync-pending"
                >
                  Synchronizovať teraz
                </Button>
              )}
            </div>
          )}

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
                    Zatiaľ žiadne úlovky neboli odoslané
                  </div>
                )}
              </div>
            </div>
          )}
          
        </Card>
        </div>
        
        {/* Sticky Submit Button - Outside Card for proper positioning */}
        {selectedCompetition && submitHandle && (
          <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/95 backdrop-blur-sm border-t border-border">
            <div className="max-w-md mx-auto">
              <Button 
                onClick={submitHandle.submit}
                className="w-full h-16 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                disabled={submitHandle.isPending}
                data-testid="button-submit-catch"
              >
                {submitHandle.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Odosíla sa...
                  </>
                ) : (
                  "Odoslať úlovok"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
