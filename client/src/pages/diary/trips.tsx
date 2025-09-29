import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorUtils";

import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Plus, 
  Fish, 
  Edit, 
  Trash2, 
  Eye, 
  Users,
  Clock,
  FileText,
  Globe,
  Lock,
  AlertCircle
} from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryTrip, InsertDiaryTrip } from "@shared/schema";
import DiaryLayout from "@/components/DiaryLayout";

// Type for freemium limits response
type FreemiumLimits = {
  canCreate: boolean;
  currentCount: number;
  limit: number;
};

// Trip form validation schema
const tripFormSchema = z.object({
  name: z.string().min(1, "Názov výpravy je povinný").max(255, "Názov môže mať maximálne 255 znakov"),
  startDate: z.date({ required_error: "Dátum začiatku je povinný" }),
  endDate: z.date({ required_error: "Dátum ukončenia je povinný" }),
  location: z.string().min(1, "Lokalita je povinná"),
  notes: z.string().optional(),
  visibility: z.enum(["private", "shared"]).default("private"),
  participants: z.array(z.object({
    name: z.string().min(1, "Meno účastníka je povinné")
  })).optional()
}).refine((data) => data.endDate >= data.startDate, {
  message: "Dátum ukončenia musí byť po dátume začiatku",
  path: ["endDate"]
});

type TripFormData = z.infer<typeof tripFormSchema>;

