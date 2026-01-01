import { useState, useRef, useEffect, type ChangeEvent } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { 
  User, 
  Mail, 
  Camera,
  Save,
  Loader2,
  UserCircle,
  Shield,
  Calendar,
  ExternalLink,
  Lock,
  Sparkles,
  BarChart3,
  Download,
  Target,
  ChevronDown,
  History,
  Settings
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SiFacebook, SiInstagram } from "react-icons/si";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";

// Profile form schema - email removed (read-only)
const profileSchema = z.object({
  firstName: z.string().min(1, "Meno je povinné").max(50, "Meno môže mať maximálne 50 znakov"),
  lastName: z.string().min(1, "Priezvisko je povinné").max(50, "Priezvisko môže mať maximálne 50 znakov"),
  nickname: z.string().max(30, "Prezývka môže mať maximálne 30 znakov").optional().or(z.literal("")),
  facebookUrl: z.string().url("Neplatná Facebook URL").optional().or(z.literal("")),
  instagramUrl: z.string().url("Neplatná Instagram URL").optional().or(z.literal("")),
});

type ProfileForm = z.infer<typeof profileSchema>;

// Normalize empty strings to null before submitting
const normalizeFormData = (data: ProfileForm) => ({
  firstName: data.firstName.trim(),
  lastName: data.lastName.trim(),
  nickname: data.nickname?.trim() || null,
  facebookUrl: data.facebookUrl?.trim() || null,
  instagramUrl: data.instagramUrl?.trim() || null,
});

// ProfileAvatar Component - reusable avatar with optional upload capability
interface ProfileAvatarProps {
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  isUploading?: boolean;
  onFileSelect?: (file: File) => void;
}

function ProfileAvatar({ imageUrl, size = 'md', editable = false, isUploading = false, onFileSelect }: ProfileAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };
  
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const handleClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleClick}
        disabled={!editable || isUploading}
        className={`
          ${sizeClasses[size]} rounded-full overflow-hidden border-4 border-primary/20
          ${editable ? 'cursor-pointer hover:border-primary/40 transition-all' : 'cursor-default'}
          ${isUploading ? 'opacity-50' : ''}
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        `}
        data-testid="button-avatar"
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Profilový obrázok"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-primary/20 flex items-center justify-center">
            <User className={`${iconSizes[size]} text-primary`} />
          </div>
        )}
        
        {/* Camera overlay on hover */}
        {editable && !isUploading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
            <Camera className="w-6 h-6 text-white" />
          </div>
        )}
        
        {/* Loading spinner */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </button>
      
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif"
          onChange={handleFileChange}
          className="hidden"
          data-testid="input-avatar-file"
        />
      )}
    </div>
  );
}

