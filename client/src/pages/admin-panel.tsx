import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Plus, 
  MapPin, 
  Calendar, 
  Users, 
  UserCheck, 
  Award, 
  Settings,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  UserX,
  BarChart3,
  Activity,
  Search,
  Check,
  X,
  Shield,
  Building2,
  ExternalLink
} from "lucide-react";
import type { Competition, Team, TeamMember, CompetitionRegistration, InsertSponsor, Sponsor, SponsorLevel } from "@shared/schema";
import { getSideCompetitionLabel } from "@/lib/utils";
import { insertSponsorSchema, sponsorLevels } from "@shared/schema";

// Schema for competition creation
const competitionSchema = z.object({
  name: z.string().min(1, "Názov súťaže je povinný").max(255, "Názov je príliš dlhý"),
  description: z.string().max(500, "Popis môže mať maximálne 500 znakov").optional(),
  rules: z.string().optional(),
  location: z.string().min(1, "Miesto je povinné").max(255, "Miesto je príliš dlhé"),
  startDate: z.string().min(1, "Dátum začiatku je povinný"),
  endDate: z.string().min(1, "Dátum konca je povinný"),
  firstPlacePrize: z.string().optional(),
  secondPlacePrize: z.string().optional(),
  thirdPlacePrize: z.string().optional(),
  registrationFee: z.string().optional(),
  maxTeams: z.string().optional(),
  hasSectors: z.boolean().default(false),
  sectorPlaces: z.array(z.object({
    sectorName: z.string().min(1, "Názov sektoru je povinný"),
    places: z.array(z.string().min(1, "Názov miesta je povinný")).min(1, "Sektor musí mať aspoň jedno miesto")
  })).default([]),
  sideCompetitions: z.array(z.string()).default([]),
  scoringType: z.enum(["total", "avg3", "avg5"]).default("total"),
  minWeight: z.number().min(2, "Minimálna hmotnosť musí byť aspoň 2 kg").max(15, "Maximálna hmotnosť môže byť 15 kg").default(2),
  selectedPlan: z.enum(["basic", "pro", "premium", "enterprise"]).default("basic"),
  requestedSubdomain: z.string().optional(),
  brandingPrimaryColor: z.string().optional(),
  brandingSecondaryColor: z.string().optional(),
});

type CompetitionForm = z.infer<typeof competitionSchema>;

// Schema for referee creation
const refereeSchema = z.object({
  userId: z.string().min(1, "Používateľ je povinný"),
  assignedSector: z.string().min(1, "Sektor je povinný"),
  isActive: z.boolean().default(true),
});

type RefereeForm = z.infer<typeof refereeSchema>;

// Dashboard stats type
interface DashboardStats {
  totalUsers: number;
  totalCompetitions: number;
  activeCompetitions: number;
  totalTeams: number;
  totalCatches: number;
  pendingRegistrations: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string; // API returns string, not Date
    user?: string;
  }>;
  usersByRole: Array<{ role: string; count: number }>;
  competitionsByStatus: Array<{ status: string; count: number }>;
}

