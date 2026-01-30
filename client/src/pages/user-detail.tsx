import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, RefreshCw, Crown, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DiaryLayout from "@/components/DiaryLayout";
import type { User } from "@shared/schema";

const userUpdateSchema = z.object({
  email: z.string().email("Neplatný email").optional().or(z.literal("")),
  firstName: z.string().min(1, "Meno je povinné"),
  lastName: z.string().min(1, "Priezvisko je povinné"),
  nickname: z.string().optional().or(z.literal("")),
  role: z.enum(['public', 'organizer', 'referee', 'admin']),
  active: z.boolean(),
});

type UserUpdateForm = z.infer<typeof userUpdateSchema>;

const premiumUpdateSchema = z.object({
  isPremium: z.boolean(),
  expiresAt: z.string().optional().or(z.literal("")),
});

type PremiumUpdateForm = z.infer<typeof premiumUpdateSchema>;

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [, navigate] = useLocation();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Redirect if not admin (wait for auth to load first)
  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== 'admin')) {
      navigate('/diary');
    }
  }, [authLoading, currentUser, navigate]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <DiaryLayout>
        <div className="container max-w-4xl mx-auto p-4 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DiaryLayout>
    );
  }

  // Early return if not admin
  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  // Fetch user detail
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/admin/users', userId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to fetch user');
      }
      return res.json();
    },
    enabled: !!userId,
  });

  // Form for user profile update
  const form = useForm<UserUpdateForm>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      nickname: user?.nickname || "",
      role: (user?.role as "public" | "organizer" | "referee" | "admin") || 'public',
      active: user?.active ?? true,
    },
  });

  // Form for premium management
  const premiumForm = useForm<PremiumUpdateForm>({
    resolver: zodResolver(premiumUpdateSchema),
    defaultValues: {
      isPremium: user?.isPremium || false,
      expiresAt: user?.premiumExpiresAt 
        ? new Date(user.premiumExpiresAt).toISOString().split('T')[0] 
        : "",
    },
  });

  // Update forms when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        nickname: user.nickname || "",
        role: user.role as "public" | "organizer" | "referee" | "admin",
        active: user.active,
      });
      
      premiumForm.reset({
        isPremium: user.isPremium || false,
        expiresAt: user.premiumExpiresAt 
          ? new Date(user.premiumExpiresAt).toISOString().split('T')[0] 
          : "",
      });
    }
  }, [user]);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserUpdateForm) => {
      const cleanData = {
        email: data.email || undefined,
        firstName: data.firstName,
        lastName: data.lastName,
        nickname: data.nickname || undefined,
        role: data.role,
        active: data.active,
      };
      const response = await apiRequest('PUT', `/api/admin/users/${userId}`, cleanData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Úspech",
        description: "Používateľ bol aktualizovaný",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa aktualizovať používateľa",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/admin/users/${userId}/reset-password`);
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Email bol odoslaný",
        description: `Reset link bol odoslaný na ${data.email}. Používateľ dostane email s odkazom na zmenu hesla.`,
        duration: 8000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa odoslať reset email",
        variant: "destructive",
      });
    },
  });

  // Update premium mutation
  const updatePremiumMutation = useMutation({
    mutationFn: async (data: PremiumUpdateForm) => {
      const response = await apiRequest('PUT', `/api/admin/users/${userId}/premium-manual`, {
        isPremium: data.isPremium,
        expiresAt: data.expiresAt || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Úspech",
        description: "Premium status bol aktualizovaný",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa aktualizovať premium status",
        variant: "destructive",
      });
    },
  });

  const onSubmitProfile = (data: UserUpdateForm) => {
    updateUserMutation.mutate(data);
  };

  const onSubmitPremium = (data: PremiumUpdateForm) => {
    updatePremiumMutation.mutate(data);
  };

  const handleResetPassword = () => {
    if (confirm('Naozaj chcete resetovať heslo tohto používateľa?')) {
      resetPasswordMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <DiaryLayout>
        <div className="container max-w-4xl mx-auto p-4 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DiaryLayout>
    );
  }

  if (!user) {
    return (
      <DiaryLayout>
        <div className="container max-w-4xl mx-auto p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
            <AlertDescription>Používateľ nebol nájdený</AlertDescription>
          </Alert>
        </div>
      </DiaryLayout>
    );
  }

  return (
    <DiaryLayout>
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            data-testid="button-back-admin"
          >
            <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.75} />
            Späť na Admin Panel
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={user.active ? "default" : "secondary"}>
              {user.active ? "Aktívny" : "Neaktívny"}
            </Badge>
            {user.isPremium && (
              <Badge variant="default" className="bg-yellow-500">
                <Crown className="h-3 w-3 mr-1" strokeWidth={1.75} />
                Premium
              </Badge>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Profil používateľa</CardTitle>
            <CardDescription>
              Upravte základné informácie o používateľovi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitProfile)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meno</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-firstName" />
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
                          <Input {...field} data-testid="input-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prezývka</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-nickname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rola</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Verejný</SelectItem>
                            <SelectItem value="organizer">Organizátor</SelectItem>
                            <SelectItem value="referee">Rozhodca</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Aktívny účet</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={updateUserMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    <Save className="h-4 w-4 mr-2" strokeWidth={1.75} />
                    {updateUserMutation.isPending ? "Ukladám..." : "Uložiť zmeny"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetPassword}
                    disabled={resetPasswordMutation.isPending}
                    data-testid="button-reset-password"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" strokeWidth={1.75} />
                    {resetPasswordMutation.isPending ? "Resetujem..." : "Resetovať heslo"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Premium Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              Premium Management
            </CardTitle>
            <CardDescription>
              Manuálne nastavenie Premium statusu a dátumu expirácie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...premiumForm}>
              <form onSubmit={premiumForm.handleSubmit(onSubmitPremium)} className="space-y-4">
                <FormField
                  control={premiumForm.control}
                  name="isPremium"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Premium Status</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Aktivovať alebo deaktivovať Premium prístup
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-premium"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={premiumForm.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dátum expirácie (voliteľné)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date" 
                          data-testid="input-premium-expires"
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Nechajte prázdne pre neobmedzený prístup
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={updatePremiumMutation.isPending}
                  data-testid="button-save-premium"
                >
                  <Save className="h-4 w-4 mr-2" strokeWidth={1.75} />
                  {updatePremiumMutation.isPending ? "Ukladám..." : "Uložiť Premium nastavenia"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Doplňujúce informácie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">ID:</span>
                <p className="font-mono text-xs break-all">{user.id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Vytvorený:</span>
                <p>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('sk-SK') : 'N/A'}</p>
              </div>
              {user.premiumExpiresAt && (
                <div>
                  <span className="text-muted-foreground">Premium vyprší:</span>
                  <p>{new Date(user.premiumExpiresAt).toLocaleDateString('sk-SK')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DiaryLayout>
  );
}