// Loading Skeleton Component
function ProfileSkeleton() {
  return (
    <DiaryLayout>
      <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Summary Skeleton */}
            <Card className="lg:col-span-1">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  <Skeleton className="w-24 h-24 rounded-full" />
                </div>
                <Skeleton className="h-6 w-40 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>

            {/* Profile Form Skeleton */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <Skeleton className="h-px w-full" />
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
      </div>
    </DiaryLayout>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [profileImage, setProfileImage] = useState<File | null>(null);

  // Check premium status with proper loading state
  const { data: premiumStatus, isLoading: isPremiumLoading } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user,
  });
  const isPremium = premiumStatus?.isPremium || false;

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      nickname: user?.nickname || "",
      facebookUrl: user?.facebookUrl || "",
      instagramUrl: user?.instagramUrl || "",
    }
  });

  // Sync form with user data when it changes
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        nickname: user.nickname || "",
        facebookUrl: user.facebookUrl || "",
        instagramUrl: user.instagramUrl || "",
      });
    }
  }, [user, form]);

  // Update profile mutation with normalized data
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const normalizedData = normalizeFormData(data);
      const response = await apiRequest("PATCH", "/api/auth/profile", normalizedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profil uložený",
        description: "Zmeny sú aktívne.",
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

  // Profile image upload mutation with auto-upload
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

  // Auto-upload when file is selected from summary card
  const handleAvatarFileSelect = (file: File) => {
    uploadImageMutation.mutate(file);
  };

  // Handle file select in form (shows preview first)
  const handleFormFileSelect = (file: File) => {
    uploadImageMutation.mutate(file);
  };

  const onSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      nickname: user?.nickname || "",
      facebookUrl: user?.facebookUrl || "",
      instagramUrl: user?.instagramUrl || "",
    });
    setProfileImage(null);
    setIsEditing(false);
  };

  // Toggle historical catches preference
  const toggleHistoricalCatchesMutation = useMutation({
    mutationFn: async (allowHistoricalCatches: boolean) => {
      return await apiRequest("PUT", "/api/user/preferences", {
        ...user?.preferences,
        allowHistoricalCatches,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Nastavenie uložené",
        description: "Vaše preferencie boli aktualizované.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa uložiť nastavenie.",
        variant: "destructive",
      });
      console.error("Toggle historical catches error:", error);
    },
  });

  // Show skeleton while loading
  if (!user) {
    return <ProfileSkeleton />;
  }

  return (
    <DiaryLayout>
      <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TacticalIcon icon={User} variant="active" size="lg" showLabel={false} />
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Môj profil</h1>
                <p className="text-muted-foreground">
                  Spravujte svoje osobné údaje a nastavenia účtu
                </p>
              </div>
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
                  <ProfileAvatar
                    imageUrl={user.profileImageUrl}
                    size="lg"
                    editable={true}
                    isUploading={uploadImageMutation.isPending}
                    onFileSelect={handleAvatarFileSelect}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Klikni pre zmenu
                  </p>
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {isPremiumLoading ? (
                      <Skeleton className="h-6 w-20" />
                    ) : (
                      <Badge 
                        variant="secondary" 
                        className={isPremium 
                          ? "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30" 
                          : "bg-slate-100 dark:bg-gray-500/20 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-500/30"
                        }
                      >
                        {isPremium ? "⭐ PREMIUM" : "FREE"}
                      </Badge>
                    )}
                  </div>
                  {!isPremium && !isPremiumLoading && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2 border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                      onClick={() => window.location.href = '/diary/premium'}
                      data-testid="button-unlock-premium"
                    >
                      <Sparkles className="w-4 h-4" />
                      Odomknúť plný výkon
                    </Button>
                  )}
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

                {/* PREMIUM Features Teaser - only for FREE users */}
                {!isPremium && !isPremiumLoading && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        PREMIUM funkcie
                      </h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 opacity-60">
                          <Lock className="w-3 h-3" />
                          <BarChart3 className="w-4 h-4" />
                          <span>Pokročilé štatistiky</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-60">
                          <Lock className="w-3 h-3" />
                          <Download className="w-4 h-4" />
                          <span>Export úlovkov</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-60">
                          <Lock className="w-3 h-3" />
                          <Target className="w-4 h-4" />
                          <span>Neobmedzené ciele</span>
                        </div>
                      </div>
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
                {/* Motivational text for FREE users */}
                {!isPremium && !isPremiumLoading && (
                  <p className="text-sm text-muted-foreground mb-4 p-3 bg-slate-100 dark:bg-muted/50 rounded-lg border border-slate-200 dark:border-transparent">
                    Vyplnený profil zvyšuje dôveryhodnosť v súťažiach a leaderboards.
                  </p>
                )}
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                              value={field.value || ""}
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
                              value={field.value || ""}
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
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Nepovinná prezývka, ktorú budú vidieť ostatní rybári
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email - Read Only */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-sm font-medium">Email</FormLabel>
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="email"
                          value={user.email || ""}
                          disabled
                          className="bg-muted"
                          data-testid="input-email"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isPremium 
                          ? "Pre zmenu emailu kontaktujte podporu"
                          : "Zmenu emailu umožňujeme iba PREMIUM používateľom z bezpečnostných dôvodov."
                        }
                      </p>
                    </div>

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
                                value={field.value || ""}
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
                                value={field.value || ""}
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
                          Uložiť profil
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Diary Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Nastavenia denníka
              </CardTitle>
              <CardDescription>
                Prispôsobte si funkcie rybárskeho denníka
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Historical Catches Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">Historické úlovky</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Umožní nahrávať staršie úlovky. Tieto úlovky sa nezapočítavajú do štatistík ani súťaží.
                  </p>
                </div>
                <Switch
                  checked={user?.preferences?.allowHistoricalCatches ?? false}
                  onCheckedChange={(checked) => toggleHistoricalCatchesMutation.mutate(checked)}
                  disabled={toggleHistoricalCatchesMutation.isPending}
                  data-testid="switch-historical-catches"
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Information - Collapsible */}
          <Collapsible open={showTechDetails} onOpenChange={setShowTechDetails}>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
                    data-testid="button-toggle-tech-details"
                  >
                    <div className="text-left">
                      <CardTitle className="text-base">Technické detaily</CardTitle>
                      <CardDescription className="text-sm">
                        Informácie o vašom účte
                      </CardDescription>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showTechDetails ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0">
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
              </CollapsibleContent>
            </Card>
          </Collapsible>
      </div>
    </DiaryLayout>
  );
}
