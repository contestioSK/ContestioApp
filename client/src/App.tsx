import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserModeProvider } from "@/contexts/UserModeContext";
import TopNavigationShell from "@/components/navigation/TopNavigationShell";
import NotFound from "@/pages/not-found";
import RoleSelection from "@/pages/role-selection";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import CompetitionDetail from "@/pages/competition-detail";
import CompetitionCatches from "@/pages/competition-catches";
import TeamDetail from "@/pages/team-detail";
import SectorDetail from "@/pages/sector-detail";
import AdminPanel from "@/pages/admin-panel";
import UserDetail from "@/pages/user-detail";
import AdminUserProfile from "@/pages/admin-user-profile";
import RefereeInterface from "@/pages/referee-interface";
import RegisterCompetition from "@/pages/register-competition";
import CompetitionSetup from "@/pages/competition-setup";
import CompetitionReport from "@/pages/competition-report";
import RegisterTeam from "@/pages/register-team";
import AboutUs from "@/pages/about-us";
import Pricing from "@/pages/pricing";
import FAQ from "@/pages/faq";
import Contact from "@/pages/contact";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import RegistrationOpenPage from "@/pages/registration-open";
import UpcomingPage from "@/pages/upcoming";
import LivePage from "@/pages/live";
import FinishedPage from "@/pages/finished";
import CompetitionsPage from "@/pages/competitions";
import NotificationPreferences from "@/pages/notification-preferences";
import Favorites from "@/pages/favorites";
import DiaryIndex from "@/pages/diary/index";
import DiaryTrips from "@/pages/diary/trips";
import DiaryTripDetail from "@/pages/diary/trip-detail";
import DiaryCatches from "@/pages/diary/catches";
import DiaryCatchDetail from "@/pages/diary/catch-detail";
import DiaryStats from "@/pages/diary/stats";
import DiarySeasonalGoals from "@/pages/diary/seasonal-goals";
import DiarySeasonalGoalsCreate from "@/pages/diary/seasonal-goals-create.tsx";
import DiarySeasonalGoalsEdit from "@/pages/diary/seasonal-goals-edit.tsx";
import DiaryProfile from "@/pages/diary/profile";
import WeatherForecast from "@/pages/diary/weather-forecast";
import FishingRules from "@/pages/diary/fishing-rules";
import GearArsenal from "@/pages/diary/gear-arsenal";
import Badges from "@/pages/diary/badges";
import Friends from "@/pages/friends";
import BattlePaywall from "@/pages/diary/battle-paywall";
import BattleIndex from "@/pages/diary/battle-index";
import BattleCreate from "@/pages/diary/battle-create";
import BattleEdit from "@/pages/diary/battle-edit";
import BattleDetail from "@/pages/diary/battle-detail";
import BattleArchive from "@/pages/diary/battle-archive";
import TripGallery from "@/pages/diary/trip-gallery";
import Register from "@/pages/register";
import SharedCatch from "@/pages/shared-catch";
import OrganizerDashboard from "@/pages/organizer-dashboard";
import OrganizerCompetitions from "@/pages/organizer/competitions";
import OrganizerCompetitionManage from "@/pages/organizer/competition-manage";
import OrganizerCompetitionCheckout from "@/pages/organizer/competition-checkout";
import OrganizerCreateCompetition from "@/pages/organizer/create-competition";
import AuthRegister from "@/pages/auth/register";
import AuthLogin from "@/pages/auth/login";
import VerifyEmail from "@/pages/auth/verify-email";
import ResetPassword from "@/pages/auth/reset-password";
import ForgotPassword from "@/pages/auth/forgot-password";
import ProtectedRoute from "@/components/ProtectedRoute";
import Onboarding from "@/pages/onboarding";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUserMode } from "@/contexts/UserModeContext";

function Router() {
  const { isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const { needsRoleSelection, isLoading: contextLoading, activeMode } = useUserMode();
  
  useEffect(() => {
    if (isLoading || contextLoading) return;
    if (!user) return;

    if (location === "/") {
      const returnTo = localStorage.getItem('privode_returnTo');
      if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
        localStorage.removeItem('privode_returnTo');
        setLocation(returnTo);
        return;
      }
    }
    
    const exemptRoutes = ["/onboarding", "/auth/login", "/auth/register", "/auth/verify-email", "/auth/reset-password", "/auth/forgot-password", "/reset-password", "/pricing", "/about-us", "/faq", "/contact", "/terms", "/privacy", "/register", "/select-role"];
    
    const isExempt = exemptRoutes.includes(location);
    
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
    <Switch>
      <Route path="/">{user ? <Redirect to="/diary" /> : <Landing />}</Route>
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
      
      <Route path="/about-us" component={AboutUs} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/faq" component={FAQ} />
      <Route path="/contact" component={Contact} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />

      {/* Competition routes disabled — redirect to diary */}
      <Route path="/competitions"><Redirect to="/diary" /></Route>
      <Route path="/categories/:rest*"><Redirect to="/diary" /></Route>
      <Route path="/competition/:rest*"><Redirect to="/diary" /></Route>
      <Route path="/team/:rest*"><Redirect to="/diary" /></Route>
      <Route path="/register-competition"><Redirect to="/diary" /></Route>
      <Route path="/register-team"><Redirect to="/diary" /></Route>
      <Route path="/referee-interface"><Redirect to="/diary" /></Route>
      <Route path="/organizer/:rest*"><Redirect to="/diary" /></Route>
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
            <AuthenticatedContent />
          </TooltipProvider>
        </UserModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
