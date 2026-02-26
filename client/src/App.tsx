import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserModeProvider } from "@/contexts/UserModeContext";
import { WebSocketProvider } from "@/providers/WebSocketProvider";
import TopNavigationShell from "@/components/navigation/TopNavigationShell";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { useUserMode } from "@/contexts/UserModeContext";
import { Loader2 } from "lucide-react";

// All page components are lazy-loaded to prevent OOM during initial Vite compilation.
// With 63 eager imports, the first compilation exhausted memory and triggered SIGKILL.
// Lazy imports compile on-demand (when the route is first visited), spreading memory load.

const NotFound = lazy(() => import("@/pages/not-found"));
const RoleSelection = lazy(() => import("@/pages/role-selection"));
const Landing = lazy(() => import("@/pages/landing"));
const Home = lazy(() => import("@/pages/home"));
const CompetitionDetail = lazy(() => import("@/pages/competition-detail"));
const CompetitionCatches = lazy(() => import("@/pages/competition-catches"));
const TeamDetail = lazy(() => import("@/pages/team-detail"));
const SectorDetail = lazy(() => import("@/pages/sector-detail"));
const AdminPanel = lazy(() => import("@/pages/admin-panel"));
const UserDetail = lazy(() => import("@/pages/user-detail"));
const AdminUserProfile = lazy(() => import("@/pages/admin-user-profile"));
const RefereeInterface = lazy(() => import("@/pages/referee-interface"));
const CompetitionSetup = lazy(() => import("@/pages/competition-setup"));
const RegisterTeam = lazy(() => import("@/pages/register-team"));
const AboutUs = lazy(() => import("@/pages/about-us"));
const Pricing = lazy(() => import("@/pages/pricing"));
const FAQ = lazy(() => import("@/pages/faq"));
const Contact = lazy(() => import("@/pages/contact"));
const Terms = lazy(() => import("@/pages/terms"));
const Privacy = lazy(() => import("@/pages/privacy"));
const RegistrationOpenPage = lazy(() => import("@/pages/registration-open"));
const UpcomingPage = lazy(() => import("@/pages/upcoming"));
const LivePage = lazy(() => import("@/pages/live"));
const FinishedPage = lazy(() => import("@/pages/finished"));
const CompetitionsPage = lazy(() => import("@/pages/competitions"));
const NotificationPreferences = lazy(() => import("@/pages/notification-preferences"));
const Favorites = lazy(() => import("@/pages/favorites"));
const Friends = lazy(() => import("@/pages/friends"));
const DiaryIndex = lazy(() => import("@/pages/diary/index"));
const DiaryTrips = lazy(() => import("@/pages/diary/trips"));
const DiaryTripDetail = lazy(() => import("@/pages/diary/trip-detail"));
const DiaryCatches = lazy(() => import("@/pages/diary/catches"));
const DiaryCatchDetail = lazy(() => import("@/pages/diary/catch-detail"));
const DiaryStats = lazy(() => import("@/pages/diary/stats"));
const DiarySeasonalGoals = lazy(() => import("@/pages/diary/seasonal-goals"));
const DiarySeasonalGoalsCreate = lazy(() => import("@/pages/diary/seasonal-goals-create"));
const DiarySeasonalGoalsEdit = lazy(() => import("@/pages/diary/seasonal-goals-edit"));
const DiaryProfile = lazy(() => import("@/pages/diary/profile"));
const WeatherForecast = lazy(() => import("@/pages/diary/weather-forecast"));
const FishingRules = lazy(() => import("@/pages/diary/fishing-rules"));
const GearArsenal = lazy(() => import("@/pages/diary/gear-arsenal"));
const Badges = lazy(() => import("@/pages/diary/badges"));
const BattlePaywall = lazy(() => import("@/pages/diary/battle-paywall"));
const BattleIndex = lazy(() => import("@/pages/diary/battle-index"));
const BattleCreate = lazy(() => import("@/pages/diary/battle-create"));
const BattleEdit = lazy(() => import("@/pages/diary/battle-edit"));
const BattleDetail = lazy(() => import("@/pages/diary/battle-detail"));
const BattleArchive = lazy(() => import("@/pages/diary/battle-archive"));
const TripGallery = lazy(() => import("@/pages/diary/trip-gallery"));
const Register = lazy(() => import("@/pages/register"));
const SharedCatch = lazy(() => import("@/pages/shared-catch"));
const OrganizerDashboard = lazy(() => import("@/pages/organizer-dashboard"));
const OrganizerCompetitions = lazy(() => import("@/pages/organizer/competitions"));
const OrganizerCompetitionManage = lazy(() => import("@/pages/organizer/competition-manage"));
const OrganizerCompetitionCheckout = lazy(() => import("@/pages/organizer/competition-checkout"));
const OrganizerCreateCompetition = lazy(() => import("@/pages/organizer/create-competition"));
const AuthRegister = lazy(() => import("@/pages/auth/register"));
const AuthLogin = lazy(() => import("@/pages/auth/login"));
const VerifyEmail = lazy(() => import("@/pages/auth/verify-email"));
const ResetPassword = lazy(() => import("@/pages/auth/reset-password"));
const ForgotPassword = lazy(() => import("@/pages/auth/forgot-password"));
const Onboarding = lazy(() => import("@/pages/onboarding"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1C2F]">
      <Loader2 className="h-8 w-8 animate-spin text-[#F97316]" />
    </div>
  );
}

