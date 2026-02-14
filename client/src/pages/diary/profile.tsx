import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Settings,
  Trophy,
  MapPin,
  Fish,
  Medal,
  Scale,
  ChevronRight,
  CheckCircle2,
  Plus,
  Image
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";

// Competition history type
interface CompetitionHistoryItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  teamId: string;
  teamName: string;
  teamPosition: number | null;
  teamTotalWeight: string | null;
  teamFishCount: number | null;
  memberRole: string | null;
  biggestCatch: {
    weight: string;
    fishType: string;
  } | null;
}

// Competition catch type
interface CompetitionCatchItem {
  id: string;
  weight: string;
  fishType: string;
  photoUrl: string | null;
  sector: string;
  submittedAt: string;
  isVerified: boolean;
  competitionId: string;
  competitionName: string;
  competitionStatus: string;
  competitionStartDate: string;
  teamId: string;
  teamName: string;
  memberRole: string | null;
  isImportedToDiary: boolean;
}

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
  const [, setLocation] = useLocation();
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

  // Fetch competition history
  const { data: competitionHistory = [], isLoading: isHistoryLoading } = useQuery<CompetitionHistoryItem[]>({
    queryKey: ["/api/me/competition-history"],
    enabled: !!user,
  });

  // Fetch competition catches for import
  const { data: competitionCatches = [], isLoading: isCatchesLoading } = useQuery<CompetitionCatchItem[]>({
    queryKey: ["/api/me/competition-catches"],
    enabled: !!user,
  });

  // State for import dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedCatch, setSelectedCatch] = useState<CompetitionCatchItem | null>(null);
  const [authorshipRole, setAuthorshipRole] = useState<'author' | 'assistant' | null>(null);
  const [personalNote, setPersonalNote] = useState('');

  // Import mutation
  const importCatchMutation = useMutation({
    mutationFn: async (data: { competitionCatchId: string; competitionId: string; authorshipRole: string; personalNote?: string }) => {
      const res = await apiRequest('POST', '/api/diary/catches/import', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Úlovok pridaný do denníka",
        description: "Úlovok importovaný do denníka.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/me/competition-catches"] });
      setImportDialogOpen(false);
      setSelectedCatch(null);
      setAuthorshipRole(null);
      setPersonalNote('');
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri importe",
        description: error.message || "Nepodarilo sa importovať úlovok.",
        variant: "destructive",
      });
    },
  });

  const handleImportClick = (catchItem: CompetitionCatchItem) => {
    setSelectedCatch(catchItem);
    setAuthorshipRole(null);
    setPersonalNote('');
    setImportDialogOpen(true);
  };

  const handleImportConfirm = () => {
    if (!selectedCatch || !authorshipRole) return;
    
    importCatchMutation.mutate({
      competitionCatchId: selectedCatch.id,
      competitionId: selectedCatch.competitionId,
      authorshipRole,
      personalNote: personalNote || undefined,
    });
  };

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
        description: "Preferencie uložené.",
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

  // Update privacy settings for sharing
  const updatePrivacySettingsMutation = useMutation({
    mutationFn: async (privacyUpdate: { hideGps?: boolean; hideBait?: boolean; hideSpot?: boolean }) => {
      const currentPrivacy = user?.preferences?.privacySettings || {};
      return await apiRequest("PUT", "/api/user/preferences", {
        ...user?.preferences,
        privacySettings: {
          ...currentPrivacy,
          ...privacyUpdate,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Súkromie aktualizované",
        description: "Tvoje nastavenia zdieľania boli uložené.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa uložiť nastavenia súkromia.",
        variant: "destructive",
      });
      console.error("Update privacy settings error:", error);
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
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-px w-16 bg-[#F97316]"></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F97316]">Profil</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-4">
                  <TacticalIcon icon={User} variant="orange" size="lg" showLabel={false} />
                  <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-foreground leading-none">Môj profil</h1>
                </div>
                <p className="text-sm font-medium text-muted-foreground italic tracking-tight pl-0.5">
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
                <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Upraviť profil
              </Button>
            )}
          </header>

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
                  <Mail className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
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
                      onClick={() => window.location.href = '/pricing?tab=diary'}
                      data-testid="button-unlock-premium"
                    >
                      <Sparkles className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
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
                    : "Tvoje základné informácie"
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meno</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Tvoje meno"
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
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priezvisko</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Tvoje priezvisko"
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                              Nepovinná prezývka viditeľná ostatným
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FormLabel className="text-sm font-medium">Email</FormLabel>
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <Input 
                          type="email"
                          value={user.email || ""}
                          disabled
                          className="bg-muted"
                          data-testid="input-email"
                        />
                        <p className="text-xs text-muted-foreground">
                          {isPremium 
                            ? "Pre zmenu kontaktujte podporu"
                            : "Zmena len pre PREMIUM používateľov"
                          }
                        </p>
                      </div>
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
                              Odkaz na tvoj Facebook profil
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
                                placeholder="https://instagram.com/tvojprofil"
                                data-testid="input-instagram"
                                disabled={!isEditing}
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Odkaz na tvoj Instagram profil
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

          {/* Competition History & Catches - only shown if user has competition participation */}
          {!isHistoryLoading && competitionHistory.length > 0 && (<>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                História pretekov
              </CardTitle>
              <CardDescription>
                Súťaže, ktorých si sa zúčastnil ako člen tímu
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isHistoryLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : competitionHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-muted-foreground mb-2">
                    Zatiaľ žiadne preteky
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Keď sa zúčastníte súťaže ako člen tímu, objaví sa tu vaša história.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setLocation('/categories/live')}
                  >
                    Preskúmať súťaže
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {competitionHistory.map((item) => {
                    const startDate = new Date(item.startDate);
                    const endDate = new Date(item.endDate);
                    const isCompleted = item.status === 'completed';
                    const isLive = item.status === 'live';
                    
                    return (
                      <div 
                        key={`${item.id}-${item.teamId}`}
                        className="group relative p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`
                            w-12 h-12 rounded-full flex items-center justify-center shrink-0
                            ${isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 
                              isLive ? 'bg-amber-500/10 text-amber-500' : 
                              'bg-muted text-muted-foreground'}
                          `}>
                            {isCompleted ? (
                              <Medal className="w-6 h-6" />
                            ) : isLive ? (
                              <Trophy className="w-6 h-6" />
                            ) : (
                              <Calendar className="w-6 h-6" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-foreground truncate">
                                {item.name}
                              </h4>
                              <Badge 
                                variant="secondary"
                                className={
                                  isCompleted ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                  isLive ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse' :
                                  ''
                                }
                              >
                                {isCompleted ? 'Ukončená' : isLive ? 'LIVE' : item.status}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {startDate.toLocaleDateString('sk-SK')} - {endDate.toLocaleDateString('sk-SK')}
                              </span>
                              {item.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {item.location}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 text-sm">
                              <span className="font-medium text-primary">{item.teamName}</span>
                              {item.memberRole === 'captain' && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  Kapitán
                                </Badge>
                              )}
                            </div>
                            
                            {isCompleted && (
                              <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
                                {item.teamPosition && (
                                  <div className="flex items-center gap-1.5">
                                    <div className={`
                                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                      ${item.teamPosition === 1 ? 'bg-amber-500 text-white' :
                                        item.teamPosition === 2 ? 'bg-slate-400 text-white' :
                                        item.teamPosition === 3 ? 'bg-amber-700 text-white' :
                                        'bg-muted text-muted-foreground'}
                                    `}>
                                      {item.teamPosition}
                                    </div>
                                    <span className="text-sm text-muted-foreground">miesto</span>
                                  </div>
                                )}
                                {item.teamTotalWeight && parseFloat(item.teamTotalWeight) > 0 && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Scale className="w-3.5 h-3.5" />
                                    <span>{parseFloat(item.teamTotalWeight).toFixed(2)} kg</span>
                                  </div>
                                )}
                                {item.teamFishCount && item.teamFishCount > 0 && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Fish className="w-3.5 h-3.5" />
                                    <span>{item.teamFishCount} úlovkov</span>
                                  </div>
                                )}
                                {item.biggestCatch && (
                                  <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 font-medium">
                                    <Trophy className="w-3.5 h-3.5" />
                                    <span>Najväčší: {parseFloat(item.biggestCatch.weight).toFixed(2)} kg</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={() => setLocation(`/competition/${item.id}/leaderboard`)}
                          >
                            <span className="hidden sm:inline mr-1">Výsledky</span>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competition Catches Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fish className="w-5 h-5 text-blue-500" />
                Moje úlovky zo súťaží
              </CardTitle>
              <CardDescription>
                Úlovky z tvojich tímov - môžeš si ich pridať do osobného denníka
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCatchesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : competitionCatches.length === 0 ? (
                <div className="text-center py-8">
                  <Fish className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-muted-foreground mb-2">
                    Zatiaľ žiadne súťažné úlovky
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Keď tvoj tím chytí úlovok na súťaži, objaví sa tu.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {competitionCatches.map((catchItem) => {
                    const fishTypeLabels: Record<string, string> = {
                      'scaly': 'Šupináč',
                      'mirror': 'Lysec',
                      'grass': 'Amur',
                      'other': 'Iný',
                    };
                    
                    return (
                      <div 
                        key={catchItem.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                          catchItem.isImportedToDiary 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        {/* Photo or placeholder */}
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {catchItem.photoUrl ? (
                            <img 
                              src={catchItem.photoUrl} 
                              alt="Úlovok" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Image className="w-6 h-6 text-muted-foreground/50" />
                          )}
                        </div>
                        
                        {/* Catch details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {parseFloat(catchItem.weight).toFixed(2)} kg
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {fishTypeLabels[catchItem.fishType] || catchItem.fishType}
                            </Badge>
                            {catchItem.isImportedToDiary && (
                              <Badge variant="default" className="text-xs bg-emerald-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                V denníku
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <span>{catchItem.competitionName}</span>
                            <span className="mx-1.5">•</span>
                            <span>{catchItem.teamName}</span>
                            <span className="mx-1.5">•</span>
                            <span>{new Date(catchItem.submittedAt).toLocaleDateString('sk-SK')}</span>
                          </div>
                        </div>
                        
                        {/* Import button */}
                        {!catchItem.isImportedToDiary && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => handleImportClick(catchItem)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Do denníka</span>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          </>)}

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

              <Separator />

              {/* Privacy Settings Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Súkromie pri zdieľaní</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tieto nastavenia sa aplikujú automaticky pri každom zdieľaní úlovkov.
                </p>

                {/* Hide GPS */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Skryť GPS polohu</span>
                    <p className="text-xs text-muted-foreground">
                      Presné súradnice nebudú viditeľné pri zdieľaní
                    </p>
                  </div>
                  <Switch
                    checked={user?.preferences?.privacySettings?.hideGps ?? true}
                    onCheckedChange={(checked) => updatePrivacySettingsMutation.mutate({ hideGps: checked })}
                    disabled={updatePrivacySettingsMutation.isPending}
                    data-testid="switch-hide-gps"
                  />
                </div>

                {/* Hide Bait */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Skryť návnadu</span>
                    <p className="text-xs text-muted-foreground">
                      Použitá návnada nebude viditeľná pri zdieľaní
                    </p>
                  </div>
                  <Switch
                    checked={user?.preferences?.privacySettings?.hideBait ?? true}
                    onCheckedChange={(checked) => updatePrivacySettingsMutation.mutate({ hideBait: checked })}
                    disabled={updatePrivacySettingsMutation.isPending}
                    data-testid="switch-hide-bait"
                  />
                </div>

                {/* Hide Spot */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Skryť revír</span>
                    <p className="text-xs text-muted-foreground">
                      Názov revíru nebude viditeľný pri zdieľaní
                    </p>
                  </div>
                  <Switch
                    checked={user?.preferences?.privacySettings?.hideSpot ?? false}
                    onCheckedChange={(checked) => updatePrivacySettingsMutation.mutate({ hideSpot: checked })}
                    disabled={updatePrivacySettingsMutation.isPending}
                    data-testid="switch-hide-spot"
                  />
                </div>
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
                        Informácie o tvojom účte
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

      {/* Import Competition Catch Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pridať úlovok do denníka</DialogTitle>
            <DialogDescription>
              Bol si autorom tohto úlovku?
            </DialogDescription>
          </DialogHeader>
          
          {selectedCatch && (
            <div className="space-y-4">
              {/* Catch preview */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 rounded bg-background flex items-center justify-center overflow-hidden">
                  {selectedCatch.photoUrl ? (
                    <img 
                      src={selectedCatch.photoUrl} 
                      alt="Úlovok" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Fish className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="font-medium">{parseFloat(selectedCatch.weight).toFixed(2)} kg</div>
                  <div className="text-sm text-muted-foreground">{selectedCatch.competitionName}</div>
                </div>
              </div>
              
              {/* Authorship selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tvoja rola pri úlovku</Label>
                <RadioGroup
                  value={authorshipRole || ''}
                  onValueChange={(value) => setAuthorshipRole(value as 'author' | 'assistant')}
                >
                  <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="author" id="author" className="mt-0.5" />
                    <Label htmlFor="author" className="cursor-pointer flex-1">
                      <div className="font-medium">Bol som autor</div>
                      <div className="text-sm text-muted-foreground">
                        Tento úlovok som chytil ja
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="assistant" id="assistant" className="mt-0.5" />
                    <Label htmlFor="assistant" className="cursor-pointer flex-1">
                      <div className="font-medium">Len som asistoval</div>
                      <div className="text-sm text-muted-foreground">
                        Pomáhal som kolegovi z tímu
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Personal note */}
              <div className="space-y-2">
                <Label htmlFor="personalNote" className="text-sm font-medium">
                  Osobná poznámka (voliteľné)
                </Label>
                <Textarea
                  id="personalNote"
                  placeholder="Tvoj príbeh, emócia, čokoľvek..."
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
            >
              Zrušiť
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={!authorshipRole || importCatchMutation.isPending}
            >
              {importCatchMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Pridávam...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Pridať do denníka
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DiaryLayout>
  );
}