export default function AdminPanel() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedCompetition, setSelectedCompetition] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [registrationFilter, setRegistrationFilter] = useState<string>("all");
  const [selectedRegistration, setSelectedRegistration] = useState<CompetitionRegistration | null>(null);
  const [isRegistrationDetailOpen, setIsRegistrationDetailOpen] = useState(false);
  const [isAddRefereeDialogOpen, setIsAddRefereeDialogOpen] = useState(false);
  const [isAddSponsorDialogOpen, setIsAddSponsorDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  const isAdmin = user?.role === 'admin';

  // Set initial active tab based on selected competition
  useEffect(() => {
    if (selectedCompetition) {
      setActiveTab("teams");
    } else {
      setActiveTab("dashboard");
    }
  }, [selectedCompetition]);

  const form = useForm<CompetitionForm>({
    resolver: zodResolver(competitionSchema),
    defaultValues: {
      name: "",
      description: "",
      rules: "",
      location: "",
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      firstPlacePrize: "",
      secondPlacePrize: "",
      thirdPlacePrize: "",
      registrationFee: "",
      maxTeams: "",
      hasSectors: false,
      sectorPlaces: [
        { sectorName: "Sektor A", places: ["Miesto 1", "Miesto 2", "Miesto 3"] },
        { sectorName: "Sektor B", places: ["Miesto 1", "Miesto 2"] }
      ],
      sideCompetitions: [],
      scoringType: "total",
      minWeight: 2,
      selectedPlan: "basic",
      requestedSubdomain: "",
      brandingPrimaryColor: "",
      brandingSecondaryColor: "",
    },
  });

  const refereeForm = useForm<RefereeForm>({
    resolver: zodResolver(refereeSchema),
    defaultValues: {
      userId: "",
      assignedSector: "",
      isActive: true,
    },
  });

  const sponsorForm = useForm<InsertSponsor>({
    resolver: zodResolver(insertSponsorSchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      websiteUrl: "",
      sponsorshipLevel: "regular",
      competitionId: selectedCompetition || "",
    },
  });

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Update sponsor form when competition changes
  useEffect(() => {
    if (selectedCompetition) {
      sponsorForm.setValue("competitionId", selectedCompetition);
    }
  }, [selectedCompetition, sponsorForm]);

  // Handle logo file selection
  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Prefill form when editing competition
  useEffect(() => {
    if (editingCompetition && isEditDialogOpen) {
      form.reset({
        name: editingCompetition.name || "",
        description: editingCompetition.description || "",
        rules: editingCompetition.rules || "",
        location: editingCompetition.location || "",
        startDate: editingCompetition.startDate ? new Date(editingCompetition.startDate).toISOString().slice(0, 16) : "",
        endDate: editingCompetition.endDate ? new Date(editingCompetition.endDate).toISOString().slice(0, 16) : "",
        firstPlacePrize: editingCompetition.firstPlacePrize?.toString() || "",
        secondPlacePrize: editingCompetition.secondPlacePrize?.toString() || "",
        thirdPlacePrize: editingCompetition.thirdPlacePrize?.toString() || "",
        registrationFee: editingCompetition.registrationFee?.toString() || "",
        maxTeams: editingCompetition.maxTeams?.toString() || "",
        hasSectors: editingCompetition.hasSectors || false,
        sectorPlaces: editingCompetition.sectorPlaces || [],
        sideCompetitions: editingCompetition.sideCompetitions || [],
        scoringType: editingCompetition.scoringType || "total",
        minWeight: editingCompetition.minWeight ? parseFloat(editingCompetition.minWeight.toString()) : 2,
        selectedPlan: editingCompetition.planTier || "basic", // Use actual plan tier from competition
        requestedSubdomain: "",
        brandingPrimaryColor: "",
        brandingSecondaryColor: "",
      });
    }
  }, [editingCompetition, isEditDialogOpen, form]);

  // Watch form values for dynamic behavior
  const selectedPlan = form.watch("selectedPlan");
  const hasSectors = form.watch("hasSectors");

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Načítavam...</p>
        </div>
      </div>
    );
  }

  // Auth guard
  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'organizer')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <Trophy className="mx-auto h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Prístup odmietnutý</h2>
            <p className="text-muted-foreground">
              Pre prístup do admin panelu potrebujete oprávnenia administrátora alebo organizátora.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Queries
  const { data: competitions, isLoading: competitionsLoading } = useQuery({
    queryKey: ["/api/competitions"],
    enabled: isAuthenticated,
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<(Team & { members: TeamMember[] })[]>({
    queryKey: ["/api/competitions", selectedCompetition, "teams"],
    enabled: isAuthenticated && !!selectedCompetition,
  });

  const { data: referees, isLoading: refereesLoading } = useQuery<any[]>({
    queryKey: ["/api/competitions", selectedCompetition, "referees"],
    enabled: isAuthenticated && !!selectedCompetition,
  });

  const { data: sponsors, isLoading: sponsorsLoading } = useQuery<any[]>({
    queryKey: ["/api/competitions", selectedCompetition, "sponsors"],
    enabled: isAuthenticated && !!selectedCompetition,
  });

  // Dashboard stats query
  const { data: dashboardStats, isLoading: dashboardLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
    enabled: isAuthenticated && isAdmin,
  });

  // Users query for user management
  const { data: allUsers, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  // Registrations queries
  const { data: registrations, isLoading: registrationsLoading, refetch: refetchRegistrations } = useQuery({
    queryKey: ["/api/admin/registrations", registrationFilter === "all" ? undefined : registrationFilter],
    enabled: isAuthenticated && isAdmin,
  });

  // Update editingCompetition when competitions data changes
  useEffect(() => {
    if (editingCompetition && competitions) {
      const updatedCompetition = competitions.find((c: any) => c.id === editingCompetition.id);
      if (updatedCompetition) {
        console.log('Updating editingCompetition with new data:', updatedCompetition);
        setEditingCompetition(updatedCompetition);
      }
    }
  }, [competitions, editingCompetition?.id]);

  // User role update mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      refetchUsers();
      toast({
        title: "Úspech",
        description: "Rola používateľa bola aktualizovaná",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať rolu používateľa",
        variant: "destructive",
      });
    },
  });

  // User status update mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/status`, { active });
      return response.json();
    },
    onSuccess: () => {
      refetchUsers();
      toast({
        title: "Úspech",
        description: "Status používateľa bol aktualizovaný",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať status používateľa",
        variant: "destructive",
      });
    },
  });

  // Competition creation mutation
  const createCompetitionMutation = useMutation({
    mutationFn: async (competitionData: any) => {
      const response = await apiRequest("POST", "/api/competitions", competitionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      form.reset();
      toast({
        title: "Úspech",
        description: "Súťaž bola úspešne vytvorená",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vytvoriť súťaž",
        variant: "destructive",
      });
    },
  });

  // Competition edit mutation
  const editCompetitionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/competitions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Úspech",
        description: "Súťaž bola úspešne upravená",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa upraviť súťaž",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = async (data: any) => {
    try {
      const competitionData = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        organizerId: user?.id,
        maxTeams: data.maxTeams ? parseInt(data.maxTeams) : null,
        registrationFee: data.registrationFee ? parseFloat(data.registrationFee) : null,
        firstPlacePrize: data.firstPlacePrize ? parseFloat(data.firstPlacePrize) : null,
        secondPlacePrize: data.secondPlacePrize ? parseFloat(data.secondPlacePrize) : null,
        thirdPlacePrize: data.thirdPlacePrize ? parseFloat(data.thirdPlacePrize) : null,
        minWeight: typeof data.minWeight === 'string' ? parseFloat(data.minWeight) : data.minWeight,
      };
      await createCompetitionMutation.mutateAsync(competitionData);
    } catch (error) {
      console.error("Error creating competition:", error);
    }
  };

  // Team status update mutation
  const updateTeamStatusMutation = useMutation({
    mutationFn: async ({ teamId, status }: { teamId: string; status: 'approved' | 'rejected' }) => {
      const response = await apiRequest("PATCH", `/api/teams/${teamId}/status`, { status });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "teams"] });
      toast({
        title: "Úspech",
        description: `Tím bol ${variables.status === 'approved' ? 'schválený' : 'zamietnutý'}`
      });
    },
    onError: (error) => {
      console.error("Error updating team status:", error);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodarilo sa zmeniť status tímu"
      });
    },
  });

  // Referee mutations
  const toggleRefereeMutation = useMutation({
    mutationFn: async ({ refereeId, isActive }: { refereeId: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/competitions/${selectedCompetition}/referees/${refereeId}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "referees"] });
      toast({
        title: "Status rozhodcu zmenený",
        description: "Status rozhodcu bol úspešne zmenený."
      });
    },
    onError: (error) => {
      console.error("Error updating referee:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa zmeniť status rozhodcu",
        variant: "destructive"
      });
    }
  });

  // Sponsor mutations
  const deleteSponsorMutation = useMutation({
    mutationFn: async (sponsorId: string) => {
      const response = await apiRequest("DELETE", `/api/competitions/${selectedCompetition}/sponsors/${sponsorId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "sponsors"] });
      toast({
        title: "Sponzor odstránený",
        description: "Sponzor bol úspešne odstránený."
      });
    },
    onError: (error) => {
      console.error("Error deleting sponsor:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odstrániť sponzora",
        variant: "destructive"
      });
    }
  });

  // Competition mutations
  const resetCatchesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/competitions/${selectedCompetition}/catches`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate multiple cache keys affected by resetting catches
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "catches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "leaderboard"] });
      toast({
        title: "Úlovky resetované",
        description: "Všetky úlovky súťaže boli úspešne odstránené."
      });
    },
    onError: (error) => {
      console.error("Error resetting catches:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa resetovať úlovky",
        variant: "destructive"
      });
    }
  });

  const deleteCompetitionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/competitions/${selectedCompetition}`);
      return response.json();
    },
    onSuccess: () => {
      setSelectedCompetition('');
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      toast({
        title: "Súťaž zmazaná",
        description: "Súťaž bola úspešne zmazaná."
      });
    },
    onError: (error) => {
      console.error("Error deleting competition:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa zmazať súťaž",
        variant: "destructive"
      });
    }
  });

  // Registration management mutations
  const approveRegistrationMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/registrations/${registrationId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      refetchRegistrations();
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      setIsRegistrationDetailOpen(false);
      toast({
        title: "Úspech",
        description: "Registrácia bola schválená a súťaž vytvorená",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa schváliť registráciu",
        variant: "destructive",
      });
    },
  });

  const declineRegistrationMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/registrations/${registrationId}/decline`);
      return response.json();
    },
    onSuccess: () => {
      refetchRegistrations();
      setIsRegistrationDetailOpen(false);
      toast({
        title: "Úspech",
        description: "Registrácia bola zamietnutá",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa zamietnuť registráciu",
        variant: "destructive",
      });
    },
  });

  // Create referee mutation
  const createRefereeMutation = useMutation({
    mutationFn: async (refereeData: RefereeForm) => {
      if (!selectedCompetition) throw new Error("No competition selected");
      const response = await apiRequest("POST", `/api/competitions/${selectedCompetition}/referees`, refereeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "referees"] });
      refereeForm.reset();
      setIsAddRefereeDialogOpen(false);
      toast({
        title: "Úspech",
        description: "Rozhodca bol úspešne pridaný",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať rozhodcu",
        variant: "destructive",
      });
    },
  });

  // Logo upload mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      // Use fetch with credentials for authentication
      const response = await fetch('/api/sponsors/upload-logo', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || 'Upload failed');
      }
      return response.json();
    },
  });

  // Create sponsor mutation
  const createSponsorMutation = useMutation({
    mutationFn: async (sponsorData: InsertSponsor) => {
      if (!selectedCompetition) throw new Error("No competition selected");
      
      let logoUrl = sponsorData.logoUrl;
      
      // Upload logo if file is selected
      if (logoFile) {
        setIsUploadingLogo(true);
        try {
          const uploadResult = await uploadLogoMutation.mutateAsync(logoFile);
          logoUrl = uploadResult.logoUrl;
        } catch (error) {
          setIsUploadingLogo(false);
          throw error;
        }
        setIsUploadingLogo(false);
      }
      
      const response = await apiRequest("POST", `/api/competitions/${selectedCompetition}/sponsors`, {
        ...sponsorData,
        logoUrl,
        competitionId: selectedCompetition
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "sponsors"] });
      sponsorForm.reset();
      setLogoFile(null);
      setLogoPreview("");
      setIsAddSponsorDialogOpen(false);
      toast({
        title: "Úspech",
        description: "Sponzor bol úspešne pridaný",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať sponzora",
        variant: "destructive",
      });
    },
  });

  // Update sponsor mutation
  const updateSponsorMutation = useMutation({
    mutationFn: async ({ sponsorId, sponsorData }: { sponsorId: string, sponsorData: InsertSponsor }) => {
      if (!selectedCompetition) throw new Error("No competition selected");
      
      let logoUrl = sponsorData.logoUrl;
      
      // Upload logo if new file is selected
      if (logoFile) {
        setIsUploadingLogo(true);
        try {
          const uploadResult = await uploadLogoMutation.mutateAsync(logoFile);
          logoUrl = uploadResult.logoUrl;
        } catch (error) {
          setIsUploadingLogo(false);
          throw error;
        }
        setIsUploadingLogo(false);
      }
      
      const response = await apiRequest("PATCH", `/api/competitions/${selectedCompetition}/sponsors/${sponsorId}`, {
        ...sponsorData,
        logoUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "sponsors"] });
      sponsorForm.reset();
      setLogoFile(null);
      setLogoPreview("");
      setEditingSponsor(null);
      setIsAddSponsorDialogOpen(false);
      toast({
        title: "Úspech",
        description: "Sponzor bol úspešne aktualizovaný",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať sponzora",
        variant: "destructive",
      });
    },
  });

  // Export functions
  const exportData = (type: 'teams' | 'catches' | 'results') => {
    if (!selectedCompetition) return;
    
    const link = document.createElement('a');
    link.href = `/api/competitions/${selectedCompetition}/export/${type}`;
    link.download = `${type}-${selectedCompetition}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export spustený",
      description: `Export ${type === 'teams' ? 'tímov' : type === 'catches' ? 'úlovkov' : 'výsledkov'} sa sťahuje.`
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <Card className="w-full">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isAdmin ? "Správa systému" : "Správa súťaží"}
                </h1>
                <p className="text-muted-foreground">
                  {isAdmin ? "Celkový prehľad a správa platformy" : "Spravujte svoje súťaže a tímy"}
                </p>
              </div>
              
              {/* Competition Selector (for non-admin or admin with competitions) */}
              {(!isAdmin || competitions?.length > 0) && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="competition-select">Súťaž:</Label>
                    <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Vyberte súťaž" />
                      </SelectTrigger>
                      <SelectContent>
                        {competitions?.map((comp: Competition) => (
                          <SelectItem key={comp.id} value={comp.id}>
                            {comp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" />
                        Nová súťaž
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Vytvorenie novej súťaže</DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form className="space-y-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Názov súťaže</FormLabel>
                                <FormControl>
                                  <Input placeholder="Zadajte názov súťaže" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsCreateDialogOpen(false)}
                            >
                              Zrušiť
                            </Button>
                            <Button type="submit">
                              Vytvoriť súťaž
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          {competitionsLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          ) : !selectedCompetition && !isAdmin ? (
            <div className="text-center py-12">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {competitions?.length === 0 ? "Zatiaľ žiadne súťaže" : "Vyberte súťaž"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {competitions?.length === 0 
                  ? "Vytvorte svoju prvú súťaž a začnite spravovať tímy a udalosti." 
                  : "Vyberte súťaž z rozbaľovacieho menu vyššie pre správu jej detailov."
                }
              </p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              
              {/* Tab Navigation */}
              <div className="border-b border-border">
                <TabsList className="flex space-x-8 px-6 bg-transparent">
                  {isAdmin && (
                    <>
                      <TabsTrigger value="dashboard" className="py-4 border-b-2 border-primary text-primary font-medium text-sm">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Dashboard
                      </TabsTrigger>
                      <TabsTrigger value="users" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <Users className="w-4 h-4 mr-2" />
                        Používatelia
                      </TabsTrigger>
                      <TabsTrigger value="competitions" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <Trophy className="w-4 h-4 mr-2" />
                        Súťaže
                      </TabsTrigger>
                      <TabsTrigger value="registrations" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Registrácie
                      </TabsTrigger>
                    </>
                  )}
                  {selectedCompetition && (
                    <>
                      <TabsTrigger value="teams" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <Users className="w-4 h-4 mr-2" />
                        Tímy
                      </TabsTrigger>
                      <TabsTrigger value="referees" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <UserCheck className="w-4 h-4 mr-2" />
                        Rozhodcovia
                      </TabsTrigger>
                      <TabsTrigger value="sponsors" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <Award className="w-4 h-4 mr-2" />
                        Sponzori
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Nastavenia
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>
              </div>
              
              {/* Admin-only Tabs */}
              {isAdmin && (
                <>
                  <TabsContent value="dashboard" className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Prehľad systému</h2>
                        <p className="text-muted-foreground">Komplexný prehľad platformy a kľúčových metrík</p>
                      </div>

                      {dashboardLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {[...Array(8)].map((_, i) => (
                            <Card key={i} className="p-6">
                              <Skeleton className="h-8 w-24 mb-2" />
                              <Skeleton className="h-12 w-16 mb-1" />
                              <Skeleton className="h-4 w-32" />
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <>
                          {/* Statistics Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="p-6" data-testid="card-total-users">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Celkový počet užívateľov</p>
                                  <p className="text-3xl font-bold text-foreground">
                                    {dashboardStats?.totalUsers || 0}
                                  </p>
                                </div>
                                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <Users className="h-6 w-6 text-primary" />
                                </div>
                              </div>
                            </Card>

                            <Card className="p-6" data-testid="card-total-competitions">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Celkový počet súťaží</p>
                                  <p className="text-3xl font-bold text-foreground">
                                    {dashboardStats?.totalCompetitions || 0}
                                  </p>
                                </div>
                                <div className="h-12 w-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                                  <Trophy className="h-6 w-6 text-secondary" />
                                </div>
                              </div>
                            </Card>

                            <Card className="p-6" data-testid="card-active-competitions">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Aktívne súťaže</p>
                                  <p className="text-3xl font-bold text-foreground">
                                    {dashboardStats?.activeCompetitions || 0}
                                  </p>
                                </div>
                                <div className="h-12 w-12 bg-accent/10 rounded-lg flex items-center justify-center">
                                  <Activity className="h-6 w-6 text-accent" />
                                </div>
                              </div>
                            </Card>

                            <Card className="p-6" data-testid="card-pending-registrations">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Čakajúce registrácie</p>
                                  <p className="text-3xl font-bold text-foreground">
                                    {dashboardStats?.pendingRegistrations || 0}
                                  </p>
                                </div>
                                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <Clock className="h-6 w-6 text-orange-600" />
                                </div>
                              </div>
                            </Card>
                          </div>

                          {/* Charts Row */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Users by Role */}
                            <Card className="p-6">
                              <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-semibold">Užívatelia podľa rolí</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {dashboardStats?.usersByRole?.map((item, index) => (
                                    <div key={item.role} className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${
                                          item.role === 'admin' ? 'bg-red-500' :
                                          item.role === 'organizer' ? 'bg-blue-500' :
                                          item.role === 'referee' ? 'bg-green-500' : 'bg-gray-500'
                                        }`} />
                                        <span className="text-sm font-medium capitalize">
                                          {item.role === 'admin' ? 'Admin' :
                                           item.role === 'organizer' ? 'Organizátor' :
                                           item.role === 'referee' ? 'Rozhodca' : 'Verejnosť'}
                                        </span>
                                      </div>
                                      <span className="text-sm font-semibold">{item.count}</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Competitions by Status */}
                            <Card className="p-6">
                              <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-semibold">Súťaže podľa statusu</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {dashboardStats?.competitionsByStatus?.map((item) => (
                                    <div key={item.status} className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${
                                          item.status === 'live' ? 'bg-green-500' :
                                          item.status === 'registration' ? 'bg-yellow-500' :
                                          item.status === 'finished' ? 'bg-gray-500' : 'bg-blue-500'
                                        }`} />
                                        <span className="text-sm font-medium capitalize">
                                          {item.status === 'live' ? 'Živo' :
                                           item.status === 'registration' ? 'Registrácia' :
                                           item.status === 'finished' ? 'Ukončené' : item.status}
                                        </span>
                                      </div>
                                      <span className="text-sm font-semibold">{item.count}</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Recent Activity */}
                          <Card className="p-6">
                            <CardHeader className="pb-4">
                              <CardTitle className="text-lg font-semibold">Nedávna aktivita</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {dashboardStats?.recentActivity?.length ? (
                                  dashboardStats.recentActivity.map((activity, index) => (
                                    <div key={activity.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                                      <div className={`p-2 rounded-full ${
                                        activity.type === 'team_registration' ? 'bg-blue-100' :
                                        activity.type === 'catch_submission' ? 'bg-green-100' :
                                        'bg-yellow-100'
                                      }`}>
                                        {activity.type === 'team_registration' ? (
                                          <Users className="h-4 w-4 text-blue-600" />
                                        ) : activity.type === 'catch_submission' ? (
                                          <Trophy className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <FileText className="h-4 w-4 text-yellow-600" />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">{activity.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(activity.timestamp).toLocaleString('sk-SK')}
                                          {activity.user && ` • ${activity.user}`}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-center text-muted-foreground py-8">Žiadna nedávna aktivita</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="users" className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Správa používateľov</h2>
                        <p className="text-muted-foreground">Spravujte roly a oprávnenia používateľov</p>
                      </div>

                      {/* Search Users */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Vyhľadať používateľa podľa emailovej adresy..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="pl-9"
                          data-testid="input-search-users"
                        />
                      </div>

                      {usersLoading ? (
                        <div className="space-y-4">
                          {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                              <Skeleton className="h-6 w-20" />
                              <Skeleton className="h-8 w-32" />
                            </div>
                          ))}
                        </div>
                      ) : allUsers?.length === 0 ? (
                        <div className="text-center py-12">
                          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground text-lg">Žiadni používatelia nenájdení</p>
                        </div>
                      ) : (() => {
                        // Filter users based on search term
                        const filteredUsers = allUsers?.filter((user: any) => 
                          user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                        ) || [];
                        
                        return filteredUsers.length === 0 && userSearchTerm ? (
                          <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground text-lg">
                              Žiadni používatelia pre "{userSearchTerm}" nenájdení
                            </p>
                            <p className="text-muted-foreground text-sm">
                              Skúste upraviť vyhľadávací výraz
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredUsers?.map((user: any) => (
                            <div key={user.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg bg-card">
                              {/* User Info */}
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground" data-testid={`text-user-name-${user.id}`}>
                                    {user.name || user.email}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                  {user.createdAt && (
                                    <p className="text-xs text-muted-foreground">
                                      Registrovaný {new Date(user.createdAt).toLocaleDateString('sk-SK')}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Status and Role Badges */}
                              <div className="flex items-center space-x-2">
                                <Badge variant={user.active ? 'default' : 'destructive'} data-testid={`badge-status-${user.id}`}>
                                  {user.active ? 'Aktívny' : 'Neaktívny'}
                                </Badge>
                                <Badge variant={
                                  user.role === 'admin' ? 'destructive' :
                                  user.role === 'organizer' ? 'default' :
                                  user.role === 'referee' ? 'secondary' : 'outline'
                                } data-testid={`badge-role-${user.id}`}>
                                  {user.role === 'admin' ? 'Admin' :
                                   user.role === 'organizer' ? 'Organizátor' :
                                   user.role === 'referee' ? 'Rozhodca' : 'Verejnosť'}
                                </Badge>
                              </div>

                              {/* Status Toggle and Role Change Select */}
                              <div className="flex items-center space-x-2">
                                {/* Status Toggle Switch */}
                                <div className="flex items-center space-x-2 min-w-[100px]">
                                  <Switch 
                                    checked={user.active}
                                    onCheckedChange={(active) => updateUserStatusMutation.mutate({ userId: user.id, active })}
                                    disabled={updateUserStatusMutation.isPending}
                                    data-testid={`switch-status-${user.id}`}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {user.active ? 'Aktívny' : 'Neaktívny'}
                                  </span>
                                </div>

                                {/* Role Change Select */}
                                <div className="min-w-[140px]">
                                  <Select 
                                    value={user.role} 
                                    onValueChange={(newRole) => updateUserRoleMutation.mutate({ userId: user.id, role: newRole })}
                                    disabled={updateUserRoleMutation.isPending}
                                  >
                                    <SelectTrigger data-testid={`select-role-${user.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="public">Verejnosť</SelectItem>
                                      <SelectItem value="referee">Rozhodca</SelectItem>
                                      <SelectItem value="organizer">Organizátor</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Additional Info */}
                              <div className="text-right min-w-[80px]">
                                <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        );
                      })()}
                    </div>
                  </TabsContent>

                  <TabsContent value="competitions" className="p-6">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-2xl font-bold text-foreground mb-2">Správa súťaží</h2>
                          <p className="text-muted-foreground">Spravujte všetky súťaže v systéme</p>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button data-testid="button-create-competition">
                              <Plus className="w-4 h-4 mr-2" />
                              Vytvoriť súťaž
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Vytvoriť novú súťaž</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Názov súťaže</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Názov súťaže" {...field} data-testid="input-competition-name" />
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
                                          <Input placeholder="Lokalita súťaže" {...field} data-testid="input-competition-location" />
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
                                      <FormLabel>Popis</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder="Popis súťaže..." className="min-h-[100px]" {...field} data-testid="textarea-competition-description" />
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
                                      <FormItem>
                                        <FormLabel>Dátum začiatku</FormLabel>
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
                                        <FormLabel>Dátum konca</FormLabel>
                                        <FormControl>
                                          <Input type="datetime-local" {...field} data-testid="input-end-date" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <FormField
                                  control={form.control}
                                  name="rules"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Pravidlá súťaže</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder="Pravidlá a podmienky súťaže..." className="min-h-[80px]" {...field} data-testid="textarea-competition-rules" />
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

                                <FormField
                                  control={form.control}
                                  name="registrationFee"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Registračný poplatok (€)</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.01" placeholder="25.00" {...field} data-testid="input-registration-fee" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="grid grid-cols-3 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="firstPlacePrize"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>1. cena (€)</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="0.01" placeholder="500.00" {...field} data-testid="input-first-prize" />
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
                                        <FormLabel>2. cena (€)</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="0.01" placeholder="300.00" {...field} data-testid="input-second-prize" />
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
                                        <FormLabel>3. cena (€)</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="0.01" placeholder="200.00" {...field} data-testid="input-third-prize" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                {/* Logo Upload */}
                                <div>
                                  <FormLabel>Logo súťaže (voliteľné)</FormLabel>
                                  <div className="mt-2">
                                    <label
                                      htmlFor="competition-logo-input"
                                      className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/10 hover:bg-muted/20"
                                      data-testid="label-competition-logo-upload"
                                    >
                                      <input
                                        id="competition-logo-input"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        data-testid="input-competition-logo"
                                      />
                                      <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                                        <Trophy className="w-8 h-8 text-primary" />
                                      </div>
                                      <p className="text-sm font-medium text-foreground mb-1">
                                        Pridať logo súťaže
                                      </p>
                                      <p className="text-xs text-muted-foreground text-center">
                                        Kliknite pre výber súboru
                                        <br />
                                        <span className="text-xs">JPG, PNG, GIF (max 5MB)</span>
                                      </p>
                                    </label>
                                  </div>
                                </div>

                                {/* Competition Configuration */}
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="scoringType"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Typ hodnotenia</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-scoring-type">
                                              <SelectValue placeholder="Zvoľte typ hodnotenia" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="total">Celková hmotnosť</SelectItem>
                                            <SelectItem value="avg3">Priemer 3 najlepších</SelectItem>
                                            <SelectItem value="avg5">Priemer 5 najlepších</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="minWeight"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Minimálna váha (kg)</FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="number" 
                                            step="0.1" 
                                            placeholder="2.0" 
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                            data-testid="input-min-weight" 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                {/* Plan Selection */}
                                <FormField
                                  control={form.control}
                                  name="selectedPlan"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Cenový plán</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-plan-tier">
                                            <SelectValue placeholder="Zvoľte plán" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="basic">Basic</SelectItem>
                                          <SelectItem value="pro">Pro</SelectItem>
                                          <SelectItem value="premium">Premium</SelectItem>
                                          <SelectItem value="enterprise">Enterprise</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/* Side Competitions */}
                                {(selectedPlan === 'pro' || selectedPlan === 'premium' || selectedPlan === 'enterprise') ? (
                                  <div className="space-y-6">
                                    <div className="flex items-center gap-2">
                                      <Award className="w-5 h-5 text-muted-foreground" />
                                      <h3 className="text-lg font-medium text-foreground">Špeciálne súťaže</h3>
                                      <Badge variant="secondary" className="text-xs">
                                        {selectedPlan.toUpperCase()}
                                      </Badge>
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
                                ) : (
                                  <div className="space-y-6">
                                    <div className="flex items-center gap-2">
                                      <Award className="w-5 h-5 text-muted-foreground" />
                                      <h3 className="text-lg font-medium text-muted-foreground">Špeciálne súťaže</h3>
                                    </div>
                                    <div className="p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/10">
                                      <p className="text-center text-muted-foreground text-sm">
                                        Špeciálne súťaže sú dostupné v <strong>Pro</strong>, <strong>Premium</strong> a <strong>Enterprise</strong> balíkoch.
                                        <br />
                                        <button
                                          type="button"
                                          onClick={() => form.setValue("selectedPlan", "pro")}
                                          className="mt-2 text-primary underline hover:no-underline"
                                          data-testid="button-upgrade-to-pro"
                                        >
                                          Upgradovať na Pro balík
                                        </button>
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Sectors */}
                                <FormField
                                  control={form.control}
                                  name="hasSectors"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <input
                                          type="checkbox"
                                          className="mt-1"
                                          checked={field.value}
                                          onChange={field.onChange}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel>
                                          Rozdeliť súťaž na sektory
                                        </FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                          Povoliť účastníkom súťažiť v rôznych sektoroch/oblastiach
                                        </p>
                                      </div>
                                    </FormItem>
                                  )}
                                />

                                {/* Branding (Premium/Enterprise) */}
                                {(selectedPlan === 'premium' || selectedPlan === 'enterprise') && (
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                      <Settings className="w-5 h-5 text-muted-foreground" />
                                      <h3 className="text-lg font-medium">Branding</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <FormField
                                        control={form.control}
                                        name="brandingPrimaryColor"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Primárna farba</FormLabel>
                                            <FormControl>
                                              <Input type="color" {...field} data-testid="input-primary-color" />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name="brandingSecondaryColor"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Sekundárna farba</FormLabel>
                                            <FormControl>
                                              <Input type="color" {...field} data-testid="input-secondary-color" />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                    <FormField
                                      control={form.control}
                                      name="requestedSubdomain"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Vlastná subdoména</FormLabel>
                                          <FormControl>
                                            <Input placeholder="moja-sutaz" {...field} data-testid="input-subdomain" />
                                          </FormControl>
                                          <p className="text-sm text-muted-foreground">
                                            Bude dostupná na: {field.value || 'moja-sutaz'}.contestio.sk
                                          </p>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                )}

                                <div className="flex justify-end space-x-2">
                                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                                    Zrušiť
                                  </Button>
                                  <Button type="submit" disabled={createCompetitionMutation.isPending} data-testid="button-submit-competition">
                                    {createCompetitionMutation.isPending ? "Vytváranie..." : "Vytvoriť súťaž"}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Competitions List */}
                      {competitions ? (
                        <div className="space-y-4">
                          {competitions.map((competition: Competition) => (
                            <Card key={competition.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <h3 className="font-semibold text-lg text-foreground" data-testid={`text-competition-name-${competition.id}`}>
                                        {competition.name}
                                      </h3>
                                      <Badge variant={
                                        competition.status === 'live' ? 'default' :
                                        competition.status === 'registration' ? 'secondary' :
                                        competition.status === 'finished' ? 'outline' : 'destructive'
                                      } data-testid={`badge-competition-status-${competition.id}`}>
                                        {competition.status === 'live' ? 'Prebiehajúca' :
                                         competition.status === 'registration' ? 'Registrácie' :
                                         competition.status === 'finished' ? 'Ukončená' : 'Pozastavená'}
                                      </Badge>
                                      <Badge 
                                        variant="outline"
                                        className={
                                          competition.planTier === 'basic' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                                          competition.planTier === 'pro' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                          competition.planTier === 'premium' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                          competition.planTier === 'enterprise' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                          'bg-gray-100 text-gray-800 border-gray-300'
                                        }
                                        data-testid={`badge-competition-plan-${competition.id}`}
                                      >
                                        {competition.planTier?.toUpperCase() || 'BASIC'}
                                      </Badge>
                                    </div>
                                    <p className="text-muted-foreground text-sm mb-2">{competition.description}</p>
                                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                                      <div className="flex items-center space-x-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{competition.location}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>{new Date(competition.startDate).toLocaleDateString('sk-SK')}</span>
                                      </div>
                                      {competition.maxTeams && (
                                        <div className="flex items-center space-x-1">
                                          <Users className="w-4 h-4" />
                                          <span>Max {competition.maxTeams} tímov</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedCompetition(competition.id);
                                        setActiveTab("teams");
                                      }}
                                      data-testid={`button-select-competition-${competition.id}`}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Zobraziť
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        setEditingCompetition(competition);
                                        setIsEditDialogOpen(true);
                                      }}
                                      data-testid={`button-edit-competition-${competition.id}`}
                                    >
                                      <Edit className="w-4 h-4 mr-1" />
                                      Upraviť
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground text-lg">Žiadne súťaže nenájdené</p>
                        </div>
                      )}

                      {/* Edit Competition Dialog */}
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Upraviť súťaž</DialogTitle>
                          </DialogHeader>
                          {editingCompetition && (
                            <Form {...form}>
                              <form onSubmit={form.handleSubmit(async (data) => {
                                try {
                                  const competitionData = {
                                    ...data,
                                    startDate: new Date(data.startDate),
                                    endDate: new Date(data.endDate),
                                    maxTeams: data.maxTeams ? parseInt(data.maxTeams) : null,
                                    registrationFee: data.registrationFee || null,
                                    firstPlacePrize: data.firstPlacePrize || null,
                                    secondPlacePrize: data.secondPlacePrize || null,
                                    thirdPlacePrize: data.thirdPlacePrize || null,
                                    minWeight: typeof data.minWeight === 'string' ? parseFloat(data.minWeight) : data.minWeight,
                                  };
                                  
                                  console.log('Edit competition data:', competitionData);
                                  await editCompetitionMutation.mutateAsync({id: editingCompetition.id, data: competitionData});
                                } catch (error) {
                                  console.error("Error editing competition:", error);
                                  toast({
                                    title: "Chyba",
                                    description: "Nepodarilo sa upraviť súťaž.",
                                    variant: "destructive"
                                  });
                                }
                              })} className="space-y-6">
                                
                                {/* Basic Information */}
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Názov súťaže</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Názov súťaže" {...field} data-testid="input-edit-competition-name" />
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
                                          <Input placeholder="Lokalita súťaže" {...field} data-testid="input-edit-competition-location" />
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
                                      <FormLabel>Popis</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder="Popis súťaže..." className="min-h-[100px]" {...field} data-testid="textarea-edit-competition-description" />
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
                                      <FormItem>
                                        <FormLabel>Dátum začiatku</FormLabel>
                                        <FormControl>
                                          <Input type="datetime-local" {...field} data-testid="input-edit-start-date" />
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
                                        <FormLabel>Dátum konca</FormLabel>
                                        <FormControl>
                                          <Input type="datetime-local" {...field} data-testid="input-edit-end-date" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <FormField
                                  control={form.control}
                                  name="rules"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Pravidlá súťaže</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder="Pravidlá a podmienky súťaže..." className="min-h-[80px]" {...field} data-testid="textarea-edit-competition-rules" />
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
                                        <Input type="number" placeholder="50" {...field} data-testid="input-edit-max-teams" />
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
                                        <Input type="number" step="0.01" placeholder="25.00" {...field} data-testid="input-edit-registration-fee" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="grid grid-cols-3 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="firstPlacePrize"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>1. cena (€)</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="0.01" placeholder="500.00" {...field} data-testid="input-edit-first-prize" />
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
                                        <FormLabel>2. cena (€)</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="0.01" placeholder="300.00" {...field} data-testid="input-edit-second-prize" />
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
                                        <FormLabel>3. cena (€)</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="0.01" placeholder="100.00" {...field} data-testid="input-edit-third-prize" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                {/* Competition Configuration */}
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="scoringType"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Typ hodnotenia</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-edit-scoring-type">
                                              <SelectValue placeholder="Zvoľte typ hodnotenia" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="total">Celková hmotnosť</SelectItem>
                                            <SelectItem value="avg3">Priemer 3 najlepších</SelectItem>
                                            <SelectItem value="avg5">Priemer 5 najlepších</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="minWeight"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Minimálna váha (kg)</FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="number" 
                                            step="0.1" 
                                            placeholder="2.0" 
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                            data-testid="input-edit-min-weight" 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                {/* Plan Selection */}
                                <FormField
                                  control={form.control}
                                  name="selectedPlan"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Cenový plán</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-edit-plan-tier">
                                            <SelectValue placeholder="Zvoľte plán" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="basic">Basic</SelectItem>
                                          <SelectItem value="pro">Pro</SelectItem>
                                          <SelectItem value="premium">Premium</SelectItem>
                                          <SelectItem value="enterprise">Enterprise</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/* Side Competitions - simplified version for edit mode */}
                                {(form.watch("selectedPlan") === 'pro' || form.watch("selectedPlan") === 'premium' || form.watch("selectedPlan") === 'enterprise') && (
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                      <Award className="w-5 h-5 text-muted-foreground" />
                                      <h3 className="text-lg font-medium text-foreground">Špeciálne súťaže</h3>
                                      <Badge variant="secondary" className="text-xs">
                                        {form.watch("selectedPlan")?.toUpperCase()}
                                      </Badge>
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
                                                          data-testid={`checkbox-edit-side-competition-${item.id}`}
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
                                  </div>
                                )}

                                <div className="flex space-x-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditDialogOpen(false)}
                                  >
                                    Zrušiť
                                  </Button>
                                  <Button type="submit">
                                    Uložiť zmeny
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TabsContent>

                  <TabsContent value="registrations" className="p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-foreground mb-2">Správa registrácií</h2>
                          <p className="text-muted-foreground">Spracovávajte žiadosti o registráciu súťaží</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="registration-filter">Filter:</Label>
                          <Select value={registrationFilter} onValueChange={setRegistrationFilter}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Všetky</SelectItem>
                              <SelectItem value="submitted">Čakajúce</SelectItem>
                              <SelectItem value="approved">Schválené</SelectItem>
                              <SelectItem value="declined">Zamietnuté</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {registrationsLoading ? (
                        <div className="grid gap-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="border border-border rounded-lg p-4">
                              <Skeleton className="h-6 w-48 mb-2" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          ))}
                        </div>
                      ) : registrations && registrations.length > 0 ? (
                        <div className="grid gap-4">
                          {registrations.map((registration: CompetitionRegistration) => (
                            <div key={registration.id} className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="text-base font-medium text-foreground" data-testid={`text-registration-name-${registration.id}`}>
                                      {registration.name}
                                    </h4>
                                    <Badge 
                                      variant={
                                        registration.status === 'approved' ? 'default' : 
                                        registration.status === 'submitted' ? 'secondary' : 'destructive'
                                      }
                                      data-testid={`badge-registration-status-${registration.id}`}
                                    >
                                      {registration.status === 'approved' ? 'Schválená' : 
                                       registration.status === 'submitted' ? 'Čaká na schválenie' : 'Zamietnutá'}
                                    </Badge>
                                    <Badge variant="outline" data-testid={`badge-registration-plan-${registration.id}`}>
                                      {registration.selectedPlan?.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
                                    <span>Miesto: {registration.location}</span>
                                    <span>Kontakt: {registration.contactEmail}</span>
                                    <span>Organizácia: {registration.organizationName || 'N/A'}</span>
                                    <span>Odoslané: {new Date(registration.createdAt || '').toLocaleDateString('sk-SK')}</span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedRegistration(registration);
                                      setIsRegistrationDetailOpen(true);
                                    }}
                                    data-testid={`button-view-registration-${registration.id}`}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Detail
                                  </Button>
                                  {registration.status === 'submitted' && (
                                    <>
                                      <Button 
                                        size="sm"
                                        onClick={() => approveRegistrationMutation.mutate(registration.id)}
                                        disabled={approveRegistrationMutation.isPending}
                                        data-testid={`button-approve-registration-${registration.id}`}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Schváliť
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => declineRegistrationMutation.mutate(registration.id)}
                                        disabled={declineRegistrationMutation.isPending}
                                        data-testid={`button-decline-registration-${registration.id}`}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Zamietnuť
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">
                            {registrationFilter === "all" ? "Žiadne registrácie" : `Žiadne ${registrationFilter === "submitted" ? "čakajúce" : registrationFilter === "approved" ? "schválené" : "zamietnuté"} registrácie`}
                          </h3>
                          <p className="text-muted-foreground">
                            {registrationFilter === "all" ? "Zatiaľ neboli odoslané žiadne registrácie súťaží." : "Zmeňte filter na zobrazenie iných registrácií."}
                          </p>
                        </div>
                      )}

                      {/* Registration Detail Dialog */}
                      <Dialog open={isRegistrationDetailOpen} onOpenChange={setIsRegistrationDetailOpen}>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Detail registrácie súťaže</DialogTitle>
                          </DialogHeader>
                          {selectedRegistration && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Názov súťaže</Label>
                                  <p className="text-foreground">{selectedRegistration.name}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                  <div className="mt-1">
                                    <Badge 
                                      variant={
                                        selectedRegistration.status === 'approved' ? 'default' : 
                                        selectedRegistration.status === 'submitted' ? 'secondary' : 'destructive'
                                      }
                                    >
                                      {selectedRegistration.status === 'approved' ? 'Schválená' : 
                                       selectedRegistration.status === 'submitted' ? 'Čaká na schválenie' : 'Zamietnutá'}
                                    </Badge>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Miesto konania</Label>
                                  <p className="text-foreground">{selectedRegistration.location}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Vybraný plán</Label>
                                  <p className="text-foreground">{selectedRegistration.selectedPlan?.toUpperCase()}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Začiatok súťaže</Label>
                                  <p className="text-foreground">{new Date(selectedRegistration.startDate).toLocaleDateString('sk-SK')}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Koniec súťaže</Label>
                                  <p className="text-foreground">{new Date(selectedRegistration.endDate).toLocaleDateString('sk-SK')}</p>
                                </div>
                              </div>

                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Popis</Label>
                                <p className="text-foreground">{selectedRegistration.description || 'Žiadny popis'}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Kontaktná osoba</Label>
                                  <p className="text-foreground">{selectedRegistration.contactName}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                                  <p className="text-foreground">{selectedRegistration.contactEmail}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Telefón</Label>
                                  <p className="text-foreground">{selectedRegistration.contactPhone || 'Neuvedené'}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Organizácia</Label>
                                  <p className="text-foreground">{selectedRegistration.organizationName || 'Neuvedené'}</p>
                                </div>
                              </div>

                              {selectedRegistration.status === 'submitted' && (
                                <div className="flex justify-end space-x-2 pt-4 border-t">
                                  <Button 
                                    variant="outline"
                                    onClick={() => setIsRegistrationDetailOpen(false)}
                                  >
                                    Zatvoriť
                                  </Button>
                                  <Button 
                                    variant="destructive"
                                    onClick={() => declineRegistrationMutation.mutate(selectedRegistration.id)}
                                    disabled={declineRegistrationMutation.isPending}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Zamietnuť
                                  </Button>
                                  <Button 
                                    onClick={() => approveRegistrationMutation.mutate(selectedRegistration.id)}
                                    disabled={approveRegistrationMutation.isPending}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Schváliť a vytvoriť súťaž
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TabsContent>
                </>
              )}

              {/* Competition-specific tabs */}
              {selectedCompetition && (
                <>
                  <TabsContent value="teams" className="p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-foreground">Správa tímov</h3>
                          <p className="text-muted-foreground">
                            Spravujte tímy prihlásenej súťaže
                          </p>
                        </div>
                      </div>

                      {teamsLoading ? (
                        <div className="grid gap-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="border border-border rounded-lg p-4">
                              <Skeleton className="h-6 w-48 mb-2" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          ))}
                        </div>
                      ) : teams && teams.length > 0 ? (
                        <div className="grid gap-4">
                          {teams.map((team) => (
                            <div key={team.id} className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="text-base font-medium text-foreground" data-testid={`text-team-name-${team.id}`}>
                                      {team.name}
                                    </h4>
                                    <Badge 
                                      variant={team.status === 'approved' ? 'default' : team.status === 'pending' ? 'secondary' : 'destructive'}
                                      data-testid={`badge-team-status-${team.id}`}
                                    >
                                      {team.status === 'approved' ? 'Schválený' : team.status === 'pending' ? 'Čaká na schválenie' : 'Zamietnutý'}
                                    </Badge>
                                    {team.country && (
                                      <Badge variant="outline" data-testid={`badge-team-country-${team.id}`}>
                                        {team.country}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
                                    <span>Členovia: {team.members?.length || 0}</span>
                                    <span>Úlovky: {team.fishCount || 0}</span>
                                    <span>Celková hmotnosť: {team.totalWeight || 0} kg</span>
                                    {team.sectorName && (
                                      <span>Sektor: {team.sectorName}</span>
                                    )}
                                    {team.placeName && (
                                      <span>Miesto: {team.placeName}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      // TODO: Implement team details modal
                                      toast({
                                        title: "Detaily tímu",
                                        description: "Funkcia detailov tímu bude implementovaná neskôr"
                                      });
                                    }}
                                    data-testid={`button-view-team-${team.id}`}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Detaily
                                  </Button>
                                  {team.status === 'pending' && (
                                    <>
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        onClick={() => updateTeamStatusMutation.mutate({ teamId: team.id, status: 'approved' })}
                                        disabled={updateTeamStatusMutation.isPending}
                                        data-testid={`button-approve-team-${team.id}`}
                                      >
                                        <Check className="w-4 h-4 mr-1" />
                                        Schváliť
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => updateTeamStatusMutation.mutate({ teamId: team.id, status: 'rejected' })}
                                        disabled={updateTeamStatusMutation.isPending}
                                        data-testid={`button-reject-team-${team.id}`}
                                      >
                                        <X className="w-4 h-4 mr-1" />
                                        Zamietnuť
                                      </Button>
                                    </>
                                  )}
                                  {team.status === 'rejected' && (
                                    <Button 
                                      size="sm" 
                                      variant="default"
                                      onClick={() => updateTeamStatusMutation.mutate({ teamId: team.id, status: 'approved' })}
                                      disabled={updateTeamStatusMutation.isPending}
                                      data-testid={`button-approve-team-${team.id}`}
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Schváliť
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">
                            Žiadne tímy
                          </h3>
                          <p className="text-muted-foreground">
                            Pre túto súťaž sa zatiaľ neprihlásili žiadne tímy.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="referees" className="p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-foreground">Správa rozhodcov</h3>
                          <p className="text-muted-foreground">
                            Spravujte rozhodcov priradených k súťaži
                          </p>
                        </div>
                        <Button 
                          variant="default"
                          onClick={() => setIsAddRefereeDialogOpen(true)}
                          data-testid="button-add-referee"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Pridať rozhodcu
                        </Button>
                      </div>

                      {refereesLoading ? (
                        <div className="grid gap-4">
                          {[...Array(2)].map((_, i) => (
                            <div key={i} className="border border-border rounded-lg p-4">
                              <Skeleton className="h-6 w-48 mb-2" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          ))}
                        </div>
                      ) : referees && referees.length > 0 ? (
                        <div className="grid gap-4">
                          {referees.map((referee) => (
                            <div key={referee.id} className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <h4 className="text-base font-medium text-foreground" data-testid={`text-referee-name-${referee.id}`}>
                                      {referee.user?.email || "Neznámy rozhodca"}
                                    </h4>
                                    <Badge 
                                      variant={referee.isActive ? 'default' : 'secondary'}
                                      data-testid={`badge-referee-status-${referee.id}`}
                                    >
                                      {referee.isActive ? 'Aktívny' : 'Neaktívny'}
                                    </Badge>
                                  </div>
                                  <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
                                    <span>Sektor: {referee.assignedSector}</span>
                                    <span>Priradený: {new Date(referee.createdAt).toLocaleDateString('sk-SK')}</span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      toast({
                                        title: "Úprava rozhodcu",
                                        description: "Funkcia úpravy rozhodcu bude implementovaná neskôr"
                                      });
                                    }}
                                    data-testid={`button-edit-referee-${referee.id}`}
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Upraviť
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant={referee.isActive ? "secondary" : "default"}
                                    onClick={() => toggleRefereeMutation.mutate({ 
                                      refereeId: referee.id, 
                                      isActive: !referee.isActive 
                                    })}
                                    disabled={toggleRefereeMutation.isPending}
                                    data-testid={`button-toggle-referee-${referee.id}`}
                                  >
                                    {referee.isActive ? (
                                      <>
                                        <UserX className="w-4 h-4 mr-1" />
                                        Deaktivovať
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="w-4 h-4 mr-1" />
                                        Aktivovať
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">
                            Žiadni rozhodcovia
                          </h3>
                          <p className="text-muted-foreground">
                            Pre túto súťaž zatiaľ nie sú priradení žiadni rozhodcovia.
                          </p>
                        </div>
                      )}

                      {/* Add Referee Dialog */}
                      <Dialog open={isAddRefereeDialogOpen} onOpenChange={setIsAddRefereeDialogOpen}>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Pridať rozhodcu</DialogTitle>
                          </DialogHeader>
                          <Form {...refereeForm}>
                            <form
                              onSubmit={refereeForm.handleSubmit((data) => createRefereeMutation.mutate(data))}
                              className="space-y-4"
                            >
                              <FormField
                                control={refereeForm.control}
                                name="userId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Používateľ</FormLabel>
                                    <FormControl>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger data-testid="select-referee-user">
                                          <SelectValue placeholder="Vyberte používateľa" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(allUsers || []).filter((u: any) => u.role === 'referee').map((u: any) => (
                                            <SelectItem key={u.id} value={u.id}>
                                              {u.email}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={refereeForm.control}
                                name="assignedSector"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Priradený sektor</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Zadajte sektor" data-testid="input-referee-sector" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={refereeForm.control}
                                name="isActive"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                      <FormLabel>Aktívny rozhodca</FormLabel>
                                      <FormDescription>
                                        Rozhodca bude aktívny a pripravený na prácu
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="switch-referee-active"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <div className="flex justify-end space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsAddRefereeDialogOpen(false)}
                                >
                                  Zrušiť
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={createRefereeMutation.isPending}
                                  data-testid="button-submit-referee"
                                >
                                  {createRefereeMutation.isPending ? "Pridávam..." : "Pridať rozhodcu"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="sponsors" className="p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-foreground">Správa sponzorov</h3>
                          <p className="text-muted-foreground">
                            Spravujte sponzorov súťaže
                          </p>
                        </div>
                        <Button 
                          variant="default"
                          onClick={() => {
                            if (!selectedCompetition) {
                              toast({
                                title: "Chyba",
                                description: "Najprv vyberte súťaž",
                                variant: "destructive"
                              });
                              return;
                            }

                            const competition = competitions?.find(c => c.id === selectedCompetition);
                            const planTier = competition?.planTier;
                            
                            if (!planTier || !['pro', 'premium', 'enterprise'].includes(planTier)) {
                              toast({
                                title: "Obmedzenie plánu",
                                description: "Funkcia sponzorov je dostupná len v Pro, Premium a Enterprise plánoch",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            // Clear editing state for new sponsor
                            setEditingSponsor(null);
                            sponsorForm.reset({
                              name: "",
                              logoUrl: "",
                              websiteUrl: "",
                              sponsorshipLevel: "regular",
                              competitionId: selectedCompetition || "",
                            });
                            setLogoFile(null);
                            setLogoPreview("");
                            setIsAddSponsorDialogOpen(true);
                          }}
                          data-testid="button-add-sponsor"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Pridať sponzora
                        </Button>
                      </div>

                      {sponsorsLoading ? (
                        <div className="grid gap-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="border border-border rounded-lg p-4">
                              <Skeleton className="h-6 w-48 mb-2" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          ))}
                        </div>
                      ) : sponsors && sponsors.length > 0 ? (
                        <div className="grid gap-4">
                          {sponsors.map((sponsor) => (
                            <div key={sponsor.id} className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <Building2 className="w-5 h-5 text-muted-foreground" />
                                    <h4 className="text-base font-medium text-foreground" data-testid={`text-sponsor-name-${sponsor.id}`}>
                                      {sponsor.name}
                                    </h4>
                                    <Badge 
                                      variant="outline"
                                      data-testid={`badge-sponsor-tier-${sponsor.id}`}
                                    >
                                      {sponsor.sponsorshipLevel === 'main' ? 'Hlavný sponzor' : 
                                       sponsor.sponsorshipLevel === 'regular' ? 'Sponzor' : 
                                       sponsor.sponsorshipLevel === 'media' ? 'Mediálny partner' : sponsor.sponsorshipLevel}
                                    </Badge>
                                  </div>
                                  <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
                                    {sponsor.description && (
                                      <span>{sponsor.description}</span>
                                    )}
                                    {sponsor.contactEmail && (
                                      <span>Email: {sponsor.contactEmail}</span>
                                    )}
                                  </div>
                                  {sponsor.website && (
                                    <div className="mt-2">
                                      <a 
                                        href={sponsor.website} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-sm text-primary hover:underline"
                                        data-testid={`link-sponsor-website-${sponsor.id}`}
                                      >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        {sponsor.website}
                                      </a>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setEditingSponsor(sponsor);
                                      sponsorForm.reset({
                                        name: sponsor.name,
                                        logoUrl: sponsor.logoUrl || "",
                                        websiteUrl: sponsor.websiteUrl || "",
                                        sponsorshipLevel: sponsor.sponsorshipLevel,
                                        competitionId: selectedCompetition || "",
                                      });
                                      // Clear file states when editing
                                      setLogoFile(null);
                                      setLogoPreview("");
                                      // If sponsor has a logo, set it as preview
                                      if (sponsor.logoUrl) {
                                        setLogoPreview(sponsor.logoUrl);
                                      }
                                      setIsAddSponsorDialogOpen(true);
                                    }}
                                    data-testid={`button-edit-sponsor-${sponsor.id}`}
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Upraviť
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => deleteSponsorMutation.mutate(sponsor.id)}
                                    disabled={deleteSponsorMutation.isPending}
                                    data-testid={`button-delete-sponsor-${sponsor.id}`}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Odstrániť
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">
                            Žiadni sponzori
                          </h3>
                          <p className="text-muted-foreground">
                            Pre túto súťaž zatiaľ nie sú pridaní žiadni sponzori.
                          </p>
                        </div>
                      )}

                      {/* Add Sponsor Dialog */}
                      <Dialog 
                        open={isAddSponsorDialogOpen} 
                        onOpenChange={(open) => {
                          setIsAddSponsorDialogOpen(open);
                          if (!open) {
                            setEditingSponsor(null);
                            setLogoFile(null);
                            setLogoPreview("");
                          }
                        }}
                      >
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>
                              {editingSponsor ? "Upraviť sponzora" : "Pridať sponzora"}
                            </DialogTitle>
                          </DialogHeader>
                          <Form {...sponsorForm}>
                            <form
                              onSubmit={sponsorForm.handleSubmit(
                                (data) => {
                                  console.log("Form submitted with data:", data);
                                  console.log("Form errors:", sponsorForm.formState.errors);
                                  
                                  if (editingSponsor) {
                                    // Update existing sponsor
                                    updateSponsorMutation.mutate({
                                      sponsorId: editingSponsor.id,
                                      sponsorData: data
                                    });
                                  } else {
                                    // Create new sponsor
                                    createSponsorMutation.mutate(data);
                                  }
                                },
                                (errors) => {
                                  console.log("Form validation errors:", errors);
                                  toast({
                                    title: "Chyba vo formulári",
                                    description: "Prosím skontrolujte vyplnené údaje",
                                    variant: "destructive"
                                  });
                                }
                              )}
                              className="space-y-4"
                            >
                              <FormField
                                control={sponsorForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Názov sponzora</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Zadajte názov sponzora" data-testid="input-sponsor-name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={sponsorForm.control}
                                name="sponsorshipLevel"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Typ sponzorstva</FormLabel>
                                    <FormControl>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger data-testid="select-sponsor-level">
                                          <SelectValue placeholder="Vyberte typ sponzorstva" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="main">Hlavný sponzor</SelectItem>
                                          <SelectItem value="regular">Sponzor</SelectItem>
                                          <SelectItem value="media">Mediálny partner</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="space-y-4">
                                <FormField
                                  control={sponsorForm.control}
                                  name="logoUrl"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Logo sponzora</FormLabel>
                                      <FormDescription>
                                        Nahrajte obrázok vášho loga (maximálne 5MB). Podporujeme PNG, JPG a SVG súbory.
                                      </FormDescription>
                                      <div className="space-y-3">
                                        {/* File upload */}
                                        <div>
                                          <Label className="text-sm text-muted-foreground mb-2 block">
                                            Nahrať súbor
                                          </Label>
                                          <Input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/gif"
                                            onChange={handleLogoFileChange}
                                            data-testid="input-sponsor-logo-file"
                                            className="cursor-pointer"
                                          />
                                        </div>
                                        
                                        {/* URL input as alternative */}
                                        <div>
                                          <Label className="text-sm text-muted-foreground mb-2 block">
                                            Alebo URL loga
                                          </Label>
                                          <FormControl>
                                            <Input 
                                              placeholder="https://example.com/logo.png" 
                                              data-testid="input-sponsor-logo-url" 
                                              value={field.value || ""}
                                              onChange={field.onChange}
                                              onBlur={field.onBlur}
                                              name={field.name}
                                            />
                                          </FormControl>
                                        </div>
                                        
                                        {/* Logo preview */}
                                        {(logoPreview || field.value) && (
                                          <div className="mt-2">
                                            <Label className="text-sm text-muted-foreground">Náhľad:</Label>
                                            <div className="mt-1 border rounded-lg p-2 bg-muted/50">
                                              <img 
                                                src={logoPreview || field.value || ""} 
                                                alt="Logo preview" 
                                                className="max-h-20 max-w-full object-contain"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                /></div>

                              <FormField
                                control={sponsorForm.control}
                                name="websiteUrl"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Webová stránka (nepovinné)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="https://example.com" 
                                        data-testid="input-sponsor-website" 
                                        value={field.value || ""}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        name={field.name}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="flex justify-end space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsAddSponsorDialogOpen(false)}
                                >
                                  Zrušiť
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={createSponsorMutation.isPending || updateSponsorMutation.isPending || isUploadingLogo}
                                  data-testid="button-submit-sponsor"
                                >
                                  {isUploadingLogo ? "Nahrávam logo..." : 
                                   (createSponsorMutation.isPending || updateSponsorMutation.isPending) ? 
                                   (editingSponsor ? "Aktualizujem..." : "Pridávam...") : 
                                   (editingSponsor ? "Upraviť sponzora" : "Pridať sponzora")}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-foreground">Nastavenia súťaže</h3>
                        <p className="text-muted-foreground">
                          Spravujte nastavenia a konfiguráciu súťaže
                        </p>
                      </div>

                      <div className="grid gap-6">
                        {/* Competition Status */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center">
                              <Settings className="w-5 h-5 mr-2" />
                              Status súťaže
                            </CardTitle>
                            <CardDescription>
                              Upravte aktuálny status súťaže
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Aktuálny status:</p>
                                <Badge variant="outline" className="mt-1">
                                  {competitions?.find(c => c.id === selectedCompetition)?.status === 'registration' ? 'Registrácia' :
                                   competitions?.find(c => c.id === selectedCompetition)?.status === 'live' ? 'Prebieha' :
                                   competitions?.find(c => c.id === selectedCompetition)?.status === 'completed' ? 'Ukončená' : 'Neznámy'}
                                </Badge>
                              </div>
                              <Button 
                                variant="outline"
                                onClick={() => {
                                  toast({
                                    title: "Zmena statusu",
                                    description: "Funkcia zmeny statusu bude implementovaná neskôr"
                                  });
                                }}
                                data-testid="button-change-competition-status"
                              >
                                Zmeniť status
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Export Options */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center">
                              <FileText className="w-5 h-5 mr-2" />
                              Export údajov
                            </CardTitle>
                            <CardDescription>
                              Exportujte údaje súťaže do rôznych formátov
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => exportData('teams')}
                                data-testid="button-export-teams"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Export tímov
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => exportData('catches')}
                                data-testid="button-export-catches"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Export úlovkov
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => exportData('results')}
                                data-testid="button-export-results"
                              >
                                <Trophy className="w-4 h-4 mr-1" />
                                Export výsledkov
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Competition Statistics */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center">
                              <BarChart3 className="w-5 h-5 mr-2" />
                              Štatistiky súťaže
                            </CardTitle>
                            <CardDescription>
                              Prehľad kľúčových štatistík
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-foreground">
                                  {teams?.length || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Tímy</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-foreground">
                                  {teams?.filter(t => t.status === 'approved').length || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Schválené</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-foreground">
                                  {referees?.length || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Rozhodcovia</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-foreground">
                                  {sponsors?.length || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Sponzori</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Danger Zone */}
                        <Card className="border-destructive">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center text-destructive">
                              <XCircle className="w-5 h-5 mr-2" />
                              Nebezpečná zóna
                            </CardTitle>
                            <CardDescription>
                              Akcie, ktoré nie je možné vrátiť späť
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-col space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Resetovať všetky úlovky</p>
                                  <p className="text-sm text-muted-foreground">
                                    Odstráni všetky úlovky zo súťaže
                                  </p>
                                </div>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Naozaj chcete resetovať všetky úlovky? Táto akcia sa nedá vrátiť späť.')) {
                                      resetCatchesMutation.mutate();
                                    }
                                  }}
                                  disabled={resetCatchesMutation.isPending}
                                  data-testid="button-reset-catches"
                                >
                                  Reset úlovkov
                                </Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Zmazať súťaž</p>
                                  <p className="text-sm text-muted-foreground">
                                    Úplne odstráni súťaž a všetky súvisiace údaje
                                  </p>
                                </div>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Naozaj chcete zmazať túto súťaž? Odstránia sa všetky súvisiace údaje a táto akcia sa nedá vrátiť späť.')) {
                                      deleteCompetitionMutation.mutate();
                                    }
                                  }}
                                  disabled={deleteCompetitionMutation.isPending}
                                  data-testid="button-delete-competition"
                                >
                                  Zmazať súťaž
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          )}

        </Card>
      </div>
    </div>
  );
}