function Router() {
  const { isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const { needsRoleSelection, isLoading: contextLoading, activeMode } = useUserMode();
  
  useEffect(() => {
    if (isLoading || contextLoading) return;
    if (!user) return;

    if (location === "/") {
      const returnTo = localStorage.getItem('contestio_returnTo');
      if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
        localStorage.removeItem('contestio_returnTo');
        setLocation(returnTo);
        return;
      }
    }
    
    const exemptRoutes = ["/onboarding", "/auth/login", "/auth/register", "/auth/verify-email", "/auth/reset-password", "/auth/forgot-password", "/reset-password", "/pricing", "/about-us", "/faq", "/contact", "/terms", "/privacy", "/register", "/select-role"];
    const exemptPrefixes = ["/competition/", "/team/", "/categories/"];
    
    const isExempt = exemptRoutes.includes(location) || 
                     exemptPrefixes.some(prefix => location.startsWith(prefix));
    
    if (isExempt) return;
    
    if (!user.preferences?.onboardingCompleted) {
      setLocation("/onboarding");
      return;
    }
    
    if (needsRoleSelection && location === "/" && !activeMode) {
      setLocation("/select-role");
    }
  }, [user, isLoading, location, setLocation, needsRoleSelection, contextLoading, activeMode]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={user ? Home : Landing} />
        <Route path="/register" component={Register} />
        
        {/* Public shared catch page - no authentication required */}
        <Route path="/s/:shareToken" component={SharedCatch} />
        
        {/* New authentication routes */}
        <Route path="/auth/register" component={AuthRegister} />
        <Route path="/auth/login" component={AuthLogin} />
        <Route path="/auth/verify-email" component={VerifyEmail} />
        <Route path="/auth/forgot-password" component={ForgotPassword} />
        <Route path="/auth/reset-password" component={ResetPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/select-role" component={RoleSelection} />
        
        <Route path="/register-competition">
          {() => {
            const params = new URLSearchParams(window.location.search);
            const plan = params.get('plan');
            window.location.href = plan ? `/organizer/create?plan=${plan}` : '/organizer/create';
            return null;
          }}
        </Route>
        <Route path="/competition/:id/setup" component={CompetitionSetup} />
        <Route path="/register-team" component={RegisterTeam} />
        <Route path="/about-us" component={AboutUs} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/faq" component={FAQ} />
        <Route path="/contact" component={Contact} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/competitions" component={CompetitionsPage} />
        <Route path="/categories/registration-open" component={RegistrationOpenPage} />
        <Route path="/categories/upcoming" component={UpcomingPage} />
        <Route path="/categories/live" component={LivePage} />
        <Route path="/categories/finished" component={FinishedPage} />
        <Route path="/competition/:id" component={CompetitionDetail} />
        <Route path="/competition/:id/catches" component={CompetitionCatches} />
        <Route path="/competition/:competitionId/sector/:sector" component={SectorDetail} />
        <Route path="/team/:teamId" component={TeamDetail} />
        <Route path="/admin/users/:userId">
          <ProtectedRoute roles={["admin"]}>
            <UserDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/users/:userId/profile">
          <ProtectedRoute roles={["admin"]}>
            <AdminUserProfile />
          </ProtectedRoute>
        </Route>
        <Route path="/admin">
          <ProtectedRoute roles={["admin"]}>
            <AdminPanel />
          </ProtectedRoute>
        </Route>
        <Route path="/admin-panel">
          <ProtectedRoute roles={["admin"]}>
            <AdminPanel />
          </ProtectedRoute>
        </Route>
        <Route path="/referee-interface" component={RefereeInterface} />
        <Route path="/organizer">
          <ProtectedRoute redirectTo="/auth/login">
            <OrganizerDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/organizer/competitions">
          <ProtectedRoute redirectTo="/auth/login">
            <OrganizerCompetitions />
          </ProtectedRoute>
        </Route>
        <Route path="/organizer/create">
          <ProtectedRoute redirectTo="/auth/login">
            <OrganizerCreateCompetition />
          </ProtectedRoute>
        </Route>
        <Route path="/organizer/competition/:id">
          <ProtectedRoute redirectTo="/auth/login">
            <OrganizerCompetitionManage />
          </ProtectedRoute>
        </Route>
        <Route path="/organizer/competition/:id/checkout">
          <ProtectedRoute redirectTo="/auth/login">
            <OrganizerCompetitionCheckout />
          </ProtectedRoute>
        </Route>
        <Route path="/notification-preferences">
          <ProtectedRoute>
            <NotificationPreferences />
          </ProtectedRoute>
        </Route>
        <Route path="/favorites">
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        </Route>
        <Route path="/diary">
          <ProtectedRoute redirectTo="/auth/login">
            <DiaryIndex />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/trips/:id/gallery">
          <ProtectedRoute redirectTo="/auth/login">
            <TripGallery />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/trips/:id">
          <ProtectedRoute redirectTo="/auth/login">
            <DiaryTripDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/trips">
          <ProtectedRoute redirectTo="/auth/login">
            <DiaryTrips />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/catches/:id">
          <ProtectedRoute redirectTo="/auth/login">
            <DiaryCatchDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/catches">
          <ProtectedRoute redirectTo="/auth/login">
            <DiaryCatches />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/profile">
          <ProtectedRoute redirectTo="/auth/login">
            <DiaryProfile />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/stats">
          <ProtectedRoute redirectTo="/auth/login">
            <DiaryStats />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/weather-forecast">
          <ProtectedRoute redirectTo="/auth/login">
            <WeatherForecast />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/fishing-rules">
          <ProtectedRoute redirectTo="/auth/login">
            <FishingRules />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/arsenal">
          <ProtectedRoute redirectTo="/auth/login">
            <GearArsenal />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/badges">
          <ProtectedRoute redirectTo="/auth/login">
            <Badges />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/seasonal-goals">
          <ProtectedRoute redirectTo="/auth/login">
            <DiarySeasonalGoals />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/seasonal-goals/create">
          <ProtectedRoute redirectTo="/auth/login">
            <DiarySeasonalGoalsCreate />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/seasonal-goals/:id/edit">
          <ProtectedRoute redirectTo="/auth/login">
            <DiarySeasonalGoalsEdit />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/battles/paywall" component={BattlePaywall} />
        <Route path="/diary/battles/create">
          <ProtectedRoute redirectTo="/auth/login">
            <BattleCreate />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/battles/archive">
          <ProtectedRoute redirectTo="/auth/login">
            <BattleArchive />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/battles/:id/edit">
          <ProtectedRoute redirectTo="/auth/login">
            <BattleEdit />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/battles/:id">
          <ProtectedRoute redirectTo="/auth/login">
            <BattleDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/diary/battles">
          <ProtectedRoute redirectTo="/auth/login">
            <BattleIndex />
          </ProtectedRoute>
        </Route>
        <Route path="/friends">
          <ProtectedRoute>
            <Friends />
          </ProtectedRoute>
        </Route>
        {!isLoading && <Route component={NotFound} />}
      </Switch>
    </Suspense>
  );
}

function AuthenticatedContent() {
  const { user } = useAuth();
  
  if (!user) {
    return <Router />;
  }
  
  return (
    <TopNavigationShell>
      <Router />
    </TopNavigationShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <UserModeProvider>
          <TooltipProvider>
            <Toaster />
            <WebSocketProvider>
              <AuthenticatedContent />
            </WebSocketProvider>
          </TooltipProvider>
        </UserModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
