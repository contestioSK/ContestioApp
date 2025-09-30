import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import CompetitionDetail from "@/pages/competition-detail";
import CompetitionCatches from "@/pages/competition-catches";
import TeamDetail from "@/pages/team-detail";
import SectorDetail from "@/pages/sector-detail";
import AdminPanel from "@/pages/admin-panel";
import RefereeInterface from "@/pages/referee-interface";
import RegisterCompetition from "@/pages/register-competition";
import RegisterTeam from "@/pages/register-team";
import AboutUs from "@/pages/about-us";
import Pricing from "@/pages/pricing";
import FAQ from "@/pages/faq";
import Contact from "@/pages/contact";
import RegistrationOpenPage from "@/pages/registration-open";
import UpcomingPage from "@/pages/upcoming";
import LivePage from "@/pages/live";
import FinishedPage from "@/pages/finished";
import NotificationPreferences from "@/pages/notification-preferences";
import DiaryIndex from "@/pages/diary/index";
import DiaryTrips from "@/pages/diary/trips";
import DiaryCatches from "@/pages/diary/catches";
import DiaryStats from "@/pages/diary/stats";
import DiarySeasonalGoals from "@/pages/diary/seasonal-goals";
import DiarySeasonalGoalsCreate from "@/pages/diary/seasonal-goals-create.tsx";
import DiarySeasonalGoalsEdit from "@/pages/diary/seasonal-goals-edit.tsx";
import DiaryProfile from "@/pages/diary/profile";
import BattlePaywall from "@/pages/diary/battle-paywall";
import BattleIndex from "@/pages/diary/battle-index";
import BattleCreate from "@/pages/diary/battle-create";
import BattleDetail from "@/pages/diary/battle-detail";
import BattleArchive from "@/pages/diary/battle-archive";
import Register from "@/pages/register";
import AuthRegister from "@/pages/auth/register";
import AuthLogin from "@/pages/auth/login";
import VerifyEmail from "@/pages/auth/verify-email";
import ProtectedRoute from "@/components/ProtectedRoute";

function Router() {
  const { isLoading, user } = useAuth();

  return (
    <Switch>
      <Route path="/" component={user ? Home : Landing} />
      <Route path="/register" component={Register} />
      
      {/* New authentication routes */}
      <Route path="/auth/register" component={AuthRegister} />
      <Route path="/auth/login" component={AuthLogin} />
      <Route path="/auth/verify-email" component={VerifyEmail} />
      
      <Route path="/register-competition" component={RegisterCompetition} />
      <Route path="/register-team" component={RegisterTeam} />
      <Route path="/about-us" component={AboutUs} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/faq" component={FAQ} />
      <Route path="/contact" component={Contact} />
      <Route path="/categories/registration-open" component={RegistrationOpenPage} />
      <Route path="/categories/upcoming" component={UpcomingPage} />
      <Route path="/categories/live" component={LivePage} />
      <Route path="/categories/finished" component={FinishedPage} />
      <Route path="/competition/:id" component={CompetitionDetail} />
      <Route path="/competition/:id/catches" component={CompetitionCatches} />
      <Route path="/competition/:competitionId/sector/:sector" component={SectorDetail} />
      <Route path="/team/:teamId" component={TeamDetail} />
      <Route path="/admin">
        <ProtectedRoute roles={["organizer", "admin"]}>
          <AdminPanel />
        </ProtectedRoute>
      </Route>
      <Route path="/admin-panel">
        <ProtectedRoute roles={["organizer", "admin"]}>
          <AdminPanel />
        </ProtectedRoute>
      </Route>
      <Route path="/referee-interface" component={RefereeInterface} />
      <Route path="/notification-preferences">
        <ProtectedRoute>
          <NotificationPreferences />
        </ProtectedRoute>
      </Route>
      <Route path="/diary">
        <ProtectedRoute>
          <DiaryIndex />
        </ProtectedRoute>
      </Route>
      <Route path="/diary/trips">
        <ProtectedRoute>
          <DiaryTrips />
        </ProtectedRoute>
      </Route>
      <Route path="/diary/catches">
        <ProtectedRoute>
          <DiaryCatches />
        </ProtectedRoute>
      </Route>
      <Route path="/diary/profile">
        <ProtectedRoute>
          <DiaryProfile />
        </ProtectedRoute>
      </Route>
      <Route path="/diary/stats">
        <ProtectedRoute>
          <DiaryStats />
        </ProtectedRoute>
      </Route>
      <Route path="/diary/seasonal-goals">
        <ProtectedRoute>
          <DiarySeasonalGoals />
        </ProtectedRoute>
      </Route>
      <Route path="/diary/seasonal-goals/create">
        <ProtectedRoute>
          <DiarySeasonalGoalsCreate />
        </ProtectedRoute>
      </Route>
      <Route path="/diary/seasonal-goals/:id/edit">
        <ProtectedRoute>
          <DiarySeasonalGoalsEdit />
        </ProtectedRoute>
      </Route>
      <Route path="/diary/battle/paywall" component={BattlePaywall} />
      <Route path="/diary/battle/create">
        <ProtectedRoute>
          <BattleCreate />
        </ProtectedRoute>
      </Route>
      <Route path="/diary/battle/:id">
        <ProtectedRoute>
          <BattleDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/diary/battle/archive">
        <ProtectedRoute>
          <BattleArchive />
        </ProtectedRoute>
      </Route>
      <Route path="/diary/battle">
        <ProtectedRoute>
          <BattleIndex />
        </ProtectedRoute>
      </Route>
      {!isLoading && <Route component={NotFound} />}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
