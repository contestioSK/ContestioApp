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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Plus, 
  Fish, 
  Edit, 
  Trash2, 
  Eye, 
  Users,
  ArrowLeft,
  Clock,
  FileText,
  Globe,
  Lock,
  AlertCircle
} from "lucide-react";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DiaryTrip, InsertDiaryTrip } from "@shared/schema";

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
      toast({
        title: "Chyba pri vytváraní výpravy",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Chyba pri aktualizácii výpravy",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Chyba pri mazaní výpravy",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: TripFormData) => {
    if (editingTrip) {
      updateTripMutation.mutate(data);
    } else {
      createTripMutation.mutate(data);
    }
  };

  const handleEdit = (trip: DiaryTrip) => {
    setEditingTrip(trip);
    form.reset({
      name: trip.name,
      startDate: new Date(trip.startDate),
      endDate: new Date(trip.endDate),
      location: trip.location,
      notes: trip.notes || "",
      visibility: trip.visibility as "private" | "shared",
      participants: trip.participants?.map(p => ({ name: p.name })) || []
    });
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingTrip(null);
    form.reset();
  };

  // Enforce strict freemium gating - don't allow bypass during loading
  const canCreateTrip = limits?.canCreate === true;
  const isAtLimit = limits && !limits.canCreate;
  const limitsLoading = !limits;

  return (
    <div className="min-h-screen bg-background" data-testid="page-diary-trips">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/diary")}
              className="gap-2"
              data-testid="button-back-to-diary"
            >
              <ArrowLeft className="w-4 h-4" />
              Späť do denníka
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Rybárske výpravy</h1>
              <p className="text-muted-foreground">Spravujte svoje rybárske výpravy a plánujte nové dobrodružstvá</p>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen || !!editingTrip} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button 
                className="gap-2"
                disabled={!canCreateTrip}
                data-testid="button-create-trip"
              >
                <Plus className="w-4 h-4" />
                Nová výprava
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTrip ? "Upraviť výpravu" : "Nová rybárska výprava"}
                </DialogTitle>
                <DialogDescription>
                  {editingTrip ? "Aktualizujte informácie o výprave" : "Vytvorte novú rybársku výpravu a začnite zaznamenávať úlovky"}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Disable all form fields during submission */}
                  <fieldset disabled={createTripMutation.isPending || updateTripMutation.isPending} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Názov výpravy</FormLabel>
                        <FormControl>
                          <Input placeholder="napr. Víkendová výprava na Dunaj" {...field} data-testid="input-trip-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Dátum začiatku</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
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
                          <FormLabel>Dátum ukončenia</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
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
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lokalita</FormLabel>
                        <FormControl>
                          <Input placeholder="napr. Dunaj - Bratislava, Sektor A" {...field} data-testid="input-trip-location" />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-trip-visibility">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vyberte viditeľnosť" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="private">
                              <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Súkromná
                              </div>
                            </SelectItem>
                            <SelectItem value="shared">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Zdieľaná
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poznámky</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Dodatočné informácie o výprave..."
                            className="resize-none"
                            {...field}
                            data-testid="textarea-trip-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-trip">
                      Zrušiť
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createTripMutation.isPending || updateTripMutation.isPending}
                      data-testid="button-save-trip"
                    >
                      {(createTripMutation.isPending || updateTripMutation.isPending) && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      )}
                      {editingTrip ? "Uložiť zmeny" : "Vytvoriť výpravu"}
                    </Button>
                  </div>
                  </fieldset>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Freemium Limit Alert */}
        {isAtLimit && (
          <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              Dosiahli ste limit {limits.limit} výprav vo FREE verzii. 
              <Button variant="link" className="p-0 h-auto font-medium text-orange-600" data-testid="link-upgrade-premium">
                Prejdite na PREMIUM
              </Button> pre neobmedzené výpravy.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Celkové výpravy</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trips.length}</div>
              <p className="text-xs text-muted-foreground">
                {limits && `${limits.currentCount}/${limits.limit} použité`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktívne výpravy</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trips.filter(trip => new Date(trip.endDate) >= new Date()).length}
              </div>
              <p className="text-xs text-muted-foreground">Prebieha alebo naplánované</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Zdieľané výpravy</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trips.filter(trip => trip.visibility === "shared").length}
              </div>
              <p className="text-xs text-muted-foreground">Verejne dostupné</p>
            </CardContent>
          </Card>
        </div>

        {/* Trips List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse" data-testid="skeleton-trip-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Trip name */}
                      <div className="h-5 bg-muted rounded w-4/5 mb-2"></div>
                      {/* Location with map pin */}
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-32"></div>
                      </div>
                    </div>
                    {/* Badges */}
                    <div className="flex gap-1">
                      {i % 2 === 0 && <div className="h-5 bg-muted rounded w-16"></div>}
                      {i % 3 === 0 && <div className="h-5 bg-muted rounded w-12"></div>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Date range */}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-40"></div>
                    </div>
                    {/* Duration */}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                    {/* Participants (sometimes) */}
                    {i % 3 === 1 && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-24"></div>
                      </div>
                    )}
                    {/* Notes (sometimes) */}
                    {i % 4 === 0 && (
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 bg-muted rounded mt-0.5"></div>
                        <div className="space-y-1 flex-1">
                          <div className="h-3 bg-muted rounded w-full"></div>
                          <div className="h-3 bg-muted rounded w-3/4"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Separator */}
                  <div className="h-px bg-muted my-4"></div>
                  {/* Action buttons */}
                  <div className="flex justify-between">
                    <div className="h-8 bg-muted rounded w-20"></div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 bg-muted rounded"></div>
                      <div className="w-8 h-8 bg-muted rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Fish className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Žiadne výpravy</h3>
              <p className="text-muted-foreground mb-4">
                Vytvorte svoju prvú rybársku výpravu a začnite zaznamenávať úlovky.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!canCreateTrip} data-testid="button-create-first-trip">
                <Plus className="w-4 h-4 mr-2" />
                Vytvoriť prvú výpravu
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => {
              const isActive = new Date(trip.endDate) >= new Date();
              const daysDuration = Math.ceil(
                (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
              ) + 1;

              return (
                <Card key={trip.id} className="hover:shadow-md transition-shadow" data-testid={`card-trip-${trip.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{trip.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3" />
                          {trip.location}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        {trip.visibility === "shared" && (
                          <Badge variant="secondary" className="text-xs">
                            <Globe className="w-3 h-3 mr-1" />
                            Zdieľaná
                          </Badge>
                        )}
                        {isActive && (
                          <Badge variant="default" className="text-xs">Aktívna</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="w-4 h-4" />
                        <span>
                          {format(new Date(trip.startDate), "dd.MM.yyyy", { locale: sk })} - {" "}
                          {format(new Date(trip.endDate), "dd.MM.yyyy", { locale: sk })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{daysDuration} {daysDuration === 1 ? "deň" : daysDuration < 5 ? "dni" : "dní"}</span>
                      </div>

                      {trip.participants && trip.participants.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{trip.participants.length} účastníci</span>
                        </div>
                      )}

                      {trip.notes && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4 mt-0.5" />
                          <p className="line-clamp-2">{trip.notes}</p>
                        </div>
                      )}
                    </div>

                    <Separator className="my-4" />

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/diary/catches?tripId=${trip.id}`)}
                        className="gap-2"
                        data-testid={`button-view-catches-${trip.id}`}
                      >
                        <Fish className="w-4 h-4" />
                        Úlovky
                      </Button>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(trip)}
                          data-testid={`button-edit-trip-${trip.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingTrip(trip)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-trip-${trip.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTrip} onOpenChange={() => setDeletingTrip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmazať výpravu</DialogTitle>
            <DialogDescription>
              Naozaj chcete zmazať výpravu "{deletingTrip?.name}"? Táto akcia je nevratná a zmaže aj všetky súvisiace úlovky a battle.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeletingTrip(null)} data-testid="button-cancel-delete">
              Zrušiť
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingTrip && deleteTripMutation.mutate(deletingTrip.id)}
              disabled={deleteTripMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteTripMutation.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              )}
              Zmazať výpravu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}