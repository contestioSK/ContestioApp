import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Plus, Trash2, Camera, User, X, Flag, LogIn, Bell, Check } from "lucide-react";
import { Link, useLocation } from "wouter";
import { COUNTRIES, getCountryFlag, getCountryDisplay, getCountryFlagEmoji } from "@/lib/countries";
import { UserAutocomplete } from "@/components/user-autocomplete";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logoImage from "@assets/contestio logo_1760283270014.png";

// Team registration form schema - extended with userId for linked members
const teamRegistrationSchema = z.object({
  competitionId: z.string().min(1, "Výber súťaže je povinný"),
  name: z.string().min(1, "Názov tímu je povinný").max(100, "Názov tímu je príliš dlhý"),
  description: z.string().optional(),
  country: z.string().length(2, "Kód krajiny musí mať presne 2 znaky").default("SK"),
  members: z.array(z.object({
    name: z.string().min(1, "Meno člena je povinné"),
    role: z.enum(["captain", "member"]),
    email: z.string().optional().refine((val) => !val || z.string().email().safeParse(val).success, "Zadajte platný e-mail"),
    phone: z.string().optional(),
    userId: z.string().optional().nullable(), // Linked Contestio account
  })).min(1, "Aspoň jeden člen tímu je povinný").max(6, "Maximálne 6 členov je povolených"),
});

type TeamRegistrationForm = z.infer<typeof teamRegistrationSchema>;

