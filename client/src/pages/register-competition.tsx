import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertCompetitionRegistrationSchema, type InsertCompetitionRegistration } from "@shared/schema";
import { Plus, Trash2, ArrowLeft, Award, MapPin, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getSideCompetitionLabel } from "@/lib/utils";
import { useState } from "react";
import { z } from "zod";

// Form-specific schema that uses strings for dates and handles null values
const competitionRegistrationFormSchema = z.object({
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
  contactName: z.string().min(1, "Meno kontaktnej osoby je povinné").max(255),
  contactEmail: z.string().email("Neplatný email").max(255),
  contactPhone: z.string().max(50).optional(),
  organizationName: z.string().max(255).optional(),
  hasSectors: z.boolean().default(false),
  sectorPlaces: z.array(z.object({
    sectorName: z.string().min(1, "Názov sektoru je povinný"),
    places: z.array(z.string().min(1, "Názov miesta je povinný")).min(1, "Sektor musí mať aspoň jedno miesto")
  })).min(1, "Súťaž musí mať aspoň jeden sektor"),
  sideCompetitions: z.array(z.string()).optional().default([]),
  scoringType: z.enum(["total", "avg3", "avg5"]).default("total"),
});

type CompetitionRegistrationForm = z.infer<typeof competitionRegistrationFormSchema>;

