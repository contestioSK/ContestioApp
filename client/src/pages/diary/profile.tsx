import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Camera,
  Save,
  Loader2,
  UserCircle,
  Shield,
  Calendar,
  ExternalLink
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import DiaryLayout from "@/components/DiaryLayout";

// Profile form schema
const profileSchema = z.object({
  firstName: z.string().min(1, "Meno je povinné").max(50, "Meno môže mať maximálne 50 znakov"),
  lastName: z.string().min(1, "Priezvisko je povinné").max(50, "Priezvisko môže mať maximálne 50 znakov"),
  nickname: z.string().max(30, "Prezývka môže mať maximálne 30 znakov").optional().or(z.literal("")),
  email: z.string().email("Neplatný email"),
  facebookUrl: z.string().url("Neplatná Facebook URL").optional().or(z.literal("")),
  instagramUrl: z.string().url("Neplatná Instagram URL").optional().or(z.literal("")),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);

  // Check premium status
  const { data: premiumStatus } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/auth/premium-status"],
  });
  const isPremium = premiumStatus?.isPremium || false;

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      nickname: user?.nickname || "",
      email: user?.email || "",
      facebookUrl: user?.facebookUrl || "",
      instagramUrl: user?.instagramUrl || "",
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profil aktualizovaný!",
        description: "Vaše údaje boli úspešne uložené.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať profil. Skúste to znovu.",
        variant: "destructive"
      });
      console.error("Update profile error:", error);
    }
  });

  // Profile image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch('/api/auth/profile/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profilová fotografia nahraná!",
        description: "Vaša profilová fotografia bola úspešne zmenená.",
      });
      setProfileImage(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa nahrať profilovú fotografiu. Skúste to znovu.",
        variant: "destructive"
      });
      console.error("Upload image error:", error);
    }
  });

  const onSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      nickname: user?.nickname || "",
      email: user?.email || "",
      facebookUrl: user?.facebookUrl || "",
      instagramUrl: user?.instagramUrl || "",
    });
    setIsEditing(false);
  };

  if (!user) {
    return (
      <DiaryLayout>
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <UserCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Načítavam profil...
                </h3>
                <p className="text-muted-foreground">
                  Prosím počkajte, kým sa načíta váš profil.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DiaryLayout>
    );
  }

  return (
    <DiaryLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Môj profil</h1>
              <p className="text-muted-foreground">
                Spravujte svoje osobné údaje a nastavenia účtu
              </p>
            </div>
            {!isEditing && (
              <Button 
                onClick={() => setIsEditing(true)}
                className="gap-2"
                data-testid="button-edit-profile"
              >
                <User className="w-4 h-4" />
                Upraviť profil
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Summary */}
            <Card className="lg:col-span-1">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  {user.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Profilový obrázok"
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/20">
                      <User className="w-12 h-12 text-primary" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user.email
                  }
                </CardTitle>
                <CardDescription className="flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge 
                    variant="secondary" 
                    className={isPremium 
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30" 
                      : "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30"
                    }
                  >
                    {isPremium ? "⭐ PREMIUM" : "FREE"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rola</span>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm capitalize">{user.role}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Člen od</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('sk-SK') : 'Neznámy'}
                    </span>
                  </div>
                </div>
                
                {/* Social Media Links */}
                {(user.facebookUrl || user.instagramUrl) && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-center gap-4">
                      {user.facebookUrl && (
                        <a 
                          href={user.facebookUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                          data-testid="link-facebook"
                        >
                          <SiFacebook className="w-5 h-5 text-[#1877F2]" />
                        </a>
                      )}
                      {user.instagramUrl && (
                        <a 
                          href={user.instagramUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                          data-testid="link-instagram"
                        >
                          <SiInstagram className="w-5 h-5 text-[#E4405F]" />
                        </a>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Profile Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Osobné údaje</CardTitle>
                <CardDescription>
                  {isEditing 
                    ? "Upravte svoje osobné informácie"
                    : "Vaše základné informácie"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Profile Image Upload */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-muted overflow-hidden">
                          {user.profileImageUrl ? (
                            <img
                              src={user.profileImageUrl}
                              alt="Profilový obrázok"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <UserCircle className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-foreground">Profilový obrázok</h4>
                          <p className="text-sm text-muted-foreground">Nahrajte svoj profilový obrázok</p>
                        </div>
                        {isEditing && (
                          <div className="flex gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                              className="hidden"
                              id="profile-image-input"
                              data-testid="input-profile-image"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => document.getElementById('profile-image-input')?.click()}
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Zmeniť
                            </Button>
                            {profileImage && (
                              <Button
                                type="button"
                                onClick={() => uploadImageMutation.mutate(profileImage)}
                                disabled={uploadImageMutation.isPending}
                                data-testid="button-upload-image"
                              >
                                {uploadImageMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4 mr-2" />
                                )}
                                Nahrať
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      {profileImage && (
                        <p className="text-sm text-muted-foreground">
                          Vybratý súbor: {profileImage.name}
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* First Name */}
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meno</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Vaše meno"
                              data-testid="input-first-name"
                              disabled={!isEditing}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Last Name */}
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priezvisko</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Vaše priezvisko"
                              data-testid="input-last-name"
                              disabled={!isEditing}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Nickname */}
                    <FormField
                      control={form.control}
                      name="nickname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prezývka</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Vaša prezývka"
                              data-testid="input-nickname"
                              disabled={!isEditing}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Nepovinná prezývka, ktorú budú vidieť ostatní rybári
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="vas.email@example.com"
                              data-testid="input-email"
                              disabled={!isEditing}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Emailová adresa pre prihlásenie a komunikáciu
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    {/* Social Media Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        Sociálne siete
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Prepojte svoj profil so sociálnymi sieťami
                      </p>

                      {/* Facebook */}
                      <FormField
                        control={form.control}
                        name="facebookUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <SiFacebook className="w-4 h-4 text-[#1877F2]" />
                              Facebook
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://facebook.com/vasprofil"
                                data-testid="input-facebook"
                                disabled={!isEditing}
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Odkaz na váš Facebook profil
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Instagram */}
                      <FormField
                        control={form.control}
                        name="instagramUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <SiInstagram className="w-4 h-4 text-[#E4405F]" />
                              Instagram
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://instagram.com/vasprofil"
                                data-testid="input-instagram"
                                disabled={!isEditing}
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Odkaz na váš Instagram profil
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Action Buttons */}
                    {isEditing && (
                      <div className="flex justify-end gap-4 pt-6">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={handleCancel}
                          data-testid="button-cancel"
                        >
                          Zrušiť
                        </Button>
                        <Button 
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-profile"
                        >
                          {updateProfileMutation.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          <Save className="w-4 h-4 mr-2" />
                          Uložiť zmeny
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informácie o účte</CardTitle>
              <CardDescription>
                Technické detaily vášho účtu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-foreground mb-2">ID používateľa</h4>
                  <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                    {user.id}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Email overený</h4>
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified ? "Overený" : "Neoverený"}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Posledná aktualizácia</h4>
                  <p className="text-sm text-muted-foreground">
                    {user.updatedAt ? new Date(user.updatedAt).toLocaleString('sk-SK') : 'Neznámy'}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Stav účtu</h4>
                  <Badge variant={user.active ? "default" : "destructive"}>
                    {user.active ? "Aktívny" : "Neaktívny"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DiaryLayout>
  );
}