export default function RegisterTeam() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [memberPhotos, setMemberPhotos] = useState<{ [key: number]: File | null }>({});
  const [teamPhoto, setTeamPhoto] = useState<File | null>(null);

  // Check if user is logged in
  const { data: user, isLoading: userLoading } = useQuery<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const isLoggedIn = !!user;

  // Fetch all competitions and filter for those available for registration
  const { data: allCompetitions = [], isLoading: competitionsLoading } = useQuery({
    queryKey: ["/api/competitions"],
    staleTime: 60000,
  });

  // Filter competitions that are open for registration
  const availableCompetitions = Array.isArray(allCompetitions) 
    ? allCompetitions.filter((competition: any) => 
        competition.status === 'registration' || 
        (competition.startDate && new Date(competition.startDate) > new Date())
      )
    : [];

  // Get captain's display name from user account
  const captainName = user 
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    : "";

  const form = useForm<TeamRegistrationForm>({
    resolver: zodResolver(teamRegistrationSchema),
    defaultValues: {
      competitionId: "",
      name: "",
      description: "",
      country: "SK",
      members: [
        { name: "", role: "captain", email: "", phone: "", userId: null }
      ],
    },
  });

  // Auto-fill captain's name when user is logged in
  useEffect(() => {
    if (user && captainName) {
      const currentMembers = form.getValues("members");
      const captainIndex = currentMembers.findIndex(m => m.role === "captain");
      if (captainIndex >= 0 && !currentMembers[captainIndex].name) {
        form.setValue(`members.${captainIndex}.name`, captainName);
        form.setValue(`members.${captainIndex}.userId`, user.id);
        if (user.email) {
          form.setValue(`members.${captainIndex}.email`, user.email);
        }
      }
    }
  }, [user, captainName, form]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const addMember = () => {
    const currentMembers = form.getValues("members");
    if (currentMembers.length < 6) {
      form.setValue("members", [...currentMembers, { name: "", role: "member", email: "", phone: "", userId: null }]);
    }
  };

  const handlePhotoSelect = (index: number, file: File | null) => {
    setMemberPhotos(prev => ({
      ...prev,
      [index]: file
    }));
  };

  const removePhoto = (index: number) => {
    setMemberPhotos(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const handleTeamPhotoSelect = (file: File | null) => {
    setTeamPhoto(file);
  };

  const removeTeamPhoto = () => {
    setTeamPhoto(null);
  };

  const removeMember = (index: number) => {
    const currentMembers = form.getValues("members");
    if (currentMembers.length > 1) {
      form.setValue("members", currentMembers.filter((_, i) => i !== index));
      // Also remove the photo for this member and shift the remaining photos
      setMemberPhotos(prev => {
        const updated = { ...prev };
        delete updated[index];
        // Shift photos for members after the removed one
        for (let i = index + 1; i < currentMembers.length; i++) {
          if (updated[i]) {
            updated[i - 1] = updated[i];
            delete updated[i];
          }
        }
        return updated;
      });
    }
  };

  const onSubmit = async (data: TeamRegistrationForm) => {
    // Create FormData to handle file uploads
    const formData = new FormData();
    formData.append('competitionId', data.competitionId);
    formData.append('name', data.name);
    formData.append('country', data.country);
    if (data.description) {
      formData.append('description', data.description);
    }
    
    // Add team photo if exists
    if (teamPhoto) {
      formData.append('teamPhoto', teamPhoto);
    }
    
    // Add members data
    data.members.forEach((member, index) => {
      formData.append(`members[${index}][name]`, member.name);
      formData.append(`members[${index}][role]`, member.role);
      if (member.email) formData.append(`members[${index}][email]`, member.email);
      if (member.phone) formData.append(`members[${index}][phone]`, member.phone);
      if (member.userId) formData.append(`members[${index}][userId]`, member.userId);
      
      // Add photo if exists
      if (memberPhotos[index]) {
        formData.append(`memberPhoto_${index}`, memberPhotos[index]);
      }
    });

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/competitions/${data.competitionId}/teams`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      toast({
        title: "Tím bol úspešne zaregistrovaný!",
        description: "Registrácia tvojho tímu čaká na schválenie organizátorom.",
      });
      form.reset();
      setMemberPhotos({});
      setTeamPhoto(null);
    } catch (error: any) {
      toast({
        title: "Registrácia zlyhala",
        description: error.message || "Nepodarilo sa zaregistrovať tím. Prosím, skúste to znovu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-background border-b border-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer">
                <img src={logoImage} alt="Contestio" className="h-8 w-auto" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Zaregistrovať tím</h1>
          <p className="text-muted-foreground">
            Vytvor svoj tím a zaregistruj sa do rybárskej súťaže
          </p>
        </div>

        {/* Login requirement alert */}
        {!userLoading && !isLoggedIn && (
          <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
            <LogIn className="h-4 w-4 text-amber-600" />
            <AlertDescription className="ml-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Pre registráciu tímu sa musíš prihlásiť
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Ako kapitán budeš automaticky dostávať notifikácie o súťaži
                  </p>
                </div>
                <Link href="/auth/login">
                  <Button variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-100">
                    <LogIn className="w-4 h-4 mr-2" />
                    Prihlásiť sa
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Logged in confirmation */}
        {isLoggedIn && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/20">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="ml-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-800 dark:text-green-200">
                  Prihlásený ako {captainName}
                </span>
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  Budeš dostávať notifikácie
                </span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Informácie o tíme</span>
            </CardTitle>
            <CardDescription>
              Vyplň základné informácie o tvojom tíme a členoch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Competition Selection */}
                <FormField
                  control={form.control}
                  name="competitionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Súťaž</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-competition">
                            <SelectValue placeholder="Vyber súťaž" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {competitionsLoading ? (
                            <SelectItem value="loading" disabled>Načítavam súťaže...</SelectItem>
                          ) : availableCompetitions.length === 0 ? (
                            <SelectItem value="empty" disabled>Žiadne dostupné súťaže</SelectItem>
                          ) : (
                            availableCompetitions.map((competition: any) => (
                              <SelectItem key={competition.id} value={competition.id}>
                                {competition.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Team Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Názov tímu</FormLabel>
                      <FormControl>
                        <Input placeholder="Napr. Rybári z Liptova" {...field} data-testid="input-team-name" />
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
                        <Textarea placeholder="Krátky popis tímu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Country Selection */}
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Flag className="w-4 h-4" />
                        Krajina
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-team-country">
                            <SelectValue placeholder="Vyber krajinu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              <div className="flex items-center gap-2">
                                <img 
                                  src={`https://flagcdn.com/16x12/${country.code.toLowerCase()}.png`} 
                                  alt={`${country.name} flag`}
                                  className="w-4 h-3 object-cover rounded-sm border border-gray-200"
                                  onError={(e) => {
                                    // Fallback to emoji
                                    e.currentTarget.style.display = 'none';
                                    const span = document.createElement('span');
                                    span.textContent = country.flag;
                                    span.className = 'text-sm';
                                    e.currentTarget.parentNode?.insertBefore(span, e.currentTarget);
                                  }}
                                />
                                <span>{country.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Team Photo/Logo Upload */}
                <div>
                  <FormLabel>Logo/Fotka tímu (voliteľná)</FormLabel>
                  <div className="mt-2">
                    {teamPhoto ? (
                      <div className="flex items-center justify-between p-4 border-2 border-dashed border-muted rounded-lg bg-muted/10">
                        <div className="flex items-center space-x-3">
                          <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Users className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{teamPhoto.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round(teamPhoto.size / 1024)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeTeamPhoto}
                          data-testid="button-remove-team-photo"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label
                        htmlFor="team-photo-input"
                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/10 hover:bg-muted/20"
                        data-testid="label-team-photo-upload"
                      >
                        <input
                          id="team-photo-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleTeamPhotoSelect(file);
                          }}
                          data-testid="input-team-photo"
                        />
                        <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                          <Users className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          Pridať logo alebo fotku tímu
                        </p>
                        <p className="text-xs text-muted-foreground text-center">
                          Kliknite pre výber súboru
                          <br />
                          <span className="text-xs">JPG, PNG, GIF (max 5MB)</span>
                        </p>
                      </label>
                    )}
                  </div>
                </div>

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
                      <Plus className="w-4 h-4 mr-2" />
                      Pridať člena
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {form.watch("members").map((member, index) => {
                      const isCaptain = member.role === "captain";
                      const isLinkedCaptain = isCaptain && isLoggedIn && member.userId === user?.id;
                      
                      return (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`members.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  Meno člena
                                  {form.watch(`members.${index}.userId`) && (
                                    <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <Bell className="w-3 h-3" />
                                      Notifikácie
                                    </span>
                                  )}
                                </FormLabel>
                                <FormControl>
                                  {isLinkedCaptain ? (
                                    <div className="relative">
                                      <Input 
                                        value={field.value} 
                                        disabled 
                                        className="bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 pr-24"
                                        data-testid={`input-member-name-${index}`} 
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-600 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        Kapitán
                                      </span>
                                    </div>
                                  ) : (
                                    <UserAutocomplete
                                      value={field.value}
                                      selectedUserId={form.watch(`members.${index}.userId`)}
                                      onChange={(name, userId) => {
                                        field.onChange(name);
                                        form.setValue(`members.${index}.userId`, userId || null);
                                      }}
                                      placeholder="Začni písať meno..."
                                      data-testid={`input-member-name-${index}`}
                                    />
                                  )}
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`members.${index}.role`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pozícia</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid={`select-member-role-${index}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="captain">Kapitán</SelectItem>
                                    <SelectItem value="member">Člen</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`members.${index}.email`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>E-mail (voliteľný)</FormLabel>
                                <FormControl>
                                  <Input placeholder="email@example.com" type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`members.${index}.phone`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefón (voliteľný)</FormLabel>
                                <FormControl>
                                  <Input placeholder="+421 9XX XXX XXX" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Member Photo Upload */}
                        <div className="mt-4">
                          <FormLabel>Fotka člena (voliteľná)</FormLabel>
                          <div className="mt-2">
                            {memberPhotos[index] ? (
                              <div className="flex items-center justify-between p-4 border-2 border-dashed border-muted rounded-lg bg-muted/10">
                                <div className="flex items-center space-x-3">
                                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <User className="w-6 h-6 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{memberPhotos[index]!.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {Math.round(memberPhotos[index]!.size / 1024)} KB
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePhoto(index)}
                                  data-testid={`button-remove-photo-${index}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <label
                                htmlFor={`photo-input-${index}`}
                                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/10 hover:bg-muted/20"
                                data-testid={`label-photo-upload-${index}`}
                              >
                                <input
                                  id={`photo-input-${index}`}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    handlePhotoSelect(index, file);
                                  }}
                                  data-testid={`input-photo-${index}`}
                                />
                                <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground text-center">
                                  Kliknite pre výber fotky
                                  <br />
                                  <span className="text-xs">JPG, PNG, GIF (max 5MB)</span>
                                </p>
                              </label>
                            )}
                          </div>
                        </div>

                        {form.watch("members").length > 1 && (
                          <div className="mt-4 flex justify-end">
                            <Button 
                              type="button" 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => removeMember(index)}
                              data-testid={`button-remove-member-${index}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Odstrániť člena
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                    })}
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={isSubmitting}
                    data-testid="button-submit-team"
                  >
                    {isSubmitting ? "Registrujem..." : "Registrovať tím"}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/" data-testid="button-cancel">Zrušiť</Link>
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