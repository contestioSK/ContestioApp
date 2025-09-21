import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
  ExternalLink,
  Download,
  Filter,
  MoreHorizontal,
  CheckSquare,
  Square as SquareIcon,
  RefreshCw,
  Trash2,
  Play,
  Square,
  ArrowRight,
  Palette
} from "lucide-react";
import type { Competition, Team, TeamMember, CompetitionRegistration, InsertSponsor, Sponsor, SponsorLevel, Catch, Referee, InsertReferee } from "@shared/schema";
import { getSideCompetitionLabel } from "@/lib/utils";
import { insertSponsorSchema, sponsorLevels } from "@shared/schema";
import { getMaxReferees } from "@shared/plan-capabilities";
import { useWebSocket } from "@/hooks/useWebSocket";

// Type for team with members and catches
type TeamWithDetails = Team & {
  members?: TeamMember[];
  catches?: Catch[];
};

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

// Schema for competition editing - extends creation schema with additional fields
const editCompetitionSchema = z.object({
  name: z.string().min(1, "Názov súťaže je povinný").max(255, "Názov je príliš dlhý"),
  description: z.string().max(500, "Popis môže mať maximálne 500 znakov").optional(),
  rules: z.string().optional(),
  location: z.string().min(1, "Miesto je povinné").max(255, "Miesto je príliš dlhé"),
  startDate: z.string().min(1, "Dátum začiatku je povinný"),
  endDate: z.string().min(1, "Dátum konca je povinný"),
  status: z.enum(["registration", "live", "finished"]).default("registration"),
  imageUrl: z.string().url("Neplatná URL adresa").optional().or(z.literal("")),
  firstPlacePrize: z.preprocess(v => v === "" || v == null ? undefined : v, z.coerce.number().positive("Cena musí byť kladná")).optional(),
  secondPlacePrize: z.preprocess(v => v === "" || v == null ? undefined : v, z.coerce.number().positive("Cena musí byť kladná")).optional(),
  thirdPlacePrize: z.preprocess(v => v === "" || v == null ? undefined : v, z.coerce.number().positive("Cena musí byť kladná")).optional(),
  registrationFee: z.preprocess(v => v === "" || v == null ? undefined : v, z.coerce.number().positive("Poplatok musí byť kladný")).optional(),
  maxTeams: z.preprocess(v => v === "" || v == null ? undefined : v, z.coerce.number().int().positive("Počet tímov musí byť kladný")).optional(),
  maxReferees: z.preprocess(v => v === "" || v == null ? undefined : v, z.coerce.number().int().positive("Počet rozhodcov musí byť kladný")).optional(),
  hasSectors: z.boolean().default(false),
  sectorPlaces: z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }
    return val || [];
  }, z.array(z.object({
    sectorName: z.string().min(1, "Názov sektoru je povinný"),
    places: z.array(z.string().min(1, "Názov miesta je povinný")).min(1, "Sektor musí mať aspoň jedno miesto")
  }))).optional(),
  sideCompetitions: z.array(z.string()).default([]),
  scoringType: z.enum(["total", "avg3", "avg5"]).default("total"),
  minWeight: z.coerce.number().min(2, "Minimálna hmotnosť musí byť aspoň 2 kg").max(15, "Maximálna hmotnosť môže byť 15 kg").default(2),
  selectedPlan: z.enum(["basic", "pro", "premium", "enterprise"]).default("basic"),
  branding: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    subdomain: z.string().optional(),
  }).optional(),
  mediaAccess: z.boolean().default(false),
  prioritySupport: z.boolean().default(false),
}).refine((data) => {
  // Enforce plan constraints
  const plan = data.selectedPlan;
  if (data.maxReferees && data.maxReferees > getMaxReferees(plan)) {
    return false;
  }
  if ((data.mediaAccess || data.prioritySupport) && !['premium', 'enterprise'].includes(plan)) {
    return false;
  }
  return true;
}, {
  message: "Nastavenia nie sú kompatibilné s vybraným plánom",
  path: ["selectedPlan"]
});

type EditCompetitionForm = z.infer<typeof editCompetitionSchema>;

// Schema for referee creation
const refereeSchema = z.object({
  userId: z.string().min(1, "Používateľ je povinný"),
  assignedSector: z.string().min(1, "Sektor je povinný"),
  isActive: z.boolean().default(true),
});

type RefereeForm = z.infer<typeof refereeSchema>;

// Schema for team editing
const editTeamSchema = z.object({
  name: z.string().min(1, "Názov tímu je povinný").max(255, "Názov je príliš dlhý"),
  country: z.string().length(2, "Kód krajiny musí mať presne 2 znaky").default("SK"),
  sectorName: z.string().optional(),
  placeName: z.string().optional(),
}).refine((data) => {
  // If sectorName is provided, placeName must also be provided
  if (data.sectorName && !data.placeName) {
    return false;
  }
  if (data.placeName && !data.sectorName) {
    return false;
  }
  return true;
}, {
  message: "Ak je definovaný sektor, musí byť definované aj miesto",
  path: ["sectorName"]
});