export default function DiaryTrips() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<DiaryTrip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<DiaryTrip | null>(null);

  // Fetch user's trips
  const { data: trips = [], isLoading } = useQuery<DiaryTrip[]>({
    queryKey: ["/api/diary/trips"],
    enabled: !!user
  });

  // Check freemium limits
  const { data: limits } = useQuery<FreemiumLimits>({
    queryKey: ["/api/diary/trip-limits"],
    enabled: !!user
  });

  const form = useForm<TripFormData>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      name: "",
      startDate: new Date(),
      endDate: new Date(),
      location: "",
      notes: "",
      visibility: "private",
      participants: []
    }
  });

  // Create trip mutation
  const createTripMutation = useMutation({
    mutationFn: async (data: TripFormData) => {
      // Server will set ownerUserId from auth session
      const tripData = {
        ...data,
        participants: data.participants || []
      };
      const response = await apiRequest("POST", "/api/diary/trips", tripData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trip-limits"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Výprava vytvorená!",
        description: "Vaša rybárska výprava bola úspešne vytvorená.",
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'trip');
    }
  });

  // Update trip mutation
  const updateTripMutation = useMutation({
    mutationFn: async (data: TripFormData) => {
      const response = await apiRequest("PUT", `/api/diary/trips/${editingTrip!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
      setEditingTrip(null);
      form.reset();
      toast({
        title: "Výprava aktualizovaná!",
        description: "Vaša rybárska výprava bola úspešne aktualizovaná.",
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'update');
    }
  });

  // Delete trip mutation
  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      await apiRequest("DELETE", `/api/diary/trips/${tripId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trip-limits"] });
      setDeletingTrip(null);
      toast({
        title: "Výprava zmazaná!",
        description: "Rybárska výprava bola úspešne zmazaná.",
      });
    },
    onError: (error: Error) => {
      showErrorToast(toast, error, 'delete');
    }
  });

  const handleSubmit = (data: TripFormData) => {
    if (editingTrip) {
      updateTripMutation.mutate(data);
    } else {
      createTripMutation.mutate(data);
    }
  };

  const addParticipant = () => {
    const currentParticipants = form.getValues("participants") || [];
    form.setValue("participants", [...currentParticipants, { name: "" }]);
  };

  const removeParticipant = (index: number) => {
    const currentParticipants = form.getValues("participants") || [];
    form.setValue("participants", currentParticipants.filter((_, i) => i !== index));
  };

  const openEditDialog = (trip: DiaryTrip) => {
    setEditingTrip(trip);
    form.reset({
      name: trip.name,
      startDate: new Date(trip.startDate),
      endDate: new Date(trip.endDate),
      location: trip.location,
      notes: trip.notes || "",
      visibility: trip.visibility as "private" | "shared",
      participants: trip.participants || []
    });
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingTrip(null);
    form.reset();
  };

  const handleDeleteTrip = () => {
    if (deletingTrip) {
      deleteTripMutation.mutate(deletingTrip.id);
    }
  };

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Rybárske výpravy</h1>
              <p className="text-muted-foreground">
                Spravujte svoje rybárske výpravy a zdieľajte ich s ostatnými
              </p>
            </div>
            <Dialog open={isCreateDialogOpen || !!editingTrip} onOpenChange={closeDialog}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={limits && !limits.canCreate}
                  data-testid="button-create-trip"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nová výprava
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTrip ? "Upraviť výpravu" : "Nová rybárska výprava"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTrip 
                      ? "Aktualizujte detaily vašej rybárskej výpravy."
                      : "Vytvorte novú rybársku výpravu a začnite zapisovať úlovky."
                    }
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Názov výpravy</FormLabel>
                            <FormControl>
                              <Input placeholder="napr. Víkendová výprava na Dunaj" data-testid="input-trip-name" {...field} />
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
                            <FormLabel>Lokalita</FormLabel>
                            <FormControl>
                              <Input placeholder="napr. Dunaj - Bratislava" data-testid="input-trip-location" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Začiatok výpravy</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                      data-testid="button-start-date"
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP", { locale: sk })
                                      ) : (
                                        <span>Vyberte dátum</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date("1900-01-01")}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Koniec výpravy</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                      data-testid="button-end-date"
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP", { locale: sk })
                                      ) : (
                                        <span>Vyberte dátum</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date("1900-01-01")}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Poznámky (voliteľné)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Dodatočné informácie o výprave..."
                                data-testid="textarea-trip-notes"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="visibility"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Viditeľnosť</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-trip-visibility">
                                  <SelectValue placeholder="Vyberte viditeľnosť" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="private">
                                  <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    <span>Súkromné - len vy</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="shared">
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4" />
                                    <span>Zdieľané - viditeľné pre ostatných</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Participants */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <FormLabel>Účastníci (voliteľné)</FormLabel>
                        <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
                          <Plus className="w-4 h-4 mr-1" />
                          Pridať
                        </Button>
                      </div>
                      
                      {form.watch("participants")?.map((_, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name={`participants.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input 
                                    placeholder="Meno účastníka"
                                    data-testid={`input-participant-${index}`}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeParticipant(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button type="button" variant="outline" onClick={closeDialog}>
                        Zrušiť
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createTripMutation.isPending || updateTripMutation.isPending}
                        data-testid="button-submit-trip"
                      >
                        {editingTrip ? "Aktualizovať" : "Vytvoriť"} výpravu
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Freemium Limits Warning */}
          {limits && !limits.canCreate && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Dosiahli ste limit {limits.limit} výprav v rámci bezplatného plánu ({limits.currentCount}/{limits.limit}). 
                <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setLocation('/pricing')}>
                  Prejdite na Premium
                </Button> pre neobmedzený počet výprav.
              </AlertDescription>
            </Alert>
          )}

          {/* Trips List */}
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent className="animate-pulse">
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : trips.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Fish className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Zatiaľ nemáte žiadne výpravy
                </h3>
                <p className="text-muted-foreground mb-4">
                  Vytvorte svoju prvú rybársku výpravu a začnite zapisovať úlovky.
                </p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={limits && !limits.canCreate}
                  data-testid="button-create-first-trip"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Vytvoriť prvú výpravu
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <Card key={trip.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg truncate">{trip.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {trip.location}
                        </CardDescription>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {trip.visibility === "private" ? (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Globe className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            {trip.visibility === "private" ? "Súkromné" : "Zdieľané"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="w-4 h-4" />
                        <span>
                          {format(new Date(trip.startDate), "d. MMM", { locale: sk })} - {format(new Date(trip.endDate), "d. MMM yyyy", { locale: sk })}
                        </span>
                      </div>

                      {trip.participants && trip.participants.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{trip.participants.length + 1} účastníkov</span>
                        </div>
                      )}

                      {trip.notes && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4 mt-0.5" />
                          <span className="line-clamp-2">{trip.notes}</span>
                        </div>
                      )}

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setLocation(`/diary/trips/${trip.id}`)}
                            data-testid={`button-view-trip-${trip.id}`}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Zobraziť
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openEditDialog(trip)}
                            data-testid={`button-edit-trip-${trip.id}`}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Upraviť
                          </Button>
                        </div>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => setDeletingTrip(trip)}
                          data-testid={`button-delete-trip-${trip.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!deletingTrip} onOpenChange={() => setDeletingTrip(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Zmazať výpravu</DialogTitle>
                <DialogDescription>
                  Naozaj chcete zmazať výpravu "{deletingTrip?.name}"? Táto akcia sa nedá vrátiť späť.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => setDeletingTrip(null)}>
                  Zrušiť
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteTrip}
                  disabled={deleteTripMutation.isPending}
                  data-testid="button-confirm-delete-trip"
                >
                  {deleteTripMutation.isPending ? "Maže sa..." : "Zmazať"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DiaryLayout>
  );
}