export default function RegisterCompetition() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<CompetitionRegistrationForm>({
    resolver: zodResolver(competitionRegistrationFormSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      firstPlacePrize: "",
      secondPlacePrize: "",
      thirdPlacePrize: "",
      registrationFee: "",
      maxTeams: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      organizationName: "",
      hasSectors: false,
      sectorPlaces: [
        { sectorName: "Sektor A", places: ["Miesto 1", "Miesto 2", "Miesto 3"] },
        { sectorName: "Sektor B", places: ["Miesto 1", "Miesto 2"] }
      ],
      sideCompetitions: [],
      scoringType: "total",
    },
  });

  const createRegistrationMutation = useMutation({
    mutationFn: async (data: CompetitionRegistrationForm) => {
      // Transform form data to match API schema
      const registrationData: InsertCompetitionRegistration = {
        name: data.name,
        description: data.description || null,
        location: data.location,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        firstPlacePrize: data.firstPlacePrize || null,
        secondPlacePrize: data.secondPlacePrize || null,
        thirdPlacePrize: data.thirdPlacePrize || null,
        registrationFee: data.registrationFee || null,
        maxTeams: data.maxTeams ? parseInt(data.maxTeams) : null,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
        organizationName: data.organizationName || null,
        hasSectors: data.hasSectors,
        sectorPlaces: data.sectorPlaces,
        sideCompetitions: data.sideCompetitions || [],
      };
      
      return apiRequest("POST", "/api/competition-registrations", registrationData);
    },
    onSuccess: async () => {
      toast({
        title: "Registrácia úspešne odoslaná!",
        description: "Vaša žiadosť o registráciu súťaže bola odoslaná na schválenie administrátorom.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Nepodarilo sa odoslať registráciu",
        description: error.message || "Prosím skontrolujte údaje a skúste znovu.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompetitionRegistrationForm) => {
    createRegistrationMutation.mutate(data);
  };

  const [sectorPlaces, setSectorPlaces] = useState(form.watch("sectorPlaces") || []);

  // Update form when sector places change
  const updateSectorPlaces = (newSectorPlaces: typeof sectorPlaces) => {
    setSectorPlaces(newSectorPlaces);
    form.setValue("sectorPlaces", newSectorPlaces);
  };

  const addSector = () => {
    const newSector = { sectorName: `Sektor ${String.fromCharCode(65 + sectorPlaces.length)}`, places: ["Miesto 1"] };
    updateSectorPlaces([...sectorPlaces, newSector]);
  };

  const removeSector = (index: number) => {
    updateSectorPlaces(sectorPlaces.filter((_, i) => i !== index));
  };

  const updateSector = (index: number, updates: Partial<{ sectorName: string; places: string[] }>) => {
    const updatedSectors = [...sectorPlaces];
    updatedSectors[index] = { ...updatedSectors[index], ...updates };
    updateSectorPlaces(updatedSectors);
  };

  const addPlace = (sectorIndex: number) => {
    const updatedSectors = [...sectorPlaces];
    updatedSectors[sectorIndex].places.push(`Miesto ${updatedSectors[sectorIndex].places.length + 1}`);
    updateSectorPlaces(updatedSectors);
  };

  const removePlace = (sectorIndex: number, placeIndex: number) => {
    const updatedSectors = [...sectorPlaces];
    updatedSectors[sectorIndex].places = updatedSectors[sectorIndex].places.filter((_, i) => i !== placeIndex);
    updateSectorPlaces(updatedSectors);
  };

  const updatePlace = (sectorIndex: number, placeIndex: number, newName: string) => {
    const updatedSectors = [...sectorPlaces];
    updatedSectors[sectorIndex].places[placeIndex] = newName;
    updateSectorPlaces(updatedSectors);
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="mb-4"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť na domovskú stránku
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground">Registrácia súťaže</h1>
          <p className="text-muted-foreground mt-2">
            Vyplňte formulár pre registráciu novej rybárskej súťaže. Vaša žiadosť bude preskúmaná administrátorom.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Údaje o súťaži</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Basic Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-foreground">Základné informácie</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Názov súťaže *</FormLabel>
                          <FormControl>
                            <Input placeholder="Zadajte názov súťaže" {...field} data-testid="input-competition-name" />
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
                          <FormLabel>Miesto konania *</FormLabel>
                          <FormControl>
                            <Input placeholder="Napríklad: Jazero Orava, Oravská Polhora" {...field} data-testid="input-competition-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Popis (voliteľné)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Stručný popis súťaže, pravidlá, atď." {...field} data-testid="input-competition-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dátum začiatku *</FormLabel>
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
                          <FormLabel>Dátum ukončenia *</FormLabel>
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
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-foreground">Detaily súťaže</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="firstPlacePrize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Výhry: 1. miesto (€)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="500.00" step="0.01" {...field} data-testid="input-first-place-prize" />
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
                            <Input type="number" placeholder="300.00" step="0.01" {...field} data-testid="input-second-place-prize" />
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
                            <Input type="number" placeholder="200.00" step="0.01" {...field} data-testid="input-third-place-prize" />
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
                            <Input placeholder="25.00" {...field} data-testid="input-registration-fee" />
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
                            <Input type="number" placeholder="50" {...field} data-testid="input-max-teams" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Side Competitions */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-medium text-foreground">Špeciálne súťaže</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="sideCompetitions"
                    render={() => (
                      <FormItem>
                        <FormDescription>
                          Vyberte špeciálne súťaže, ktoré budú súčasťou hlavnej súťaže
                        </FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="sideCompetitions"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          return checked
                                            ? field.onChange([...currentValue, item.id])
                                            : field.onChange(currentValue.filter((value) => value !== item.id));
                                        }}
                                        data-testid={`checkbox-side-competition-${item.id}`}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Show selected side competitions as badges */}
                  {form.watch("sideCompetitions")?.length > 0 && (
                    <div>
                      <FormLabel className="text-sm font-medium">Vybrané špeciálne súťaže:</FormLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.watch("sideCompetitions").map((id: string, index: number) => (
                          <Badge 
                            key={id} 
                            variant="outline" 
                            className="bg-muted/20 text-foreground border-muted"
                            data-testid={`badge-selected-side-competition-${index}`}
                          >
                            {getSideCompetitionLabel(id)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Scoring Type */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-medium text-foreground">Typ hodnotenia súťaže</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="scoringType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormDescription>
                          Vyberte ako sa bude hodnotiť výsledok tímov v súťaži
                        </FormDescription>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                            data-testid="radio-group-scoring-type"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="total" id="total" data-testid="radio-scoring-total" />
                              <FormLabel htmlFor="total" className="font-normal">
                                Celková hmotnosť všetkých rýb
                              </FormLabel>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="avg3" id="avg3" data-testid="radio-scoring-avg3" />
                              <FormLabel htmlFor="avg3" className="font-normal">
                                Priemerná hmotnosť 3 najväčších rýb
                              </FormLabel>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="avg5" id="avg5" data-testid="radio-scoring-avg5" />
                              <FormLabel htmlFor="avg5" className="font-normal">
                                Priemerná hmotnosť 5 najväčších rýb
                              </FormLabel>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-foreground">Kontaktné údaje organizátora</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meno kontaktnej osoby *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ján Novák" {...field} data-testid="input-contact-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="jan.novak@email.com" {...field} data-testid="input-contact-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefón</FormLabel>
                          <FormControl>
                            <Input placeholder="+421 900 123 456" {...field} data-testid="input-contact-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Názov organizácie</FormLabel>
                          <FormControl>
                            <Input placeholder="Rybársky spolok Orava" {...field} data-testid="input-organization-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Sectors and Places Configuration */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-foreground">Konfigurácia sektorov a miest</h3>
                    {form.watch("hasSectors") && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addSector}
                        data-testid="button-add-sector"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Pridať sektor
                      </Button>
                    )}
                  </div>
                  
                  {/* Sector Toggle */}
                  <FormField
                    control={form.control}
                    name="hasSectors"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">
                            Súťaž je rozdelená do sektorov
                          </FormLabel>
                          <FormDescription>
                            Aktivujte túto možnosť, ak sa súťaž bude konať v geograficky rozdelených sektoroch
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
                  
                  {form.watch("hasSectors") && (
                    <>
                      <FormDescription>
                        Definujte sektory a miesta pre súťaž. Každý sektor môže mať viacero miest kde sa tímy môžu umiestniť.
                      </FormDescription>

                      {sectorPlaces.map((sector, sectorIndex) => (
                    <Card key={sectorIndex} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Input
                            value={sector.sectorName}
                            onChange={(e) => updateSector(sectorIndex, { sectorName: e.target.value })}
                            placeholder="Názov sektoru"
                            data-testid={`input-sector-name-${sectorIndex}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeSector(sectorIndex)}
                            disabled={sectorPlaces.length <= 1}
                            data-testid={`button-remove-sector-${sectorIndex}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Miesta v sektore:</label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addPlace(sectorIndex)}
                              data-testid={`button-add-place-${sectorIndex}`}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Pridať miesto
                            </Button>
                          </div>
                          
                          {sector.places.map((place, placeIndex) => (
                            <div key={placeIndex} className="flex items-center gap-2">
                              <Input
                                value={place}
                                onChange={(e) => updatePlace(sectorIndex, placeIndex, e.target.value)}
                                placeholder="Názov miesta"
                                data-testid={`input-place-${sectorIndex}-${placeIndex}`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removePlace(sectorIndex, placeIndex)}
                                disabled={sector.places.length <= 1}
                                data-testid={`button-remove-place-${sectorIndex}-${placeIndex}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                      ))}

                      {(!sectorPlaces || sectorPlaces.length === 0) && (
                        <div className="text-center py-4 text-muted-foreground">
                          <MapPin className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
                          <p>Žiadne sektory nie sú definované. Kliknite na "Pridať sektor" pre začatie.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button 
                    type="submit" 
                    disabled={createRegistrationMutation.isPending}
                    className="w-full md:w-auto"
                    data-testid="button-submit-registration"
                  >
                    {createRegistrationMutation.isPending ? "Odosiela sa..." : "Odoslať registráciu"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}