type EditTeamForm = z.infer<typeof editTeamSchema>;

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
  newUsers: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
  newCompetitions: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
  newCatches: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
  systemChanges: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
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
  const [competitionsSearchTerm, setCompetitionsSearchTerm] = useState("");
  const [refereeSearchTerm, setRefereeSearchTerm] = useState("");
  const [isRefereeDropdownOpen, setIsRefereeDropdownOpen] = useState(false);
  const [registrationFilter, setRegistrationFilter] = useState<string>("all");
  const [selectedRegistration, setSelectedRegistration] = useState<CompetitionRegistration | null>(null);
  const [isRegistrationDetailOpen, setIsRegistrationDetailOpen] = useState(false);
  const [isAddRefereeDialogOpen, setIsAddRefereeDialogOpen] = useState(false);
  const [isAddSponsorDialogOpen, setIsAddSponsorDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isTeamDetailsDialogOpen, setIsTeamDetailsDialogOpen] = useState(false);
  const [isEditTeamDialogOpen, setIsEditTeamDialogOpen] = useState(false);
  const [deleteCompetitionId, setDeleteCompetitionId] = useState<string>("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resetCatchesCompetitionId, setResetCatchesCompetitionId] = useState<string>("");
  const [isResetCatchesDialogOpen, setIsResetCatchesDialogOpen] = useState(false);
  
  // New state for enhanced teams management
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [teamToUpdate, setTeamToUpdate] = useState<string | null>(null);
  const [teamsFilter, setTeamsFilter] = useState<string>("all");
  const [teamsSearchTerm, setTeamsSearchTerm] = useState("");
  const [selectedTeamsForBulk, setSelectedTeamsForBulk] = useState<string[]>([]);
  const [isBulkActionOpen, setIsBulkActionOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  
  // Referee state
  const [editingReferee, setEditingReferee] = useState<Referee | null>(null);
  const [isEditRefereeDialogOpen, setIsEditRefereeDialogOpen] = useState(false);
  const [isDeleteRefereeDialogOpen, setIsDeleteRefereeDialogOpen] = useState(false);
  const [refereeToDelete, setRefereeToDelete] = useState<string | null>(null);
  const [isDeleteSponsorDialogOpen, setIsDeleteSponsorDialogOpen] = useState(false);
  const [sponsorToDelete, setSponsorToDelete] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  // Helper functions for status transitions
  const getValidStatusTransitions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'registration':
        return [
          { value: 'live', label: 'Prebiehajúca', icon: Play },
          { value: 'finished', label: 'Ukončená', icon: Square }
        ];
      case 'live':
        return [
          { value: 'finished', label: 'Ukončená', icon: Square }
        ];
      case 'finished':
        return []; // Cannot transition from finished status
      default:
        return [
          { value: 'registration', label: 'Registrácie', icon: Users },
          { value: 'live', label: 'Prebiehajúca', icon: Play }
        ];
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100';
      case 'registration':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-100';
      case 'finished':
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-100';
      default:
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-100';
    }
  };

  // Initialize WebSocket connection for real-time updates
  const { isConnected } = useWebSocket();

  // Set initial active tab based on selected competition
  useEffect(() => {
    if (selectedCompetition) {
      setActiveTab("teams");
    } else {
      setActiveTab("dashboard");
    }
  }, [selectedCompetition]);

  // Close referee dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isRefereeDropdownOpen && !target.closest('[data-testid="input-search-referee"]') && !target.closest('.referee-dropdown')) {
        setIsRefereeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRefereeDropdownOpen]);

  const form = useForm<EditCompetitionForm>({
    resolver: zodResolver(editCompetitionSchema),
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

  const editTeamForm = useForm<EditTeamForm>({
    resolver: zodResolver(editTeamSchema),
    defaultValues: {
      name: "",
      country: "SK",
      sectorName: "",
      placeName: "",
    },
  });

  const editRefereeForm = useForm<RefereeForm>({
    resolver: zodResolver(refereeSchema),
    defaultValues: {
      userId: "",
      assignedSector: "",
      isActive: true,
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
        status: editingCompetition.status || "registration",
        imageUrl: editingCompetition.imageUrl || "",
        firstPlacePrize: editingCompetition.firstPlacePrize?.toString() || "",
        secondPlacePrize: editingCompetition.secondPlacePrize?.toString() || "",
        thirdPlacePrize: editingCompetition.thirdPlacePrize?.toString() || "",
        registrationFee: editingCompetition.registrationFee?.toString() || "",
        maxTeams: editingCompetition.maxTeams?.toString() || "",
        maxReferees: editingCompetition.maxReferees?.toString() || "",
        hasSectors: editingCompetition.hasSectors || false,
        sectorPlaces: editingCompetition.sectorPlaces || [],
        sideCompetitions: editingCompetition.sideCompetitions || [],
        scoringType: editingCompetition.scoringType || "total",
        minWeight: editingCompetition.minWeight ? parseFloat(editingCompetition.minWeight.toString()) : 2,
        selectedPlan: editingCompetition.planTier || "basic",
        branding: {
          primaryColor: editingCompetition.branding?.primaryColor || "",
          secondaryColor: editingCompetition.branding?.secondaryColor || "",
          subdomain: editingCompetition.branding?.subdomain || "",
        },
        mediaAccess: editingCompetition.mediaAccess || false,
        prioritySupport: editingCompetition.prioritySupport || false,
      });
    }
  }, [editingCompetition, isEditDialogOpen, form]);

  // Team details query - moved here before useEffect that uses it
  const { data: selectedTeamDetails, isLoading: teamDetailsLoading } = useQuery<TeamWithDetails>({
    queryKey: ["/api/teams", selectedTeamId],
    enabled: !!selectedTeamId && isTeamDetailsDialogOpen,
  });

  // Prefill team edit form when editing team
  useEffect(() => {
    if (selectedTeamDetails && isEditTeamDialogOpen) {
      editTeamForm.reset({
        name: selectedTeamDetails.name || "",
        country: selectedTeamDetails.country || "SK",
        sectorName: selectedTeamDetails.sectorName || "",
        placeName: selectedTeamDetails.placeName || "",
      });
    }
  }, [selectedTeamDetails, isEditTeamDialogOpen, editTeamForm]);

  // Prefill referee edit form when editing referee
  useEffect(() => {
    if (editingReferee && isEditRefereeDialogOpen) {
      editRefereeForm.reset({
        userId: editingReferee.userId || "",
        assignedSector: editingReferee.assignedSector || "",
        isActive: editingReferee.isActive,
      });
    }
  }, [editingReferee, isEditRefereeDialogOpen, editRefereeForm]);





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

  // Helper function to get available sectors and places
  const getAvailableSectorPlaces = () => {
    const selectedComp = competitions?.find((c: Competition) => c.id === selectedCompetition);
    if (!selectedComp?.sectorPlaces) return [];
    
    const occupiedPairs = teams?.map(team => `${team.sectorName}|${team.placeName}`).filter(Boolean) || [];
    
    return selectedComp.sectorPlaces.flatMap(sector => 
      sector.places.map(place => ({
        sectorName: sector.sectorName,
        placeName: place,
        isOccupied: occupiedPairs.includes(`${sector.sectorName}|${place}`)
      }))
    );
  };

  // Helper function to export teams to CSV
  const exportTeamsToCSV = () => {
    if (!teams || teams.length === 0) {
      toast({
        title: "Upozornenie",
        description: "Žiadne tímy na export",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      "Názov tímu",
      "Status",
      "Krajina",
      "Sektor",
      "Miesto",
      "Počet členov",
      "Počet úlovkov",
      "Celková hmotnosť (kg)",
      "Kapitán",
      "Email kapitána",
      "Telefón"
    ];

    const csvContent = [
      headers.join(","),
      ...teams.map(team => {
        const captain = team.members?.find(member => member.role === 'captain');
        return [
          `"${team.name || ''}"`,
          team.status === 'approved' ? 'Schválený' : team.status === 'pending' ? 'Čaká na schválenie' : 'Zamietnutý',
          team.country || 'SK',
          `"${team.sectorName || ''}"`,
          `"${team.placeName || ''}"`,
          team.members?.length || 0,
          team.fishCount || 0,
          team.totalWeight || 0,
          `"${captain?.name || ''}"`,
          `"${captain?.email || ''}"`,
          `"${captain?.phone || ''}"`
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `timy-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Úspech",
      description: "Tímy boli exportované do CSV súboru"
    });
  };

  // Filter teams based on status and search term
  const filteredTeams = teams?.filter(team => {
    const matchesFilter = teamsFilter === "all" || team.status === teamsFilter;
    const matchesSearch = !teamsSearchTerm || 
      team.name?.toLowerCase().includes(teamsSearchTerm.toLowerCase()) ||
      team.members?.some(member => 
        member.name?.toLowerCase().includes(teamsSearchTerm.toLowerCase())
      );
    return matchesFilter && matchesSearch;
  }) || [];

  // Helper function to handle team selection for bulk actions
  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamsForBulk(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const selectAllTeams = () => {
    const pendingTeams = filteredTeams.filter(team => team.status === 'pending').map(team => team.id);
    setSelectedTeamsForBulk(pendingTeams);
  };

  const clearTeamSelection = () => {
    setSelectedTeamsForBulk([]);
  };

  // Team edit submit handler with enhanced validation
  const onEditTeamSubmit = async (data: EditTeamForm) => {
    if (!selectedTeamId) return;
    
    try {
      // Check if sector/place combination is already taken
      if (data.sectorName && data.placeName) {
        const availablePlaces = getAvailableSectorPlaces();
        const selectedPlace = availablePlaces.find(
          (place: any) => place.sectorName === data.sectorName && place.placeName === data.placeName
        );
        
        if (selectedPlace?.isOccupied) {
          // Check if it's the same team editing its own place
          const currentTeam = teams?.find(t => t.id === selectedTeamId);
          if (currentTeam?.sectorName !== data.sectorName || currentTeam?.placeName !== data.placeName) {
            toast({
              title: "Chyba",
              description: `Miesto ${data.sectorName} - ${data.placeName} je už obsadené iným tímom`,
              variant: "destructive"
            });
            return;
          }
        }
      }
      
      // Transform data to prevent clearing existing sector/place assignments with empty strings
      const cleanData: Partial<EditTeamForm> = {
        name: data.name,
        country: data.country,
      };
      
      // Only include sector/place if both are provided (non-empty)
      if (data.sectorName && data.sectorName.trim() && data.placeName && data.placeName.trim()) {
        cleanData.sectorName = data.sectorName.trim();
        cleanData.placeName = data.placeName.trim();
      } else if (!data.sectorName && !data.placeName) {
        // Allow clearing both sector and place
        cleanData.sectorName = undefined;
        cleanData.placeName = undefined;
      }
      
      await updateTeamMutation.mutateAsync({
        teamId: selectedTeamId,
        data: cleanData
      });
    } catch (error) {
      console.error("Error updating team:", error);
      // Surface server error message in toast
      const errorMessage = error instanceof Error ? error.message : "Chyba pri aktualizácii tímu";
      toast({
        title: "Chyba",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

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
      setIsApproveConfirmOpen(false);
      setIsRejectConfirmOpen(false);
      setTeamToUpdate(null);
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

  // Bulk team status update mutation
  const bulkUpdateTeamStatusMutation = useMutation({
    mutationFn: async ({ teamIds, status }: { teamIds: string[]; status: 'approved' | 'rejected' }) => {
      const responses = await Promise.all(
        teamIds.map(teamId => 
          apiRequest("PATCH", `/api/teams/${teamId}/status`, { status })
        )
      );
      return responses;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "teams"] });
      setSelectedTeamsForBulk([]);
      setIsBulkActionOpen(false);
      setBulkAction(null);
      toast({
        title: "Úspech",
        description: `${variables.teamIds.length} tímov bolo ${variables.status === 'approved' ? 'schválených' : 'zamietnutých'}`
      });
    },
    onError: (error) => {
      console.error("Error bulk updating team status:", error);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodarilo sa zmeniť status tímov"
      });
    },
  });

  // Team update mutation
  const updateTeamMutation = useMutation({
    mutationFn: async ({ teamId, data }: { teamId: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/teams/${teamId}`, data);
      return response.json();
    },
    onSuccess: (updatedTeam, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "teams"] });
      setIsEditTeamDialogOpen(false);
      toast({
        title: "Úspech",
        description: "Tím bol úspešne aktualizovaný"
      });
    },
    onError: (error) => {
      console.error("Error updating team:", error);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať tím"
      });
    },
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
      // Close dialog and reset state
      setIsDeleteSponsorDialogOpen(false);
      setSponsorToDelete(null);
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
    mutationFn: async (competitionId: string) => {
      const response = await apiRequest("DELETE", `/api/competitions/${competitionId}/catches`);
      return response.json();
    },
    onSuccess: (data, competitionId) => {
      // Invalidate multiple cache keys affected by resetting catches
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", competitionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", competitionId, "teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", competitionId, "catches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", competitionId, "leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
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
    mutationFn: async (competitionId: string) => {
      const response = await apiRequest("DELETE", `/api/competitions/${competitionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      if (selectedCompetition) {
        setSelectedCompetition('');
      }
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

  const updateCompetitionStatusMutation = useMutation({
    mutationFn: async ({ competitionId, status }: { competitionId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/competitions/${competitionId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      toast({
        title: "Status súťaže zmenený",
        description: "Status súťaže bol úspešne zmenený."
      });
    },
    onError: (error) => {
      console.error("Error updating competition status:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa zmeniť status súťaže",
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

  // Helper function to check referee plan limits
  const checkRefereePlanLimits = () => {
    const competition = competitions?.find((c: Competition) => c.id === selectedCompetition);
    if (!competition) return { canAdd: false, message: "Súťaž nebola nájdená" };
    
    const planTier = competition.planTier || "basic";
    const maxReferees = getMaxReferees(planTier);
    const currentRefereeCount = referees?.length || 0;
    
    if (maxReferees !== null && currentRefereeCount >= maxReferees) {
      return {
        canAdd: false,
        message: `Váš ${planTier} plán povoľuje maximálne ${maxReferees} rozhodcov. Momentálne máte ${currentRefereeCount}.`,
        planLimit: maxReferees,
        currentCount: currentRefereeCount
      };
    }
    
    return { canAdd: true, message: "", planLimit: maxReferees, currentCount: currentRefereeCount };
  };

  // Create referee mutation with plan enforcement
  const createRefereeMutation = useMutation({
    mutationFn: async (refereeData: RefereeForm) => {
      if (!selectedCompetition) throw new Error("No competition selected");
      
      // Check plan limits
      const limitsCheck = checkRefereePlanLimits();
      if (!limitsCheck.canAdd) {
        throw new Error(limitsCheck.message);
      }
      
      // Check if user is already a referee in this competition
      const existingReferee = referees?.find(r => r.userId === refereeData.userId);
      if (existingReferee) {
        throw new Error("Tento používateľ je už rozhodcom v tejto súťaži");
      }
      
      const response = await apiRequest("POST", `/api/competitions/${selectedCompetition}/referees`, refereeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "referees"] });
      refereeForm.reset();
      setRefereeSearchTerm("");
      setIsRefereeDropdownOpen(false);
      setIsAddRefereeDialogOpen(false);
      toast({
        title: "Úspech",
        description: "Rozhodca bol úspešne pridaný",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa pridať rozhodcu",
        variant: "destructive",
      });
    },
  });

  // Update referee mutation
  const updateRefereeMutation = useMutation({
    mutationFn: async ({ refereeId, refereeData }: { refereeId: string, refereeData: Partial<RefereeForm> }) => {
      if (!selectedCompetition) throw new Error("No competition selected");
      const response = await apiRequest("PATCH", `/api/competitions/${selectedCompetition}/referees/${refereeId}`, refereeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "referees"] });
      editRefereeForm.reset();
      setEditingReferee(null);
      setIsEditRefereeDialogOpen(false);
      toast({
        title: "Úspech",
        description: "Rozhodca bol úspešne aktualizovaný",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať rozhodcu",
        variant: "destructive",
      });
    },
  });

  // Delete referee mutation  
  const deleteRefereeMutation = useMutation({
    mutationFn: async (refereeId: string) => {
      if (!selectedCompetition) throw new Error("No competition selected");
      const response = await apiRequest("DELETE", `/api/competitions/${selectedCompetition}/referees/${refereeId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "referees"] });
      setRefereeToDelete(null);
      setIsDeleteRefereeDialogOpen(false);
      toast({
        title: "Úspech",
        description: "Rozhodca bol úspešne odstránený",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odstrániť rozhodcu",
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

                          {/* Recent Activity - 4 Columns */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                            {/* New Users Column */}
                            <Card className="p-4">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold flex items-center">
                                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                                  Noví používatelia
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {dashboardStats?.newUsers?.length ? (
                                    dashboardStats.newUsers.map((user) => (
                                      <div key={user.id} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <p className="text-xs font-medium text-foreground truncate">{user.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(user.timestamp).toLocaleDateString('sk-SK')}
                                        </p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-4">Žiadni nový užívatelia</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            {/* New Competitions Column */}
                            <Card className="p-4">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold flex items-center">
                                  <Trophy className="h-4 w-4 mr-2 text-green-600" />
                                  Nové súťaže
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {dashboardStats?.newCompetitions?.length ? (
                                    dashboardStats.newCompetitions.map((competition) => (
                                      <div key={competition.id} className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                        <p className="text-xs font-medium text-foreground truncate">{competition.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(competition.timestamp).toLocaleDateString('sk-SK')}
                                        </p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-4">Žiadne nové súťaže</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            {/* New Catches Column */}
                            <Card className="p-4">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold flex items-center">
                                  <Award className="h-4 w-4 mr-2 text-orange-600" />
                                  Nové úlovky
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {dashboardStats?.newCatches?.length ? (
                                    dashboardStats.newCatches.map((catch_) => (
                                      <div key={catch_.id} className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                        <p className="text-xs font-medium text-foreground truncate">{catch_.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(catch_.timestamp).toLocaleDateString('sk-SK')}
                                        </p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-4">Žiadne nové úlovky</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            {/* System Changes Column */}
                            <Card className="p-4">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold flex items-center">
                                  <Settings className="h-4 w-4 mr-2 text-purple-600" />
                                  Zmeny v systéme
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {dashboardStats?.systemChanges?.length ? (
                                    dashboardStats.systemChanges.map((change) => (
                                      <div key={change.id} className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                        <p className="text-xs font-medium text-foreground truncate">{change.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(change.timestamp).toLocaleDateString('sk-SK')}
                                          {change.user && ` • ${change.user}`}
                                        </p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-4">Žiadne zmeny</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
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
                          placeholder="Vyhľadať používateľa podľa mena, priezviska alebo emailu..."
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
                        // Filter users based on search term (name, lastname, or email)
                        const filteredUsers = allUsers?.filter((user: any) => {
                          const searchLower = userSearchTerm.toLowerCase();
                          return user.email.toLowerCase().includes(searchLower) ||
                                 (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
                                 (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
                                 (user.firstName && user.lastName && 
                                  `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower))
                        }) || [];
                        
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
                                    {user.firstName && user.lastName 
                                      ? `${user.firstName} ${user.lastName}` 
                                      : user.firstName || user.lastName || user.email}
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

                      {/* Search Competitions */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Vyhľadať súťaž podľa názvu alebo lokality..."
                          value={competitionsSearchTerm}
                          onChange={(e) => setCompetitionsSearchTerm(e.target.value)}
                          className="pl-9"
                          data-testid="input-search-competitions"
                        />
                      </div>

                      {/* Competitions List */}
                      {(() => {
                        // Filter competitions based on search term
                        const filteredCompetitions = competitions?.filter((competition: Competition) => {
                          const searchLower = competitionsSearchTerm.toLowerCase();
                          return competition.name.toLowerCase().includes(searchLower) ||
                                 (competition.location && competition.location.toLowerCase().includes(searchLower)) ||
                                 (competition.description && competition.description.toLowerCase().includes(searchLower));
                        }) || [];
                        
                        return filteredCompetitions.length === 0 && competitionsSearchTerm ? (
                          <div className="text-center py-12">
                            <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground text-lg">
                              Žiadne súťaže pre "{competitionsSearchTerm}" nenájdené
                            </p>
                            <p className="text-muted-foreground text-sm">
                              Skúste upraviť vyhľadávací výraz
                            </p>
                          </div>
                        ) : filteredCompetitions.length > 0 ? (
                        <div className="space-y-4">
                          {filteredCompetitions.map((competition: Competition) => (
                            <Card key={competition.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <h3 className="font-semibold text-lg text-foreground" data-testid={`text-competition-name-${competition.id}`}>
                                        {competition.name}
                                      </h3>
                                      <Badge 
                                        variant="outline"
                                        className={getStatusBadgeStyle(competition.status)}
                                        data-testid={`badge-competition-status-${competition.id}`}
                                      >
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

                                  <div className="flex items-center space-x-2 flex-wrap">
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

                                    {/* Status Transition Buttons */}
                                    {getValidStatusTransitions(competition.status).map((transition) => {
                                      const IconComponent = transition.icon;
                                      return (
                                        <Button
                                          key={transition.value}
                                          size="sm"
                                          variant="outline"
                                          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                          onClick={() => updateCompetitionStatusMutation.mutate({
                                            competitionId: competition.id,
                                            status: transition.value
                                          })}
                                          disabled={updateCompetitionStatusMutation.isPending}
                                          data-testid={`button-status-${transition.value}-${competition.id}`}
                                        >
                                          {updateCompetitionStatusMutation.isPending ? (
                                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                                          ) : (
                                            <IconComponent className="w-4 h-4 mr-1" />
                                          )}
                                          {transition.label}
                                        </Button>
                                      );
                                    })}

                                    {/* Reset Catches Button - only for live competitions */}
                                    {competition.status === 'live' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white"
                                        onClick={() => {
                                          setResetCatchesCompetitionId(competition.id);
                                          setIsResetCatchesDialogOpen(true);
                                        }}
                                        data-testid={`button-reset-catches-${competition.id}`}
                                      >
                                        <RefreshCw className="w-4 h-4 mr-1" />
                                        Reset úlovky
                                      </Button>
                                    )}

                                    {/* Delete Button - only for admin/owner */}
                                    {(isAdmin || competition.organizerId === user?.id) && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                                        onClick={() => {
                                          setDeleteCompetitionId(competition.id);
                                          setIsDeleteDialogOpen(true);
                                        }}
                                        data-testid={`button-delete-competition-${competition.id}`}
                                      >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Zmazať
                                      </Button>
                                    )}
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
                        );
                      })()}

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
                                    name: data.name,
                                    description: data.description,
                                    rules: data.rules,
                                    location: data.location,
                                    status: data.status,
                                    imageUrl: data.imageUrl || null,
                                    startDate: new Date(data.startDate),
                                    endDate: new Date(data.endDate),
                                    maxTeams: data.maxTeams ? parseInt(data.maxTeams) : null,
                                    maxReferees: data.maxReferees ? parseInt(data.maxReferees) : null,
                                    registrationFee: data.registrationFee || null,
                                    firstPlacePrize: data.firstPlacePrize || null,
                                    secondPlacePrize: data.secondPlacePrize || null,
                                    thirdPlacePrize: data.thirdPlacePrize || null,
                                    minWeight: typeof data.minWeight === 'string' ? parseFloat(data.minWeight) : data.minWeight,
                                    hasSectors: data.hasSectors,
                                    sectorPlaces: data.sectorPlaces || [],
                                    sideCompetitions: data.sideCompetitions || [],
                                    scoringType: data.scoringType,
                                    planTier: data.selectedPlan,
                                    branding: data.branding && (data.branding.primaryColor || data.branding.secondaryColor || data.branding.subdomain) ? {
                                      primaryColor: data.branding.primaryColor || null,
                                      secondaryColor: data.branding.secondaryColor || null,
                                      subdomain: data.branding.subdomain || null,
                                    } : null,
                                    mediaAccess: data.mediaAccess,
                                    prioritySupport: data.prioritySupport,
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

                                {/* Status and Image */}
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Status súťaže</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-edit-competition-status">
                                              <SelectValue placeholder="Zvoľte status" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="registration">Registrácie</SelectItem>
                                            <SelectItem value="live">Prebiehajúca</SelectItem>
                                            <SelectItem value="finished">Ukončená</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="imageUrl"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>URL obrázka súťaže</FormLabel>
                                        <FormControl>
                                          <Input placeholder="https://example.com/image.jpg" {...field} data-testid="input-edit-competition-image" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

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

                                {/* Plan Selection and Advanced Settings */}
                                <div className="grid grid-cols-2 gap-4">
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
                                  <FormField
                                    control={form.control}
                                    name="maxReferees"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Max. počet rozhodcov</FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="number" 
                                            placeholder="5" 
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                            data-testid="input-edit-max-referees" 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                {/* Sectors Configuration */}
                                <div className="space-y-4">
                                  <FormField
                                    control={form.control}
                                    name="hasSectors"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                          <FormLabel className="text-base">Rozdelenie do sektorov</FormLabel>
                                          <FormDescription>
                                            Povoliť rozdelenie súťaže do geografických sektorov
                                          </FormDescription>
                                        </div>
                                        <FormControl>
                                          <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            data-testid="switch-edit-has-sectors"
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />

                                  {form.watch("hasSectors") && (
                                    <FormField
                                      control={form.control}
                                      name="sectorPlaces"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Nastavenia sektorov (JSON)</FormLabel>
                                          <FormControl>
                                            <Textarea 
                                              placeholder='[{"sectorName": "Sektor A", "places": ["Miesto 1", "Miesto 2"]}]'
                                              className="min-h-[100px] font-mono text-sm"
                                              {...field}
                                              value={typeof field.value === 'string' ? field.value : JSON.stringify(field.value || [], null, 2)}
                                              onChange={(e) => {
                                                try {
                                                  const parsed = JSON.parse(e.target.value);
                                                  field.onChange(parsed);
                                                } catch {
                                                  field.onChange(e.target.value);
                                                }
                                              }}
                                              data-testid="textarea-edit-sector-places"
                                            />
                                          </FormControl>
                                          <FormDescription>
                                            JSON formát pre definovanie sektorov a miest
                                          </FormDescription>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  )}
                                </div>

                                {/* Branding Settings */}
                                {(form.watch("selectedPlan") === 'premium' || form.watch("selectedPlan") === 'enterprise') && (
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                      <Palette className="w-5 h-5 text-muted-foreground" />
                                      <h3 className="text-lg font-medium text-foreground">Branding nastavenia</h3>
                                      <Badge variant="secondary" className="text-xs">
                                        {form.watch("selectedPlan")?.toUpperCase()}
                                      </Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <FormField
                                        control={form.control}
                                        name="branding.primaryColor"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Primárna farba</FormLabel>
                                            <FormControl>
                                              <Input 
                                                type="color" 
                                                {...field}
                                                data-testid="input-edit-primary-color"
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name="branding.secondaryColor"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Sekundárna farba</FormLabel>
                                            <FormControl>
                                              <Input 
                                                type="color" 
                                                {...field}
                                                data-testid="input-edit-secondary-color"
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                    
                                    <FormField
                                      control={form.control}
                                      name="branding.subdomain"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Vlastná subdoména</FormLabel>
                                          <FormControl>
                                            <Input placeholder="moja-sutaz" {...field} data-testid="input-edit-subdomain" />
                                          </FormControl>
                                          <FormDescription>
                                            Bude dostupná na: {field.value || 'moja-sutaz'}.contestio.sk
                                          </FormDescription>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                )}

                                {/* Advanced Features */}
                                {(form.watch("selectedPlan") === 'premium' || form.watch("selectedPlan") === 'enterprise') && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name="mediaAccess"
                                      render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                          <div className="space-y-0.5">
                                            <FormLabel className="text-base">Mediálny prístup</FormLabel>
                                            <FormDescription>
                                              Povoliť prístup pre médiá
                                            </FormDescription>
                                          </div>
                                          <FormControl>
                                            <Switch
                                              checked={field.value}
                                              onCheckedChange={field.onChange}
                                              data-testid="switch-edit-media-access"
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="prioritySupport"
                                      render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                          <div className="space-y-0.5">
                                            <FormLabel className="text-base">Prioritná podpora</FormLabel>
                                            <FormDescription>
                                              Aktivovať prioritnú podporu
                                            </FormDescription>
                                          </div>
                                          <FormControl>
                                            <Switch
                                              checked={field.value}
                                              onCheckedChange={field.onChange}
                                              data-testid="switch-edit-priority-support"
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                )}

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

                      {/* Delete Competition Confirmation Dialog */}
                      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <Trash2 className="w-5 h-5 text-red-600" />
                              <span>Zmazať súťaž</span>
                            </DialogTitle>
                            <DialogDescription>
                              Táto akcia je nevratná. Zmaže sa súťaž aj všetky súvisiace údaje.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                <div>
                                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                                    Budú zmazané tieto údaje:
                                  </h4>
                                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                    <li>• Všetky registrované tímy</li>
                                    <li>• Všetky úlovky a záznamy</li>
                                    <li>• Všetci rozhodcovia</li>
                                    <li>• Všetci sponzori</li>
                                    <li>• Kompletná história súťaže</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsDeleteDialogOpen(false)}
                              data-testid="button-cancel-delete"
                            >
                              Zrušiť
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={() => {
                                deleteCompetitionMutation.mutate(deleteCompetitionId);
                                setIsDeleteDialogOpen(false);
                              }}
                              disabled={deleteCompetitionMutation.isPending}
                              data-testid="button-confirm-delete"
                            >
                              {deleteCompetitionMutation.isPending ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Mazanie...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Zmazať súťaž
                                </>
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Reset Catches Confirmation Dialog */}
                      <Dialog open={isResetCatchesDialogOpen} onOpenChange={setIsResetCatchesDialogOpen}>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <RefreshCw className="w-5 h-5 text-orange-600" />
                              <span>Reset všetkých úlovkov</span>
                            </DialogTitle>
                            <DialogDescription>
                              Táto akcia zmaže všetky úlovky zo súťaže. Akcia je nevratná.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <XCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                                <div>
                                  <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                                    Potvrdenie resetovania:
                                  </h4>
                                  <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                                    <li>• Všetky úlovky budú zmazané</li>
                                    <li>• Rebríčky budú vynulované</li>
                                    <li>• Štatistiky tímov sa resetujú</li>
                                    <li>• Akcia je nevratná</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsResetCatchesDialogOpen(false)}
                              data-testid="button-cancel-reset"
                            >
                              Zrušiť
                            </Button>
                            <Button 
                              variant="destructive"
                              className="bg-orange-600 hover:bg-orange-700"
                              onClick={() => {
                                resetCatchesMutation.mutate(resetCatchesCompetitionId);
                                setIsResetCatchesDialogOpen(false);
                              }}
                              disabled={resetCatchesMutation.isPending}
                              data-testid="button-confirm-reset"
                            >
                              {resetCatchesMutation.isPending ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Resetovanie...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Reset úlovky
                                </>
                              )}
                            </Button>
                          </div>
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
                        <div className="flex items-center space-x-2">
                          {filteredTeams.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={exportTeamsToCSV}
                              data-testid="button-export-teams"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Export CSV
                            </Button>
                          )}
                          {selectedTeamsForBulk.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setIsBulkActionOpen(true)}
                              data-testid="button-bulk-actions"
                            >
                              <MoreHorizontal className="w-4 h-4 mr-2" />
                              Hromadné akcie ({selectedTeamsForBulk.length})
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Filters and Search */}
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Filter className="w-4 h-4 text-muted-foreground" />
                          <Select value={teamsFilter} onValueChange={setTeamsFilter}>
                            <SelectTrigger className="w-40" data-testid="select-teams-filter">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Všetky</SelectItem>
                              <SelectItem value="pending">Čakajúce</SelectItem>
                              <SelectItem value="approved">Schválené</SelectItem>
                              <SelectItem value="rejected">Zamietnuté</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Vyhľadať tím alebo člena..."
                            value={teamsSearchTerm}
                            onChange={(e) => setTeamsSearchTerm(e.target.value)}
                            className="pl-9"
                            data-testid="input-search-teams"
                          />
                        </div>
                        {filteredTeams.filter(team => team.status === 'pending').length > 0 && (
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={selectedTeamsForBulk.length === filteredTeams.filter(t => t.status === 'pending').length ? clearTeamSelection : selectAllTeams}
                              data-testid="button-select-all-teams"
                            >
                              {selectedTeamsForBulk.length === filteredTeams.filter(t => t.status === 'pending').length ? (
                                <SquareIcon className="w-4 h-4 mr-2" />
                              ) : (
                                <CheckSquare className="w-4 h-4 mr-2" />
                              )}
                              {selectedTeamsForBulk.length === filteredTeams.filter(t => t.status === 'pending').length ? 'Zrušiť výber' : 'Vybrať všetky'}
                            </Button>
                          </div>
                        )}
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
                      ) : filteredTeams && filteredTeams.length > 0 ? (
                        <div className="grid gap-4">
                          {filteredTeams.map((team) => (
                            <div key={team.id} className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                  {team.status === 'pending' && (
                                    <Checkbox
                                      checked={selectedTeamsForBulk.includes(team.id)}
                                      onCheckedChange={() => toggleTeamSelection(team.id)}
                                      data-testid={`checkbox-team-${team.id}`}
                                    />
                                  )}
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
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTeamId(team.id);
                                      setIsTeamDetailsDialogOpen(true);
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
                                        onClick={() => {
                                          setTeamToUpdate(team.id);
                                          setIsApproveConfirmOpen(true);
                                        }}
                                        disabled={updateTeamStatusMutation.isPending}
                                        data-testid={`button-approve-team-${team.id}`}
                                      >
                                        <Check className="w-4 h-4 mr-1" />
                                        Schváliť
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => {
                                          setTeamToUpdate(team.id);
                                          setIsRejectConfirmOpen(true);
                                        }}
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
                                      onClick={() => {
                                        setTeamToUpdate(team.id);
                                        setIsApproveConfirmOpen(true);
                                      }}
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
                          {/* Plan limits indicator */}
                          {selectedCompetition && (() => {
                            const limitsCheck = checkRefereePlanLimits();
                            return (
                              <div className="mt-2 text-sm text-muted-foreground">
                                Rozhodcovia: {limitsCheck.currentCount} / {limitsCheck.planLimit === null ? '∞' : limitsCheck.planLimit}
                                {limitsCheck.planLimit !== null && limitsCheck.currentCount >= limitsCheck.planLimit && (
                                  <span className="text-red-600 dark:text-red-400 ml-2">
                                    (Limit dosiahnutý)
                                  </span>
                                )}
                              </div>
                            );
                          })()}
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

                            const limitsCheck = checkRefereePlanLimits();
                            if (!limitsCheck.canAdd) {
                              toast({
                                title: "Obmedzenie plánu",
                                description: limitsCheck.message,
                                variant: "destructive"
                              });
                              return;
                            }

                            refereeForm.reset({
                              userId: "",
                              assignedSector: "",
                              isActive: true,
                            });
                            setIsAddRefereeDialogOpen(true);
                          }}
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
                                      setEditingReferee(referee);
                                      setIsEditRefereeDialogOpen(true);
                                    }}
                                    data-testid={`button-edit-referee-${referee.id}`}
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Upraviť
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant={referee.isActive ? "secondary" : "default"}
                                    onClick={() => updateRefereeMutation.mutate({ 
                                      refereeId: referee.id, 
                                      refereeData: { isActive: !referee.isActive }
                                    })}
                                    disabled={updateRefereeMutation.isPending}
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
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => {
                                      setRefereeToDelete(referee.id);
                                      setIsDeleteRefereeDialogOpen(true);
                                    }}
                                    data-testid={`button-delete-referee-${referee.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Odstrániť
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
                      <Dialog open={isAddRefereeDialogOpen} onOpenChange={(open) => {
                        if (!open) {
                          setRefereeSearchTerm("");
                          setIsRefereeDropdownOpen(false);
                        }
                        setIsAddRefereeDialogOpen(open);
                      }}>
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
                                render={({ field }) => {
                                  // Filter referees based on search term
                                  const availableReferees = (allUsers || [])
                                    .filter((u: any) => u.role === 'referee')
                                    .filter((u: any) => {
                                      const searchLower = refereeSearchTerm.toLowerCase();
                                      return u.email.toLowerCase().includes(searchLower) ||
                                             (u.firstName && u.firstName.toLowerCase().includes(searchLower)) ||
                                             (u.lastName && u.lastName.toLowerCase().includes(searchLower)) ||
                                             (u.firstName && u.lastName && 
                                              `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchLower))
                                    });
                                  
                                  const selectedUser = availableReferees.find((u: any) => u.id === field.value);
                                  
                                  return (
                                    <FormItem>
                                      <FormLabel>Používateľ</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <div className="flex">
                                            <div className="flex-1 relative">
                                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                              <Input
                                                placeholder="Vyhľadať rozhodcu podľa mena alebo emailu..."
                                                value={selectedUser ? (selectedUser.firstName && selectedUser.lastName ? `${selectedUser.firstName} ${selectedUser.lastName} (${selectedUser.email})` : selectedUser.email) : refereeSearchTerm}
                                                onChange={(e) => {
                                                  setRefereeSearchTerm(e.target.value);
                                                  setIsRefereeDropdownOpen(true);
                                                  if (!e.target.value) {
                                                    field.onChange("");
                                                  }
                                                }}
                                                onFocus={() => setIsRefereeDropdownOpen(true)}
                                                className="pl-9"
                                                data-testid="input-search-referee"
                                              />
                                              {field.value && (
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                                                  onClick={() => {
                                                    field.onChange("");
                                                    setRefereeSearchTerm("");
                                                  }}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* Dropdown Results */}
                                          {isRefereeDropdownOpen && refereeSearchTerm && (
                                            <div className="referee-dropdown absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                                              {availableReferees.length > 0 ? (
                                                availableReferees.map((referee: any) => (
                                                  <div
                                                    key={referee.id}
                                                    className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-0"
                                                    onClick={() => {
                                                      field.onChange(referee.id);
                                                      setRefereeSearchTerm("");
                                                      setIsRefereeDropdownOpen(false);
                                                    }}
                                                    data-testid={`option-referee-${referee.id}`}
                                                  >
                                                    <div className="text-sm font-medium">
                                                      {referee.firstName && referee.lastName ? `${referee.firstName} ${referee.lastName}` : referee.email}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{referee.email}</div>
                                                  </div>
                                                ))
                                              ) : (
                                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                                  Žiadni rozhodcovia nenájdení pre "{refereeSearchTerm}"
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }}
                              />
                              
                              <FormField
                                control={refereeForm.control}
                                name="assignedSector"
                                render={({ field }) => {
                                  const competition = competitions?.find((c: Competition) => c.id === selectedCompetition);
                                  const hasSectors = competition?.hasSectors && competition?.sectorPlaces?.length > 0;
                                  
                                  if (hasSectors) {
                                    // Dropdown for sector assignment
                                    const sectors = competition.sectorPlaces?.map(s => s.sectorName) || [];
                                    return (
                                      <FormItem>
                                        <FormLabel>Priradený sektor</FormLabel>
                                        <FormControl>
                                          <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger data-testid="select-referee-sector">
                                              <SelectValue placeholder="Vyberte sektor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {sectors.map((sector) => (
                                                <SelectItem key={sector} value={sector}>
                                                  {sector}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    );
                                  } else {
                                    // Text input for free text sector
                                    return (
                                      <FormItem>
                                        <FormLabel>Priradený sektor</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Zadajte sektor" data-testid="input-referee-sector" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    );
                                  }
                                }}
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
                                  onClick={() => {
                                    setRefereeSearchTerm("");
                                    setIsRefereeDropdownOpen(false);
                                    setIsAddRefereeDialogOpen(false);
                                  }}
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

                      {/* Edit Referee Dialog */}
                      <Dialog open={isEditRefereeDialogOpen} onOpenChange={setIsEditRefereeDialogOpen}>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Upraviť rozhodcu</DialogTitle>
                            <DialogDescription>
                              Upravte detaily rozhodcu priradenia k súťaži
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...editRefereeForm}>
                            <form
                              onSubmit={editRefereeForm.handleSubmit((data) => {
                                if (editingReferee) {
                                  updateRefereeMutation.mutate({
                                    refereeId: editingReferee.id,
                                    refereeData: data
                                  });
                                }
                              })}
                              className="space-y-4"
                            >
                              <FormField
                                control={editRefereeForm.control}
                                name="assignedSector"
                                render={({ field }) => {
                                  const competition = competitions?.find((c: Competition) => c.id === selectedCompetition);
                                  const hasSectors = competition?.hasSectors && competition?.sectorPlaces?.length > 0;
                                  
                                  if (hasSectors) {
                                    // Dropdown for sector assignment
                                    const sectors = competition.sectorPlaces?.map(s => s.sectorName) || [];
                                    return (
                                      <FormItem>
                                        <FormLabel>Priradený sektor</FormLabel>
                                        <FormControl>
                                          <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger data-testid="select-edit-referee-sector">
                                              <SelectValue placeholder="Vyberte sektor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {sectors.map((sector) => (
                                                <SelectItem key={sector} value={sector}>
                                                  {sector}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    );
                                  } else {
                                    // Text input for free text sector
                                    return (
                                      <FormItem>
                                        <FormLabel>Priradený sektor</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Zadajte sektor" data-testid="input-edit-referee-sector" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    );
                                  }
                                }}
                              />

                              <FormField
                                control={editRefereeForm.control}
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
                                        data-testid="switch-edit-referee-active"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <div className="flex justify-end space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setIsEditRefereeDialogOpen(false);
                                    setEditingReferee(null);
                                  }}
                                >
                                  Zrušiť
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={updateRefereeMutation.isPending}
                                  data-testid="button-submit-edit-referee"
                                >
                                  {updateRefereeMutation.isPending ? "Aktualizujem..." : "Aktualizovať"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>

                      {/* Delete Referee Confirmation Dialog */}
                      <Dialog open={isDeleteRefereeDialogOpen} onOpenChange={setIsDeleteRefereeDialogOpen}>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Odstrániť rozhodcu</DialogTitle>
                            <DialogDescription>
                              Ste si istí, že chcete odstrániť tohto rozhodcu zo súťaže? Táto akcia sa nedá vrátiť späť.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-start space-x-3">
                              <div className="text-yellow-600 dark:text-yellow-400">
                                <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                  Dôležité upozornenie
                                </h4>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                  Ak má rozhodca neschválené úlovky, budú prevedené na organizátora súťaže.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsDeleteRefereeDialogOpen(false);
                                setRefereeToDelete(null);
                              }}
                              data-testid="button-cancel-delete-referee"
                            >
                              Zrušiť
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                if (refereeToDelete) {
                                  deleteRefereeMutation.mutate(refereeToDelete);
                                }
                              }}
                              disabled={deleteRefereeMutation.isPending}
                              data-testid="button-confirm-delete-referee"
                            >
                              {deleteRefereeMutation.isPending ? "Odstraňujem..." : "Odstrániť"}
                            </Button>
                          </div>
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
                                    onClick={() => {
                                      setSponsorToDelete(sponsor.id);
                                      setIsDeleteSponsorDialogOpen(true);
                                    }}
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

                      {/* Delete Sponsor Confirmation Dialog */}
                      <Dialog open={isDeleteSponsorDialogOpen} onOpenChange={setIsDeleteSponsorDialogOpen}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Odstránenie sponzora</DialogTitle>
                          </DialogHeader>
                          <p className="text-muted-foreground">
                            Ste si istí, že chcete odstrániť tohto sponzora? Táto akcia sa nedá vrátiť späť.
                          </p>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsDeleteSponsorDialogOpen(false);
                                setSponsorToDelete(null);
                              }}
                              data-testid="button-cancel-delete-sponsor"
                            >
                              Zrušiť
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                if (sponsorToDelete) {
                                  deleteSponsorMutation.mutate(sponsorToDelete);
                                }
                              }}
                              disabled={deleteSponsorMutation.isPending}
                              data-testid="button-confirm-delete-sponsor"
                            >
                              {deleteSponsorMutation.isPending ? "Odstraňujem..." : "Odstrániť"}
                            </Button>
                          </div>
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

      {/* Team Details Dialog - Moved to top level to avoid z-index conflicts */}
      <Dialog 
        open={isTeamDetailsDialogOpen} 
        onOpenChange={(open) => {
          setIsTeamDetailsDialogOpen(open);
          if (!open) {
            setSelectedTeamId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {selectedTeamDetails ? `Detaily tímu - ${selectedTeamDetails.name}` : "Detaily tímu"}
                </DialogTitle>
                <DialogDescription>
                  Podrobné informácie o tíme a jeho členoch
                </DialogDescription>
              </div>
              {selectedTeamDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditTeamDialogOpen(true)}
                  data-testid="button-edit-team"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Upraviť
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {teamDetailsLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : selectedTeamDetails ? (
            <div className="space-y-6">
              {/* Team Basic Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Názov tímu</Label>
                    <p className="text-foreground font-medium" data-testid="team-name">
                      {selectedTeamDetails.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge 
                        variant={selectedTeamDetails.status === 'approved' ? 'default' : 
                                selectedTeamDetails.status === 'pending' ? 'secondary' : 'destructive'}
                        data-testid="team-status"
                      >
                        {selectedTeamDetails.status === 'approved' ? 'Schválený' : 
                         selectedTeamDetails.status === 'pending' ? 'Čaká na schválenie' : 'Zamietnutý'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Krajina</Label>
                    <p className="text-foreground font-medium" data-testid="team-country">
                      {selectedTeamDetails.country || 'SK'}
                    </p>
                  </div>
                  {selectedTeamDetails.sectorName && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Sektor</Label>
                      <p className="text-foreground font-medium" data-testid="team-sector">
                        {selectedTeamDetails.sectorName}
                      </p>
                    </div>
                  )}
                  {selectedTeamDetails.placeName && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Miesto</Label>
                      <p className="text-foreground font-medium" data-testid="team-place">
                        {selectedTeamDetails.placeName}
                      </p>
                    </div>
                  )}
                  {selectedTeamDetails.totalWeight && parseFloat(selectedTeamDetails.totalWeight) > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Celková váha</Label>
                      <p className="text-foreground font-medium" data-testid="team-total-weight">
                        {selectedTeamDetails.totalWeight} kg
                      </p>
                    </div>
                  )}
                  {selectedTeamDetails.fishCount && selectedTeamDetails.fishCount > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Počet rýb</Label>
                      <p className="text-foreground font-medium" data-testid="team-fish-count">
                        {selectedTeamDetails.fishCount}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Team Photo */}
              {selectedTeamDetails.photoUrl && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fotka tímu</Label>
                  <div className="mt-2">
                    <img 
                      src={selectedTeamDetails.photoUrl} 
                      alt={`Fotka tímu ${selectedTeamDetails.name}`}
                      className="w-full max-w-md h-48 object-cover rounded-lg border"
                      data-testid="team-photo"
                    />
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Členovia tímu ({selectedTeamDetails.members?.length || 0})
                </Label>
                <div className="mt-3 space-y-3">
                  {selectedTeamDetails.members?.length > 0 ? (
                    selectedTeamDetails.members.map((member: TeamMember, index: number) => (
                      <div 
                        key={member.id || index} 
                        className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg border"
                        data-testid={`member-${index}`}
                      >
                        {/* Member Photo */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-muted-foreground" />
                          </div>
                        </div>
                        
                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground" data-testid={`member-name-${index}`}>
                            {member.name}
                          </div>
                          {member.email && (
                            <div className="text-sm text-muted-foreground truncate" data-testid={`member-email-${index}`}>
                              {member.email}
                            </div>
                          )}
                          {member.phone && (
                            <div className="text-sm text-muted-foreground" data-testid={`member-phone-${index}`}>
                              {member.phone}
                            </div>
                          )}
                        </div>
                        
                        {/* Role Badge */}
                        <div>
                          <Badge variant={member.role === 'captain' ? 'default' : 'secondary'} data-testid={`member-role-${index}`}>
                            {member.role === 'captain' ? 'Kapitán' : 'Člen'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Žiadni členovia tímu.</p>
                  )}
                </div>
              </div>

              {/* Created/Updated Info */}
              <div className="pt-4 border-t border-border">
                <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                  {selectedTeamDetails.createdAt && (
                    <div>
                      <span className="font-medium">Vytvorené:</span> {new Date(selectedTeamDetails.createdAt).toLocaleString('sk-SK')}
                    </div>
                  )}
                  {selectedTeamDetails.updatedAt && (
                    <div>
                      <span className="font-medium">Posledná úprava:</span> {new Date(selectedTeamDetails.updatedAt).toLocaleString('sk-SK')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nepodarilo sa načítať detaily tímu.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={isEditTeamDialogOpen} onOpenChange={setIsEditTeamDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upraviť tím</DialogTitle>
            <DialogDescription>
              Upravte základné informácie o tíme
            </DialogDescription>
          </DialogHeader>
          
          {selectedTeamDetails && (
            <Form {...editTeamForm}>
              <form onSubmit={editTeamForm.handleSubmit(onEditTeamSubmit)} className="space-y-4">
                <FormField
                  control={editTeamForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Názov tímu</FormLabel>
                      <FormControl>
                        <Input placeholder="Názov tímu" {...field} data-testid="input-edit-team-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editTeamForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Krajina</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-team-country">
                            <SelectValue placeholder="Vyberte krajinu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SK">Slovensko</SelectItem>
                          <SelectItem value="CZ">Česko</SelectItem>
                          <SelectItem value="HU">Maďarsko</SelectItem>
                          <SelectItem value="PL">Poľsko</SelectItem>
                          <SelectItem value="AT">Rakúsko</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sector Selection with Available Options */}
                <FormField
                  control={editTeamForm.control}
                  name="sectorName"
                  render={({ field }) => {
                    const availablePlaces = getAvailableSectorPlaces();
                    const availableSectors = [...new Set(availablePlaces.map(p => p.sectorName))];
                    return (
                      <FormItem>
                        <FormLabel>Sektor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-team-sector">
                              <SelectValue placeholder="Vyberte sektor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Bez sektoru</SelectItem>
                            {availableSectors.map(sector => (
                              <SelectItem key={sector} value={sector}>
                                {sector}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Place Selection - only show if sector is selected */}
                {editTeamForm.watch("sectorName") && (
                  <FormField
                    control={editTeamForm.control}
                    name="placeName"
                    render={({ field }) => {
                      const selectedSector = editTeamForm.watch("sectorName");
                      const availablePlaces = getAvailableSectorPlaces();
                      const placesInSector = availablePlaces.filter(p => p.sectorName === selectedSector);
                      
                      return (
                        <FormItem>
                          <FormLabel>Miesto</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-team-place">
                                <SelectValue placeholder="Vyberte miesto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Bez miesta</SelectItem>
                              {placesInSector.map(place => (
                                <SelectItem 
                                  key={place.placeName} 
                                  value={place.placeName}
                                  disabled={place.isOccupied && selectedTeamDetails?.placeName !== place.placeName}
                                >
                                  {place.placeName} {place.isOccupied && selectedTeamDetails?.placeName !== place.placeName ? '(obsadené)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          <FormDescription>
                            {selectedSector && `Dostupné miesta v ${selectedSector}: ${placesInSector.filter(p => !p.isOccupied || selectedTeamDetails?.placeName === p.placeName).length}`}
                          </FormDescription>
                        </FormItem>
                      );
                    }}
                  />
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditTeamDialogOpen(false)}
                    data-testid="button-cancel-edit-team"
                  >
                    Zrušiť
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateTeamMutation.isPending}
                    data-testid="button-save-edit-team"
                  >
                    {updateTeamMutation.isPending ? "Ukladám..." : "Uložiť"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Team Approve Confirmation Dialog */}
      <Dialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Schváliť tím</span>
            </DialogTitle>
            <DialogDescription>
              Naozaj chcete schváliť tento tím? Tím bude môcť začať súťažiť.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsApproveConfirmOpen(false)}
              data-testid="button-cancel-approve"
            >
              Zrušiť
            </Button>
            <Button 
              onClick={() => {
                if (teamToUpdate) {
                  updateTeamStatusMutation.mutate({ teamId: teamToUpdate, status: 'approved' });
                }
              }}
              disabled={updateTeamStatusMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {updateTeamStatusMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Schvaľujem...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Schváliť
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Reject Confirmation Dialog */}
      <Dialog open={isRejectConfirmOpen} onOpenChange={setIsRejectConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span>Zamietnuť tím</span>
            </DialogTitle>
            <DialogDescription>
              Naozaj chcete zamietnuť tento tím? Tím nebude môcť súťažiť.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsRejectConfirmOpen(false)}
              data-testid="button-cancel-reject"
            >
              Zrušiť
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (teamToUpdate) {
                  updateTeamStatusMutation.mutate({ teamId: teamToUpdate, status: 'rejected' });
                }
              }}
              disabled={updateTeamStatusMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {updateTeamStatusMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Zamietam...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Zamietnuť
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={isBulkActionOpen} onOpenChange={setIsBulkActionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hromadné akcie</DialogTitle>
            <DialogDescription>
              Vyberte akciu pre {selectedTeamsForBulk.length} vybraných tímov
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setBulkAction('approve')}
              data-testid="button-bulk-approve"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Schváliť všetky vybrané tímy
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setBulkAction('reject')}
              data-testid="button-bulk-reject"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Zamietnuť všetky vybrané tímy
            </Button>
          </div>
          {bulkAction && (
            <div className="border-t pt-4">
              <div className="bg-muted/30 p-3 rounded-lg mb-4">
                <p className="text-sm">
                  {bulkAction === 'approve' 
                    ? `Chystáte sa schváliť ${selectedTeamsForBulk.length} tímov`
                    : `Chystáte sa zamietnuť ${selectedTeamsForBulk.length} tímov`
                  }
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setBulkAction(null);
                    setIsBulkActionOpen(false);
                  }}
                >
                  Zrušiť
                </Button>
                <Button 
                  variant={bulkAction === 'approve' ? 'default' : 'destructive'}
                  onClick={() => {
                    bulkUpdateTeamStatusMutation.mutate({
                      teamIds: selectedTeamsForBulk,
                      status: bulkAction
                    });
                  }}
                  disabled={bulkUpdateTeamStatusMutation.isPending}
                  data-testid="button-confirm-bulk-action"
                >
                  {bulkUpdateTeamStatusMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Spracovávam...
                    </>
                  ) : (
                    <>
                      {bulkAction === 'approve' ? (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      {bulkAction === 'approve' ? 'Schváliť' : 'Zamietnuť'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}